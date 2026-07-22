import { ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { SnapDetailModal } from '@/app/components/modals/snap-detail-modal';

import { ChatMessage } from '@/app/components/chat/chat-message';
import { ChatInput } from '@/app/components/chat/chat-input';
import { useActiveChat } from '@/app/components/chat/useActiveChat';
import { ActiveChatSidebar } from '@/app/components/chat/ActiveChatSidebar';

export function ActiveChat() {
  const {
    projectId,
    sessionId,
    navigate,
    messages,
    inputValue,
    setInputValue,
    project,
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
  } = useActiveChat();

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

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <NeuralBackground />

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

          {/* Input Area */}
          <ChatInput inputValue={inputValue} setInputValue={setInputValue} handleSend={handleSend} />
        </motion.div>

        {/* RIGHT PANEL - Contextual Memory */}
        <ActiveChatSidebar
          mobileView={mobileView}
          rightPanelTab={rightPanelTab}
          setRightPanelTab={setRightPanelTab}
          suggestedSnaps={suggestedSnaps}
          handleSnapClick={handleSnapClick}
          handleSuggestedSnapClick={handleSuggestedSnapClick}
          handleAcceptSnap={handleAcceptSnap}
        />
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