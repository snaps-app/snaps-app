import { Database, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

interface ActiveChatSidebarProps {
  mobileView: 'chat' | 'memory';
  rightPanelTab: 'memory' | 'snapper';
  setRightPanelTab: (tab: 'memory' | 'snapper') => void;
  suggestedSnaps: SuggestedSnap[];
  handleSnapClick: (snap: ReferencedSnap) => void;
  handleSuggestedSnapClick: (snap: SuggestedSnap) => void;
  handleAcceptSnap: (snapId: string) => void;
}

export function ActiveChatSidebar({
  mobileView,
  rightPanelTab,
  setRightPanelTab,
  suggestedSnaps,
  handleSnapClick,
  handleSuggestedSnapClick,
  handleAcceptSnap
}: ActiveChatSidebarProps) {
  return (
    <div className={`w-full md:w-1/2 flex-col pt-16 md:pt-0 ${mobileView === 'memory' ? 'flex' : 'hidden md:flex'}`}>
      <motion.div
        className="backdrop-blur-[30px] border-b border-white/10"
        style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
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
  );
}
