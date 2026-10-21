import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { novoClienteDeTeste } from '@/test/comConsulta';
import { invalidarPorEvento } from '@/app/components/cockpit/superficie/invalidarPorEvento';

vi.mock('./client', () => ({ api: { get: vi.fn() } }));

import { api } from './client';
import { chavesDeConsulta as chaves } from './chavesDeConsulta';
import { shaConhecido, useArquivosDaPr } from './arquivosDePr';

const resposta = (sha: string, arquivo: string, fixado = false) => ({
    data: {
        repo: 'snaps-api', pr_number: 7, pr_url: null, head_sha: sha, fixado, truncado: false,
        arquivos: [{ caminho: arquivo, status: 'modified', adicoes: 1, remocoes: 0 }],
    },
});

function montar(cliente = novoClienteDeTeste()) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    );
    const hook = renderHook(() => useArquivosDaPr('no', 'snaps-api', true), { wrapper });
    return { cliente, ...hook };
}

const commitNaPr = { name: 'side_effect_receipt', execution_id: 'no', payload: { provider: 'github', operation: 'commit' } };

beforeEach(() => vi.mocked(api.get).mockReset());

describe('useArquivosDaPr — a lista é guardada pelo commit', () => {
    it('commit novo na PR leva a outra chave e a outra busca, e a lista velha não fica', async () => {
        vi.mocked(api.get)
            .mockResolvedValueOnce(resposta('aaaaaaa', 'a.py'))
            .mockResolvedValueOnce(resposta('bbbbbbb', 'b.py'));
        const { cliente, result } = montar();

        await waitFor(() => expect(result.current.data?.head_sha).toBe('aaaaaaa'));
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(cliente.getQueryData(chaves.prs('no', 'snaps-api', 'aaaaaaa'))).toBeDefined();

        await invalidarPorEvento(cliente, commitNaPr, { rootId: 'raiz' });

        await waitFor(() => expect(result.current.data?.head_sha).toBe('bbbbbbb'));
        expect(api.get).toHaveBeenCalledTimes(2);
        expect(result.current.data?.arquivos.map((a) => a.caminho)).toEqual(['b.py']);
        // Outra chave: o commit novo não sobrescreve o antigo, e a tela deixou de usar a velha.
        expect((cliente.getQueryData(chaves.prs('no', 'snaps-api', 'bbbbbbb')) as any).arquivos[0].caminho).toBe('b.py');
        expect((cliente.getQueryData(chaves.prs('no', 'snaps-api', 'aaaaaaa')) as any).arquivos[0].caminho).toBe('a.py');
        // A troca de chave não pediu de novo o que acabara de chegar.
        await waitFor(() => expect(result.current.isFetching).toBe(false));
        expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('nó concluído reaberto não faz nova chamada', async () => {
        vi.mocked(api.get).mockResolvedValue(resposta('ccccccc', 'c.py', true));
        const primeira = montar();
        await waitFor(() => expect(primeira.result.current.data?.fixado).toBe(true));
        expect(api.get).toHaveBeenCalledTimes(1);
        primeira.unmount();

        const reaberta = montar(primeira.cliente);

        await waitFor(() => expect(reaberta.result.current.data?.head_sha).toBe('ccccccc'));
        expect(reaberta.result.current.isFetching).toBe(false);
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('com o snapshot do nó em cache, a chave já nasce com o SHA gravado no pr_heads_captured', async () => {
        vi.mocked(api.get).mockResolvedValue(resposta('ddddddd', 'd.py', true));
        const cliente = novoClienteDeTeste();
        cliente.setQueryData(chaves.snapshot('no'), { prs: [{ repo: 'snaps-api', pr_number: 7, head_sha: 'ddddddd' }] });

        const { result } = montar(cliente);

        await waitFor(() => expect(result.current.data?.head_sha).toBe('ddddddd'));
        expect(cliente.getQueryCache().find({ queryKey: chaves.prs('no', 'snaps-api', 'ddddddd') })).toBeDefined();
        expect(cliente.getQueryCache().find({ queryKey: chaves.prs('no', 'snaps-api', '') })).toBeUndefined();
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('sem nenhum SHA conhecido, shaConhecido devolve null (nenhuma chamada para descobrir)', () => {
        expect(shaConhecido(novoClienteDeTeste(), 'no', 'snaps-api')).toBeNull();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('nenhuma consulta periódica: sem evento, a lista de um nó ativo não é pedida de novo sozinha', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            vi.mocked(api.get).mockResolvedValue(resposta('eeeeeee', 'e.py'));
            const { result } = montar();
            await waitFor(() => expect(result.current.data?.head_sha).toBe('eeeeeee'));

            await vi.advanceTimersByTimeAsync(10 * 60_000);

            expect(api.get).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
