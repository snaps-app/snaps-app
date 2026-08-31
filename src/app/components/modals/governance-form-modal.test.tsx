/**
 * O formulário é um instantâneo do momento da abertura (card E18 / TP-6).
 *
 * Duas coisas eram lidas das props VIVAS enquanto o modal já estava aberto: os
 * campos (repovoados por um `useEffect` que tinha as listas nas dependências) e
 * a `lock_version` (consultada na lista no instante do save). As duas juntas
 * anulavam o compare-and-swap: o usuário editava sobre a versão 7, o pai
 * recarregava a lista já na versão 8, e o save mandava `expected_lock_version=8`
 * com o conteúdo baseado na 7 — o CAS aceitava e sobrescrevia a alteração
 * concorrente, que é exatamente o que ele existe para impedir.
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

import { updateGovernanceDoc } from '@/services/governance';
import { GovernanceFormModal } from './governance-form-modal';

const DOC = 'd1d1d1d1-1111-4111-8111-aaaaaaaaaaaa';

const doc = (lock_version: number, content: string) => ({
  id: DOC, name: 'Roadmap', type: 'roadmap', scope: 'global',
  project_id: null, content, lock_version,
} as any);

const props = (docs: any[]) => ({
  isOpen: true, onClose: vi.fn(), tab: 'docs' as const, editingId: DOC,
  projects: [], agents: [], docs, skills: [], resources: [],
  onSaveSuccess: vi.fn(),
});

beforeEach(() => vi.clearAllMocks());

it('envia a versao da ABERTURA, nao a que a lista tem no momento do save', async () => {
  vi.mocked(updateGovernanceDoc).mockResolvedValue({} as any);
  const { rerender } = render(<GovernanceFormModal {...props([doc(7, 'original')])} />);

  const conteudo = screen.getByPlaceholderText('Document content...');
  fireEvent.change(conteudo, { target: { value: 'minha edicao' } });

  // O pai recarrega a lista: alguem gravou a versao 8 enquanto este modal
  // estava aberto.
  rerender(<GovernanceFormModal {...props([doc(8, 'escrita alheia')])} />);

  fireEvent.click(screen.getByText('Save'));

  await waitFor(() => expect(updateGovernanceDoc).toHaveBeenCalled());
  const [, , versaoEnviada] = vi.mocked(updateGovernanceDoc).mock.calls[0];
  expect(versaoEnviada).toBe(7);
});

it('nao apaga o rascunho quando a lista do pai muda por baixo', async () => {
  const { rerender } = render(<GovernanceFormModal {...props([doc(7, 'original')])} />);

  const conteudo = screen.getByPlaceholderText('Document content...');
  fireEvent.change(conteudo, { target: { value: 'minha edicao' } });

  rerender(<GovernanceFormModal {...props([doc(8, 'escrita alheia')])} />);

  // O texto da pessoa e a UNICA copia da alteracao dela. Repovoar o campo aqui
  // apagaria trabalho sem aviso nenhum.
  expect((screen.getByPlaceholderText('Document content...') as HTMLTextAreaElement).value)
    .toBe('minha edicao');
});

it('preenche os campos a partir do registro ao abrir', () => {
  render(<GovernanceFormModal {...props([doc(7, 'original')])} />);

  expect((screen.getByPlaceholderText('Document content...') as HTMLTextAreaElement).value)
    .toBe('original');
  expect((screen.getByPlaceholderText('Document name') as HTMLInputElement).value)
    .toBe('Roadmap');
});
