/**
 * Layout dos painéis do Cockpit, por usuário (P14; TP-4 da Sprint 24.0).
 *
 * Guarda só ESTADO DE TELA: a largura do Workflow e da Conversa, em px, e o que
 * está recolhido (os três painéis e o cabeçalho). É por usuário, e não por aba
 * de raiz: quem estreita a Conversa numa raiz quer a mesma largura na outra.
 *
 * As regras moram aqui, em funções puras, e o componente só as aplica:
 *   - limites: Workflow de 200 a 520 px, Conversa de 300 a 640 px; a Superfície
 *     aberta nunca fica abaixo de 320 px;
 *   - o último painel aberto não recolhe;
 *   - quem cresce: o centro; com o centro recolhido, a Conversa; com centro e
 *     Conversa recolhidos, o Workflow;
 *   - abaixo de `lg` a tela abre com os laterais recolhidos.
 *
 * O storage pode faltar (modo privado, cota, bloqueio) e o JSON pode chegar
 * corrompido ou de outra versão: nos dois casos vale o padrão. Perder o layout
 * é chato; a tela não abrir é defeito.
 */

export type PainelDoCockpit = 'workflow' | 'superficie' | 'conversa';

export const PAINEIS: readonly PainelDoCockpit[] = ['workflow', 'superficie', 'conversa'];

export interface LayoutDoCockpit {
    /** Largura preferida do Workflow, em px. */
    larguraWorkflow: number;
    /** Largura preferida da Conversa, em px. */
    larguraConversa: number;
    recolhidos: Record<PainelDoCockpit, boolean>;
    cabecalhoRecolhido: boolean;
    faixaDeCardsRecolhida?: boolean;
}

export const LIMITES = {
    workflow: { min: 200, max: 520, padrao: 300 },
    conversa: { min: 300, max: 640, padrao: 400 },
    superficieMin: 320,
} as const;

/** Largura de um painel recolhido. */
export const LARGURA_DO_TRILHO = 44;
/** Quanto as setas movem o divisor. */
export const PASSO_DO_TECLADO = 16;
/** Breakpoint `lg` do Tailwind. */
export const LARGURA_LG = 1024;

export type Lateral = 'workflow' | 'conversa';

export function layoutPadrao(larguraDaJanela?: number): LayoutDoCockpit {
    const estreita = typeof larguraDaJanela === 'number' && larguraDaJanela < LARGURA_LG;
    return {
        larguraWorkflow: LIMITES.workflow.padrao,
        larguraConversa: LIMITES.conversa.padrao,
        recolhidos: { workflow: estreita, superficie: false, conversa: estreita },
        cabecalhoRecolhido: false,
        faixaDeCardsRecolhida: false,
    };
}

export function chaveDoLayout(userId: string): string {
    return `snaps.cockpit.layout.v1.${userId}`;
}

/** Largura dentro dos limites do painel. Valor inválido vira o padrão. */
export function limitarLargura(painel: Lateral, px: unknown): number {
    const { min, max, padrao } = LIMITES[painel];
    if (typeof px !== 'number' || !Number.isFinite(px)) return padrao;
    return Math.round(Math.min(max, Math.max(min, px)));
}

export function paineisAbertos(layout: Pick<LayoutDoCockpit, 'recolhidos'>): PainelDoCockpit[] {
    return PAINEIS.filter((p) => !layout.recolhidos[p]);
}

/**
 * Recolhe ou abre um painel. Recolher o último aberto não faz nada: devolve o
 * MESMO objeto, para quem chamou saber que nada mudou.
 */
export function definirRecolhido(layout: LayoutDoCockpit, painel: PainelDoCockpit, recolhido: boolean): LayoutDoCockpit {
    if (layout.recolhidos[painel] === recolhido) return layout;
    if (recolhido && paineisAbertos(layout).length <= 1) return layout;
    return { ...layout, recolhidos: { ...layout.recolhidos, [painel]: recolhido } };
}

export function alternarPainel(layout: LayoutDoCockpit, painel: PainelDoCockpit): LayoutDoCockpit {
    return definirRecolhido(layout, painel, !layout.recolhidos[painel]);
}

export function definirLargura(layout: LayoutDoCockpit, painel: Lateral, px: number): LayoutDoCockpit {
    const campo = painel === 'workflow' ? 'larguraWorkflow' : 'larguraConversa';
    const largura = limitarLargura(painel, px);
    return layout[campo] === largura ? layout : { ...layout, [campo]: largura };
}

/** Duplo clique no divisor: volta à largura padrão. */
export function restaurarLargura(layout: LayoutDoCockpit, painel: Lateral): LayoutDoCockpit {
    return definirLargura(layout, painel, LIMITES[painel].padrao);
}

/**
 * Seta no divisor. O divisor do Workflow fica à DIREITA dele, e o da Conversa à
 * ESQUERDA dela: a seta para a direita alarga o Workflow e estreita a Conversa.
 */
export function moverDivisor(layout: LayoutDoCockpit, painel: Lateral, tecla: string): LayoutDoCockpit {
    const sentido = tecla === 'ArrowRight' ? 1 : tecla === 'ArrowLeft' ? -1 : 0;
    if (!sentido) return layout;
    const atual = painel === 'workflow' ? layout.larguraWorkflow : layout.larguraConversa;
    const passo = painel === 'workflow' ? sentido * PASSO_DO_TECLADO : -sentido * PASSO_DO_TECLADO;
    return definirLargura(layout, painel, atual + passo);
}

/** O painel que ocupa o espaço que sobra: o centro, depois a Conversa, depois o Workflow. */
export function painelQueCresce(layout: Pick<LayoutDoCockpit, 'recolhidos'>): PainelDoCockpit {
    const abertos = paineisAbertos(layout);
    if (abertos.includes('superficie')) return 'superficie';
    if (abertos.includes('conversa')) return 'conversa';
    return 'workflow';
}

/**
 * Larguras efetivas, em px, dos painéis abertos, para um espaço disponível
 * (`disponivel` já sem trilhos e divisores). O painel que cresce fica com o
 * resto. Se o espaço não comporta as preferências, os laterais encolhem até o
 * mínimo deles para a Superfície não ficar abaixo de 320 px.
 */
export function largurasEfetivas(layout: LayoutDoCockpit, disponivel: number): Partial<Record<PainelDoCockpit, number>> {
    const abertos = paineisAbertos(layout);
    const cresce = painelQueCresce(layout);
    const saida: Partial<Record<PainelDoCockpit, number>> = {};
    let workflow = abertos.includes('workflow') && cresce !== 'workflow' ? layout.larguraWorkflow : 0;
    let conversa = abertos.includes('conversa') && cresce !== 'conversa' ? layout.larguraConversa : 0;
    const minimoDoQueCresce = cresce === 'superficie' ? LIMITES.superficieMin : LIMITES[cresce].min;

    let excesso = workflow + conversa + minimoDoQueCresce - disponivel;
    if (excesso > 0 && conversa) {
        const corte = Math.min(excesso, conversa - LIMITES.conversa.min);
        conversa -= corte;
        excesso -= corte;
    }
    if (excesso > 0 && workflow) {
        workflow -= Math.min(excesso, workflow - LIMITES.workflow.min);
    }
    if (workflow) saida.workflow = workflow;
    if (conversa) saida.conversa = conversa;
    saida[cresce] = Math.max(0, disponivel - workflow - conversa);
    return saida;
}

function storagePadrao(): Storage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

/** Reconstrói o layout só com os campos conhecidos, dentro dos limites. */
function sanear(bruto: unknown, base: LayoutDoCockpit): LayoutDoCockpit {
    if (!bruto || typeof bruto !== 'object') return base;
    const l = bruto as Record<string, unknown>;
    const rec = (l.recolhidos && typeof l.recolhidos === 'object' ? l.recolhidos : {}) as Record<string, unknown>;
    const recolhidos = {
        workflow: rec.workflow === true,
        superficie: rec.superficie === true,
        conversa: rec.conversa === true,
    };
    // Os três recolhidos não é estado válido: a Superfície volta.
    if (recolhidos.workflow && recolhidos.superficie && recolhidos.conversa) recolhidos.superficie = false;
    return {
        larguraWorkflow: limitarLargura('workflow', l.larguraWorkflow),
        larguraConversa: limitarLargura('conversa', l.larguraConversa),
        recolhidos,
        cabecalhoRecolhido: l.cabecalhoRecolhido === true,
        faixaDeCardsRecolhida: l.faixaDeCardsRecolhida === true,
    };
}

/**
 * O layout salvo do usuário. Abaixo de `lg` os laterais abrem recolhidos,
 * mesmo que estivessem abertos: a Superfície não cabe ao lado deles.
 */
export function lerLayout(
    userId: string,
    larguraDaJanela?: number,
    storage: Storage | null = storagePadrao(),
): LayoutDoCockpit {
    const padrao = layoutPadrao(larguraDaJanela);
    let salvo = padrao;
    if (storage) {
        try {
            const texto = storage.getItem(chaveDoLayout(userId));
            if (texto) salvo = sanear(JSON.parse(texto), padrao);
        } catch {
            salvo = padrao;
        }
    }
    if (typeof larguraDaJanela === 'number' && larguraDaJanela < LARGURA_LG) {
        return { ...salvo, recolhidos: { workflow: true, superficie: false, conversa: true } };
    }
    return salvo;
}

/** Grava; devolve `false` quando o storage recusa (cota, bloqueio), sem lançar. */
export function gravarLayout(
    userId: string,
    layout: LayoutDoCockpit,
    storage: Storage | null = storagePadrao(),
): boolean {
    if (!storage) return false;
    try {
        storage.setItem(chaveDoLayout(userId), JSON.stringify(sanear(layout, layoutPadrao())));
        return true;
    } catch {
        return false;
    }
}
