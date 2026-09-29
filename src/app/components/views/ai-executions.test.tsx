/**
 * AI Executions paginada no SERVIDOR, 20 branches por pagina.
 *
 * A tela baixava 100 branches com o snapshot de cada execucao e contava os
 * totais sobre o que tinha chegado. O que estes testes amarram:
 *
 *  - os totais do topo sao os que o servidor contou (escopo inteiro), nao o
 *    tamanho da pagina;
 *  - trocar de pagina pede a pagina ao servidor e os totais nao mudam;
 *  - a busca vai ao servidor e volta para a pagina 1;
 *  - com uma pagina so, nao ha botoes de paginacao.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/services/agentExecutions', () => ({
  closeDeliveredExecution: vi.fn(),
  deleteAgentExecution: vi.fn(),
  getExecutionBranchesPage: vi.fn(),
  createAgentExecution: vi.fn(),
}));
vi.mock('@/services/projects', () => ({ getProjects: vi.fn() }));
vi.mock('@/services/sprints', () => ({ getSprints: vi.fn() }));
vi.mock('@/services/workflowTemplates', () => ({ getWorkflowTemplates: vi.fn() }));

import { getExecutionBranchesPage } from '@/services/agentExecutions';
import { getProjects } from '@/services/projects';
import { getSprints } from '@/services/sprints';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { AIExecutions } from '@/app/components/views/ai-executions';
import { EXECUCOES_POR_PAGINA } from '@/app/components/views/useAiExecutions';
import type { ExecutionBranchesPage } from '@/services/types';

const PROJETO = 'p1';
const TOTAIS = { total: 310, done: 241, active: 13, failed: 0, discarded: 47 };

const raiz = (i: number) => ({
  id: `r${i}`, root_id: `r${i}`, project_id: PROJETO, status: 'completed', phase: 'assurance',
  agent_name: 'QA', sprint_ids: [], branch_type: 'main', lock_version: 1,
  created_at: new Date(2026, 8, 30 - i).toISOString(), updated_at: new Date(2026, 8, 30 - i).toISOString(),
}) as any;

const pagina = (page: number, totalBranches = 58): ExecutionBranchesPage => ({
  items: Array.from({ length: 2 }, (_, i) => raiz(page * 100 + i)),
  page, page_size: EXECUCOES_POR_PAGINA, total_branches: totalBranches, totals: TOTAIS,
});

const montar = async () => {
  render(
    <MemoryRouter initialEntries={[`/project/${PROJETO}/executions`]}>
      <Routes>
        <Route path="/project/:projectId/executions" element={<AIExecutions />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(getExecutionBranchesPage).toHaveBeenCalled());
  await screen.findByText('310');
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getExecutionBranchesPage).mockImplementation(async ({ page }) => pagina(page));
  vi.mocked(getProjects).mockResolvedValue([{ id: PROJETO, name: 'Snaps' }] as any);
  vi.mocked(getSprints).mockResolvedValue([] as any);
  vi.mocked(getWorkflowTemplates).mockResolvedValue([] as any);
});
afterEach(cleanup);

describe('AI Executions paginada', () => {
  it('pede a primeira pagina de 20 ao servidor e mostra os totais do escopo inteiro', async () => {
    await montar();

    expect(getExecutionBranchesPage).toHaveBeenCalledWith({
      projectId: PROJETO, page: 1, pageSize: 20, search: '',
    });
    for (const valor of ['310', '241', '13', '47']) {
      expect(screen.getByText(valor)).toBeInTheDocument();
    }
    expect(screen.getByText('Mostrando 1–20 de 58 branches')).toBeInTheDocument();
  });

  it('trocar de pagina pede a pagina ao servidor e os totais nao mudam', async () => {
    await montar();
    const nav = screen.getByRole('navigation', { name: 'Paginação' });

    await userEvent.click(within(nav).getByRole('button', { name: '3' }));

    await waitFor(() => expect(getExecutionBranchesPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 3 }),
    ));
    await screen.findByText('Mostrando 41–58 de 58 branches');
    expect(screen.getByText('310')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  });

  it('a busca vai ao servidor e volta para a pagina 1', async () => {
    await montar();
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(getExecutionBranchesPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    ));

    await userEvent.type(screen.getByPlaceholderText('Search sessions...'), 'qa');

    await waitFor(() => expect(getExecutionBranchesPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: 'qa' }),
    ));
  });

  it('com uma pagina so nao mostra botoes de paginacao', async () => {
    vi.mocked(getExecutionBranchesPage).mockImplementation(async ({ page }) => pagina(page, 2));
    await montar();

    expect(screen.getByText('Mostrando 1–2 de 2 branches')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próxima página' })).not.toBeInTheDocument();
  });
});
