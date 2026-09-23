import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));

import { conectarStreamDeExecucao, ParserSSE, StreamRecusado } from './executionStream';

const frame = (seq: number, nome = 'execution_status_changed') =>
    `id: ${seq}\nevent: ${nome}\ndata: ${JSON.stringify({ name: nome, seq, payload: {} })}\n\n`;

function respostaDe(pedacos: string[], status = 200): Response {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const p of pedacos) controller.enqueue(encoder.encode(p));
            controller.close();
        },
    });
    return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

describe('ParserSSE', () => {
    it('monta blocos partidos em qualquer ponto e ignora heartbeat', () => {
        const parser = new ParserSSE();
        const texto = `retry: 2000\n\n: ping\n\n${frame(3)}${frame(7)}`;
        const blocos = [...texto].flatMap((c) => parser.empurrar(c));
        expect(blocos.filter((b) => b.id).map((b) => b.id)).toEqual(['3', '7']);
        expect(blocos.find((b) => b.retry)?.retry).toBe(2000);
    });
});

describe('conectarStreamDeExecucao', () => {
    it('envia token e Last-Event-ID no cabeçalho, nunca na URL', async () => {
        const fetchImpl = vi.fn(async () => respostaDe([frame(5)]));
        const eventos: number[] = [];
        await conectarStreamDeExecucao('exec-1', {
            lastEventId: 4,
            onEvento: (e) => eventos.push(e.id),
            fetchImpl: fetchImpl as unknown as typeof fetch,
            token: async () => 'jwt',
        });
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toMatch(/\/api\/agent-executions\/exec-1\/stream$/);
        expect(url).not.toContain('jwt');
        expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt', 'Last-Event-ID': '4' });
        expect(eventos).toEqual([5]);
    });

    it('recusa HTTP vira StreamRecusado com o status', async () => {
        const fetchImpl = vi.fn(async () => new Response('no', { status: 403 }));
        await expect(conectarStreamDeExecucao('x', {
            onEvento: () => {},
            fetchImpl: fetchImpl as unknown as typeof fetch,
            token: async () => null,
        })).rejects.toEqual(new StreamRecusado(403));
    });
});
