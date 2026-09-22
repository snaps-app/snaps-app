/**
 * Transporte SSE dos eventos de uma execução (TP-4 / E20).
 *
 * `GET /api/agent-executions/{id}/stream` responde `text/event-stream` com
 * `id: <seq>`, `event: <nome>`, `data: <json>`.
 *
 * Por que não o `EventSource` nativo: ele não envia cabeçalhos, e a API só
 * autentica por `Authorization: Bearer`. A alternativa seria o JWT na query
 * string — e aí ele vai parar no log de requisição do Cloud Run. Então este
 * módulo faz o que o `EventSource` faz (parse do protocolo, `Last-Event-ID`,
 * `retry:`) sobre `fetch`, com o token no cabeçalho.
 *
 * Uma conexão termina — o servidor encerra antes do timeout do Cloud Run — e
 * quem chama reconecta com o último `id`. Isso é o caminho normal.
 */
import { API_URL } from './client';
import { supabase } from '@/lib/supabaseClient';

export interface EventoDeExecucao {
    id: number;
    nome: string;
    dados: {
        name: string;
        seq: number;
        created_at: string | null;
        execution_id: string | null;
        payload: Record<string, unknown>;
        actor_kind: string | null;
    };
}

/** Erro HTTP de abertura: 4xx não se resolve reconectando. */
export class StreamRecusado extends Error {
    constructor(public status: number) {
        super(`stream recusado: HTTP ${status}`);
    }
}

export interface OpcoesConexao {
    lastEventId?: number | null;
    signal?: AbortSignal;
    onEvento: (evento: EventoDeExecucao) => void;
    onRetry?: (ms: number) => void;
    fetchImpl?: typeof fetch;
    token?: () => Promise<string | null>;
}

async function tokenDaSessao(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}

/** Parser incremental do protocolo SSE: recebe pedaços, devolve blocos completos. */
export class ParserSSE {
    private buffer = '';

    empurrar(pedaco: string): Array<{ id?: string; event?: string; data: string; retry?: number }> {
        this.buffer += pedaco.replace(/\r\n?/g, '\n');
        const blocos: Array<{ id?: string; event?: string; data: string; retry?: number }> = [];
        let fim: number;
        while ((fim = this.buffer.indexOf('\n\n')) >= 0) {
            const bloco = this.buffer.slice(0, fim);
            this.buffer = this.buffer.slice(fim + 2);
            const campos: { id?: string; event?: string; data: string; retry?: number } = { data: '' };
            const dados: string[] = [];
            for (const linha of bloco.split('\n')) {
                if (!linha || linha.startsWith(':')) continue; // heartbeat
                const sep = linha.indexOf(':');
                const chave = sep < 0 ? linha : linha.slice(0, sep);
                const valor = sep < 0 ? '' : linha.slice(sep + 1).replace(/^ /, '');
                if (chave === 'id') campos.id = valor;
                else if (chave === 'event') campos.event = valor;
                else if (chave === 'data') dados.push(valor);
                else if (chave === 'retry' && /^\d+$/.test(valor)) campos.retry = Number(valor);
            }
            campos.data = dados.join('\n');
            blocos.push(campos);
        }
        return blocos;
    }
}

/** Uma conexão. Resolve quando o servidor encerra; rejeita em erro de rede/HTTP. */
export async function conectarStreamDeExecucao(executionId: string, opcoes: OpcoesConexao): Promise<void> {
    const fetchImpl = opcoes.fetchImpl ?? fetch;
    const token = await (opcoes.token ?? tokenDaSessao)();
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opcoes.lastEventId != null) headers['Last-Event-ID'] = String(opcoes.lastEventId);

    const resposta = await fetchImpl(`${API_URL}/api/agent-executions/${executionId}/stream`, {
        headers,
        signal: opcoes.signal,
        cache: 'no-store',
    });
    if (!resposta.ok || !resposta.body) throw new StreamRecusado(resposta.status);

    const leitor = resposta.body.getReader();
    const decoder = new TextDecoder();
    const parser = new ParserSSE();
    for (;;) {
        const { value, done } = await leitor.read();
        if (done) return;
        for (const bloco of parser.empurrar(decoder.decode(value, { stream: true }))) {
            if (bloco.retry != null) opcoes.onRetry?.(bloco.retry);
            if (bloco.id == null || !bloco.data) continue;
            opcoes.onEvento({
                id: Number(bloco.id),
                nome: bloco.event ?? 'message',
                dados: JSON.parse(bloco.data),
            });
        }
    }
}
