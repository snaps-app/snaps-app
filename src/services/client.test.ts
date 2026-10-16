/**
 * 401 renova a sessao e reenvia uma vez antes de mandar para o login (SNA-SUP-84).
 * Antes, todo 401 virava `location.replace('/login')` -- o "app recarrega sozinho".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth } }));

import { api } from './client';

const sessao = (token: string, segundos = 3600) => ({
  access_token: token,
  expires_at: Math.floor(Date.now() / 1000) + segundos,
});

/** Responde 200 so para os tokens `aceitos`; qualquer outro Bearer leva 401. */
function servidor(...aceitos: string[]) {
  const vistos: string[] = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const bearer = String(config.headers.Authorization ?? '');
    vistos.push(bearer);
    const resposta = { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    if (aceitos.some((t) => bearer === `Bearer ${t}`)) return resposta;
    throw new AxiosError('401', 'ERR_BAD_REQUEST', config, null, { ...resposta, status: 401, statusText: 'Unauthorized' });
  };
  api.defaults.adapter = adapter;
  return vistos;
}

let replace: ReturnType<typeof vi.fn>;
let rodada = 0;

beforeEach(() => {
  auth.getSession.mockReset();
  auth.refreshSession.mockReset();
  replace = vi.fn();
  vi.stubGlobal('location', { ...window.location, pathname: '/project/p1/execution/e1', search: '?tab=log', replace });
  vi.useFakeTimers({ toFake: ['Date'] });
  // Cada teste parte sem sessao em cache: o relogio anda um minuto a mais que
  // no teste anterior, alem do TTL de 5 s do cache do modulo.
  vi.setSystemTime(Date.now() + 60_000 * ++rodada);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('401 no client HTTP', () => {
  it('renova a sessao e reenvia uma vez, sem ir para o login', async () => {
    auth.getSession.mockResolvedValue({ data: { session: sessao('velho') } });
    auth.refreshSession.mockResolvedValue({ data: { session: sessao('novo') }, error: null });
    const vistos = servidor('novo');

    const resposta = await api.get('/x');

    expect(resposta.data).toEqual({ ok: true });
    expect(vistos).toEqual(['Bearer velho', 'Bearer novo']);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('reenvio tambem recusado: um retry so, depois login com next', async () => {
    auth.getSession.mockResolvedValue({ data: { session: sessao('velho') } });
    auth.refreshSession.mockResolvedValue({ data: { session: sessao('novo') }, error: null });
    const vistos = servidor('nenhum');

    await expect(api.get('/x')).rejects.toThrow('Sua sessao expirou');

    expect(vistos).toHaveLength(2);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/login?next=%2Fproject%2Fp1%2Fexecution%2Fe1%3Ftab%3Dlog');
  });

  it('refresh falhou de verdade: vai para o login sem reenviar', async () => {
    auth.getSession.mockResolvedValue({ data: { session: sessao('velho') } });
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('Invalid Refresh Token') });
    const vistos = servidor('novo');

    await expect(api.get('/x')).rejects.toThrow('Sua sessao expirou');

    expect(vistos).toEqual(['Bearer velho']);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('401 simultaneos fazem um refresh so', async () => {
    auth.getSession.mockResolvedValue({ data: { session: sessao('velho') } });
    auth.refreshSession.mockResolvedValue({ data: { session: sessao('novo') }, error: null });
    servidor('novo');

    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('nao reaproveita do cache um token a menos de 1 minuto de vencer', async () => {
    auth.getSession
      .mockResolvedValueOnce({ data: { session: sessao('quase-vencido', 30) } })
      .mockResolvedValueOnce({ data: { session: sessao('renovado') } });
    const vistos = servidor('quase-vencido', 'renovado');

    await api.get('/a');
    await api.get('/b');

    expect(auth.getSession).toHaveBeenCalledTimes(2);
    expect(vistos).toEqual(['Bearer quase-vencido', 'Bearer renovado']);
  });
});
