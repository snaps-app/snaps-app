/**
 * Abas de raízes do Cockpit, persistidas no navegador por usuário (P2; TP-3).
 *
 * Guarda só ESTADO DE TELA: que raízes estão abertas, a ativa e, por aba, o nó
 * selecionado, a aba da Superfície, o scroll da Conversa e o filtro de card.
 * Nunca dado do servidor (ADR-0071, item 8): nem rótulo, nem status, nem nome
 * de projeto. Dado de projeto em disco sobrevive ao logout, e o rótulo vem do
 * cache em memória, que o logout limpa. Por isso a gravação passa por uma lista
 * fechada de campos, e não pelo objeto que chegou.
 *
 * O storage pode faltar (modo privado, cota, bloqueio) e o JSON pode chegar
 * corrompido ou de outra versão. Nos dois casos o Cockpit abre sem abas
 * salvas: perder as abas é chato, a tela não abrir é defeito.
 */
import { eIdDeExecucao } from './cockpitRota';

export interface EstadoDaAba {
    rootId: string;
    /** Nó selecionado dentro da raiz; sem ele, a raiz. */
    no: string | null;
    /** Aba da Superfície aberta. */
    aba: string | null;
    scrollDaConversa: number;
    filtroDeCard: string | null;
    ramosRecolhidos?: string[];
    leituras?: Record<string, Record<string, {versao: string; cursor: number}>>;
}

export interface AbasDoCockpit {
    abas: EstadoDaAba[];
    ativa: string | null;
}

export const ABAS_VAZIAS: AbasDoCockpit = { abas: [], ativa: null };

export function chaveDasAbas(userId: string): string {
    return `snaps.cockpit.abas.v1.${userId}`;
}

/** `localStorage`, ou `null` quando o navegador nega o acesso (o getter lança). */
function storagePadrao(): Storage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

const textoOuNulo = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

function sanearLeituras(bruto: unknown): EstadoDaAba['leituras'] {
    if (!bruto || typeof bruto !== 'object') return {};
    const saida: NonNullable<EstadoDaAba['leituras']> = {};
    for (const [no, abas] of Object.entries(bruto)) {
        if (!eIdDeExecucao(no) || !abas || typeof abas !== 'object') continue;
        for (const [aba, valor] of Object.entries(abas)) {
            if (!['prompt','testplans','revisoes'].includes(aba) || !valor || typeof valor !== 'object') continue;
            const {versao,cursor} = valor as {versao: unknown;cursor: unknown};
            if (typeof versao !== 'string' || versao.length > 256 || typeof cursor !== 'number' || !Number.isSafeInteger(cursor) || cursor < 0) continue;
            (saida[no] ??= {})[aba] = {versao,cursor};
        }
    }
    return saida;
}

function sanearAba(bruta: unknown): EstadoDaAba | null {
    if (!bruta || typeof bruta !== 'object') return null;
    const a = bruta as Record<string, unknown>;
    if (!eIdDeExecucao(a.rootId as string)) return null;
    const scroll = a.scrollDaConversa;
    return {
        rootId: a.rootId as string,
        no: eIdDeExecucao(a.no as string) ? (a.no as string) : null,
        aba: textoOuNulo(a.aba),
        scrollDaConversa: typeof scroll === 'number' && Number.isFinite(scroll) && scroll > 0 ? scroll : 0,
        filtroDeCard: textoOuNulo(a.filtroDeCard),
        ...(a.leituras ? {leituras:sanearLeituras(a.leituras)} : {}),
        ...(Array.isArray(a.ramosRecolhidos) ? {ramosRecolhidos: [...new Set(a.ramosRecolhidos.filter((id): id is string => typeof id === "string" && eIdDeExecucao(id)))]} : {}),
    };
}

/** Reconstrói o estado só com os campos conhecidos, sem duplicar raiz. */
function sanear(bruto: unknown): AbasDoCockpit {
    if (!bruto || typeof bruto !== 'object' || !Array.isArray((bruto as AbasDoCockpit).abas)) return ABAS_VAZIAS;
    const vistas = new Set<string>();
    const abas: EstadoDaAba[] = [];
    for (const item of (bruto as AbasDoCockpit).abas) {
        const aba = sanearAba(item);
        if (!aba || vistas.has(aba.rootId)) continue;
        vistas.add(aba.rootId);
        abas.push(aba);
    }
    const ativa = (bruto as AbasDoCockpit).ativa;
    return { abas, ativa: typeof ativa === 'string' && vistas.has(ativa) ? ativa : abas[0]?.rootId ?? null };
}

export function lerAbas(userId: string, storage: Storage | null = storagePadrao()): AbasDoCockpit {
    if (!storage) return ABAS_VAZIAS;
    try {
        const texto = storage.getItem(chaveDasAbas(userId));
        return texto ? sanear(JSON.parse(texto)) : ABAS_VAZIAS;
    } catch {
        return ABAS_VAZIAS;
    }
}

/** Grava; devolve `false` quando o storage recusa (cota, bloqueio), sem lançar. */
export function gravarAbas(userId: string, estado: AbasDoCockpit, storage: Storage | null = storagePadrao()): boolean {
    if (!storage) return false;
    try {
        storage.setItem(chaveDasAbas(userId), JSON.stringify(sanear(estado)));
        return true;
    } catch {
        return false;
    }
}

function novaAba(rootId: string): EstadoDaAba {
    return { rootId, no: null, aba: null, scrollDaConversa: 0, filtroDeCard: null };
}

/**
 * Abre a raiz numa aba nova, ou foca a que já existe — nunca duas abas da mesma
 * raiz. `parcial` atualiza o estado da aba (o nó e a aba vindos da URL).
 */
export function abrirAba(
    estado: AbasDoCockpit,
    rootId: string,
    parcial: Partial<Omit<EstadoDaAba, 'rootId'>> = {},
): AbasDoCockpit {
    const existe = estado.abas.some((a) => a.rootId === rootId);
    const abas = existe
        ? estado.abas.map((a) => (a.rootId === rootId ? { ...a, ...parcial } : a))
        : [...estado.abas, { ...novaAba(rootId), ...parcial }];
    return { abas, ativa: rootId };
}

export function atualizarAba(
    estado: AbasDoCockpit,
    rootId: string,
    parcial: Partial<Omit<EstadoDaAba, 'rootId'>>,
): AbasDoCockpit {
    if (!estado.abas.some((a) => a.rootId === rootId)) return estado;
    return { ...estado, abas: estado.abas.map((a) => (a.rootId === rootId ? { ...a, ...parcial } : a)) };
}

/**
 * Fecha a aba. É só tela: a execução continua onde estava (fechar não cancela).
 * Fechar a ativa passa o foco à vizinha da direita, ou à da esquerda na última.
 * Serve também para tirar da barra a raiz que respondeu 404.
 */
export function fecharAba(estado: AbasDoCockpit, rootId: string): AbasDoCockpit {
    const indice = estado.abas.findIndex((a) => a.rootId === rootId);
    if (indice === -1) return estado;
    const abas = estado.abas.filter((a) => a.rootId !== rootId);
    if (estado.ativa !== rootId) return { abas, ativa: estado.ativa };
    const vizinha = abas[indice] ?? abas[indice - 1] ?? null;
    return { abas, ativa: vizinha?.rootId ?? null };
}


/** Read receipts are discarded on logout/account switch; layout can survive. */
export function limparLeituras(userId: string, storage: Storage | null = storagePadrao()): void {
    if (!storage) return;
    const estado = lerAbas(userId,storage);
    gravarAbas(userId,{...estado,abas:estado.abas.map(({leituras: _leituras,...aba}) => aba)},storage);
}
