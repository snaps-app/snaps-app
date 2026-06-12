import { createChat, createMessage, getChatHistory, streamChat } from '@/services/chats';
import { getProject } from '@/services/projects';
import type { Chat, Message, Project } from '@/services/types';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Database, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { SnapDetailModal } from '@/app/components/modals/snap-detail-modal';
import { useParams, useNavigate } from 'react-router-dom';

import { ChatMessage } from '@/app/components/chat/chat-message';
import { ChatInput } from '@/app/components/chat/chat-input';
import { ReferencedSnapCard, ReferencedSnap } from '@/app/components/chat/referenced-snap-card';
import { SuggestedSnapCard, SuggestedSnap } from '@/app/components/chat/suggested-snap-card';

const mockReferencedSnaps: ReferencedSnap[] = [
  {
    id: '1',
    title: 'Zettelkasten Method',
    content: 'Each note should contain one idea. This enables atomic thinking and better connections.',
    isActive: true,
    tags: [
      { label: 'Zettelkasten', variant: 'blue' },
      { label: 'Atomic Thinking', variant: 'orange' }
    ],
    timestamp: '10:24 AM'
  },
  {
    id: '2',
    title: 'PARA Method',
    content: 'Projects (active), Areas (ongoing), Resources (reference), Archives (inactive). Organize by actionability.',
    isActive: true,
    tags: [
      { label: 'PARA', variant: 'purple' },
      { label: 'Actionability', variant: 'green' }
    ],
    timestamp: '10:24 AM'
  },
  {
    id: '3',
    title: 'Progressive Summarization',
    content: 'Layer highlighting to surface key insights without losing context.',
    isActive: false,
    tags: [
      { label: 'Summarization', variant: 'pink' },
      { label: 'Context', variant: 'blue' }
    ],
    timestamp: '10:24 AM'
  }
];

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

export function ActiveChat() {
  const { projectId, sessionId } = useParams<{ projectId: string, sessionId?: string }>();
  const navigate = useNavigate();

  // State
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

  // Validation: If no projectId, cannot chat.
  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: 'var(--snaps-bg)' }}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">No Project Selected</h2>
          <p className="text-gray-400 mb-6">Please go back and select a project to start chatting.</p>

          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Load Project
  useEffect(() => {
    if (projectId) {
      getProject(projectId).then(setProject).catch(console.error);
    }
  }, [projectId]);

  // Load Chat History
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

    // Optimistic User Message
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

      // 1. Create Chat if needed
      if (!activeChatId) {
        const newChat = await createChat(projectId, userContent.slice(0, 30) || 'New Chat');
        activeChatId = newChat.id;
        setCurrentChatId(activeChatId);
        navigate(`/project/${projectId}/chat/${activeChatId}`, { replace: true });
      }

      // 2. Persist User Message
      await createMessage(activeChatId!, userContent, 'user');

      // 3. Stream Response
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

      // 4. Persist Assistant Message
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
    console.log('Accept snap:', snapId);
    setSuggestedSnaps(prev => prev.filter(s => s.id !== snapId));
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

      {/* Main Container */}
      <div className="relative z-10 h-screen flex">
        {/* Mobile View Toggle */}
        <div className="md:hidden fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center p-1 rounded-full backdrop-blur-2xl"
          style={{ background: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => setMobileView('chat')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mobileView === 'chat' ? 'bg-white/10 text-white' : 'text-white/50'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setMobileView('memory')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mobileView === 'memory' ? 'bg-white/10 text-white' : 'text-white/50'}`}
          >
            Memories
          </button>
        </div>

        {/* LEFT PANEL - Chat Stream (50%) */}
        <motion.div
          className={`w-full md:w-1/2 border-r border-white/10 backdrop-blur-[30px] flex-col pb-safe md:pb-0 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Chat Header */}
          <div className="p-6 pt-16 md:pt-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/project/${projectId}`)}
                className="w-9 h-9 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(255, 107, 53, 0.1)',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)'
                }}
              >
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-accent-orange)' }} />
              </motion.button>

              <div>
                <h2
                  className="text-xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {sessionId ? 'Active Session' : 'New Chat'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                  {project?.name || 'Loading...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--snaps-accent-blue)' }} />
              <span className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                AI Active
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <ChatMessage key={message.id} message={message} index={index} />
              ))}
            </AnimatePresence>

            {/* Thinking Indicator */}
            {isThinking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex justify-start"
              >
                <div
                  className="p-4 rounded-2xl backdrop-blur-xl"
                  style={{
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid rgba(0, 212, 255, 0.3)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="flex gap-1"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--snaps-accent-blue)' }} />
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--snaps-accent-purple)' }} />
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--snaps-accent-blue)' }} />
                    </motion.div>
                    <span className="text-sm" style={{ color: 'var(--snaps-accent-blue)' }}>
                      Thinking...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Command Palette */}
          <ChatInput inputValue={inputValue} setInputValue={setInputValue} handleSend={handleSend} />
        </motion.div>

        {/* RIGHT PANEL - Contextual Memory (50%) */}
        <div className={`w-full md:w-1/2 flex-col pt-16 md:pt-0 ${mobileView === 'memory' ? 'flex' : 'hidden md:flex'}`}>
          {/* Panel Header with Tabs */}
          <motion.div
            className="backdrop-blur-[30px] border-b border-white/10"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Tabs */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => setRightPanelTab('memory')}
                className="flex-1 px-6 py-4 text-sm font-medium transition-all relative"
                style={{
                  color: rightPanelTab === 'memory' ? 'var(--snaps-accent-blue)' : 'var(--snaps-text-secondary)',
                  background: rightPanelTab === 'memory' ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 0, 0, 0)'
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Database className="w-4 h-4" />
                  Contextual Memory
                </div>
                {rightPanelTab === 'memory' && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--snaps-accent-blue)', boxShadow: '0 0 10px rgba(0, 212, 255, 0.6)' }}
                    layoutId="activeTab"
                  />
                )}
              </button>

              <button
                onClick={() => setRightPanelTab('snapper')}
                className="flex-1 px-6 py-4 text-sm font-medium transition-all relative"
                style={{
                  color: rightPanelTab === 'snapper' ? 'var(--snaps-accent-purple)' : 'var(--snaps-text-secondary)',
                  background: rightPanelTab === 'snapper' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 0, 0, 0)'
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  Snap Area
                  {suggestedSnaps.length > 0 && (
                    <motion.span
                      className="px-2 py-0.5 text-xs rounded-full font-medium"
                      style={{
                        background: 'rgba(168, 85, 247, 0.3)',
                        color: 'var(--snaps-accent-purple)',
                        border: '1px solid rgba(168, 85, 247, 0.5)'
                      }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {suggestedSnaps.length}
                    </motion.span>
                  )}
                </div>
                {rightPanelTab === 'snapper' && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--snaps-accent-purple)', boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}
                    layoutId="activeTab"
                  />
                )}
              </button>
            </div>

            {/* Tab Content Header */}
            <div className="p-6">
              {rightPanelTab === 'memory' ? (
                <>
                  <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--snaps-text-primary)' }}>
                    Contextual Memory
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                    {mockReferencedSnaps.length} snaps referenced in this conversation
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap className="w-5 h-5" style={{ color: 'var(--snaps-accent-purple)' }} />
                    </motion.div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--snaps-text-primary)' }}>
                      Snapper Agent
                    </h2>
                    <motion.div
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.5)',
                        color: 'var(--snaps-accent-green)'
                      }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Active
                    </motion.div>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                    {suggestedSnaps.length} snaps suggested from conversation
                  </p>
                </>
              )}
            </div>
          </motion.div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence mode="wait">
              {rightPanelTab === 'memory' ? (
                <motion.div
                  key="memory"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {mockReferencedSnaps.map((snap, index) => (
                    <ReferencedSnapCard
                      key={snap.id}
                      snap={snap}
                      index={index}
                      onClick={() => handleSnapClick(snap)}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="snapper"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {suggestedSnaps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Zap className="w-16 h-16 mb-4 opacity-20" style={{ color: 'var(--snaps-accent-purple)' }} />
                      <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                        Snapper is listening...
                      </p>
                      <p className="text-xs mt-2" style={{ color: 'var(--snaps-text-secondary)' }}>
                        New snaps will appear here as you chat
                      </p>
                    </div>
                  ) : (
                    suggestedSnaps.map((snap, index) => (
                      <SuggestedSnapCard
                        key={snap.id}
                        snap={snap}
                        index={index}
                        onClick={() => handleSuggestedSnapClick(snap)}
                        onAccept={(e) => {
                          e.stopPropagation();
                          handleAcceptSnap(snap.id);
                        }}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Snap Detail Modal */}
      <SnapDetailModal
        isOpen={isSnapDetailModalOpen}
        onClose={() => setIsSnapDetailModalOpen(false)}
        snap={selectedSnap as any}
      />
    </div>
  );
}