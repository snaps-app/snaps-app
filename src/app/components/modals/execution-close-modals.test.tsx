/**
 * Concluir (entregue) e Descartar no ponto do clique (SNA-RD-166, hotfix 22.0).
 *
 * A recusa da API ia para um banner no topo da pagina: o PO clicou 17 vezes e
 * nao viu nada. Agora abre um modal com a mensagem como veio, os cards abertos
 * e o fechamento forcado com motivo obrigatorio.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/agentExecutions', () => ({
  closeDeliveredExecution: vi.fn(),
  deleteAgentExecution: vi.fn(),
  getAllAgentExecutions: vi.fn(),
  getProjectAgentExecutions: vi.fn(),
}));
vi.mock('@/services/boards', () => ({ getProjectBoard: vi.fn() }));
vi.mock('@/services/projects', () => ({ getProjects: vi.fn() }));
vi.mock('@/services/sprints', () => ({ getSprints: vi.fn() }));
vi.mock('@/services/workflowTemplates', () => ({ getWorkflowTemplates: vi.fn() }));

import { closeDeliveredExecution, deleteAgentExecution, getAllAgentExecutions } from '@/services/agentExecutions';
import { getProjects } from '@/services/projects';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { useAiExecutions } from '@/app/components/views/useAiExecutions';
import { CloseDeliveredModal, DiscardExecutionModal } from './execution-close-modals';

const exec = { id: 'e1', project_id: 'p1', status: 'pending', phase: 'assurance', lock_version: 3 } as any;

const MENSAGEM = "sem evidencia de entrega para a execucao e1: a sprint sprint-22.0 esta 'active', nao encerrada";

const recusa400 = () => Object.assign(new Error('Request failed with status code 400'), {
  response: {
    status: 400,
    data: {
      detail: {
        message: MENSAGEM,
        sprint_status: 'active',
        open_cards: [
          { id: 'c1', code: 'SNA-RD-164', title: 'Editor', status: 'assurance' },
          { id: 'c2', code: 'SNA-RD-167', title: 'Vocabulario', status: 'in_progress' },
        ],
      },
    },
  },
});

/** O mesmo encaixe de `ai-executions.tsx`: hook + modais. */
function Harness() {
  const h = useAiExecutions();
  return (
    <div>
      <button onClick={() => h.handleCloseDelivered(exec)}>Concluir (entregue)</button>
      <button title="Descartar" onClick={() => h.handleDeleteExecution('e1')}>lixeira</button>
      {h.notice && <div role="status">{h.notice}</div>}
      {h.closeTarget && (
        <CloseDeliveredModal
          refusal={h.closeTarget.refusal}
          submitting={h.closeSubmitting}
          error={h.closeError}
          onConfirm={h.confirmForceClose}
          onClose={h.cancelClose}
        />
      )}
      {h.discardTarget && (
        <DiscardExecutionModal submitting={h.discardSubmitting} onConfirm={h.confirmDiscard} onClose={h.cancelDiscard} />
      )}
    </div>
  );
}

const montar = async () => {
  render(<MemoryRouter><Harness /></MemoryRouter>);
  await waitFor(() => expect(getAllAgentExecutions).toHaveBeenCalled());
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAllAgentExecutions).mockResolvedValue([exec]);
  vi.mocked(getProjects).mockResolvedValue([] as any);
  vi.mocked(getWorkflowTemplates).mockResolvedValue([] as any);
});
afterEach(cleanup);

describe('Concluir (entregue)', () => {
  it('recusa da API abre modal com a mensagem sem reescrita, sprint e cards abertos', async () => {
    vi.mocked(closeDeliveredExecution).mockRejectedValueOnce(recusa400());
    await montar();

    await userEvent.click(screen.getByText('Concluir (entregue)'));

    const dialog = await screen.findByRole('dialog');
    expect(screen.getByTestId('close-refusal-message').textContent).toBe(MENSAGEM);
    expect(dialog.textContent).toContain('active');
    expect(dialog.textContent).toContain('SNA-RD-164');
    expect(dialog.textContent).toContain('SNA-RD-167');
    expect(screen.getByRole('button', { name: 'Concluir e marcar 2 cards como done' })).toBeInTheDocument();
  });

  it('botao fica desabilitado sem motivo (so espacos tambem)', async () => {
    vi.mocked(closeDeliveredExecution).mockRejectedValueOnce(recusa400());
    await montar();
    await userEvent.click(screen.getByText('Concluir (entregue)'));

    const botao = await screen.findByRole('button', { name: /Concluir e marcar/ });
    expect(botao).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Motivo/), '   ');
    expect(botao).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Motivo/), 'PO validou');
    expect(botao).toBeEnabled();
  });

  it('confirmar envia force + motivo e fecha o modal com aviso de sucesso', async () => {
    vi.mocked(closeDeliveredExecution)
      .mockRejectedValueOnce(recusa400())
      .mockResolvedValueOnce({ ...exec, status: 'completed' });
    await montar();
    await userEvent.click(screen.getByText('Concluir (entregue)'));
    await userEvent.type(await screen.findByLabelText(/Motivo/), '  entregue fora do fluxo ');

    await userEvent.click(screen.getByRole('button', { name: /Concluir e marcar/ }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(closeDeliveredExecution).toHaveBeenLastCalledWith('e1', 3, { motivo: 'entregue fora do fluxo' });
    expect(screen.getByRole('status').textContent).toMatch(/concluída/);
    expect(getAllAgentExecutions).toHaveBeenCalledTimes(2);
  });

  it('erro da segunda chamada aparece dentro do modal', async () => {
    vi.mocked(closeDeliveredExecution)
      .mockRejectedValueOnce(recusa400())
      .mockRejectedValueOnce(Object.assign(new Error('403'), {
        response: { status: 403, data: { detail: 'o fechamento forcado e reservado a um humano com papel admin no projeto' } },
      }));
    await montar();
    await userEvent.click(screen.getByText('Concluir (entregue)'));
    await userEvent.type(await screen.findByLabelText(/Motivo/), 'motivo');

    await userEvent.click(screen.getByRole('button', { name: /Concluir e marcar/ }));

    const dialog = screen.getByRole('dialog');
    const alerta = await screen.findByRole('alert');
    expect(dialog).toContainElement(alerta);
    expect(alerta.textContent).toContain('reservado a um humano');
  });

  it('sem cards abertos o botao diz "Concluir mesmo assim"', () => {
    render(<CloseDeliveredModal refusal={{ message: 'x', sprintStatus: null, openCards: [] }}
      submitting={false} error={null} onConfirm={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Concluir mesmo assim' })).toBeDisabled();
  });

  it('aceita de primeira: aviso de sucesso, sem modal, e a lista recarrega', async () => {
    vi.mocked(closeDeliveredExecution).mockResolvedValueOnce({ ...exec, status: 'completed' });
    await montar();

    await userEvent.click(screen.getByText('Concluir (entregue)'));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getAllAgentExecutions).toHaveBeenCalledTimes(2);
  });
});

describe('Descartar', () => {
  it('confirmacao em modal diz que nada e apagado, sem window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    vi.mocked(deleteAgentExecution).mockResolvedValue(undefined as any);
    await montar();

    await userEvent.click(screen.getByTitle('Descartar'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Nada é apagado');
    expect(dialog.textContent).not.toMatch(/permanentemente/);
    expect(confirmSpy).not.toHaveBeenCalled();
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    });
    expect(deleteAgentExecution).toHaveBeenCalledWith('e1');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
