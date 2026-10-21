/** Fundação do cache (ADR-0071): política do cliente e limpeza por sessão. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOutMock = vi.fn();
vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { signOut: (...args: unknown[]) => signOutMock(...args) } },
}));

import { consultaCliente, criarConsultaCliente, vincularCacheASessao } from '@/services/consultaCliente';
import { signOut } from '@/services/auth.service';

beforeEach(() => {
    signOutMock.mockReset();
    consultaCliente.clear();
});

describe('criarConsultaCliente', () => {
    it('aplica a política da ADR-0071', () => {
        const padroes = criarConsultaCliente().getDefaultOptions().queries;
        expect(padroes).toMatchObject({
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
            gcTime: 600_000,
        });
    });

    it('sobrescrever troca só o que foi pedido', () => {
        const padroes = criarConsultaCliente({ retry: false }).getDefaultOptions().queries;
        expect(padroes).toMatchObject({ retry: false, staleTime: 30_000, gcTime: 600_000 });
    });

    it('nenhum refetchInterval global: frescor é por evento, não por relógio', () => {
        expect(criarConsultaCliente().getDefaultOptions().queries).not.toHaveProperty('refetchInterval');
    });
});

/** Inscrição falsa: devolve um `emitir` para simular os eventos do Supabase. */
function sessaoFalsa() {
    let callback: ((usuario: { id: string } | null) => void) | undefined;
    const unsubscribe = vi.fn();
    const assinar = (cb: (usuario: { id: string } | null) => void) => {
        callback = cb;
        return { data: { subscription: { unsubscribe } } };
    };
    return { assinar, unsubscribe, emitir: (usuario: { id: string } | null) => callback!(usuario) };
}

function clienteComDado() {
    const cliente = criarConsultaCliente();
    cliente.setQueryData(['execucao', 'e1', 'snapshot'], { segredo: 'do projeto A' });
    return cliente;
}

describe('vincularCacheASessao', () => {
    it('a primeira notícia da sessão não apaga nada', () => {
        const cliente = clienteComDado();
        const sessao = sessaoFalsa();
        vincularCacheASessao(cliente, sessao.assinar);
        sessao.emitir({ id: 'u1' });
        expect(cliente.getQueryData(['execucao', 'e1', 'snapshot'])).toBeDefined();
    });

    it('renovar o token (mesmo usuário) não apaga o cache', () => {
        const cliente = clienteComDado();
        const sessao = sessaoFalsa();
        vincularCacheASessao(cliente, sessao.assinar);
        sessao.emitir({ id: 'u1' });
        sessao.emitir({ id: 'u1' });
        expect(cliente.getQueryData(['execucao', 'e1', 'snapshot'])).toBeDefined();
    });

    it('logout (usuário vira null) limpa o cache', () => {
        const cliente = clienteComDado();
        const sessao = sessaoFalsa();
        vincularCacheASessao(cliente, sessao.assinar);
        sessao.emitir({ id: 'u1' });
        sessao.emitir(null);
        expect(cliente.getQueryCache().getAll()).toHaveLength(0);
    });

    it('troca de conta sem logout limpa o cache', () => {
        const cliente = clienteComDado();
        const sessao = sessaoFalsa();
        vincularCacheASessao(cliente, sessao.assinar);
        sessao.emitir({ id: 'u1' });
        sessao.emitir({ id: 'u2' });
        expect(cliente.getQueryCache().getAll()).toHaveLength(0);
    });

    it('devolve a função que cancela a inscrição', () => {
        const sessao = sessaoFalsa();
        const cancelar = vincularCacheASessao(criarConsultaCliente(), sessao.assinar);
        cancelar();
        expect(sessao.unsubscribe).toHaveBeenCalledOnce();
    });
});

describe('signOut', () => {
    it('o logout limpa o cache do app', async () => {
        signOutMock.mockResolvedValue({ error: null });
        consultaCliente.setQueryData(['raiz', 'r1', 'arvore'], { nos: 20 });

        await signOut();

        expect(consultaCliente.getQueryCache().getAll()).toHaveLength(0);
    });

    it('limpa o cache mesmo quando o servidor recusa o signOut', async () => {
        signOutMock.mockResolvedValue({ error: new Error('rede') });
        consultaCliente.setQueryData(['raiz', 'r1', 'arvore'], { nos: 20 });

        await expect(signOut()).rejects.toThrow('rede');

        expect(consultaCliente.getQueryCache().getAll()).toHaveLength(0);
    });
});
