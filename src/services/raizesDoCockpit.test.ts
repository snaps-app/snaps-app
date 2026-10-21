/** Raízes da barra e do seletor, a partir da página de branches. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/agentExecutions', () => ({ getExecutionBranchesPage: vi.fn() }));

import { getExecutionBranchesPage } from '@/services/agentExecutions';
import { buscarRaiz, resumirBranches, rotuloDaRaiz, tomDaRaiz } from '@/services/raizesDoCockpit';
import type { ExecutionBranchesPage, ExecutionListItem } from '@/services/types';

const R = 'acc98642-1918-40ae-95a9-a5134caa575c';
const F = '9c52578d-d298-4b2b-bdfc-aa342e1c26ce';

function linha(p: Partial<ExecutionListItem>): ExecutionListItem {
    return {
        id: R, root_id: R, project_id: 'p1', status: 'done', phase: 'macro_planning', sprint_ids: [],
        agent_name: 'Planner', created_at: '2026-10-01', updated_at: '2026-10-01', lock_version: 1,
        project_name: 'Snaps', sprint_name: 'Sprint 24.0', workflow_name: 'SDLC v4.0', card_codes: ['SNA-RD-210'],
        ...p,
    } as ExecutionListItem;
}

function pagina(items: ExecutionListItem[]): ExecutionBranchesPage {
    return { items, page: 1, page_size: 1, total_branches: items.length ? 1 : 0, totals: { total: 0, done: 0, active: 0, failed: 0, discarded: 0 } };
}

beforeEach(() => vi.mocked(getExecutionBranchesPage).mockReset());

describe('resumirBranches', () => {
    it('o nó mais recente dá fase e status; a raiz dá projeto, sprint e alvo', () => {
        const [r] = resumirBranches([
            linha({ id: F, phase: 'execution', status: 'in_progress', card_codes: [] }),
            linha({}),
        ]);
        expect(r).toMatchObject({
            rootId: R, atualId: F, fase: 'execution', status: 'in_progress', encerrada: false,
            projectName: 'Snaps', sprintName: 'Sprint 24.0', alvo: ['SNA-RD-210'],
        });
        expect(tomDaRaiz(r)).toBe('ativa');
    });

    it('rótulo "projeto · sprint", com o ID curto quando não há sprint', () => {
        expect(rotuloDaRaiz({ rootId: R, projectName: 'Snaps', sprintName: 'Sprint 24.0' })).toBe('Snaps · Sprint 24.0');
        expect(rotuloDaRaiz({ rootId: R, projectName: 'Snaps', sprintName: null })).toBe('Snaps · acc98642');
    });

    it('tom: falha, encerrada e atenção', () => {
        expect(tomDaRaiz({ status: 'failed', encerrada: true })).toBe('falha');
        expect(tomDaRaiz({ status: 'done', encerrada: true })).toBe('encerrada');
        expect(tomDaRaiz({ status: 'awaiting_advance', encerrada: false })).toBe('atencao');
    });
});

describe('buscarRaiz', () => {
    it('pergunta ao servidor com o UUID inteiro', async () => {
        vi.mocked(getExecutionBranchesPage).mockResolvedValue(pagina([linha({})]));
        const r = await buscarRaiz(R);
        expect(getExecutionBranchesPage).toHaveBeenCalledWith({ page: 1, pageSize: 1, search: R });
        expect(r?.rootId).toBe(R);
    });

    it('fora do escopo ou inexistente: null, sem distinguir os dois', async () => {
        vi.mocked(getExecutionBranchesPage).mockResolvedValue(pagina([]));
        expect(await buscarRaiz(R)).toBeNull();
    });

    it('id de um filho devolve a raiz dele', async () => {
        vi.mocked(getExecutionBranchesPage).mockResolvedValue(pagina([linha({ id: F }), linha({})]));
        expect((await buscarRaiz(F))?.rootId).toBe(R);
    });
});
