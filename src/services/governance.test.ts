/**
 * Compare-and-swap nas escritas de governanca (card E18 / TP-6).
 *
 * A tela salvava mandando so os campos editados. Duas pessoas -- ou uma pessoa e
 * um agente -- com o mesmo documento aberto, e a segunda gravacao apagava a
 * primeira em silencio. Estas funcoes existem para que a versao que a tela LEU
 * viaje junto com a escrita, e para que a recusa chegue a interface como algo
 * acionavel em vez de um erro generico.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  API_URL: 'http://api.test',
}));

import { api } from '@/services/client';
import {
  updateGovernanceDoc,
  updateAgent,
  updateSkill,
  VersionConflictError,
} from '@/services/governance';

const DOC = 'd1d1d1d1-1111-4111-8111-aaaaaaaaaaaa';

beforeEach(() => vi.clearAllMocks());

describe('a versao lida viaja com a escrita', () => {
  it('manda expected_lock_version quando a tela a conhece', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: DOC, lock_version: 8 } });

    await updateGovernanceDoc(DOC, { content: 'novo' }, 7);

    expect(api.patch).toHaveBeenCalledWith(`/governance-docs/${DOC}`, {
      content: 'novo',
      expected_lock_version: 7,
    });
  });

  it('omite o campo quando a tela ainda nao a conhece', async () => {
    // Transicao em expansao: uma tela que ainda nao le a versao continua
    // salvando. Mandar `undefined` explicito seria diferente de omitir -- o
    // backend leria como "sem versao" de todo jeito, mas o corpo carregaria uma
    // chave que nao significa nada.
    vi.mocked(api.patch).mockResolvedValue({ data: { id: DOC } });

    await updateGovernanceDoc(DOC, { content: 'novo' });

    expect(api.patch).toHaveBeenCalledWith(`/governance-docs/${DOC}`, {
      content: 'novo',
    });
  });

  it('vale igual para agents e skills', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    await updateAgent('a1', { instructions: 'x' }, 3);
    await updateSkill('s1', { content: 'y' }, 4);

    expect(api.patch).toHaveBeenNthCalledWith(1, '/agents/a1', {
      instructions: 'x',
      expected_lock_version: 3,
    });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/skills/s1', {
      content: 'y',
      expected_lock_version: 4,
    });
  });
});

describe('a recusa chega utilizavel na tela', () => {
  it('traduz 409 em VersionConflictError com os numeros', async () => {
    vi.mocked(api.patch).mockRejectedValue({
      response: {
        status: 409,
        data: {
          detail: 'conflito de versao: voce escreveu com base na versao 7...',
          expected_lock_version: 7,
          current_lock_version: 9,
          last_modified_by: 'unknown (mcp)',
          last_modified_at: '2026-08-31T12:00:00Z',
        },
      },
    });

    const erro = await updateGovernanceDoc(DOC, { content: 'x' }, 7).catch(e => e);

    expect(erro).toBeInstanceOf(VersionConflictError);
    expect(erro.expectedLockVersion).toBe(7);
    expect(erro.currentLockVersion).toBe(9);
    expect(erro.lastModifiedBy).toBe('unknown (mcp)');
    // A mensagem tem de nomear as versoes: um "conflito" sozinho faz o usuario
    // apertar Salvar de novo, sobre a mesma base velha.
    expect(erro.message).toContain('versao 7');
  });

  it('tem mensagem legivel mesmo se o corpo vier vazio', async () => {
    vi.mocked(api.patch).mockRejectedValue({ response: { status: 409, data: null } });

    const erro = await updateGovernanceDoc(DOC, { content: 'x' }, 1).catch(e => e);

    expect(erro).toBeInstanceOf(VersionConflictError);
    expect(erro.message).toMatch(/alterado por outra pessoa/);
  });

  it('nao transforma outros erros em conflito', async () => {
    // Um 500 e "tente de novo"; um 409 e "recarregue e reaplique". Confundi-los
    // mandaria o usuario ao caminho errado nos dois sentidos.
    vi.mocked(api.patch).mockRejectedValue({ response: { status: 500, data: {} } });

    const erro = await updateGovernanceDoc(DOC, { content: 'x' }, 1).catch(e => e);

    expect(erro).not.toBeInstanceOf(VersionConflictError);
  });
});
