/** SNA-RD-189: painel do Planner no board, ligado ao Neuron. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/services/chats', () => ({
  createChat: vi.fn(),
  createMessage: vi.fn(async () => ({})),
  getChatHistory: vi.fn(async () => []),
  listChats: vi.fn(async () => []),
  streamChat: vi.fn(),
}));
vi.mock('@/app/components/chat/usePapelNoProjeto', () => ({ usePapelNoProjeto: vi.fn() }));

import { createChat, createMessage, getChatHistory, listChats, streamChat } from '@/services/chats';
import { usePapelNoProjeto } from '@/app/components/chat/usePapelNoProjeto';
import type { EventoNeuron } from '@/services/neuronEvents';
import { PlannerPanel, TITULO_CHAT_PLANNER } from './PlannerPanel';

const PROJETO = 'p1';

const papel = (p: 'member' | 'viewer' | null, carregando = false) =>
  vi.mocked(usePapelNoProjeto).mockReturnValue({ papel: p, carregando, erro: false });

const painel = (onBoardChanged = vi.fn()) => {
  render(<PlannerPanel isOpen onClose={() => {}} projectId={PROJETO} onBoardChanged={onBoardChanged} />);
  return onBoardChanged;
};

const pedir = (texto: string) => {
  fireEvent.change(screen.getByLabelText('Mensagem ao Planner'), { target: { value: texto } });
  fireEvent.click(screen.getByLabelText('Enviar ao Planner'));
};

beforeEach(() => {
  vi.mocked(streamChat).mockReset();
  vi.mocked(createMessage).mockClear();
  vi.mocked(createChat).mockReset().mockResolvedValue({ id: 'chat-planner', project_id: PROJETO, title: TITULO_CHAT_PLANNER, created_at: '' });
  vi.mocked(listChats).mockReset().mockResolvedValue([]);
  vi.mocked(getChatHistory).mockReset().mockResolvedValue([]);
});

describe('Planner no board', () => {
  it('member pede um card: o Planner cria pelo Neuron e o board recarrega em board_changed', async () => {
    papel('member');
    vi.mocked(streamChat).mockImplementation(async (_p, aoEvento) => {
      ([
        { type: 'tool_start', tool: 'snaps_save_card_tool', resumo: '{}' },
        { type: 'board_changed', entidades: [{ tipo: 'card', id: 'card-novo' }] },
        { type: 'token', content: 'Criei o card "Login".' },
      ] as EventoNeuron[]).forEach(aoEvento);
    });
    const recarregar = painel();
    await waitFor(() => expect(listChats).toHaveBeenCalledWith(PROJETO));
    pedir('Crie um card para o login');
    await waitFor(() => expect(recarregar).toHaveBeenCalledTimes(1));
    expect(createChat).toHaveBeenCalledWith(PROJETO, TITULO_CHAT_PLANNER);
    expect(vi.mocked(streamChat).mock.calls[0][0]).toEqual({
      projectId: PROJETO, chatId: 'chat-planner', perfil: 'board_planner', superficie: 'board_planner', message: 'Crie um card para o login',
    });
    expect(await screen.findByText('Criei o card "Login".')).toBeInTheDocument();
    expect(createMessage).toHaveBeenLastCalledWith('chat-planner', 'Criei o card "Login".', 'assistant', [{ perfil: 'board_planner', snaps_referenciados: [] }]);
  });

  it('reabre o chat próprio pelo título e mostra a conversa, sem resposta fixa', async () => {
    papel('member');
    vi.mocked(listChats).mockResolvedValue([
      { id: 'outro', project_id: PROJETO, title: 'Conversa qualquer', created_at: '' },
      { id: 'chat-planner', project_id: PROJETO, title: TITULO_CHAT_PLANNER, created_at: '' },
    ]);
    vi.mocked(getChatHistory).mockResolvedValue([{ id: 'm1', chat_id: 'chat-planner', role: 'assistant', content: 'Movi 2 cards.', created_at: '' }]);
    painel();
    expect(await screen.findByText('Movi 2 cards.')).toBeInTheDocument();
    expect(getChatHistory).toHaveBeenCalledWith('chat-planner');
    expect(screen.queryByText(/I'm your Planner Agent/)).not.toBeInTheDocument();
  });

  it('viewer vê que não tem permissão para planejar e não tem campo de envio', () => {
    papel('viewer');
    painel();
    expect(screen.getByRole('alert')).toHaveTextContent('Você não tem permissão para planejar neste projeto.');
    expect(screen.queryByLabelText('Mensagem ao Planner')).not.toBeInTheDocument();
    expect(listChats).not.toHaveBeenCalled();
  });

  it('carregando', () => {
    papel(null, true);
    painel();
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Carregando');
  });

  it('vazio', async () => {
    papel('member');
    painel();
    expect(await screen.findByText(/Peça ao Planner para criar/)).toBeInTheDocument();
  });

  it('erro ao carregar e erro do Neuron aparecem', async () => {
    papel('member');
    vi.mocked(listChats).mockRejectedValue(new Error('rede'));
    painel();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a conversa do Planner.');
  });

  it('erro do C6 mostra a copy do Neuron', async () => {
    papel('member');
    vi.mocked(streamChat).mockImplementation(async (_p, aoEvento) => {
      aoEvento({ type: 'error', code: 'modelo_sem_preco', message: 'Cadastre o preço do modelo na Settings do sistema.' });
    });
    painel();
    await waitFor(() => expect(listChats).toHaveBeenCalled());
    pedir('Organize o board');
    expect(await screen.findByRole('alert')).toHaveTextContent('Cadastre o preço do modelo');
  });
});
