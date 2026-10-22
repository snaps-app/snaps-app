/** Aba Nó (E21, TP-1): o estado daquela fase, com selos e sem ação de escrita. */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { NodeSnapshot } from '@/services/types';
import { AuditoriaDoNo } from './AuditoriaDoNo';

const SNAPSHOT: NodeSnapshot = {
    execution_id: 'n1', root_id: 'r', parent_id: 'p', phase: 'micro_planning', status: 'completed',
    classe: 'concluido', imutavel: true, agent_name: '@antigravity-micro-planner',
    created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T11:00:00Z',
    prompt: { entry: 'Escreva os planos táticos.', exit: 'Grave o walkthrough.' },
    prompt_regravado_apos_conclusao: false,
    workflow: {
        template_id: 't', template_version: 3, snapshot_hash: 'abcdef1234567890ffff',
        fase: { key: 'micro_planning', label: 'Micro planning', advance_conditions: {} },
    },
    gates: {
        advance_conditions: { plan_approved: true },
        avaliacoes: [{ at: '2026-10-20T10:30:00Z', gate: 'advance_conditions', result: 'failed' }],
        overrides: [{ at: '2026-10-20T10:40:00Z', actor_id: 'u', payload: { conditions: ['plan_approved'], reason: 'PO aprovou fora do Cockpit' } }],
    },
    artefatos: [{
        tipo: 'snap', artifact_type: 'walkthrough', id: 's1', nome: 'Walkthrough micro', submetido_em: '2026-10-20T10:50:00Z',
        hash_na_submissao: 'a', hash_atual: 'a', editado_apos_submissao: false,
    }],
    planos: [{ id: 'p1', titulo: 'TP-1 · History', status: 'approved', content_revision: 3, approved_revision: 3, vinculo: 'produzido_pelo_no' }],
    prs: [{ repo: 'snaps-api', pr_number: 547, head_sha: '135d4630aaaabbbb', motivo: null }],
    skills_ativadas: null,
};

describe('AuditoriaDoNo', () => {
    it('mostra prompt, gates, override com motivo, hash do workflow e artefatos', () => {
        render(<AuditoriaDoNo snapshot={SNAPSHOT} />);
        expect(screen.getByText('Escreva os planos táticos.')).toBeInTheDocument();
        expect(within(screen.getByRole('region', { name: 'Gates' })).getByText('plan_approved')).toBeInTheDocument();
        expect(screen.getByText('falhou')).toBeInTheDocument();
        expect(screen.getByText(/motivo: PO aprovou fora do Cockpit/)).toBeInTheDocument();
        expect(screen.getByText('abcdef123456')).toBeInTheDocument();
        expect(screen.getByText(/Walkthrough micro/)).toBeInTheDocument();
        expect(screen.getByText('135d4630aaaa')).toBeInTheDocument();
        expect(screen.getByText(/TP-1 · History/)).toBeInTheDocument();
    });

    it('override mostra quem fez, a base da autorização (dono ou admin) e o motivo (ADR-0072)', () => {
        render(<AuditoriaDoNo snapshot={{
            ...SNAPSHOT,
            gates: {
                ...SNAPSHOT.gates,
                overrides: [
                    { at: '2026-10-21T10:40:00Z', actor_id: 'u1', ator: 'Maria Souza', motivo: 'CI do provedor fora do ar', base: 'dono',
                        payload: { conditions: ['ci_passed'], decision_id: 'd1', authorized_as: 'dono' } },
                    { at: '2026-10-21T10:50:00Z', actor_id: 'u2', ator: 'Ana Admin', motivo: 'PO decidiu', base: 'admin',
                        payload: { conditions: { required_env: true }, decision_id: 'd2' } },
                ],
            },
        }} />);
        const [dono, admin] = within(screen.getByRole('list', { name: 'Overrides do nó' })).getAllByTestId('override-do-no');
        expect(dono).toHaveTextContent('ci_passed · por Maria Souza (dono da execução) · motivo: CI do provedor fora do ar');
        expect(admin).toHaveTextContent('required_env · por Ana Admin (admin do projeto) · motivo: PO decidiu');
    });

    it('skills ativadas ainda não são registradas', () => {
        render(<AuditoriaDoNo snapshot={SNAPSHOT} />);
        expect(screen.getByText('Skills ativadas: não registrado nesta versão')).toBeInTheDocument();
    });

    it('sem selos quando nada foi regravado nem editado', () => {
        render(<AuditoriaDoNo snapshot={SNAPSHOT} />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('selo do prompt regravado antes da trava', () => {
        render(<AuditoriaDoNo snapshot={{ ...SNAPSHOT, prompt_regravado_apos_conclusao: true }} />);
        expect(screen.getByRole('status')).toHaveTextContent('prompt regravado depois da conclusão (antes da trava da 24.0)');
    });

    it('selo do artefato editado depois da submissão', () => {
        const editado = { ...SNAPSHOT.artefatos[0], hash_atual: 'b', editado_apos_submissao: true };
        render(<AuditoriaDoNo snapshot={{ ...SNAPSHOT, artefatos: [editado] }} />);
        expect(screen.getByRole('status')).toHaveTextContent('editado após a submissão');
    });

    it('head não capturado aparece com o motivo', () => {
        render(<AuditoriaDoNo snapshot={{ ...SNAPSHOT, prs: [{ repo: 'snaps-app', pr_number: 87, head_sha: null, motivo: 'TimeoutError' }] }} />);
        expect(screen.getByText(/não capturado \(TimeoutError\)/)).toBeInTheDocument();
    });

    it('nó concluído: nenhuma ação de escrita na aba', () => {
        render(<AuditoriaDoNo snapshot={SNAPSHOT} />);
        expect(screen.queryAllByRole('button')).toEqual([]);
        expect(screen.queryAllByRole('textbox')).toEqual([]);
        expect(screen.getByText('Nó concluído: somente leitura.')).toBeInTheDocument();
    });
});

describe('estilo do History', () => {
    it('nenhum hex nos componentes: só tokens --snaps-*', () => {
        const pasta = __dirname;
        const fontes = readdirSync(pasta).filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f));
        expect(fontes.sort()).toEqual(['AuditoriaDoNo.tsx', 'HistoryDaRaiz.tsx']);
        for (const f of fontes) expect(readFileSync(join(pasta, f), 'utf-8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it('sem barrel index.ts (ADR-0063)', () => {
        expect(readdirSync(__dirname)).not.toContain('index.ts');
    });
});
