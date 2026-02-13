import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Paperclip, Database, FileText, Link2, Hash, Mic, Sparkles, Settings, FolderOpen, Check, X, Edit, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from './neural-background';
import { Tag } from './tag';
import { Card } from './card';
import { SnapDetailModal } from './snap-detail-modal';
import api, { Project, Message, Chat } from '@/services/api';

interface ReferencedSnap {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  tags: Array<{ label: string; variant: 'blue' | 'orange' | 'purple' | 'green' | 'pink' }>;
  timestamp: string;
}

interface SuggestedSnap {
  id: string;
  title: string;
  content: string;
  tags: Array<{ label: string; variant: 'blue' | 'orange' | 'purple' | 'green' | 'pink' }>;
  confidence: number;
  timestamp: string;
}

interface ActiveChatProps {
  sessionId: string | null;
  projectId: string | null;
  onBack?: () => void;
}

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

export function ActiveChat({ sessionId, projectId, onBack }: ActiveChatProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(sessionId);
  const [isThinking, setIsThinking] = useState(false);
  const [isSnapDetailModalOpen, setIsSnapDetailModalOpen] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<ReferencedSnap | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'memory' | 'snapper'>('memory');
  const [suggestedSnaps, setSuggestedSnaps] = useState<SuggestedSnap[]>(mockSuggestedSnaps);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Validation: If no projectId, cannot chat.
  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: 'var(--snaps-bg)' }}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">No Project Selected</h2>
          <p className="text-gray-400 mb-6">Please go back and select a project to start chatting.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Load Project
  useEffect(() => {
    if (projectId) {
      api.getProject(projectId).then(setProject).catch(console.error);
    }
  }, [projectId]);

  // Load Chat History
  useEffect(() => {
    if (sessionId) {
      setCurrentChatId(sessionId);
      api.getChatHistory(sessionId).then((history: Message[]) => {
        setMessages(history);
      }).catch(console.error);
    } else {
      setCurrentChatId(null);
      // Optional: Add welcome message locally
      setMessages([{
        id: 'welcome',
        chat_id: 'temp',
        role: 'assistant', // Use 'assistant' to match API type
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
        const newChat = await api.createChat(projectId, userContent.slice(0, 30) || 'New Chat');
        activeChatId = newChat.id;
        setCurrentChatId(activeChatId);
        // Update URL without navigation if possible, or just rely on internal state
        // If we want to update the URL, we might need a callback to parent to change route, 
        // but for now internal state is fine.
      }

      // 2. Persist User Message
      await api.createMessage(activeChatId!, userContent, 'user');

      // 3. Stream Response
      let accumulatedResponse = '';
      await api.streamChat(projectId, userContent, (event: any) => {
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

      // 4. Persist Assistant Message (Assumption: Agent doesn't save it)
      if (accumulatedResponse) {
        await api.createMessage(activeChatId!, accumulatedResponse, 'assistant');
        // Update the 'streaming' message with real ID from response? 
        // For now, just re-fetching history or leaving it as is is fine. 
        // Better: Replace 'streaming' ID with a real ID if we had one, but we don't.
        // We'll just leave it. Next reload will fix IDs.
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
    // Convert SuggestedSnap to ReferencedSnap format for modal
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

  const handleRejectSnap = (snapId: string) => {
    console.log('Reject snap:', snapId);
    setSuggestedSnaps(prev => prev.filter(s => s.id !== snapId));
  };

  const handleEditSnap = (snapId: string) => {
    console.log('Edit snap:', snapId);
    // Would open snap modal in edit mode
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

      {/* Main Container */}
      <div className="relative z-10 h-screen flex">
        {/* LEFT PANEL - Chat Stream (50%) */}
        <motion.div
          className="w-1/2 border-r border-white/10 backdrop-blur-[30px] flex flex-col"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Chat Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  className="w-9 h-9 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
                  style={{
                    background: 'rgba(255, 107, 53, 0.1)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)'
                  }}
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-accent-orange)' }} />
                </motion.button>
              )}
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
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] ${message.role === 'assistant' ? 'mr-auto' : 'ml-auto'}`}
                  >
                    {message.role === 'assistant' ? (
                      // Agent Bubble
                      <div
                        className="p-4 rounded-2xl backdrop-blur-xl relative"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid transparent',
                          backgroundImage: 'linear-gradient(rgba(10, 10, 10, 0.8), rgba(10, 10, 10, 0.8)), linear-gradient(135deg, #00D4FF, #A855F7)',
                          backgroundOrigin: 'border-box',
                          backgroundClip: 'padding-box, border-box',
                          boxShadow: '0 0 20px rgba(0, 212, 255, 0.15), inset 0 0 20px rgba(0, 212, 255, 0.05)'
                        }}
                      >
                        {/* Left Neon Border */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                          style={{
                            background: 'linear-gradient(180deg, #00D4FF 0%, #A855F7 100%)',
                            boxShadow: '0 0 10px rgba(0, 212, 255, 0.6)'
                          }}
                        />
                        <p
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                          style={{ color: 'var(--snaps-text-primary)' }}
                        >
                          {message.content}
                        </p>
                        <span
                          className="text-xs mt-2 block"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ) : (
                      // User Bubble
                      <div
                        className="p-4 rounded-2xl"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: 'var(--snaps-text-primary)' }}
                        >
                          {message.content}
                        </p>
                        <span
                          className="text-xs mt-2 block text-right"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
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
          <div className="p-6 border-t border-white/10">
            <div
              className="relative rounded-2xl backdrop-blur-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask your second brain..."
                className="w-full px-6 py-4 pr-28 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--snaps-text-primary)' }}
              />

              {/* Mic Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-16 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <Mic className="w-5 h-5" style={{ color: '#EF4444' }} />
              </motion.button>

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: inputValue.trim()
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: inputValue.trim()
                    ? '1px solid rgba(34, 197, 94, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: inputValue.trim()
                    ? '0 0 20px rgba(34, 197, 94, 0.6), inset 0 0 10px rgba(34, 197, 94, 0.2)'
                    : 'none',
                  opacity: inputValue.trim() ? 1 : 0.5
                }}
              >
                <Send className="w-5 h-5" style={{ color: inputValue.trim() ? 'var(--snaps-accent-green)' : '#888' }} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* RIGHT PANEL - Contextual Memory (50%) */}
        <div className="w-1/2 flex flex-col">
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
                    <motion.div
                      key={snap.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card
                        size="compact"
                        className="cursor-pointer relative"
                        style={{
                          background: snap.isActive
                            ? 'rgba(0, 212, 255, 0.08)'
                            : 'rgba(255, 255, 255, 0.03)',
                          backdropFilter: 'blur(20px)',
                          border: snap.isActive
                            ? '1px solid rgba(0, 212, 255, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: snap.isActive
                            ? '0 0 30px rgba(0, 212, 255, 0.3)'
                            : 'none'
                        }}
                        onClick={() => handleSnapClick(snap)}
                      >
                        {/* Active Synapse Pulse */}
                        {snap.isActive && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                            style={{ background: 'var(--snaps-accent-blue)' }}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [1, 0.5, 1]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut'
                            }}
                          />
                        )}

                        <p
                          className="text-sm leading-relaxed"
                          style={{
                            color: snap.isActive
                              ? 'var(--snaps-text-primary)'
                              : 'var(--snaps-text-secondary)'
                          }}
                        >
                          {snap.content}
                        </p>

                        {snap.isActive && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <span
                              className="text-xs flex items-center gap-2"
                              style={{ color: 'var(--snaps-accent-blue)' }}
                            >
                              <Sparkles className="w-3 h-3" />
                              Active in conversation
                            </span>
                          </div>
                        )}
                      </Card>
                    </motion.div>
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
                      <motion.div
                        key={snap.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card
                          size="compact"
                          className="relative cursor-pointer"
                          style={{
                            background: 'rgba(168, 85, 247, 0.05)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)'
                          }}
                          onClick={() => handleSuggestedSnapClick(snap)}
                        >
                          {/* Confidence Badge */}
                          <div
                            className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: `rgba(168, 85, 247, ${snap.confidence * 0.3})`,
                              border: '1px solid rgba(168, 85, 247, 0.5)',
                              color: 'var(--snaps-accent-purple)'
                            }}
                          >
                            {Math.round(snap.confidence * 100)}% match
                          </div>

                          {/* Snapper Badge */}
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-3 h-3" style={{ color: 'var(--snaps-accent-purple)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--snaps-accent-purple)' }}>
                              Suggested by Snapper
                            </span>
                          </div>

                          <h3
                            className="font-semibold mb-2 pr-20"
                            style={{ color: 'var(--snaps-text-primary)' }}
                          >
                            {snap.title}
                          </h3>

                          <p
                            className="text-sm mb-3 leading-relaxed"
                            style={{ color: 'var(--snaps-text-secondary)' }}
                          >
                            {snap.content}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {snap.tags.map((tag, i) => (
                              <Tag key={i} variant={tag.variant}>
                                <Hash className="w-3 h-3" />
                                {tag.label}
                              </Tag>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleAcceptSnap(snap.id)}
                              className="flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all"
                              style={{
                                background: 'rgba(34, 197, 94, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.5)',
                                color: 'var(--snaps-accent-green)'
                              }}
                            >
                              <Check className="w-4 h-4" />
                              Accept
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleEditSnap(snap.id)}
                              className="px-3 py-2 rounded-lg flex items-center justify-center transition-all"
                              style={{
                                background: 'rgba(0, 212, 255, 0.2)',
                                border: '1px solid rgba(0, 212, 255, 0.5)',
                                color: 'var(--snaps-accent-blue)'
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRejectSnap(snap.id)}
                              className="px-3 py-2 rounded-lg flex items-center justify-center transition-all"
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                color: '#EF4444'
                              }}
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/5">
                            <span className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                              {snap.timestamp}
                            </span>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Action Buttons - Right Edge */}
        <motion.div
          className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {/* Settings Button - Purple */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center transition-all"
            style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: '2px solid rgba(168, 85, 247, 0.5)',
              boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
            }}
          >
            <Settings className="w-6 h-6" style={{ color: 'var(--snaps-accent-purple)' }} />
          </motion.button>

          {/* Docs Button - Blue */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center transition-all"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: '2px solid rgba(0, 212, 255, 0.5)',
              boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)'
            }}
          >
            <FolderOpen className="w-6 h-6" style={{ color: 'var(--snaps-accent-blue)' }} />
          </motion.button>
        </motion.div>
      </div>

      {/* Snap Detail Modal */}
      <SnapDetailModal
        isOpen={isSnapDetailModalOpen}
        onClose={() => setIsSnapDetailModalOpen(false)}
        snap={selectedSnap}
      />
    </div>
  );
}