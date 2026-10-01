/** Transporte do Neuron v2: JWT, corpo do C6, grant (C2.4) e reenvio no grant vencido. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'jwt-da-sessao' } } })) } },
}));
vi.mock('@/services/client', () => ({
  api: { post: vi.fn(), get: vi.fn() },
  AGENT_URL: 'http://neuron.test',
}));

import { api } from '@/services/client';
import { createMessage, descartarGrant, obterGrant, streamChat, type PedidoAoNeuron } from './chats';

const CHAT = 'c0c0c0c0-0000-4000-8000-000000000001';
const daqui = (min: number) => new Date(Date.now() + min * 60_000).toISOString();

const grant = (id: string, perfil = 'project_chat', minutos = 30) => ({
  data: { grant_id: id, valid_until: daqui(minutos), perfil, capabilities: ['context:read'], snaps_db: false },
});

const sse = (...eventos: object[]) =>
  new Response(eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''), {
    status: 200, headers: { 'content-type': 'text/event-stream' },
  });

const PEDIDO: PedidoAoNeuron = {
  projectId: '7d17a48e-5615-4c90-9602-531f1b5a603d', chatId: CHAT, perfil: 'project_chat', superficie: 'chat', message: 'Oi',
};

beforeEach(() => {
  vi.mocked(api.post).mockReset();
  descartarGrant(CHAT);
});

describe('grant do chat', () => {
  it('pede o grant com o perfil e reaproveita enquanto faltar mais de 5 minutos', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(grant('g1')).mockResolvedValueOnce(grant('g2'));
    expect((await obterGrant(CHAT, 'project_chat')).grant_id).toBe('g1');
    expect((await obterGrant(CHAT, 'project_chat')).grant_id).toBe('g1');
    expect(api.post).toHaveBeenCalledWith(`/api/chats/${CHAT}/work-grant`, { perfil: 'project_chat' });
    // 26 minutos depois faltam 4: renova
    expect((await obterGrant(CHAT, 'project_chat', Date.now() + 26 * 60_000)).grant_id).toBe('g2');
  });

  it('trocar de perfil pede um grant novo', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(grant('g1')).mockResolvedValueOnce(grant('g2', 'orchestrator'));
    await obterGrant(CHAT, 'project_chat');
    const novo = await obterGrant(CHAT, 'orchestrator');
    expect(novo.grant_id).toBe('g2');
    expect(api.post).toHaveBeenLastCalledWith(`/api/chats/${CHAT}/work-grant`, { perfil: 'orchestrator' });
  });
});

describe('streamChat', () => {
  it('envia Authorization e o corpo do C6', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(grant('g1'));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse({ type: 'token', content: 'Olá' }));
    const eventos: unknown[] = [];
    await streamChat(PEDIDO, (e) => eventos.push(e));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://neuron.test/chat');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer jwt-da-sessao');
    expect(JSON.parse(init!.body as string)).toEqual({ ...PEDIDO, grantId: 'g1' });
    expect(eventos).toEqual([{ type: 'token', content: 'Olá' }]);
  });

  it('em grant_expired renova o grant e reenvia uma vez, sem mostrar o erro', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(grant('velho')).mockResolvedValueOnce(grant('novo'));
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(sse({ type: 'error', code: 'grant_expired', message: 'venceu' }))
      .mockResolvedValueOnce(sse({ type: 'token', content: 'ok' }));
    const eventos: unknown[] = [];
    await streamChat(PEDIDO, (e) => eventos.push(e));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string).grantId).toBe('novo');
    expect(eventos).toEqual([{ type: 'token', content: 'ok' }]);
  });

  it('401 do Neuron vira mensagem de sessão expirada', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(grant('g1'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(streamChat(PEDIDO, () => {})).rejects.toThrow('Sua sessão expirou');
  });
});

describe('createMessage', () => {
  it('grava o perfil e os snaps referenciados em tool_calls', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    await createMessage(CHAT, 'resposta', 'assistant', [{ perfil: 'orchestrator', snaps_referenciados: ['s1'] }]);
    expect(api.post).toHaveBeenCalledWith(`/chats/${CHAT}/messages/`, {
      chat_id: CHAT, content: 'resposta', role: 'assistant',
      tool_calls: [{ perfil: 'orchestrator', snaps_referenciados: ['s1'] }],
    });
  });
});
