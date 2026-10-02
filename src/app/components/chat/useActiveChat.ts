import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChat, getChatHistory, type PerfilNeuron } from '@/services/chats';
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

import {useConversa} from './comum/useConversa';

export function useActiveChat() {
  const { projectId, sessionId } = useParams<{ projectId: string, sessionId?: string }>();
  const navigate = useNavigate();
  const { papel, carregando: carregandoPapel } = usePapelNoProjeto(projectId);

  const [inputValue, setInputValue] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(sessionId || null);
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

  const geracaoDoChat = useRef(0);
  const chatDoTurno = useRef<string | null>(sessionId ?? null);
  const rotaAtual = useRef(`${projectId}:${sessionId}`);
  rotaAtual.current = `${projectId}:${sessionId}`;
  const conversa = useConversa({
    projectId, chave: `${projectId}:${sessionId}:${perfil}`, perfil, superficie: 'chat',
    obterChat: async (texto) => {
      if (chatDoTurno.current) return chatDoTurno.current;
      const geracao = geracaoDoChat.current;
      const chat = await createChat(projectId!, texto.slice(0, 30) || 'Novo chat');
      if(geracao===geracaoDoChat.current) {
        chatDoTurno.current = chat.id;
        setCurrentChatId(chat.id);
      }
      return chat.id;
    },
    aoEvento: evento => {
      if (evento.type === 'snaps_referenced') {
        setReferencedSnaps(prev => juntarPorId(prev, evento.snaps.map(referenciadoDoEvento)));
      } else if (evento.type === 'snap_suggested') {
        setSuggestedSnaps(prev => juntarPorId([sugeridoDoEvento(evento.snap)], prev));
      }
    },
  });
  const {messages, setMessages, ocupado: isThinking} = conversa;
  useEffect(()=>()=>{geracaoDoChat.current+=1;},[perfil]);
  const statusDoTurno = isThinking ? 'Respondendo…' : null;

  useEffect(() => {
    let atual = true;
    if (projectId) {
      getProject(projectId).then(p => {if(atual) setProject(p);}).catch(console.error);
    }
    return () => {atual=false;};
  }, [projectId]);

  useEffect(() => {
    let atual = true;
    geracaoDoChat.current+=1;
    chatDoTurno.current = sessionId ?? null;
    setSuggestedSnaps([]);
    setReferencedSnaps([]);
    setMessages([]);
    if (sessionId) {
      setCurrentChatId(sessionId);
      getChatHistory(sessionId).then((history: Message[]) => {
        if(!atual) return;
        setMessages(history);
        // Os referenciados de cada resposta ficam em `tool_calls`: sobrevivem ao reload.
        const ids = [...new Set(history.flatMap((m) => idsReferenciados(m.tool_calls)))];
        if (!projectId || ids.length === 0) return;
        setCarregandoReferenciados(true);
        carregarReferenciados(projectId, ids)
          .then((snaps) => {
            if(!atual) return;
            setReferencedSnaps(snaps);
            setErroReferenciados(false);
          })
          .catch(() => {if(atual) setErroReferenciados(true);})
          .finally(() => {if(atual) setCarregandoReferenciados(false);});
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
    return () => {atual=false;geracaoDoChat.current+=1;};
  }, [sessionId, projectId, setMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!inputValue.trim() || !projectId || isThinking) return;
    const texto = inputValue;
    const rota = rotaAtual.current;
    setInputValue('');
    const enviou = await conversa.enviar(texto);
    if (enviou && !sessionId && chatDoTurno.current && rotaAtual.current === rota) {
      navigate(`/project/${projectId}/chat/${chatDoTurno.current}`, {replace: true});
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
    cancelar: conversa.cancelar,
    erroConversa: conversa.erro,
    persistenciaPendente: conversa.persistenciaPendente,
    repetirPersistencia: conversa.repetirPersistencia,
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
