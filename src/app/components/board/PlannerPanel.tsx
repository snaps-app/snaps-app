import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Send, Lock } from 'lucide-react';
import { createChat, createMessage, getChatHistory, listChats, streamChat } from '@/services/chats';
import type { Message } from '@/services/types';
import { usePapelNoProjeto } from '@/app/components/chat/usePapelNoProjeto';
import { podeEscrever } from '@/app/components/chat/perfis';

/**
 * Painel do Planner no board (SNA-RD-189).
 *
 * Conversa com o Neuron no perfil `board_planner` e na superfície
 * `board_planner` (sem Snapper). Usa um chat próprio do usuário no projeto,
 * criado na primeira mensagem e reaberto pelo título; os escopos de chat são
 * da 25.0. Quando uma tool muda card ou task, o board recarrega.
 */
export const TITULO_CHAT_PLANNER = 'Planner · board';

interface PlannerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | undefined;
  onBoardChanged: () => void;
}

export function PlannerPanel({ isOpen, onClose, projectId, onBoardChanged }: PlannerPanelProps) {
  const { papel, carregando: carregandoPapel } = usePapelNoProjeto(projectId);
  const [chatId, setChatId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [entrada, setEntrada] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trabalhando, setTrabalhando] = useState<string | null>(null);
  const pode = podeEscrever(papel);

  const abrir = useCallback(async () => {
    if (!projectId) return;
    setCarregando(true);
    setErro(null);
    try {
      const chat = (await listChats(projectId)).find((c) => c.title === TITULO_CHAT_PLANNER);
      if (chat) {
        setChatId(chat.id);
        setMensagens(await getChatHistory(chat.id));
      }
    } catch {
      setErro('Não foi possível carregar a conversa do Planner.');
    } finally {
      setCarregando(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && pode) void abrir();
  }, [isOpen, pode, abrir]);

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    const texto = entrada.trim();
    if (!texto || !projectId || trabalhando) return;
    setEntrada('');
    setErro(null);
    setMensagens((prev) => [...prev, { id: `u-${Date.now()}`, chat_id: chatId ?? 'temp', role: 'user', content: texto, created_at: new Date().toISOString() }]);
    setTrabalhando('Pensando…');
    try {
      let id = chatId;
      if (!id) {
        id = (await createChat(projectId, TITULO_CHAT_PLANNER)).id;
        setChatId(id);
      }
      await createMessage(id, texto, 'user');
      let resposta = '';
      let falha: string | null = null;
      await streamChat({ projectId, chatId: id, perfil: 'board_planner', superficie: 'board_planner', message: texto }, (evento) => {
        switch (evento.type) {
          case 'token':
            resposta += evento.content;
            setTrabalhando(null);
            setMensagens((prev) => {
              const ultima = prev[prev.length - 1];
              const nova: Message = { id: 'streaming', chat_id: id!, role: 'assistant', content: resposta, created_at: new Date().toISOString() };
              return ultima?.id === 'streaming' ? [...prev.slice(0, -1), nova] : [...prev, nova];
            });
            break;
          case 'thinking':
            setTrabalhando(evento.content);
            break;
          case 'tool_start':
            setTrabalhando(`Usando ${evento.tool}…`);
            break;
          case 'board_changed':
            onBoardChanged();
            break;
          case 'error':
            falha = evento.message;
            break;
          default:
            break;
        }
      });
      if (resposta) await createMessage(id, resposta, 'assistant', [{ perfil: 'board_planner', snaps_referenciados: [] }]);
      if (falha) setErro(falha);
    } catch (falhaDeRede: any) {
      setErro(falhaDeRede?.message || 'Não foi possível falar com o Planner agora.');
    } finally {
      setTrabalhando(null);
    }
  };

  let corpo;
  if (carregandoPapel || carregando) {
    corpo = <p role="status" className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>Carregando…</p>;
  } else if (!pode) {
    corpo = (
      <div role="alert" className="flex flex-col items-center gap-2 py-10 text-center">
        <Lock className="w-6 h-6" style={{ color: 'var(--snaps-error)' }} />
        <p className="text-sm" style={{ color: 'var(--snaps-text-primary)' }}>Você não tem permissão para planejar neste projeto.</p>
        <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>O Planner cria e move cards; ele pede o papel member.</p>
      </div>
    );
  } else if (mensagens.length === 0) {
    corpo = (
      <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
        Peça ao Planner para criar, detalhar ou mover cards e tasks deste board.
      </p>
    );
  } else {
    corpo = (
      <div className="flex flex-col gap-3" aria-label="Conversa com o Planner">
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-[var(--radius-lg)] text-sm whitespace-pre-wrap border ${m.role === 'assistant' ? 'border-orange-500/30 bg-orange-500/10' : 'border-white/10 bg-white/5 ml-8'}`}
            style={{ color: 'var(--snaps-text-primary)' }}
          >
            {m.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] z-50 flex flex-col border-l border-orange-500/30 bg-black/90 backdrop-blur-2xl"
            role="dialog"
            aria-label="Planner — board"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-500/20 border-2 border-orange-500/50">
                    <Bot className="w-6 h-6" style={{ color: 'var(--snaps-accent-orange)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--snaps-text-primary)' }}>Planner — board</h2>
                    <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>Organiza cards e tasks pelo Neuron</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  aria-label="Fechar o Planner"
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10"
                >
                  <X className="w-5 h-5" style={{ color: 'var(--snaps-text-secondary)' }} />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3">
              {corpo}
              {trabalhando && <p role="status" className="text-xs" style={{ color: 'var(--snaps-accent-orange)' }}>{trabalhando}</p>}
              {erro && <p role="alert" className="text-xs" style={{ color: 'var(--snaps-error)' }}>{erro}</p>}
            </div>

            {pode && (
              <form onSubmit={enviar} className="p-6 border-t border-white/10">
                <div className="relative rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl">
                  <input
                    type="text"
                    aria-label="Mensagem ao Planner"
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    placeholder="Peça ao Planner…"
                    className="w-full px-6 py-4 pr-16 bg-transparent text-sm focus:outline-none"
                    style={{ color: 'var(--snaps-text-primary)' }}
                  />
                  <button
                    type="submit"
                    aria-label="Enviar ao Planner"
                    disabled={!entrada.trim() || !!trabalhando}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      entrada.trim() ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/40' : 'bg-white/5 opacity-50'
                    }`}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
