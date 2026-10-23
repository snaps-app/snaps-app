import { DetalheDaEntidade } from '../chat/comum/DetalheDaEntidade';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { eIdDeExecucao, lerRotaDoCockpit, rotaDoNo } from '@/services/cockpitRota';
import {
    ABAS_VAZIAS,
    abrirAba,
    atualizarAba,
    fecharAba,
    gravarAbas,
    lerAbas,
    type AbasDoCockpit,
    type EstadoDaAba,
} from '@/services/cockpitAbas';
import { type ResumoDaRaiz } from '@/services/raizesDoCockpit';
import { gravarLayout, layoutPadrao, lerLayout, type LayoutDoCockpit } from '@/services/cockpitLayout';
import { AbaDeRaiz } from './navegacao/AbaDeRaiz';
import { BarraDeRaizes, useRaizDaAba } from './navegacao/BarraDeRaizes';
import { EstadoDaAbaProvider } from './navegacao/EstadoDaAbaContexto';
import { SeletorDeRaiz } from './navegacao/SeletorDeRaiz';
import { useIdDoUsuario } from './navegacao/useIdDoUsuario';
import { ControlesDePaineis } from './layout/ControlesDePaineis';
import { useNovidadesDasRaizes, type NovidadesDasRaizes } from './novidades/useNovidadesDasRaizes';
import { CockpitDaRaiz } from './CockpitDaRaiz';
import { LimiteDeErroDoCockpit } from './LimiteDeErroDoCockpit';

export const AVISO_SEM_ACESSO = 'Raiz sem acesso ou inexistente.';

const rotaDaAba = (aba: EstadoDaAba) => rotaDoNo({ id: aba.no ?? aba.rootId, root_id: aba.rootId }, aba.aba);

const larguraDaJanela = () => (typeof window === 'undefined' ? undefined : window.innerWidth);

/**
 * O layout dos painéis do usuário (P14): por usuário, e não por aba de raiz.
 * Abaixo de `lg` abre com os laterais recolhidos (`lerLayout`).
 */
function useLayoutDoUsuario(userId: string | null | undefined) {
    const [layout, setLayout] = useState<LayoutDoCockpit>(() => layoutPadrao(larguraDaJanela()));
    useEffect(() => {
        if (userId) setLayout(lerLayout(userId, larguraDaJanela()));
    }, [userId]);
    const mudar = useCallback((novo: LayoutDoCockpit) => {
        setLayout(novo);
        if (userId) gravarLayout(userId, novo);
    }, [userId]);
    return { layout, mudar };
}

/** As abas do usuário, carregadas do storage só depois de saber quem ele é. */
function useAbasDoUsuario(userId: string | null | undefined) {
    const [carregado, setCarregado] = useState<{ dono: string | null; estado: AbasDoCockpit } | null>(null);
    useEffect(() => {
        if (userId === undefined) return;
        setCarregado({ dono: userId, estado: userId ? lerAbas(userId) : ABAS_VAZIAS });
    }, [userId]);

    const estado = carregado && carregado.dono === userId ? carregado.estado : null;
    const mudar = useCallback(
        (f: (e: AbasDoCockpit) => AbasDoCockpit) =>
            setCarregado((atual) => {
                if (!atual) return atual;
                const novo = f(atual.estado);
                if (novo !== atual.estado && atual.dono) gravarAbas(atual.dono, novo);
                return novo === atual.estado ? atual : { ...atual, estado: novo };
            }),
        [],
    );
    return { estado, mudar };
}

/**
 * Cockpit: `/cockpit/:rootId?no=<executionId>&aba=<aba>` (TP-3 da Sprint 24.0).
 *
 * A URL manda: a raiz do caminho é a aba ativa, e `no`/`aba` são o nó e a aba
 * da Superfície dela. As abas salvas só lembram o que estava aberto. Trocar de
 * aba é navegar, para que voltar no navegador volte de aba também.
 *
 * Só a aba ativa monta conteúdo. As inativas existem na barra com o rótulo e
 * a marca de novidade: sem nó e sem stream (ADR-0071). A árvore de cada aba
 * aberta é conferida pela checagem de novidades (exceção 5b), num hook só,
 * montado aqui.
 */
/** Última rede: erro fora do conteúdo da raiz (barra de abas, estado) também aparece escrito. */
export function PaginaDoCockpit() {
    return (
        <LimiteDeErroDoCockpit onde="o Cockpit">
            <PaginaDoCockpitSemLimite />
        </LimiteDeErroDoCockpit>
    );
}

function PaginaDoCockpitSemLimite() {
    const { rootId: raizDaRota } = useParams<{ rootId?: string }>();
    const [busca] = useSearchParams();
    const { no, aba } = lerRotaDoCockpit(busca);
    const navigate = useNavigate();
    const userId = useIdDoUsuario();
    const { estado, mudar } = useAbasDoUsuario(userId);
    const { layout, mudar: mudarLayout } = useLayoutDoUsuario(userId);
    const [aviso, setAviso] = useState<string | null>(null);
    const raizValida = eIdDeExecucao(raizDaRota) ? raizDaRota : null;

    // URL -> abas: a raiz da rota abre (ou foca) a aba dela, com o nó e a aba.
    // Depende de `pronto`, e não do estado: reagir a cada mudança do estado
    // reabriria a aba que acabou de ser fechada por 404.
    const pronto = estado !== null;
    useEffect(() => {
        if (!pronto || !raizValida) return;
        mudar((e) => abrirAba(e, raizValida, { no: eIdDeExecucao(no) ? no : null, aba }));
    }, [pronto, raizValida, no, aba, mudar]);

    // `/cockpit` sem raiz: volta para a última aba ativa, se houver.
    useEffect(() => {
        if (!estado || raizDaRota) return;
        const ativa = estado.abas.find((a) => a.rootId === estado.ativa);
        if (ativa) navigate(rotaDaAba(ativa), { replace: true });
    }, [estado, raizDaRota, navigate]);

    const focar = useCallback(
        (rootId: string) => {
            const alvo = estado?.abas.find((a) => a.rootId === rootId);
            navigate(alvo ? rotaDaAba(alvo) : rotaDoNo({ id: rootId, root_id: rootId }));
        },
        [estado, navigate],
    );

    const fechar = useCallback(
        (rootId: string) => {
            if (!estado) return;
            const novo = fecharAba(estado, rootId);
            mudar(() => novo);
            if (rootId !== raizValida) return;
            const proxima = novo.abas.find((a) => a.rootId === novo.ativa);
            navigate(proxima ? rotaDaAba(proxima) : '/cockpit', { replace: true });
        },
        [estado, mudar, navigate, raizValida],
    );

    // 404 (ou fora do meu escopo): sai da barra, com aviso, sem mostrar dado.
    // Se era a ativa, a URL fica onde está e o conteúdo mostra o mesmo aviso.
    const inexistente = useCallback(
        (rootId: string) => {
            setAviso(AVISO_SEM_ACESSO);
            mudar((e) => fecharAba(e, rootId));
        },
        [mudar],
    );

    // A rota apontava um nó filho: a aba é da raiz dele, com o nó selecionado.
    const raizDiferente = useCallback(
        (pedido: string, raiz: ResumoDaRaiz) => {
            mudar((e) => abrirAba(fecharAba(e, pedido), raiz.rootId, { no: pedido, aba }));
            navigate(rotaDoNo({ id: pedido, root_id: raiz.rootId }, aba), { replace: true });
        },
        [aba, mudar, navigate],
    );

    const escolher = useCallback((raiz: ResumoDaRaiz) => focar(raiz.rootId), [focar]);

    const raizesAbertas = useMemo(() => estado?.abas.map((a) => a.rootId) ?? [], [estado]);
    const abertas = useMemo(() => new Set(raizesAbertas), [raizesAbertas]);
    const novidades = useNovidadesDasRaizes(raizesAbertas, raizValida);
    const comNovidade = useMemo(
        () => new Set(Object.entries(novidades.porRaiz).filter(([, v]) => v.aba).map(([rootId]) => rootId)),
        [novidades.porRaiz],
    );
    const estadoDaAtiva = estado?.abas.find((a) => a.rootId === raizValida) ?? null;
    const contexto = useMemo(
        () => ({
            estado: estadoDaAtiva,
            atualizar: (parcial: Partial<EstadoDaAba>) => {
                if (raizValida) mudar((e) => atualizarAba(e, raizValida, parcial));
            },
        }),
        [estadoDaAtiva, raizValida, mudar],
    );

    if (!estado) return null; // ainda não sabemos de quem são as abas

    return (
        <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--snaps-bg)' }}>
            <BarraDeRaizes
                abas={estado.abas.map((a) => a.rootId)}
                ativa={raizValida}
                onFocar={focar}
                onFechar={fechar}
                onInexistente={inexistente}
                comNovidade={comNovidade}
                seletor={<SeletorDeRaiz abertas={abertas} onEscolher={escolher} />}
                direita={raizValida ? <ControlesDePaineis layout={layout} onMudarLayout={mudarLayout} /> : null}
            />
            {aviso && (
                <div
                    role="status"
                    className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-sm"
                    style={{ color: 'var(--snaps-accent-amber)' }}
                >
                    <span>{aviso}</span>
                    <button type="button" onClick={() => setAviso(null)} style={{ color: 'var(--snaps-text-secondary)' }}>
                        Dispensar
                    </button>
                </div>
            )}
            <main className="flex min-h-0 flex-1 flex-col">
                {raizDaRota && !raizValida ? (
                    <SemAcesso />
                ) : raizValida ? (
                    <LimiteDeErroDoCockpit key={raizValida} onde="esta raiz">
                        <EstadoDaAbaProvider value={contexto}>
                            <ConteudoDaRaiz
                                rootId={raizValida}
                                no={no}
                                aba={aba}
                                layout={layout}
                                onMudarLayout={mudarLayout}
                                onRaizDiferente={raizDiferente}
                                novidades={novidades}
                            />
                        </EstadoDaAbaProvider>
                    </LimiteDeErroDoCockpit>
                ) : (
                    <SemRaizAberta />
                )}
            </main>
        </div>
    );
}

function SemAcesso() {
    return (
        <p role="alert" className="p-6 text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
            {AVISO_SEM_ACESSO}
        </p>
    );
}

function SemRaizAberta() {
    return (
        <p className="p-6 text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
            Nenhuma raiz aberta. Use o + para abrir uma.
        </p>
    );
}

/**
 * Conteúdo da aba ativa: o papel por projeto e o tratamento de raiz
 * inexistente, que valem para tudo que for montado dentro, e o Cockpit da raiz
 * (cabeçalho, History, Superfície e Conversa; TP-4).
 */
function ConteudoDaRaiz({
    rootId,
    no,
    aba,
    layout,
    onMudarLayout,
    onRaizDiferente,
    novidades,
}: {
    rootId: string;
    no: string | null;
    aba: string | null;
    layout: LayoutDoCockpit;
    onMudarLayout: (layout: LayoutDoCockpit) => void;
    onRaizDiferente: (pedido: string, raiz: ResumoDaRaiz) => void;
    novidades: NovidadesDasRaizes;
}) {
    const { data: raiz, isPending, isError } = useRaizDaAba(rootId);
    const { verNo } = novidades;
    const verNoDaRaiz = useCallback((noId: string) => verNo(rootId, noId), [verNo, rootId]);
    const diferente = !!raiz && raiz.rootId !== rootId;
    useEffect(() => {
        if (raiz && diferente) onRaizDiferente(rootId, raiz);
    }, [raiz, diferente, rootId, onRaizDiferente]);

    if (isPending || diferente) return <div role="status" aria-label="Carregando a raiz" className="flex-1 animate-pulse bg-white/[0.02]" />;
    if (isError) {
        return (
            <p role="alert" className="p-6 text-sm" style={{ color: 'var(--snaps-error)' }}>
                Não foi possível abrir esta raiz agora.
            </p>
        );
    }
    if (!raiz) return <SemAcesso />;

    return (
        <AbaDeRaiz projectId={raiz.projectId}>
            <DetalheDaEntidade />
            <CockpitDaRaiz
                raiz={raiz}
                no={no}
                aba={aba}
                layout={layout}
                onMudarLayout={onMudarLayout}
                novidadesDosNos={novidades.porRaiz[rootId]?.contagem}
                onVerNo={verNoDaRaiz}
            />
        </AbaDeRaiz>
    );
}
