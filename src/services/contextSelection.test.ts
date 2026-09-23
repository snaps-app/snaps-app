import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/services/client';
import { getExecutionContextSelection, listasSemItem, type ItemDeContexto } from '@/services/contextSelection';

vi.mock('@/services/client', () => ({
    api: { get: vi.fn() },
}));

describe('selecao de contexto (E5-e)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('le a selecao pela rota de revisao da execucao', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { execution_id: 'e' } });

        await getExecutionContextSelection('e');

        expect(api.get).toHaveBeenCalledWith('/api/agent-executions/e/context-selection');
    });

    it('remover um item manda para o sync as listas completas sem ele', () => {
        const descoberta: ItemDeContexto[] = [
            { tipo: 'governance_doc', id: 'd1', origem: 'neuron' },
            { tipo: 'governance_doc', id: 'd2', origem: 'humano' },
            { tipo: 'decision', id: 'a1', origem: 'herdado' },
            { tipo: 'test_plan', id: 't1', origem: 'herdado' },
        ];

        expect(listasSemItem(descoberta, { tipo: 'governance_doc', id: 'd1' })).toEqual({
            docIds: ['d2'], decisionIds: ['a1'], testPlanIds: ['t1'],
        });
        // Lista vazia (e nao ausente) e o que faz o sync remover o ultimo item.
        expect(listasSemItem(descoberta, { tipo: 'decision', id: 'a1' }).decisionIds).toEqual([]);
    });
});
