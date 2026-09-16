/**
 * Migracao do formulario "Content (Code)" para SKILL.md (B5, card d683600c).
 *
 * O limite desta sprint e de DADO. A tabela `skills` tem `id`, `project_id`,
 * `name`, `content`, `language`, `params_schema`, `version`, `scope` e
 * timestamps -- e mais nada. Nao existem `content_hash`, `trust_level`,
 * `origin`, `runtime` nem `skill_versions`. Badge de origem, selo de confianca
 * e versao imutavel com diff sao E12 (Sprint 26.0) e nao tem onde se apoiar
 * aqui. Estes testes existem para que a tela nao volte a prometer nada disso.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/services/governance', () => ({
  createAgent: vi.fn(), updateAgent: vi.fn(),
  createGovernanceDoc: vi.fn(), updateGovernanceDoc: vi.fn(),
  createSkill: vi.fn(), updateSkill: vi.fn(),
  createResource: vi.fn(), updateResource: vi.fn(),
  VersionConflictError: class VersionConflictError extends Error {},
}));

import { createSkill, updateSkill } from '@/services/governance';
import { GovernanceFormModal } from './governance-form-modal';

const SKILL = 'aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';

const skill = (over: Record<string, unknown> = {}) => ({
  id: SKILL,
  name: 'simplify',
  content: '# Skill: Simplify Code\n\n> Objetivo: enxugar o codigo.',
  language: 'markdown',
  version: '1.0.0',
  scope: 'global',
  project_id: null,
  lock_version: 3,
  ...over,
} as any);

const props = (over: Record<string, unknown> = {}) => ({
  isOpen: true,
  onClose: vi.fn(),
  tab: 'skills' as const,
  editingId: null as string | null,
  projects: [],
  agents: [],
  docs: [],
  skills: [skill()],
  resources: [],
  onSaveSuccess: vi.fn(),
  ...over,
});

const campoSkillMd = () => screen.getByLabelText('SKILL.md') as HTMLTextAreaElement;

beforeEach(() => vi.clearAllMocks());

describe('formulario de skill: SKILL.md no lugar de "Content (Code)"', () => {
  it('o editor principal se chama SKILL.md, nao "Content (Code)"', () => {
    render(<GovernanceFormModal {...props()} />);

    expect(screen.getByLabelText('SKILL.md')).toBeInTheDocument();
    expect(screen.queryByText(/Content \(Code\)/i)).toBeNull();
  });

  it('nao oferece seletor de linguagem na criacao', () => {
    render(<GovernanceFormModal {...props()} />);

    expect(screen.queryByText('Language')).toBeNull();
    expect(screen.queryByPlaceholderText('python')).toBeNull();
  });

  it('nao oferece seletor de linguagem na edicao', () => {
    render(<GovernanceFormModal {...props({ editingId: SKILL })} />);

    expect(screen.queryByText('Language')).toBeNull();
    expect(screen.queryByPlaceholderText('python')).toBeNull();
  });

  it('nao oferece campo de versao -- versionamento e E12, nao existe hoje', () => {
    render(<GovernanceFormModal {...props({ editingId: SKILL })} />);

    expect(screen.queryByText('Version')).toBeNull();
    expect(screen.queryByPlaceholderText('1.0.0')).toBeNull();
  });

  it('nao renderiza selo de origem, de confianca nem de runtime', () => {
    render(<GovernanceFormModal {...props({ editingId: SKILL })} />);

    for (const inexistente of [/trust/i, /confian/i, /origin/i, /origem/i, /runtime/i, /quarantin/i]) {
      expect(screen.queryByText(inexistente)).toBeNull();
    }
  });

  it('pre-visualiza o conteudo como Markdown renderizado', async () => {
    render(<GovernanceFormModal {...props({ editingId: SKILL })} />);

    fireEvent.click(screen.getByRole('button', { name: /Pre-visualizar/i }));

    // O titulo vira cabecalho de verdade -- e o que prova que nao e mais um
    // bloco de codigo com linguagem.
    const titulo = await screen.findByRole('heading', { name: 'Skill: Simplify Code' });
    expect(titulo).toBeInTheDocument();
  });

  it('a edicao carrega o conteudo existente sem perder nada', () => {
    render(<GovernanceFormModal {...props({ editingId: SKILL })} />);

    expect(campoSkillMd().value).toBe('# Skill: Simplify Code\n\n> Objetivo: enxugar o codigo.');
  });
});

describe('formulario de skill: o que e gravado em `language`', () => {
  it('a EDICAO nao escreve em `language` nem em `version` (release N)', async () => {
    vi.mocked(updateSkill).mockResolvedValue({} as any);
    render(<GovernanceFormModal {...props({ editingId: SKILL })} />);

    fireEvent.change(campoSkillMd(), { target: { value: '# nova versao do texto' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(updateSkill).toHaveBeenCalled());
    const [, enviado, versaoEsperada] = vi.mocked(updateSkill).mock.calls[0];
    // Campos ausentes = valores preservados no banco. A coluna continua la,
    // intacta; o `DROP COLUMN` e de uma sprint posterior (playbook, secao 3).
    expect(enviado).not.toHaveProperty('language');
    expect(enviado).not.toHaveProperty('version');
    expect(enviado).toMatchObject({ name: 'simplify', content: '# nova versao do texto' });
    // O compare-and-swap continua valendo (E18/TP-6).
    expect(versaoEsperada).toBe(3);
  });

  it('a CRIACAO manda um valor fixo, que ninguem escolheu, porque a coluna e NOT NULL', async () => {
    vi.mocked(createSkill).mockResolvedValue({} as any);
    render(<GovernanceFormModal {...props()} />);

    fireEvent.change(screen.getByPlaceholderText('Skill name'), { target: { value: 'nova-skill' } });
    fireEvent.change(campoSkillMd(), { target: { value: '# Nova skill' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(createSkill).toHaveBeenCalled());
    const [enviado] = vi.mocked(createSkill).mock.calls[0];
    // Nao ha escolha do usuario aqui: `SkillCreate.language` e obrigatorio no
    // snaps-api e a coluna e NOT NULL. Torna-la opcional e o passo N+1.
    expect(enviado).toMatchObject({ name: 'nova-skill', content: '# Nova skill', language: 'markdown' });
    expect(enviado).not.toHaveProperty('version');
  });
});
