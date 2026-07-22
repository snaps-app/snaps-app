import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChat, createMessage, getChatHistory, streamChat } from '@/services/chats';
import { getProject } from '@/services/projects';
import type { Message, Project } from '@/services/types';
import type { ReferencedSnap } from '@/app/components/chat/referenced-snap-card';
import type { SuggestedSnap } from '@/app/components/chat/suggested-snap-card';

const mockSuggestedSnaps: SuggestedSnap[] = [
  {
    id: 's1',
    title: 'Atomic Notes Definition',
    content: 'Atomic notes contain one idea per note, enabling self-contained concepts that can be linked flexibly.',
    tags: [
      { label: 'concept', variant: 'blue' },
      { label: 'definition', variant: 'purple' }
    ],
    confidence: 0.95,
    timestamp: 'Just now'
  },
  {
    id: 's2',
    title: 'Linking Strategy',
    content: 'Connections emerge when related concepts are linked. Bidirectional links create a knowledge graph.',
    tags: [
      { label: 'strategy', variant: 'orange' },
      { label: 'connections', variant: 'green' }
    ],
    confidence: 0.88,
    timestamp: 'Just now'
  }
];

export function useActiveChat() {
  const { projectId, sessionId } = useParams<{ projectId: string, sessionId?: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(sessionId || null);
  const [isThinking, setIsThinking] = useState(false);
  const [isSnapDetailModalOpen, setIsSnapDetailModalOpen] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<ReferencedSnap | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'memory' | 'snapper'>('memory');
  const [suggestedSnaps, setSuggestedSnaps] = useState<SuggestedSnap[]>(mockSuggestedSnaps);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileView, setMobileView] = useState<'chat' | 'memory'>('chat');

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
      }).catch(console.error);
    } else {
      setCurrentChatId(null);
      setMessages([{
        id: 'welcome',
        chat_id: 'temp',
        role: 'assistant',
        content: 'Hello! I\'m your Second Brain assistant. What would you like to explore today?',
        created_at: new Date().toISOString()
      }]);
    }
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!inputValue.trim() || !projectId) {
      console.error("Cannot send message: Missing input or projectId", { inputValue, projectId });
      return;
    }

    const userContent = inputValue;
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

    try {
      let activeChatId = currentChatId;

      if (!activeChatId) {
        const newChat = await createChat(projectId, userContent.slice(0, 30) || 'New Chat');
        activeChatId = newChat.id;
        setCurrentChatId(activeChatId);
        navigate(`/project/${projectId}/chat/${activeChatId}`, { replace: true });
      }

      await createMessage(activeChatId!, userContent, 'user');

      let accumulatedResponse = '';
      await streamChat(projectId, userContent, (event: any) => {
        setIsThinking(false);
        if (event.type === 'token') {
          accumulatedResponse += event.content;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.role === 'assistant' && last.id === 'streaming') {
              return [...prev.slice(0, -1), { ...last, content: accumulatedResponse }];
            } else {
              return [...prev, {
                id: 'streaming',
                chat_id: activeChatId!,
                role: 'assistant',
                content: accumulatedResponse,
                created_at: new Date().toISOString()
              }];
            }
          });
        }
      });

      if (accumulatedResponse) {
        await createMessage(activeChatId!, accumulatedResponse, 'assistant');
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      setIsThinking(false);

      const errorMessage = error.message || 'Sorry, I encountered an error processing your request.';

      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        chat_id: currentChatId || 'temp',
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        created_at: new Date().toISOString()
      }]);
    }
  };

  const handleSnapClick = (snap: ReferencedSnap) => {
    setSelectedSnap(snap);
    setIsSnapDetailModalOpen(true);
  };

  const handleSuggestedSnapClick = (snap: SuggestedSnap) => {
    const snapForModal: ReferencedSnap = {
      id: snap.id,
      title: snap.title,
      content: snap.content,
      tags: snap.tags,
      timestamp: snap.timestamp,
      isActive: false
    };
    setSelectedSnap(snapForModal);
    setIsSnapDetailModalOpen(true);
  };

  const handleAcceptSnap = (snapId: string) => {
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
    isSnapDetailModalOpen,
    setIsSnapDetailModalOpen,
    selectedSnap,
    rightPanelTab,
    setRightPanelTab,
    suggestedSnaps,
    messagesEndRef,
    mobileView,
    setMobileView,
    handleSend,
    handleSnapClick,
    handleSuggestedSnapClick,
    handleAcceptSnap
  };
}
