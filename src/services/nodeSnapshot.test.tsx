/**
 * Consultas do History e da aba Nó (ADR-0071): nó terminal fica em cache até a
 * página recarregar, e as chaves são as de `chavesDeConsulta`.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';

vi.mock('@/services/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/services/client';
import { chavesDeConsulta } from '@/services/chavesDeConsulta';
import { renderComConsulta, novoClienteDeTeste } from '@/test/comConsulta';
import { getArvore, useArvore, useNodeSnapshot, useStatusDaApi } from './nodeSnapshot';
import type { ArvoreLeve } from './types';

function Snapshot({ id, terminal }: { id: string; terminal: boolean }) {
    const { data } = useNodeSnapshot(id, terminal);
    return <p>{data ? `fase ${data.phase}` : 'carregando'}</p>;
}

function Arvore({ rootId }: { rootId: string | null }) {
    const { data, fetchStatus } = useArvore(rootId);
    return <p>{data ? `${data.nos.length} nós` : fetchStatus}</p>;
}

function Status() {
    const { data } = useStatusDaApi();
    return <p>{data ? data.terminais.join(',') : 'carregando'}</p>;
}

beforeEach(() => vi.mocked(api.get).mockReset());

describe('useNodeSnapshot', () => {
    it('nó terminal: remontar não refaz a chamada', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { phase: 'micro_planning', imutavel: true } });
        const cliente = novoClienteDeTeste();

        const primeira = renderComConsulta(<Snapshot id="n1" terminal />, { cliente });
        expect(await screen.findByText('fase micro_planning')).toBeInTheDocument();
        primeira.unmount();

        renderComConsulta(<Snapshot id="n1" terminal />, { cliente });
        expect(await screen.findByText('fase micro_planning')).toBeInTheDocument();

        expect(api.get).toHaveBeenCalledOnce();
        expect(api.get).toHaveBeenCalledWith('/api/agent-executions/n1/node-snapshot');
        const consulta = cliente.getQueryCache().find({ queryKey: chavesDeConsulta.snapshot('n1') });
        expect(consulta?.isStale()).toBe(false);
    });

    it('nó que terminou depois de visto: o snapshot de quando era atual não congela', async () => {
        vi.mocked(api.get)
            .mockResolvedValueOnce({ data: { phase: 'execution', imutavel: false } })
            .mockResolvedValue({ data: { phase: 'execution', imutavel: true } });
        const cliente = novoClienteDeTeste();

        const atual = renderComConsulta(<Snapshot id="n3" terminal={false} />, { cliente });
        await screen.findByText('fase execution');
        atual.unmount();

        // O nó avançou: a tela passa `terminal`, e o cache ainda é o de antes.
        const terminou = renderComConsulta(<Snapshot id="n3" terminal />, { cliente });
        await vi.waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
        await vi.waitFor(() =>
            expect(cliente.getQueryData<{ imutavel: boolean }>(chavesDeConsulta.snapshot('n3'))?.imutavel).toBe(true));
        terminou.unmount();

        renderComConsulta(<Snapshot id="n3" terminal />, { cliente });
        await screen.findByText('fase execution');
        expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('nó atual usa o padrão do app, não Infinity', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { phase: 'execution' } });
        const cliente = novoClienteDeTeste();
        renderComConsulta(<Snapshot id="n2" terminal={false} />, { cliente });
        await screen.findByText('fase execution');
        const consulta = cliente.getQueryCache().find({ queryKey: chavesDeConsulta.snapshot('n2') });
        expect((consulta?.options as { staleTime?: number }).staleTime).not.toBe(Infinity);
    });
});

describe('useArvore', () => {
    it('lê a rota leve com a chave da raiz', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { root_id: 'r', nos: [{}, {}], workflows: {} } });
        const cliente = novoClienteDeTeste();
        renderComConsulta(<Arvore rootId="r" />, { cliente });
        expect(await screen.findByText('2 nós')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/agent-executions/r/arvore');
        expect(cliente.getQueryData(chavesDeConsulta.arvore('r'))).toBeTruthy();
    });

    it('frescor por evento, não por idade: remontar não busca de novo (staleTime Infinity)', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { root_id: 'r', nos: [{}], workflows: {} } });
        const cliente = novoClienteDeTeste();
        const primeira = renderComConsulta(<Arvore rootId="r" />, { cliente });
        await screen.findByText('1 nós');
        primeira.unmount();
        renderComConsulta(<Arvore rootId="r" />, { cliente });
        await screen.findByText('1 nós');
        expect(api.get).toHaveBeenCalledOnce();
        expect(cliente.getQueryCache().find({ queryKey: chavesDeConsulta.arvore('r') })?.isStale()).toBe(false);
    });

    it('sem raiz não busca nada', () => {
        renderComConsulta(<Arvore rootId={null} />);
        expect(screen.getByText('idle')).toBeInTheDocument();
        expect(api.get).not.toHaveBeenCalled();
    });
});

describe('getArvore: If-None-Match e 304 (ADR-0071, 5b)', () => {
    const ANTERIOR: ArvoreLeve = { root_id: 'r', nos: [], workflows: {}, etag: '"e1"' };

    it('sem árvore anterior, pede sem cabeçalho e guarda o ETag da resposta com a árvore', async () => {
        vi.mocked(api.get).mockResolvedValue({ status: 200, data: { root_id: 'r', nos: [], workflows: {} }, headers: { etag: '"e1"' } });
        expect(await getArvore('r')).toEqual(ANTERIOR);
        expect(api.get).toHaveBeenCalledWith('/api/agent-executions/r/arvore');
    });

    it('com a anterior, manda If-None-Match; o 304 devolve a MESMA árvore (nada redesenha)', async () => {
        vi.mocked(api.get).mockResolvedValue({ status: 304, data: '', headers: { etag: '"e1"' } });
        expect(await getArvore('r', ANTERIOR)).toBe(ANTERIOR);
        expect(api.get).toHaveBeenCalledWith('/api/agent-executions/r/arvore', expect.objectContaining({
            headers: { 'If-None-Match': '"e1"' },
        }));
        const { validateStatus } = vi.mocked(api.get).mock.calls[0][1] as { validateStatus: (s: number) => boolean };
        expect([200, 304, 404].map(validateStatus)).toEqual([true, true, false]);
    });

    it('árvore mudou: 200 com a árvore e o ETag novos', async () => {
        vi.mocked(api.get).mockResolvedValue({ status: 200, data: { root_id: 'r', nos: [{ id: 'n' }], workflows: {} }, headers: { etag: '"e2"' } });
        const nova = await getArvore('r', ANTERIOR);
        expect(nova).not.toBe(ANTERIOR);
        expect(nova.etag).toBe('"e2"');
        expect(nova.nos).toHaveLength(1);
    });
});

describe('useStatusDaApi', () => {
    it('lê os terminais de phase-directives uma vez, sem cópia local', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { terminal_statuses: ['completed', 'done'], discarded_statuses: [] } });
        const cliente = novoClienteDeTeste();
        const a = renderComConsulta(<Status />, { cliente });
        expect(await screen.findByText('completed,done')).toBeInTheDocument();
        a.unmount();
        renderComConsulta(<Status />, { cliente });
        await screen.findByText('completed,done');
        expect(api.get).toHaveBeenCalledOnce();
        expect(api.get).toHaveBeenCalledWith('/workflow-templates/phase-directives');
    });
});
