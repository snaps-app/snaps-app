/**
 * Checagem de novidades das abas de raiz abertas: a exceção 5b da ADR-0071
 * (emenda de 21/10/2026, decisão do PO). É uma das duas consultas periódicas
 * do Cockpit; a outra é o indicador de última chamada. A trava de
 * `cockpit.travas.test.ts` aceita `refetchInterval` só nestes dois arquivos.
 *
 * Por que existe: só o nó selecionado tem stream (P13). Um nó irmão que muda,
 * ou uma raiz de aba inativa, não chegava à tela até alguém recarregar.
 *
 * O que faz, num hook só, montado uma vez pela página:
 *   - revalida a árvore (`chavesDeConsulta.arvore`) de cada aba de raiz aberta,
 *     a cada `INTERVALO_DA_ABA_VISIVEL_MS` na aba visível e a cada
 *     `INTERVALO_DAS_ABAS_INATIVAS_MS` nas inativas;
 *   - pausa com a página oculta: o TanStack só dispara o intervalo com
 *     `document.visibilityState` visível (`refetchIntervalInBackground: false`);
 *   - manda `If-None-Match` (`getArvore`): sem mudança, o `/arvore` responde
 *     304 sem corpo, a árvore em cache continua a mesma referência e nada
 *     redesenha;
 *   - compara a árvore nova com a última vista (`novidadesDasRaizes.ts`) e
 *     guarda as marcas: por nó, para o Workflow, e por aba de raiz.
 *
 * Não revalida snapshot, resumo nem aba de nó: o nó selecionado continua no
 * SSE, e o nó terminal continua em cache (item 6).
 *
 * A aba inativa que ainda não tem árvore na sessão (restaurada do storage e
 * nunca aberta) não é buscada ao abrir a página: abrir a raiz custa 1
 * `/arvore`, a da aba visível (meta da task 7). A primeira checagem dela vem
 * depois de um intervalo de aba inativa, e essa árvore vira a base.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { consultaDaArvore } from '@/services/nodeSnapshot';
import { abrirAbaDeRaiz, atualizarVistos, verNo as verNoDosVistos, type VistosDaRaiz } from './novidadesDasRaizes';

/** De quanto em quanto a árvore da aba de raiz visível é conferida. */
export const INTERVALO_DA_ABA_VISIVEL_MS = 60_000;
/** De quanto em quanto a árvore de cada aba de raiz inativa é conferida. */
export const INTERVALO_DAS_ABAS_INATIVAS_MS = 180_000;

export interface NovidadesDasRaizes {
    /** Marcas por raiz aberta. Raiz sem árvore vista ainda não aparece. */
    porRaiz: Readonly<Record<string, VistosDaRaiz>>;
    /** O nó foi selecionado (ou é o selecionado da aba visível): apaga a marca dele. */
    verNo: (rootId: string, noId: string) => void;
}

export function useNovidadesDasRaizes(abertas: readonly string[], ativa: string | null): NovidadesDasRaizes {
    const cliente = useQueryClient();
    const [vistos, setVistos] = useState<Record<string, VistosDaRaiz>>({});
    const selecionados = useRef<Record<string, string>>({});
    const [liberadas, setLiberadas] = useState<ReadonlySet<string>>(() => new Set());

    const temArvore = (rootId: string) => cliente.getQueryData(chaves.arvore(rootId)) !== undefined;
    const arvores = useQueries({
        queries: abertas.map((rootId) => ({
            ...consultaDaArvore(cliente, rootId),
            enabled: rootId === ativa || liberadas.has(rootId) || temArvore(rootId),
            refetchInterval: rootId === ativa ? INTERVALO_DA_ABA_VISIVEL_MS : INTERVALO_DAS_ABAS_INATIVAS_MS,
            refetchIntervalInBackground: false,
        })),
        // Só a árvore: o estado da busca (`isFetching`) não redesenha a página.
        combine: (resultados) => resultados.map((r) => r.data),
    });

    // Aba inativa sem árvore: a primeira checagem espera um intervalo de aba
    // inativa, e de novo se a página estiver oculta quando ele vencer.
    const semArvore = abertas.filter((r) => r !== ativa && !liberadas.has(r) && !temArvore(r)).join(',');
    useEffect(() => {
        if (!semArvore) return undefined;
        let relogio: ReturnType<typeof setTimeout>;
        const agendar = () => {
            relogio = setTimeout(() => {
                if (document.visibilityState === 'hidden') return agendar();
                setLiberadas((atual) => new Set([...atual, ...semArvore.split(',')]));
            }, INTERVALO_DAS_ABAS_INATIVAS_MS);
        };
        agendar();
        return () => clearTimeout(relogio);
    }, [semArvore]);

    // Cada árvore que chega é comparada com a última vista daquela raiz.
    useEffect(() => {
        setVistos((atual) => {
            let novo = atual;
            abertas.forEach((rootId, i) => {
                const arvore = arvores[i];
                if (!arvore) return;
                const visivel = rootId === ativa;
                const proximo = atualizarVistos(atual[rootId] ?? null, arvore.nos, {
                    selecionado: visivel ? selecionados.current[rootId] ?? null : null,
                    ativa: visivel,
                });
                if (proximo !== atual[rootId]) novo = { ...novo, [rootId]: proximo };
            });
            return novo;
        });
    }, [arvores, abertas, ativa]);

    // Abrir a aba de raiz apaga a marca da aba.
    useEffect(() => {
        if (!ativa) return;
        setVistos((atual) => {
            const da = atual[ativa];
            const aberta = da && abrirAbaDeRaiz(da);
            return aberta && aberta !== da ? { ...atual, [ativa]: aberta } : atual;
        });
    }, [ativa]);

    const verNo = useCallback((rootId: string, noId: string) => {
        selecionados.current[rootId] = noId;
        setVistos((atual) => {
            const da = atual[rootId];
            const visto = da && verNoDosVistos(da, noId);
            return visto && visto !== da ? { ...atual, [rootId]: visto } : atual;
        });
    }, []);

    // Aba fechada leva as marcas junto.
    const porRaiz = useMemo(() => {
        const abertasAgora = new Set(abertas);
        return Object.fromEntries(Object.entries(vistos).filter(([rootId]) => abertasAgora.has(rootId)));
    }, [vistos, abertas]);

    return { porRaiz, verNo };
}
