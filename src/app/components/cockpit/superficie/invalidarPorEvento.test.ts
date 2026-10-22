import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { aplicarSessaoAberta } from '@/services/resumoDoNo';
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
        ['phase_advanced', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'], ['raiz', 'raiz'], ['execucao', 'no', 'snapshot']]],
        ['execution_created', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'], ['raiz', 'raiz'], ['execucao', 'no', 'snapshot']]],
        ['phase_rolled_back', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'], ['raiz', 'raiz'], ['execucao', 'no', 'snapshot']]],
        ['execution_status_changed', [['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'no'], ['raiz', 'raiz'], ['execucao', 'no', 'snapshot']]],
        ['evento_desconhecido', [['execucao', 'no', 'resumo']]],
        ['execution_updated', [['execucao', 'no', 'resumo'], ['raiz', 'raiz', 'arvore'], ['execucao', 'no', 'snapshot']]],
        // Sessão de tempo: só a fonte do total da árvore (decisão do PO no ci_gate do TP-4).
        ['session_started', [['execucao', 'no', 'resumo']]],
        ['session_closed', [['execucao', 'no', 'resumo']]],
    ])('%s invalida exatamente as chaves esperadas', (nome, esperadas) => {
        expect(chavesDoEvento(ev(nome), ctx)).toEqual(esperadas);
    });

    it('evento da sessão deste navegador, já no total em cache, não invalida nada; o de outra pessoa invalida o resumo', async () => {
        const cliente = new QueryClient();
        aplicarSessaoAberta(cliente, 'no', { id: 's-propria', inicio: '2026-10-21T12:00:00Z' });
        const espiao = vi.spyOn(cliente, 'invalidateQueries');
        const sessao = (id: string) => ({ name: 'session_started', execution_id: 'no', payload: { session_id: id } });

        await invalidarPorEvento(cliente, sessao('s-propria'), ctx);
        expect(espiao).not.toHaveBeenCalled();

        await invalidarPorEvento(cliente, sessao('s-de-outra-pessoa'), ctx);
        expect(espiao.mock.calls.map(([filtro]) => filtro?.queryKey)).toEqual([['execucao', 'no', 'resumo']]);
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

    it('commit novo na PR invalida a lista de arquivos de todo SHA do nó, e só dele', async () => {
        const cliente = new QueryClient();
        for (const chave of [['execucao', 'no', 'prs', 'snaps-api', 'aaa'], ['execucao', 'no', 'prs', 'snaps-app', 'bbb'],
            ['execucao', 'outro', 'prs', 'snaps-api', 'aaa']]) {
            cliente.setQueryData(chave, { ok: true });
        }
        const commit = { name: 'side_effect_receipt', execution_id: 'no', payload: { provider: 'github', operation: 'commit' } };

        await invalidarPorEvento(cliente, commit, ctx);

        expect(chavesDoEvento(commit, ctx)).toEqual([
            ['execucao', 'no', 'resumo'], ['execucao', 'no', 'aba', 'prs'], ['execucao', 'no', 'prs'],
        ]);
        expect(cliente.getQueryState(['execucao', 'no', 'prs', 'snaps-api', 'aaa'])?.isInvalidated).toBe(true);
        expect(cliente.getQueryState(['execucao', 'no', 'prs', 'snaps-app', 'bbb'])?.isInvalidated).toBe(true);
        expect(cliente.getQueryState(['execucao', 'outro', 'prs', 'snaps-api', 'aaa'])?.isInvalidated).toBe(false);
    });

    it('o prefixo da raiz alcança a árvore e o rótulo da aba, e só os da raiz do evento', async () => {
        const cliente = new QueryClient();
        for (const chave of [['raiz', 'raiz', 'arvore'], ['raiz', 'raiz', 'rotulo'], ['raiz', 'outra', 'rotulo']]) {
            cliente.setQueryData(chave, { ok: true });
        }

        await invalidarPorEvento(cliente, ev('execution_status_changed'), ctx);

        expect(cliente.getQueryState(['raiz', 'raiz', 'arvore'])?.isInvalidated).toBe(true);
        expect(cliente.getQueryState(['raiz', 'raiz', 'rotulo'])?.isInvalidated).toBe(true);
        expect(cliente.getQueryState(['raiz', 'outra', 'rotulo'])?.isInvalidated).toBe(false);
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
