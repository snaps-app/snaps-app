/**
 * Os três painéis do Cockpit — Workflow, Superfície e Conversa — no estilo do
 * VS Code (P14; TP-4 da Sprint 24.0), com `react-resizable-panels`.
 *
 * - A fonte da verdade é o layout em px (`cockpitLayout.ts`), por usuário. O
 *   grupo de painéis trabalha em porcentagem: aqui as larguras viram % do espaço
 *   disponível, e o arrasto volta a px. Assim o limite em px vale em qualquer
 *   largura de janela.
 * - Painel recolhido sai do grupo e vira um trilho de 44 px, que mantém a luz de
 *   pendência e o contador de novidade: recolher nunca esconde uma ação sua.
 * - Quem cresce é o centro; com o centro recolhido, a Conversa; com os dois
 *   recolhidos, o Workflow. O último painel aberto não recolhe.
 * - Divisor: arrastar, duplo clique restaura a largura padrão, setas movem
 *   16 px. As setas são tratadas na fase de captura, antes do passo de 10% da
 *   biblioteca, que então desiste (`defaultPrevented`).
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelGroupHandle } from 'react-resizable-panels';
import {
    LARGURA_DO_TRILHO,
    LIMITES,
    definirLargura,
    definirRecolhido,
    largurasEfetivas,
    moverDivisor,
    paineisAbertos,
    painelQueCresce,
    restaurarLargura,
    type Lateral,
    type LayoutDoCockpit,
    type PainelDoCockpit,
} from '@/services/cockpitLayout';

/** Largura de um divisor, em px (`w-1.5`). */
const LARGURA_DO_DIVISOR = 6;
/** Sem medida (teste, primeiro render): o espaço de uma tela comum. */
const LARGURA_SEM_MEDIDA = 1440;

export const NOME_DO_PAINEL: Record<PainelDoCockpit, string> = {
    workflow: 'Workflow',
    superficie: 'Superfície',
    conversa: 'Conversa',
};

export interface InfoDoTrilho {
    /** Ação sua pendente: a luz âmbar não some com o painel recolhido. */
    luz?: boolean;
    /** Quantas novidades ainda não vistas. */
    novidade?: number;
    /** Complemento do nome no trilho (a aba aberta da Superfície). */
    detalhe?: string | null;
}

export interface PaineisDoCockpitProps {
    layout: LayoutDoCockpit;
    onMudarLayout: (layout: LayoutDoCockpit) => void;
    workflow: ReactNode;
    superficie: ReactNode;
    conversa: ReactNode;
    trilhos?: Partial<Record<PainelDoCockpit, InfoDoTrilho>>;
    /** Conteúdo extra no topo de cada painel, ao lado do nome (chips). */
    extras?: Partial<Record<PainelDoCockpit, ReactNode>>;
}

function useLarguraDoElemento() {
    const ref = useRef<HTMLDivElement | null>(null);
    const [largura, setLargura] = useState(0);
    useEffect(() => {
        const alvo = ref.current;
        if (!alvo || typeof ResizeObserver === 'undefined') return;
        const observador = new ResizeObserver(([entrada]) => setLargura(Math.round(entrada.contentRect.width)));
        observador.observe(alvo);
        return () => observador.disconnect();
    }, []);
    return { ref, largura };
}

/** Restrições e tamanhos, em %, dos painéis abertos, na ordem da tela. */
function emPorcentagem(layout: LayoutDoCockpit, disponivel: number) {
    const abertos = paineisAbertos(layout);
    const cresce = painelQueCresce(layout);
    const larguras = largurasEfetivas(layout, disponivel);
    const pct = (px: number) => Math.min(100, Math.max(0, (px / disponivel) * 100));
    const minimo: Record<PainelDoCockpit, number> = {
        workflow: LIMITES.workflow.min,
        conversa: LIMITES.conversa.min,
        superficie: LIMITES.superficieMin,
    };
    // A soma dos mínimos não pode passar de 100%: numa janela estreita, eles
    // encolhem juntos em vez de a biblioteca recusar o layout.
    const somaDosMinimos = abertos.reduce((s, p) => s + pct(minimo[p]), 0);
    const escala = somaDosMinimos > 100 ? 100 / somaDosMinimos : 1;

    const paineis = abertos.map((painel) => ({
        painel,
        tamanho: pct(larguras[painel] ?? 0),
        min: pct(minimo[painel]) * escala,
        max: painel === cresce || painel === 'superficie' ? 100 : pct(LIMITES[painel as Lateral].max),
    }));
    // Arredondar pode deixar a soma em 99,9%: a diferença vai para quem cresce.
    const soma = paineis.reduce((s, p) => s + p.tamanho, 0);
    const doQueCresce = paineis.find((p) => p.painel === cresce);
    if (doQueCresce) doQueCresce.tamanho += 100 - soma;
    return paineis;
}

function Trilho({ painel, info, onAbrir }: { painel: PainelDoCockpit; info?: InfoDoTrilho; onAbrir: () => void }) {
    const nome = NOME_DO_PAINEL[painel];
    const novidade = info?.novidade ?? 0;
    return (
        <div
            data-testid={`trilho-${painel}`}
            className="flex h-full w-11 shrink-0 flex-col items-center gap-3.5 border-x border-white/10 bg-white/[0.025] pt-3"
            style={{ width: LARGURA_DO_TRILHO }}
        >
            <button
                type="button"
                onClick={onAbrir}
                aria-label={`Expandir ${nome}`}
                title={`Expandir ${nome}`}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm text-[var(--snaps-text-primary)] hover:bg-white/10"
            >
                {painel === 'workflow' ? '›' : painel === 'conversa' ? '‹' : '+'}
            </button>
            <span className="rotate-180 text-xs font-bold uppercase tracking-[0.14em] text-[var(--snaps-text-secondary)] [writing-mode:vertical-rl]">
                {info?.detalhe ? `${nome} · ${info.detalhe}` : nome}
            </span>
            {info?.luz && (
                <span
                    aria-label="ação sua pendente"
                    className="h-2.5 w-2.5 rounded-full bg-[var(--snaps-accent-amber)] shadow-[0_0_8px_2px_var(--snaps-accent-amber)]"
                />
            )}
            {novidade > 0 && (
                <span
                    aria-label={`${novidade} novidade(s)`}
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--snaps-accent-blue)] px-1.5 text-xs font-bold text-[var(--snaps-bg)]"
                >
                    {novidade}
                </span>
            )}
        </div>
    );
}

function Divisor({
    lateral,
    largura,
    onTecla,
    onRestaurar,
    onArrastando,
}: {
    lateral: Lateral;
    largura: number;
    onTecla: (tecla: string) => void;
    onRestaurar: () => void;
    onArrastando: (arrastando: boolean) => void;
}) {
    // As teclas que a biblioteca trata: as setas são nossas (16 px); as outras
    // não mexem, para o px salvo e o que está na tela não divergirem.
    // O tipo do evento do `PanelResizeHandle` é genérico demais; só a tecla importa.
    const capturar = (evento: Pick<KeyboardEvent, 'key' | 'preventDefault'>) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(evento.key)) return;
        evento.preventDefault();
        onTecla(evento.key);
    };
    return (
        <PanelResizeHandle
            id={`divisor-${lateral}`}
            aria-label={`Redimensionar ${NOME_DO_PAINEL[lateral]}`}
            aria-valuetext={`${largura} px`}
            title="Arraste para redimensionar · duplo clique restaura"
            onKeyDownCapture={capturar}
            onDoubleClick={onRestaurar}
            onDragging={onArrastando}
            className="group flex w-1.5 shrink-0 items-center justify-center border-x border-white/10 bg-white/[0.03] outline-none data-[resize-handle-state=drag]:bg-[var(--snaps-accent-purple)]/35 focus-visible:bg-[var(--snaps-accent-purple)]/35"
        >
            <span className="h-9 w-0.5 rounded-sm bg-white/30" />
        </PanelResizeHandle>
    );
}

export function PaineisDoCockpit({ layout, onMudarLayout, workflow, superficie, conversa, trilhos = {}, extras = {} }: PaineisDoCockpitProps) {
    const { ref, largura } = useLarguraDoElemento();
    const grupo = useRef<ImperativePanelGroupHandle | null>(null);
    const arrastando = useRef(false);
    const layoutAtual = useRef(layout);
    layoutAtual.current = layout;

    const abertos = paineisAbertos(layout);
    const aberto = (p: PainelDoCockpit) => abertos.includes(p);
    const divisorDoWorkflow = aberto('workflow') && abertos.length > 1;
    const divisorDaConversa = aberto('conversa') && aberto('superficie');
    const trilhosNaTela = 3 - abertos.length;
    const divisores = Number(divisorDoWorkflow) + Number(divisorDaConversa);
    const disponivel = Math.max(1, (largura || LARGURA_SEM_MEDIDA) - trilhosNaTela * LARGURA_DO_TRILHO - divisores * LARGURA_DO_DIVISOR);
    const paineis = emPorcentagem(layout, disponivel);
    const tamanhos = paineis.map((p) => p.tamanho);
    const assinatura = tamanhos.map((t) => t.toFixed(3)).join('|');

    // O layout em px manda: toda mudança dele (tecla, duplo clique, recolher,
    // janela) chega ao grupo. Durante o arrasto quem manda é o grupo. Painel
    // que acabou de entrar ou sair só é registrado pelo grupo no render
    // seguinte: com a contagem diferente, tenta de novo no próximo ciclo.
    useLayoutEffect(() => {
        let tentativa: ReturnType<typeof setTimeout> | undefined;
        const aplicar = (restantes: number) => {
            if (arrastando.current || !grupo.current) return;
            if (grupo.current.getLayout().length !== tamanhos.length) {
                if (restantes > 0) tentativa = setTimeout(() => aplicar(restantes - 1), 0);
                return;
            }
            grupo.current.setLayout(tamanhos);
        };
        aplicar(3);
        return () => clearTimeout(tentativa);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assinatura]);

    const aoMudarNoGrupo = (porcentagens: number[]) => {
        if (!arrastando.current) return;
        let novo = layoutAtual.current;
        const cresce = painelQueCresce(novo);
        paineisAbertos(novo).forEach((painel, i) => {
            if (painel === 'superficie' || painel === cresce) return;
            novo = definirLargura(novo, painel, (porcentagens[i] / 100) * disponivel);
        });
        if (novo !== layoutAtual.current) onMudarLayout(novo);
    };

    const mudar = (novo: LayoutDoCockpit) => {
        if (novo !== layout) onMudarLayout(novo);
    };
    const recolher = (painel: PainelDoCockpit) => mudar(definirRecolhido(layout, painel, true));
    const abrir = (painel: PainelDoCockpit) => mudar(definirRecolhido(layout, painel, false));
    const podeRecolher = abertos.length > 1;

    const conteudo: Record<PainelDoCockpit, ReactNode> = { workflow, superficie, conversa };
    const ordem: Record<PainelDoCockpit, number> = { workflow: 1, superficie: 2, conversa: 3 };

    const painel = (p: PainelDoCockpit) => {
        const dados = paineis.find((d) => d.painel === p)!;
        return (
            <Panel
                key={p}
                id={`painel-${p}`}
                order={ordem[p]}
                defaultSize={dados.tamanho}
                minSize={dados.min}
                maxSize={dados.max}
                className="@container flex min-w-0 flex-col"
                data-testid={`painel-${p}`}
            >
                <section aria-label={NOME_DO_PAINEL[p]} className="flex h-full min-h-0 flex-col">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <h2 className="grow text-xs font-bold uppercase tracking-[0.12em] text-[var(--snaps-text-secondary)]">
                            {NOME_DO_PAINEL[p]}
                        </h2>
                        {extras[p]}
                        {podeRecolher && (
                            <button
                                type="button"
                                onClick={() => recolher(p)}
                                aria-label={`Recolher ${NOME_DO_PAINEL[p]}`}
                                title={`Recolher ${NOME_DO_PAINEL[p]}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm text-[var(--snaps-text-primary)] hover:bg-white/10"
                            >
                                {p === 'workflow' ? '‹' : p === 'conversa' ? '›' : '–'}
                            </button>
                        )}
                    </div>
                    <div className="flex min-h-0 grow flex-col">{conteudo[p]}</div>
                </section>
            </Panel>
        );
    };

    const divisor = (lateral: Lateral) => (
        <Divisor
            key={`divisor-${lateral}`}
            lateral={lateral}
            largura={lateral === 'workflow' ? layout.larguraWorkflow : layout.larguraConversa}
            onTecla={(tecla) => mudar(moverDivisor(layout, lateral, tecla))}
            onRestaurar={() => mudar(restaurarLargura(layout, lateral))}
            onArrastando={(sim) => { arrastando.current = sim; }}
        />
    );

    const trilho = (p: PainelDoCockpit) => <Trilho key={`trilho-${p}`} painel={p} info={trilhos[p]} onAbrir={() => abrir(p)} />;

    return (
        <div ref={ref} className="flex min-h-0 min-w-0 flex-1">
            <PanelGroup ref={grupo} direction="horizontal" onLayout={aoMudarNoGrupo} keyboardResizeBy={null} className="min-w-0">
                {aberto('workflow') ? painel('workflow') : trilho('workflow')}
                {divisorDoWorkflow && divisor('workflow')}
                {aberto('superficie') ? painel('superficie') : trilho('superficie')}
                {divisorDaConversa && divisor('conversa')}
                {aberto('conversa') ? painel('conversa') : trilho('conversa')}
            </PanelGroup>
        </div>
    );
}
