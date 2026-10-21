import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { chavesDeConsulta } from '@/services/chavesDeConsulta';
import { buscarRaiz, idCurto, rotuloDaRaiz, tomDaRaiz, type ResumoDaRaiz, type TomDaRaiz } from '@/services/raizesDoCockpit';

/** Cor do ponto por tom, sempre por token do DESIGN_snaps. */
const COR_DO_TOM: Record<TomDaRaiz, string> = {
    ativa: 'var(--snaps-accent-blue)',
    atencao: 'var(--snaps-accent-amber)',
    falha: 'var(--snaps-error)',
    encerrada: 'var(--snaps-accent-slate)',
};

/**
 * O rótulo de uma raiz aberta. É a ÚNICA consulta de uma aba inativa: nada da
 * árvore, do nó ou do stream roda enquanto ela não for a ativa. Voltar a ela
 * usa o cache (`gcTime` de 10 min).
 *
 * Busca uma vez e não refaz sozinha: com o `staleTime` padrão (30 s), cada
 * reconexão da rede e cada remontagem buscariam de novo o rótulo de todas as
 * abas abertas. O frescor vem por evento (ADR-0071, item 5): a chave fica sob
 * o prefixo `raiz(rootId)`, que `invalidarPorEvento` invalida.
 */
export function useRaizDaAba(rootId: string) {
    return useQuery({
        queryKey: chavesDeConsulta.rotuloDaRaiz(rootId),
        queryFn: () => buscarRaiz(rootId),
        staleTime: Infinity,
    });
}

function AbaDaBarra({
    rootId,
    ativa,
    onFocar,
    onFechar,
    onInexistente,
}: {
    rootId: string;
    ativa: boolean;
    onFocar: (rootId: string) => void;
    onFechar: (rootId: string) => void;
    onInexistente: (rootId: string) => void;
}) {
    const { data: raiz, isSuccess } = useRaizDaAba(rootId);
    // `null` com sucesso = a busca respondeu e a raiz não está no meu escopo.
    const inexistente = isSuccess && raiz === null;
    useEffect(() => {
        if (inexistente) onInexistente(rootId);
    }, [inexistente, rootId, onInexistente]);
    if (inexistente) return null;

    const rotulo = raiz ? rotuloDaRaiz(raiz) : idCurto(rootId);
    const titulo = raiz ? tituloCompleto(raiz) : rootId;
    return (
        <div
            role="presentation"
            className={`group flex h-8 shrink-0 items-center rounded-lg border ${
                ativa ? 'border-white/15 bg-white/10' : 'border-white/5 hover:bg-white/5'
            }`}
        >
            <button
                type="button"
                role="tab"
                aria-selected={ativa}
                title={titulo}
                onClick={() => onFocar(rootId)}
                className="flex h-full items-center gap-2 pl-3 pr-1 text-sm whitespace-nowrap"
                style={{ color: ativa ? 'var(--snaps-text-primary)' : 'var(--snaps-text-secondary)' }}
            >
                <span
                    aria-hidden="true"
                    data-tom={raiz ? tomDaRaiz(raiz) : undefined}
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: raiz ? COR_DO_TOM[tomDaRaiz(raiz)] : 'var(--snaps-placeholder)' }}
                />
                <span>{rotulo}</span>
            </button>
            <button
                type="button"
                aria-label={`Fechar aba ${rotulo}`}
                title="Fechar a aba. A execução continua."
                onClick={() => onFechar(rootId)}
                className="mr-1 flex h-6 w-6 items-center justify-center rounded-md opacity-60 hover:bg-white/10 hover:opacity-100"
                style={{ color: 'var(--snaps-text-secondary)' }}
            >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}

function tituloCompleto(r: ResumoDaRaiz): string {
    return [r.projectName, r.sprintName, r.alvo.join(', ') || null, `raiz ${idCurto(r.rootId)}`]
        .filter(Boolean)
        .join(' · ');
}

/**
 * Barra de abas de raízes, no topo do Cockpit (canvas, página 2): a marca, uma
 * aba por raiz aberta, o seletor `+` e, à direita, o espaço que o TP-4 ocupa
 * com os controles de painel.
 */
export function BarraDeRaizes({
    abas,
    ativa,
    onFocar,
    onFechar,
    onInexistente,
    seletor,
    direita,
}: {
    abas: string[];
    ativa: string | null;
    onFocar: (rootId: string) => void;
    onFechar: (rootId: string) => void;
    onInexistente: (rootId: string) => void;
    seletor: ReactNode;
    direita?: ReactNode;
}) {
    return (
        <div
            className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4"
        >
            <div className="mr-3 text-sm font-bold tracking-wide" style={{ color: 'var(--snaps-text-primary)' }}>
                snaps
            </div>
            <div role="tablist" aria-label="Raízes abertas" className="flex min-w-0 items-center gap-2 overflow-x-auto">
                {abas.map((rootId) => (
                    <AbaDaBarra
                        key={rootId}
                        rootId={rootId}
                        ativa={rootId === ativa}
                        onFocar={onFocar}
                        onFechar={onFechar}
                        onInexistente={onInexistente}
                    />
                ))}
            </div>
            {seletor}
            <div className="flex-1" />
            {direita}
        </div>
    );
}
