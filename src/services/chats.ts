import { api, AGENT_URL } from './client';
import { supabase } from '@/lib/supabaseClient';
import { lerSSE, type EventoNeuron } from './neuronEvents';
import type { Chat, Message } from './types';

export const createChat = async (projectId: string, title: string): Promise<Chat> => {
    const response = await api.post(`/projects/${projectId}/chats/`, { project_id: projectId, title });
    return response.data;
};

export const listChats = async (projectId: string): Promise<Chat[]> => {
    const response = await api.get(`/projects/${projectId}/chats/`);
    return response.data;
};

export const getChatHistory = async (chatId: string): Promise<Message[]> => {
    const response = await api.get(`/chats/${chatId}/history`);
    return response.data;
};

/** `tool_calls` guarda o perfil que respondeu e os snaps referenciados (SNA-RD-189). */
export interface RegistroDoTurno {
    perfil: PerfilNeuron;
    snaps_referenciados: string[];
}

export const createMessage = async (
    chatId: string,
    content: string,
    role: 'user' | 'assistant' = 'user',
    toolCalls?: RegistroDoTurno[],
): Promise<Message> => {
    const corpo: Record<string, unknown> = { chat_id: chatId, content, role };
    if (toolCalls) corpo.tool_calls = toolCalls;
    const response = await api.post(`/chats/${chatId}/messages/`, corpo);
    return response.data;
};

// --- Neuron v2 (C2.4 e C6) ---

export type PerfilNeuron = 'project_chat' | 'board_planner' | 'orchestrator';
export type SuperficieNeuron = 'chat' | 'board_planner';

export interface GrantDeChat {
    grant_id: string;
    valid_until: string;
    perfil: PerfilNeuron;
    capabilities: string[];
    snaps_db: boolean;
}

/** O app renova o grant quando faltam menos de 5 minutos (C2.4). */
export const MARGEM_RENOVACAO_MS = 5 * 60 * 1000;

const grants = new Map<string, GrantDeChat>();

export const pedirGrantDeChat = async (chatId: string, perfil: PerfilNeuron): Promise<GrantDeChat> => {
    const response = await api.post(`/api/chats/${chatId}/work-grant`, { perfil });
    return response.data;
};

/**
 * Um grant por chat. Trocar de perfil pede outro (o servidor revoga o
 * anterior); o mesmo perfil reaproveita enquanto faltar mais de 5 minutos.
 */
export const obterGrant = async (chatId: string, perfil: PerfilNeuron, agora: number = Date.now()): Promise<GrantDeChat> => {
    const atual = grants.get(chatId);
    if (atual && atual.perfil === perfil && new Date(atual.valid_until).getTime() - agora > MARGEM_RENOVACAO_MS) {
        return atual;
    }
    const novo = await pedirGrantDeChat(chatId, perfil);
    grants.set(chatId, novo);
    return novo;
};

export const descartarGrant = (chatId: string) => {
    grants.delete(chatId);
};

export interface PedidoAoNeuron {
    projectId: string;
    chatId: string;
    perfil: PerfilNeuron;
    superficie: SuperficieNeuron;
    message: string;
}

const SESSAO_EXPIRADA = 'Sua sessão expirou. Entre novamente para continuar.';

const tokenDaSessao = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error(SESSAO_EXPIRADA);
    return token;
};

const umaChamada = async (pedido: PedidoAoNeuron, aoEvento: (e: EventoNeuron) => void) => {
    const [token, grant] = await Promise.all([tokenDaSessao(), obterGrant(pedido.chatId, pedido.perfil)]);
    const resposta = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...pedido, grantId: grant.grant_id }),
    });
    if (resposta.status === 401) throw new Error(SESSAO_EXPIRADA);
    if (!resposta.ok) {
        let detalhe: unknown = '';
        try {
            detalhe = (await resposta.json())?.detail ?? '';
        } catch {
            // corpo sem JSON
        }
        throw new Error(typeof detalhe === 'string' && detalhe ? detalhe : `O Neuron não respondeu (${resposta.status}).`);
    }
    if (resposta.body) await lerSSE(resposta.body, aoEvento);
};

/**
 * Conversa com o Neuron. Se o grant venceu, renova e reenvia uma vez: a
 * pergunta ja esta gravada, e o Neuron nao a duplica no historico (C6).
 */
export const streamChat = async (pedido: PedidoAoNeuron, aoEvento: (e: EventoNeuron) => void): Promise<void> => {
    let venceu = false;
    await umaChamada(pedido, (evento) => {
        if (evento.type === 'error' && evento.code === 'grant_expired') {
            venceu = true;
            return;
        }
        aoEvento(evento);
    });
    if (!venceu) return;
    descartarGrant(pedido.chatId);
    await umaChamada(pedido, aoEvento);
};
