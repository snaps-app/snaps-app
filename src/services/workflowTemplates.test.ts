/**
 * Compare-and-swap no editor de workflow templates (card E18 / TP-6).
 *
 * `workflow_templates` entrou no escopo do CAS junto com as três tabelas de
 * governança. Coluna, trigger, ORM e o tipo do frontend foram todos atualizados
 * — e esta função, a única que grava a tabela pela UI, continuou mandando um
 * PATCH sem versão. O tipo do payload não comportava o campo, então o
 * compilador nunca reclamou: a tela ficou verde escrevendo cega.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  API_URL: 'http://api.test',
}));

import { api } from '@/services/client';
import { updateWorkflowTemplate } from '@/services/workflowTemplates';
import { VersionConflictError } from '@/services/versionedWrite';

const TPL = 'a1a1a1a1-1111-4111-8111-aaaaaaaaaaaa';
const PAYLOAD = { name: 'Delivery', phases: [], default_agents: [] };

beforeEach(() => vi.clearAllMocks());

it('manda expected_lock_version quando o editor a conhece', async () => {
  vi.mocked(api.patch).mockResolvedValue({ data: { id: TPL, lock_version: 5 } });

  await updateWorkflowTemplate(TPL, PAYLOAD, 4);

  expect(api.patch).toHaveBeenCalledWith(`/workflow-templates/${TPL}`, {
    ...PAYLOAD,
    expected_lock_version: 4,
  });
});

it('omite o campo quando nao ha versao base', async () => {
  vi.mocked(api.patch).mockResolvedValue({ data: { id: TPL } });

  await updateWorkflowTemplate(TPL, PAYLOAD);

  expect(api.patch).toHaveBeenCalledWith(`/workflow-templates/${TPL}`, PAYLOAD);
});

it('traduz 409 em VersionConflictError, e nao em erro generico', async () => {
  // Um 500 e "tente de novo"; um 409 e "recarregue e reaplique". O editor
  // mostrava `alert('Error saving workflow template.')` para os dois.
  vi.mocked(api.patch).mockRejectedValue({
    response: {
      status: 409,
      data: {
        detail: 'conflito de versao: voce escreveu com base na versao 4...',
        expected_lock_version: 4,
        current_lock_version: 6,
      },
    },
  });

  const erro = await updateWorkflowTemplate(TPL, PAYLOAD, 4).catch(e => e);

  expect(erro).toBeInstanceOf(VersionConflictError);
  expect(erro.expectedLockVersion).toBe(4);
  expect(erro.currentLockVersion).toBe(6);
});

it('nao transforma outros erros em conflito', async () => {
  vi.mocked(api.patch).mockRejectedValue({ response: { status: 500, data: {} } });

  const erro = await updateWorkflowTemplate(TPL, PAYLOAD, 4).catch(e => e);

  expect(erro).not.toBeInstanceOf(VersionConflictError);
});
