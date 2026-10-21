import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { chavesDoEvento, invalidarPorEvento } from './invalidarPorEvento';

const ctx = { rootId: 'raiz' };
const ev = (name: string) => ({ name, execution_id: 'no' });

describe('invalidarPorEvento', () => {
    it.each([
        ['plan_approved', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'plano']]],
        ['artifact_submitted', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'walkthroughs']]],
        ['test_plan_verdict_recorded', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'testplans']]],
        ['gate_evaluated', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no']]],
        ['override_applied', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no']]],
        ['command_failed', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'atividade'], ['execucao', 'no', 'atividade']]],
        ['pr_heads_captured', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'prs'], ['execucao', 'no', 'prs']]],
        ['phase_advanced', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'], ['raiz', 'raiz', 'arvore'], ['execucao', 'no', 'snapshot']]],
        ['execution_created', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'], ['raiz', 'raiz', 'arvore'], ['execucao', 'no', 'snapshot']]],
        ['execution_status_changed', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'], ['raiz', 'raiz', 'arvore'], ['execucao', 'no', 'snapshot']]],
        ['evento_desconhecido', [['execucao', 'no', 'resumo']]],
    ])('%s invalida exatamente as chaves esperadas', (nome, esperadas) => {
        expect(chavesDoEvento(ev(nome), ctx)).toEqual(esperadas);
    });

    it('chama o cliente uma vez por chave e nunca sem chave', async () => {
        const cliente = new QueryClient();
        const espiao = vi.spyOn(cliente, 'invalidateQueries');

        await invalidarPorEvento(cliente, ev('phase_advanced'), ctx);
        await invalidarPorEvento(cliente, ev('evento_desconhecido'), ctx);

        expect(espiao).toHaveBeenCalledTimes(5);
        for (const [filtro] of espiao.mock.calls) {
            expect(filtro?.queryKey?.length).toBeGreaterThan(0);
        }
    });

    it('sem nó identificável, não invalida nada', () => {
        expect(chavesDoEvento({ name: 'plan_approved' }, ctx)).toEqual([]);
        expect(chavesDoEvento({ name: 'plan_approved' }, { ...ctx, executionId: 'x' })[0]).toEqual(['execucao', 'x', 'resumo']);
    });

    it('invalida só o nó do evento: o cache de outro nó fica intacto', async () => {
        const cliente = new QueryClient();
        cliente.setQueryData(['execucao', 'outro', 'resumo'], { ok: true });
        cliente.setQueryData(['execucao', 'no', 'resumo'], { ok: true });

        await invalidarPorEvento(cliente, ev('plan_approved'), ctx);

        expect(cliente.getQueryState(['execucao', 'outro', 'resumo'])?.isInvalidated).toBe(false);
        expect(cliente.getQueryState(['execucao', 'no', 'resumo'])?.isInvalidated).toBe(true);
    });
});
