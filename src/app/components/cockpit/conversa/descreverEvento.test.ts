/** Linhas da Conversa (P15; TP-4): conhecido, desconhecido, PR heads, E7 e nada sensível. */
import { describe, expect, it } from 'vitest';
import { descreverEvento } from './descreverEvento';

describe('descreverEvento', () => {
    it('evento conhecido vira texto, com os campos identificadores do payload', () => {
        expect(descreverEvento({ name: 'phase_advanced', payload: { from_phase: 'plan_review', to_phase: 'execution' } }))
            .toEqual({ texto: 'Fase avançou: plan_review → execution', tom: 'sucesso', conhecido: true });
        expect(descreverEvento({ name: 'gate_evaluated', payload: { gate: 'advance', result: 'failed', input_hash: 'abc' } }))
            .toMatchObject({ texto: 'Gate advance: recusado', tom: 'erro' });
    });

    it('pr_heads_captured mostra repo, número da PR e SHA curto', () => {
        const d = descreverEvento({
            name: 'pr_heads_captured',
            payload: { heads: [
                { repo: 'snaps-app', pr_number: 88, head_sha: 'b341d60f2e9a', motivo: null },
                { repo: 'snaps-api', pr_number: 546, head_sha: null, motivo: 'GitHub fora do ar: token xyz' },
            ] },
        });
        expect(d.texto).toBe('SHA do head registrado: snaps-app #88 · b341d60; snaps-api #546 · não capturado');
        expect(d.texto).not.toContain('token');
    });

    it('cobre os eventos do E7', () => {
        expect(descreverEvento({ name: 'request_pending', payload: { operation: 'rollback' } }).texto)
            .toBe('Pedido do Neuron esperando você: rollback');
        expect(descreverEvento({ name: 'execution_paused' }).texto).toBe('Nó pausado');
        expect(descreverEvento({ name: 'execution_resumed' }).texto).toBe('Nó retomado');
        expect(descreverEvento({ name: 'agent_question', payload: { pergunta: 'qual é a senha?' } }).texto).toBe('Pergunta ao agente');
        expect(descreverEvento({ name: 'agent_answer' }).texto).toBe('Resposta do agente');
        expect(descreverEvento({ name: 'supervision_mode_changed', payload: { from_mode: 'auto', to_mode: 'review' } }).texto)
            .toBe('Modo de supervisão: auto → review');
        expect(descreverEvento({ name: 'session.rolled_over' }).texto).toBe('Sessão técnica trocada');
    });

    it('evento desconhecido mostra o nome técnico e nada do payload', () => {
        const d = descreverEvento({
            name: 'evento_do_futuro',
            payload: { authorization: 'Bearer eyJabc.def.ghi', detalhe: 'segredo', api_key: 'sk-123' },
        });
        expect(d).toEqual({ texto: 'evento_do_futuro', tom: 'neutro', conhecido: false });
    });

    it('nenhum campo sensível passa, nem com o formato de identificador', () => {
        const textos = [
            descreverEvento({ name: 'command_received', payload: { operation: 'ghp_abcdefghijklmnopqrstuvwxyz0123' } }).texto,
            descreverEvento({ name: 'command_received', payload: { operation: 'eyJhbGciOiJIUzI1NiJ9' } }).texto,
            descreverEvento({ name: 'command_failed', payload: { error_code: 'token_expired_secret' } }).texto,
            descreverEvento({ name: 'execution_tombstoned', payload: { reason: 'senha vazou no log: hunter2' } }).texto,
            descreverEvento({ name: 'side_effect_receipt', payload: { provider: 'github', operation: 'commit', status: 'ok', url: 'https://x:y@github.com' } }).texto,
        ];
        expect(textos).toEqual([
            'Comando recebido',
            'Comando recebido',
            'Comando recusado',
            'Nó descartado',
            'Efeito confirmado: github · commit · ok',
        ]);
    });
});
