/**
 * Governance Center com carga por aba (SNA-RD-170, G2).
 *
 * `GET /governance-docs/` respondia 500 e, como a carga era um Promise.all,
 * Agents, Docs, Skills e Workflows zeravam juntos. Uma aba com erro nao pode
 * apagar as outras, e mostra o erro no proprio lugar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/governance', () => ({
  getAgents: vi.fn(), getGovernanceDocs: vi.fn(), getSkills: vi.fn(), getResources: vi.fn(),
  bindSkillToAgent: vi.fn(), unbindSkillFromAgent: vi.fn(),
  deleteAgent: vi.fn(), deleteGovernanceDoc: vi.fn(), deleteSkill: vi.fn(), deleteResource: vi.fn(),
}));
vi.mock('@/services/projects', () => ({ getProjects: vi.fn() }));
vi.mock('@/services/workflowTemplates', () => ({ getWorkflowTemplates: vi.fn() }));
vi.mock('@/app/components/workflow/workflow-editor', () => ({
  WorkflowEditorCanvas: () => <div>editor de workflow</div>,
}));

import { getAgents, getGovernanceDocs, getResources, getSkills } from '@/services/governance';
import { getProjects } from '@/services/projects';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { GovernanceView } from './governance-view';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAgents).mockResolvedValue([
    { id: 'a1', name: 'playbook-executor', type: 'fleet_agent', instructions: 'x', scope: 'global', project_id: null } as any,
  ]);
  vi.mocked(getGovernanceDocs).mockRejectedValue(Object.assign(new Error('Network Error'), {
    response: { status: 500, data: { detail: 'Internal Server Error' } },
  }));
  vi.mocked(getSkills).mockResolvedValue([]);
  vi.mocked(getResources).mockResolvedValue([]);
  vi.mocked(getProjects).mockResolvedValue([] as any);
  vi.mocked(getWorkflowTemplates).mockResolvedValue([] as any);
});
afterEach(cleanup);

describe('Governance Center — carga por aba', () => {
  it('docs com erro nao zera agents, e a aba docs mostra o erro', async () => {
    render(<GovernanceView />);

    expect(await screen.findByText('playbook-executor')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Docs/ }));
    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('HTTP 500');
    expect(screen.queryByText(/No items found/)).not.toBeInTheDocument();
  });

  it('busca usa os tokens de input do design system, nao fundo branco', async () => {
    render(<GovernanceView />);
    const busca = await screen.findByLabelText('Buscar por nome');
    await waitFor(() => expect(busca.className).toContain('bg-white/5'));
    expect(busca.className).toContain('var(--snaps-text-primary)');
    expect(busca.className).toContain('var(--snaps-placeholder)');
  });
});
