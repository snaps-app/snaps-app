import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChat, createMessage, getChatHistory, streamChat, type PerfilNeuron } from '@/services/chats';
import { getProject } from '@/services/projects';
import type { Message, Project } from '@/services/types';
import type { ReferencedSnap } from '@/app/components/chat/referenced-snap-card';
import type { SuggestedSnap } from '@/app/components/chat/suggested-snap-card';
import { PERFIL_PADRAO, idsReferenciados, podeEscolherPerfil, podeEscrever } from './perfis';
import { usePapelNoProjeto } from './usePapelNoProjeto';
import {
  aceitarSugestao,
  carregarReferenciados,
  juntarPorId,
  referenciadoDoEvento,
  sugeridoDoEvento,
} from './snapsDoChat';

const AVISO_INCOMPLETO = '\n\n_(Resposta incompleta: o Neuron parou num limite de segurança do turno.)_';

export function useActiveChat() {
  const { projectId, sessionId } = useParams<{ projectId: string, sessionId?: string }>();
  const navigate = useNavigate();
  const { papel, carregando: carregandoPapel } = usePapelNoProjeto(projectId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(sessionId || null);
  const [isThinking, setIsThinking] = useState(false);
  const [statusDoTurno, setStatusDoTurno] = useState<string | null>(null);
  const [isSnapDetailModalOpen, setIsSnapDetailModalOpen] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<ReferencedSnap | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'memory' | 'snapper'>('memory');
  const [suggestedSnaps, setSuggestedSnaps] = useState<SuggestedSnap[]>([]);
  const [referencedSnaps, setReferencedSnaps] = useState<ReferencedSnap[]>([]);
  const [carregandoReferenciados, setCarregandoReferenciados] = useState(false);
  const [erroReferenciados, setErroReferenciados] = useState(false);
  const [avisoSnapper, setAvisoSnapper] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [perfilEscolhido, setPerfilEscolhido] = useState<PerfilNeuron>(PERFIL_PADRAO);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileView, setMobileView] = useState<'chat' | 'memory'>('chat');

  const podeEscolher = podeEscolherPerfil(papel);
  // O viewer usa só o Chatter, mesmo que o estado diga outra coisa.
  const perfil: PerfilNeuron = podeEscolher ? perfilEscolhido : PERFIL_PADRAO;

  useEffect(() => {
    if (projectId) {
      getProject(projectId).then(setProject).catch(console.error);
    }
  }, [projectId]);

  useEffect(() => {
    if (sessionId) {
      setCurrentChatId(sessionId);
      getChatHistory(sessionId).then((history: Message[]) => {
        setMessages(history);
        // Os referenciados de cada resposta ficam em `tool_calls`: sobrevivem ao reload.
        const ids = [...new Set(history.flatMap((m) => idsReferenciados(m.tool_calls)))];
        if (!projectId || ids.length === 0) return;
        setCarregandoReferenciados(true);
        carregarReferenciados(projectId, ids)
          .then((snaps) => {
            setReferencedSnaps(snaps);
            setErroReferenciados(false);
          })
          .catch(() => setErroReferenciados(true))
          .finally(() => setCarregandoReferenciados(false));
      }).catch(console.error);
    } else {
      setCurrentChatId(null);
      setReferencedSnaps([]);
      setMessages([{
        id: 'welcome',
        chat_id: 'temp',
        role: 'assistant',
        content: 'Olá! Sou o Neuron. O que você quer saber do projeto?',
        created_at: new Date().toISOString()
      }]);
    }
  }, [sessionId, projectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!inputValue.trim() || !projectId) return;

    const userContent = inputValue;
    const perfilDoTurno = perfil;
    setInputValue('');

    const tempUserMsg: Message = {
      id: Date.now().toString(),
      chat_id: currentChatId || 'temp',
      role: 'user',
      content: userContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsThinking(true);
    setStatusDoTurno(null);

    let activeChatId = currentChatId;
    try {
      if (!activeChatId) {
        const newChat = await createChat(projectId, userContent.slice(0, 30) || 'Novo chat');
        activeChatId = newChat.id;
        setCurrentChatId(activeChatId);
        navigate(`/project/${projectId}/chat/${activeChatId}`, { replace: true });
      }

      // O app grava a pergunta antes de chamar o Neuron; o Neuron não a duplica (C6).
      await createMessage(activeChatId!, userContent, 'user');

      let resposta = '';
      let perfilQueRespondeu: PerfilNeuron = perfilDoTurno;
      let incompleto = false;
      let erroDoTurno: string | null = null;
      const idsDoTurno: string[] = [];
      const registro = () => [{ perfil: perfilQueRespondeu, snaps_referenciados: [...idsDoTurno] }];

      const mostrar = (conteudo: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          const streaming: Message = {
            id: 'streaming',
            chat_id: activeChatId!,
            role: 'assistant',
            content: conteudo,
            created_at: last?.id === 'streaming' ? last.created_at : new Date().toISOString(),
            tool_calls: registro(),
          };
          return last?.id === 'streaming' ? [...prev.slice(0, -1), streaming] : [...prev, streaming];
        });
      };

      await streamChat(
        { projectId, chatId: activeChatId!, perfil: perfilDoTurno, superficie: 'chat', message: userContent },
        (evento) => {
          switch (evento.type) {
            case 'token':
              setIsThinking(false);
              resposta += evento.content;
              mostrar(resposta);
              break;
            case 'thinking':
              setStatusDoTurno(evento.content);
              break;
            case 'tool_start':
              setStatusDoTurno(`Consultando ${evento.tool}…`);
              break;
            case 'snaps_referenced':
              evento.snaps.forEach((s) => idsDoTurno.includes(s.id) || idsDoTurno.push(s.id));
              setReferencedSnaps(prev => juntarPorId(prev, evento.snaps.map(referenciadoDoEvento)));
              break;
            case 'snap_suggested':
              setSuggestedSnaps(prev => juntarPorId([sugeridoDoEvento(evento.snap)], prev));
              break;
            case 'error':
              erroDoTurno = evento.message;
              break;
            case 'done':
              perfilQueRespondeu = (evento.perfil as PerfilNeuron) || perfilDoTurno;
              incompleto = evento.incompleto;
              break;
            default:
              break;
          }
        },
      );

      setIsThinking(false);
      setStatusDoTurno(null);
      if (incompleto) resposta += AVISO_INCOMPLETO;
      if (resposta) {
        mostrar(resposta);
        await createMessage(activeChatId!, resposta, 'assistant', registro());
      }
      if (erroDoTurno) {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          chat_id: activeChatId!,
          role: 'assistant',
          content: erroDoTurno!,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setIsThinking(false);
      setStatusDoTurno(null);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        chat_id: activeChatId || 'temp',
        role: 'assistant',
        content: error?.message || 'Não foi possível falar com o Neuron agora. Tente de novo.',
        created_at: new Date().toISOString()
      }]);
    }
  };

  const handleSnapClick = (snap: ReferencedSnap) => {
    setSelectedSnap(snap);
    setIsSnapDetailModalOpen(true);
  };

  const handleSuggestedSnapClick = (snap: SuggestedSnap) => {
    setSelectedSnap({
      id: snap.id,
      title: snap.title,
      content: snap.content,
      tags: snap.tags,
      timestamp: snap.timestamp,
      isActive: false
    });
    setIsSnapDetailModalOpen(true);
  };

  const handleAcceptSnap = async (snapId: string) => {
    const sugestao = suggestedSnaps.find(s => s.id === snapId);
    if (!sugestao || !projectId || !podeEscrever(papel)) return;
    try {
      await aceitarSugestao(projectId, sugestao);
      setSuggestedSnaps(prev => prev.filter(s => s.id !== snapId));
      setAvisoSnapper({ tipo: 'ok', texto: `Snap "${sugestao.title}" guardado no projeto.` });
    } catch {
      setAvisoSnapper({ tipo: 'erro', texto: 'Não foi possível guardar o snap. Tente de novo.' });
    }
  };

  const handleDiscardSnap = (snapId: string) => {
    setSuggestedSnaps(prev => prev.filter(s => s.id !== snapId));
  };

  return {
    projectId,
    sessionId,
    navigate,
    messages,
    inputValue,
    setInputValue,
    project,
    currentChatId,
    isThinking,
    statusDoTurno,
    isSnapDetailModalOpen,
    setIsSnapDetailModalOpen,
    selectedSnap,
    rightPanelTab,
    setRightPanelTab,
    suggestedSnaps,
    referencedSnaps,
    carregandoReferenciados,
    erroReferenciados,
    avisoSnapper,
    messagesEndRef,
    mobileView,
    setMobileView,
    handleSend,
    handleSnapClick,
    handleSuggestedSnapClick,
    handleAcceptSnap,
    handleDiscardSnap,
    papel,
    carregandoPapel,
    perfil,
    setPerfil: setPerfilEscolhido,
    podeEscolherPerfil: podeEscolher,
    podeAceitarSnap: podeEscrever(papel),
  };
}
