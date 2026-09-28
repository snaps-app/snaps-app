/** SNA-RD-189: seletor de perfil, Snapper e snaps referenciados, sem mock na tela. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

vi.mock('@/services/chats', () => ({
  createChat: vi.fn(),
  createMessage: vi.fn(async () => ({})),
  getChatHistory: vi.fn(async () => []),
  streamChat: vi.fn(),
}));
vi.mock('@/services/projects', () => ({ getProject: vi.fn(async () => ({ id: 'p1', name: 'Snaps' })) }));
vi.mock('@/services/snaps', () => ({ createSnap: vi.fn(async () => ({})), getSnaps: vi.fn(async () => []) }));
vi.mock('./usePapelNoProjeto', () => ({ usePapelNoProjeto: vi.fn() }));

import { createChat, createMessage, getChatHistory, streamChat } from '@/services/chats';
import { createSnap, getSnaps } from '@/services/snaps';
import type { EventoNeuron } from '@/services/neuronEvents';
import { usePapelNoProjeto } from './usePapelNoProjeto';
import { useActiveChat } from './useActiveChat';
import { SeletorDePerfil } from './seletor-de-perfil';
import { ActiveChatSidebar } from './ActiveChatSidebar';
import { ChatMessage } from './chat-message';
import type { PapelNoProjeto } from './perfis';

const PROJETO = 'p1';
const ultima = <T,>(lista: T[]): T => lista[lista.length - 1];
const CHAT = 'chat-1';

const papel = (p: PapelNoProjeto | null, carregando = false) =>
  vi.mocked(usePapelNoProjeto).mockReturnValue({ papel: p, carregando, erro: false });

const eventos = (...lista: EventoNeuron[]) =>
  vi.mocked(streamChat).mockImplementation(async (_pedido, aoEvento) => {
    lista.forEach(aoEvento);
  });

const SUGESTAO: EventoNeuron = {
  type: 'snap_suggested',
  snap: { id: 'sug-1', title: 'Teto por turno', content: 'US$ 1,00', tags: [{ label: 'decisão', variant: 'orange' }], confidence: 0.9, timestamp: '2026-09-28T12:00:00Z' },
};
const REFERENCIADOS: EventoNeuron = {
  type: 'snaps_referenced',
  snaps: [{ id: 'snap-1', title: 'Adendo 3', content: 'Chatter, Planner e Coder', tags: [], timestamp: '2026-09-28T12:00:00Z', trust_level: 'curated', source_ref: null }],
};
const done = (perfil: string): EventoNeuron => ({
  type: 'done', perfil, uso: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0 }, custo_usd: 0, preco_estimado: false, incompleto: false,
});

const wrapper = (rota: string) => ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={[rota]}>
    <Routes>
      <Route path="/project/:projectId/chat" element={children} />
      <Route path="/project/:projectId/chat/:sessionId" element={children} />
    </Routes>
  </MemoryRouter>
);

const hook = (rota = `/project/${PROJETO}/chat/${CHAT}`) => renderHook(() => useActiveChat(), { wrapper: wrapper(rota) });

const enviar = async (r: ReturnType<typeof hook>, texto = 'Oi') => {
  act(() => r.result.current.setInputValue(texto));
  await act(async () => {
    await r.result.current.handleSend();
  });
};

beforeEach(() => {
  vi.mocked(streamChat).mockReset();
  vi.mocked(createMessage).mockClear();
  vi.mocked(createSnap).mockClear();
  vi.mocked(getSnaps).mockReset().mockResolvedValue([]);
  vi.mocked(getChatHistory).mockReset().mockResolvedValue([]);
  vi.mocked(createChat).mockResolvedValue({ id: CHAT, project_id: PROJETO, title: 'x', created_at: '' });
});

describe('seletor de perfil', () => {
  it('member vê Chatter, Planner e Coder, com Chatter como padrão', () => {
    render(<SeletorDePerfil perfil="project_chat" aoTrocar={() => {}} habilitado />);
    const seletor = screen.getByLabelText('Perfil do Neuron') as HTMLSelectElement;
    expect(seletor).toBeEnabled();
    expect([...seletor.options].map((o) => o.text)).toEqual(['Chatter — informação', 'Planner — board', 'Coder — orquestração']);
    expect(seletor.value).toBe('project_chat');
  });

  it('viewer vê o seletor desabilitado com o motivo', () => {
    render(<SeletorDePerfil perfil="project_chat" aoTrocar={() => {}} habilitado={false} />);
    expect(screen.getByLabelText('Perfil do Neuron')).toBeDisabled();
    expect(screen.getByText(/usa só o Chatter/)).toBeInTheDocument();
  });

  it('carregando o papel deixa o seletor desabilitado sem motivo', () => {
    render(<SeletorDePerfil perfil="project_chat" aoTrocar={() => {}} habilitado={false} carregando />);
    expect(screen.getByLabelText('Perfil do Neuron')).toBeDisabled();
    expect(screen.queryByText(/usa só o Chatter/)).not.toBeInTheDocument();
  });
});

describe('troca de perfil', () => {
  it('member troca para Coder: a mensagem seguinte vai com o Coder e a resposta mostra o perfil', async () => {
    papel('member');
    eventos({ type: 'token', content: 'Feito.' }, done('orchestrator'));
    const r = hook();
    act(() => r.result.current.setPerfil('orchestrator'));
    await enviar(r);
    expect(vi.mocked(streamChat).mock.calls[0][0]).toMatchObject({ perfil: 'orchestrator', superficie: 'chat', chatId: CHAT });
    expect(createMessage).toHaveBeenLastCalledWith(CHAT, 'Feito.', 'assistant', [{ perfil: 'orchestrator', snaps_referenciados: [] }]);
    const resposta = ultima(r.result.current.messages);
    render(<ChatMessage message={resposta} index={0} />);
    expect(screen.getByTestId('perfil-da-resposta')).toHaveTextContent('Coder — orquestração');
  });

  it('viewer fica no Chatter mesmo se tentar trocar', async () => {
    papel('viewer');
    eventos({ type: 'token', content: 'ok' }, done('project_chat'));
    const r = hook();
    act(() => r.result.current.setPerfil('orchestrator'));
    await enviar(r);
    expect(r.result.current.podeEscolherPerfil).toBe(false);
    expect(vi.mocked(streamChat).mock.calls[0][0].perfil).toBe('project_chat');
  });
});

describe('Snapper', () => {
  it('a sugestão aparece sem gravar; aceitar grava e tira da lista; descartar não grava', async () => {
    papel('member');
    eventos(SUGESTAO, { ...SUGESTAO, snap: { ...SUGESTAO.snap, id: 'sug-2', title: 'Outra' } } as EventoNeuron, done('project_chat'));
    const r = hook();
    await enviar(r);
    expect(r.result.current.suggestedSnaps.map((s) => s.id).sort()).toEqual(['sug-1', 'sug-2']);
    expect(createSnap).not.toHaveBeenCalled();

    await act(async () => {
      await r.result.current.handleAcceptSnap('sug-1');
    });
    expect(createSnap).toHaveBeenCalledWith(expect.objectContaining({ project_id: PROJETO, name: 'Teto por turno', content: 'US$ 1,00', snadds: { labels: ['decisão'] } }));
    expect(r.result.current.avisoSnapper?.texto).toContain('guardado no projeto');

    act(() => r.result.current.handleDiscardSnap('sug-2'));
    expect(r.result.current.suggestedSnaps).toEqual([]);
    expect(createSnap).toHaveBeenCalledTimes(1);
  });

  it('viewer não vê o aceitar e o aceite não grava', async () => {
    papel('viewer');
    eventos(SUGESTAO, done('project_chat'));
    const r = hook();
    await enviar(r);
    await act(async () => {
      await r.result.current.handleAcceptSnap('sug-1');
    });
    expect(createSnap).not.toHaveBeenCalled();
    render(
      <ActiveChatSidebar mobileView="memory" rightPanelTab="snapper" setRightPanelTab={() => {}}
        suggestedSnaps={r.result.current.suggestedSnaps} referencedSnaps={[]} podeAceitar={false}
        handleSnapClick={() => {}} handleSuggestedSnapClick={() => {}} handleAcceptSnap={() => {}} handleDiscardSnap={() => {}} />,
    );
    expect(screen.getByText('Teto por turno')).toBeInTheDocument();
    expect(screen.queryByText('Aceitar')).not.toBeInTheDocument();
    expect(screen.getByText('Descartar')).toBeInTheDocument();
  });
});

describe('snaps referenciados', () => {
  it('vêm do turno e são gravados em tool_calls', async () => {
    papel('member');
    eventos(REFERENCIADOS, { type: 'token', content: 'Segundo o Adendo 3…' }, done('project_chat'));
    const r = hook();
    await enviar(r);
    expect(r.result.current.referencedSnaps.map((s) => s.title)).toEqual(['Adendo 3']);
    expect(createMessage).toHaveBeenLastCalledWith(CHAT, 'Segundo o Adendo 3…', 'assistant', [{ perfil: 'project_chat', snaps_referenciados: ['snap-1'] }]);
  });

  it('sobrevivem ao reload, lidos pelos ids de tool_calls', async () => {
    papel('member');
    vi.mocked(getChatHistory).mockResolvedValue([
      { id: 'm1', chat_id: CHAT, role: 'user', content: 'Oi', created_at: '' },
      { id: 'm2', chat_id: CHAT, role: 'assistant', content: 'Resposta', created_at: '', tool_calls: [{ perfil: 'project_chat', snaps_referenciados: ['snap-1'] }] },
    ]);
    vi.mocked(getSnaps).mockResolvedValue([
      { id: 'snap-1', project_id: PROJETO, name: 'Adendo 3', description: '', content: 'Chatter', created_at: '2026-09-28T12:00:00Z', updated_at: '' },
      { id: 'snap-2', project_id: PROJETO, name: 'Outro', description: '', content: 'x', created_at: '', updated_at: '' },
    ]);
    const r = hook();
    await waitFor(() => expect(r.result.current.referencedSnaps.map((s) => s.id)).toEqual(['snap-1']));
    expect(getSnaps).toHaveBeenCalledWith(PROJETO, 0, 500, undefined, undefined, { bypassCache: true });
  });
});

describe('estados da tela', () => {
  const sidebar = (extra: Partial<Parameters<typeof ActiveChatSidebar>[0]>) =>
    render(
      <ActiveChatSidebar mobileView="memory" rightPanelTab="memory" setRightPanelTab={() => {}}
        suggestedSnaps={[]} referencedSnaps={[]} podeAceitar
        handleSnapClick={() => {}} handleSuggestedSnapClick={() => {}} handleAcceptSnap={() => {}} handleDiscardSnap={() => {}} {...extra} />,
    );

  it('vazio', () => {
    sidebar({});
    expect(screen.getByText('Os snaps que o Neuron usar para responder aparecem aqui.')).toBeInTheDocument();
  });

  it('carregando', () => {
    sidebar({ carregandoReferenciados: true });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando os snaps referenciados');
  });

  it('erro', () => {
    sidebar({ erroReferenciados: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });

  it('erro do Neuron aparece como mensagem do assistente', async () => {
    papel('member');
    vi.mocked(streamChat).mockRejectedValue(new Error('Sua sessão expirou. Entre novamente para continuar.'));
    const r = hook();
    await enviar(r);
    expect(ultima(r.result.current.messages).content).toBe('Sua sessão expirou. Entre novamente para continuar.');
  });

  it('erro do C6 (sem chave) aparece com a copy do Neuron', async () => {
    papel('member');
    eventos({ type: 'error', code: 'sem_chave', message: 'O Neuron está sem chave de API.' });
    const r = hook();
    await enviar(r);
    expect(ultima(r.result.current.messages).content).toBe('O Neuron está sem chave de API.');
  });
});

describe('sem mock', () => {
  it('a tela do chat não carrega dados fixos', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const arquivo of ['useActiveChat.ts', 'ActiveChatSidebar.tsx']) {
      expect(readFileSync(join(__dirname, arquivo), 'utf-8')).not.toMatch(/mock(Suggested|Referenced)Snaps/);
    }
  });

  it('o seletor fica no cabeçalho do chat', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const fonte = readFileSync(join(__dirname, 'active-chat.tsx'), 'utf-8');
    expect(fonte).toMatch(/<SeletorDePerfil[\s\S]*habilitado=\{podeEscolherPerfil\}/);
  });
});
