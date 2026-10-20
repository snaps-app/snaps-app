/** Seletor `+`: busca no servidor, paginada, e abre a raiz escolhida. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

vi.mock('@/services/agentExecutions', () => ({ getExecutionBranchesPage: vi.fn() }));

import { getExecutionBranchesPage } from '@/services/agentExecutions';
import { renderComConsulta } from '@/test/comConsulta';
import type { ExecutionListItem } from '@/services/types';
import { SeletorDeRaiz } from './SeletorDeRaiz';

const R = 'acc98642-1918-40ae-95a9-a5134caa575c';

const item = {
    id: R, root_id: R, project_id: 'p1', status: 'in_progress', phase: 'execution', sprint_ids: [],
    agent_name: 'Coder', created_at: '2026-10-20', updated_at: '2026-10-20', lock_version: 1,
    project_name: 'Snaps', sprint_name: 'Sprint 24.0', workflow_name: 'SDLC v4.0 (CI Gate)', card_codes: ['SNA-RD-210'],
} as ExecutionListItem;

beforeEach(() => {
    vi.mocked(getExecutionBranchesPage).mockReset();
    vi.mocked(getExecutionBranchesPage).mockResolvedValue({
        items: [item], page: 1, page_size: 10, total_branches: 1,
        totals: { total: 1, done: 0, active: 1, failed: 0, discarded: 0 },
    });
});

describe('SeletorDeRaiz', () => {
    it('não consulta nada antes de abrir', () => {
        renderComConsulta(<SeletorDeRaiz abertas={new Set()} onEscolher={vi.fn()} />);
        expect(getExecutionBranchesPage).not.toHaveBeenCalled();
    });

    it('busca no servidor com o termo digitado e mostra projeto, alvo, workflow, fase e status', async () => {
        renderComConsulta(<SeletorDeRaiz abertas={new Set()} onEscolher={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Abrir raiz' }));
        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar raiz' }), { target: { value: ' sna-rd-210 ' } });

        await waitFor(() =>
            expect(getExecutionBranchesPage).toHaveBeenCalledWith({ search: 'sna-rd-210', page: 1, pageSize: 10 }),
        );
        const opcao = await screen.findByRole('button', { name: /Snaps · Sprint 24\.0/ });
        expect(opcao).toHaveTextContent('SNA-RD-210');
        expect(opcao).toHaveTextContent('SDLC v4.0 (CI Gate) · execution · in_progress');
    });

    it('escolher entrega a raiz, e a raiz já aberta vem marcada', async () => {
        const onEscolher = vi.fn();
        renderComConsulta(<SeletorDeRaiz abertas={new Set([R])} onEscolher={onEscolher} />);
        fireEvent.click(screen.getByRole('button', { name: 'Abrir raiz' }));
        const opcao = await screen.findByRole('button', { name: /Snaps · Sprint 24\.0/ });
        expect(opcao).toHaveTextContent('aberta');

        fireEvent.click(opcao);

        expect(onEscolher).toHaveBeenCalledWith(expect.objectContaining({ rootId: R }));
    });
});
