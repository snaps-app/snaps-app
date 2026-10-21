import { describe, expect, it } from 'vitest';
import { abaDoEvento, abrirAba, registrarNovidade, totalDeNovidades } from './abaDoEvento';

describe('abaDoEvento', () => {
    it.each([
        ['plan_approved', 'plano'],
        ['plan_approval_invalidated', 'plano'],
        ['artifact_submitted', 'walkthroughs'],
        ['test_plan_verdict_recorded', 'testplans'],
        ['gate_evaluated', 'no'],
        ['override_authorized', 'no'],
        ['override_applied', 'no'],
        ['command_failed', 'atividade'],
        ['pr_heads_captured', 'prs'],
        ['request_created', 'no'],
        ['agent_question', 'no'],
        ['agent_answer', 'no'],
        ['phase_advanced', 'no'],
    ])('%s → %s', (nome, aba) => {
        expect(abaDoEvento({ name: nome })).toBe(aba);
    });

    it('commit, abrir e fundir a PR (recibo do GitHub) vão para PRs e CI; outro provedor não', () => {
        const recibo = (provider: string, operation: string) => ({
            name: 'side_effect_receipt', payload: { provider, operation, status: 'ok' },
        });
        expect(abaDoEvento(recibo('github', 'commit'))).toBe('prs');
        expect(abaDoEvento(recibo('github', 'create_pr'))).toBe('prs');
        expect(abaDoEvento(recibo('github', 'merge_pr'))).toBe('prs');
        expect(abaDoEvento(recibo('github', 'create_branch'))).toBeNull();
        expect(abaDoEvento(recibo('github_sync', 'commit'))).toBeNull();
        expect(abaDoEvento({ name: 'side_effect_receipt' })).toBeNull();
    });

    it('evento desconhecido não gera ponto', () => {
        expect(abaDoEvento({ name: 'evento_que_ninguem_conhece' })).toBeNull();
        expect(abaDoEvento({ name: '' })).toBeNull();
        expect(abaDoEvento(null)).toBeNull();
        expect(registrarNovidade({}, { name: 'evento_que_ninguem_conhece' }, 'plano')).toEqual({});
    });
});

describe('novidade por aba', () => {
    it('soma na aba do evento e não na aberta', () => {
        let n = registrarNovidade({}, { name: 'artifact_submitted' }, 'plano');
        n = registrarNovidade(n, { name: 'artifact_submitted' }, 'plano');
        n = registrarNovidade(n, { name: 'plan_approved' }, 'plano');
        expect(n).toEqual({ walkthroughs: 2 });
        expect(totalDeNovidades(n)).toBe(2);
    });

    it('o ponto some quando a aba abre, sem mexer nas outras', () => {
        const n = { walkthroughs: 2, atividade: 1 };
        expect(abrirAba(n, 'walkthroughs')).toEqual({ atividade: 1 });
        expect(n).toEqual({ walkthroughs: 2, atividade: 1 });
    });
});
