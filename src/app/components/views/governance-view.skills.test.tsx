/**
 * Skills Center minimo (B5, card d683600c).
 *
 * Skills sao uma ABA de Governance -- nao um destino novo na sidebar (U28) --
 * e a listagem so pode mostrar o que a tabela tem: `name`, `content`, `scope`
 * e o projeto. Nada de `origin`, `trust_level`, `content_hash` ou versao
 * imutavel: sao E12 (Sprint 26.0) e nao existem no banco. Listar um nome de
 * skill nao comprova nenhuma dessas capacidades, e a UI desta sprint nao deve
 * sugerir que comprova (PRD, secao 3.5).
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

/** Forma real da tabela `skills` conferida no banco em 16/09/2026. */
const skill = (over: Record<string, unknown> = {}) => ({
  id: 's1', project_id: null, name: 'simplify',
  content: '# Skill: Simplify Code', language: 'markdown',
  params_schema: {}, version: '1.0.0', scope: 'global', lock_version: 1,
  created_at: '', updated_at: '',
  ...over,
});

const abrirSkills = async () => {
  render(<GovernanceView />);
  const aba = await screen.findByRole('tab', { name: /Skills/ });
  await userEvent.click(aba);
  await waitFor(() => expect(aba).toHaveAttribute('aria-selected', 'true'));
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAgents).mockResolvedValue([]);
  vi.mocked(getGovernanceDocs).mockResolvedValue([]);
  vi.mocked(getResources).mockResolvedValue([]);
  vi.mocked(getProjects).mockResolvedValue([] as any);
  vi.mocked(getWorkflowTemplates).mockResolvedValue([] as any);
  vi.mocked(getSkills).mockResolvedValue([
    skill(),
    skill({ id: 's2', name: 'test-driven-development' }),
    skill({ id: 's3', name: 'Migration Skill', language: 'bash', scope: 'project', project_id: 'p1' }),
  ] as any);
});
afterEach(cleanup);

describe('Skills Center: onde mora', () => {
  it('e uma aba de Governance, com papel de aba de verdade', async () => {
    await abrirSkills();

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Skills/ })).toBeInTheDocument();
  });

  it('lista as skills pelo nome', async () => {
    await abrirSkills();

    expect(await screen.findByText('simplify')).toBeInTheDocument();
    expect(screen.getByText('test-driven-development')).toBeInTheDocument();
    expect(screen.getByText('Migration Skill')).toBeInTheDocument();
  });
});

describe('Skills Center: o catalogo e pesquisavel', () => {
  it('filtra por nome', async () => {
    await abrirSkills();
    await screen.findByText('simplify');

    await userEvent.type(screen.getByLabelText('Buscar por nome'), 'migration');

    await waitFor(() => expect(screen.queryByText('simplify')).toBeNull());
    expect(screen.getByText('Migration Skill')).toBeInTheDocument();
  });

  it('filtra por escopo', async () => {
    await abrirSkills();
    await screen.findByText('simplify');

    await userEvent.click(screen.getByRole('button', { name: 'project' }));

    await waitFor(() => expect(screen.queryByText('simplify')).toBeNull());
    expect(screen.getByText('Migration Skill')).toBeInTheDocument();
  });
});

describe('Skills Center: nenhum campo que o banco nao tem', () => {
  it('nao exibe a linguagem da skill em lugar nenhum', async () => {
    await abrirSkills();
    await screen.findByText('simplify');

    expect(screen.queryByText('markdown')).toBeNull();
    expect(screen.queryByText('bash')).toBeNull();
  });

  it('nao exibe selo de versao -- versionamento imutavel e E12', async () => {
    await abrirSkills();
    await screen.findByText('simplify');

    expect(screen.queryByText(/^v1\.0\.0$/)).toBeNull();
  });

  it('nao exibe selo de origem nem de confianca -- as colunas nao existem', async () => {
    await abrirSkills();
    await screen.findByText('simplify');

    for (const inventado of [
      /internal/i, /approved/i, /unreviewed/i, /quarantined/i,
      /confian/i, /trust/i, /origem/i, /vendor/i, /plugin/i,
    ]) {
      expect(screen.queryByText(inventado)).toBeNull();
    }
  });

  it('exibe o escopo, que e derivado de project_id e portanto real', async () => {
    await abrirSkills();
    await screen.findByText('simplify');

    expect(screen.getAllByText('global').length).toBeGreaterThan(0);
  });
});
