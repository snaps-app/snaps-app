import { useEffect, useState } from 'react';
import { Search, Folder, ChevronRight, ChevronDown, FileText, Code, Image as ImageIcon, Hash, Clock, Brain, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './card';
import { Tag } from './tag';
import { NeuralBackground } from './neural-background';
import { SnapDetailModal } from './snap-detail-modal';
import api, { Snap, Project } from '@/services/api';
import { SnapCard } from './snap-card';
import { useNavigate } from 'react-router-dom';

interface FolderNode {
  id: string;
  name: string;
  type: 'project' | 'group';
  children?: FolderNode[];
  count?: number;
}

interface MemoryCard extends Snap {
  project_name?: string;
}

function FolderTree({ nodes, level = 0 }: { nodes: FolderNode[]; level?: number }) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['1', '2', '3', '4']);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div>
      {nodes.map((node) => {
        const isExpanded = expandedFolders.includes(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
          <div key={node.id}>
            <motion.button
              onClick={() => hasChildren && toggleFolder(node.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group"
              style={{
                paddingLeft: `${(level * 16) + 12}px`,
                backgroundColor: 'transparent'
              }}
              whileHover={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--snaps-accent-blue)' }} />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--snaps-text-secondary)' }} />
                )
              ) : (
                <div className="w-4" />
              )}

              <Folder
                className="w-4 h-4 flex-shrink-0"
                style={{
                  color: node.type === 'project'
                    ? 'var(--snaps-accent-blue)'
                    : 'var(--snaps-accent-purple)'
                }}
              />

              <span
                className="flex-1 text-left font-medium"
                style={{ color: 'var(--snaps-text-primary)' }}
              >
                {node.name}
              </span>

              {node.count !== undefined && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    color: 'var(--snaps-accent-blue)'
                  }}
                >
                  {node.count}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {isExpanded && hasChildren && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FolderTree nodes={node.children!} level={level + 1} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// MemoryCardComponent removed. Using SnapCard instead.

export function MemoryView() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSnapDetailModalOpen, setIsSnapDetailModalOpen] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<MemoryCard | null>(null);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { snaps, projects } = await api.getAllSnaps();

        // Transform Snaps to MemoryCards
        setMemoryCards(snaps as MemoryCard[]);

        // Generate Folder Structure from Projects
        const folders: FolderNode[] = projects.map(p => ({
          id: p.id,
          name: p.name,
          type: 'project',
          count: snaps.filter(s => s.project_id === p.id).length,
          children: [] // Groups not supported yet in MVP
        }));
        setFolderStructure(folders);
      } catch (error) {
        console.error('Failed to fetch memory data:', error);
      }
    };
    fetchData();
  }, []);

  const handleCardClick = (card: MemoryCard) => {
    setSelectedSnap(card);
    setIsSnapDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Dense Neural Network Background */}
      <NeuralBackground density="high" />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-20 w-10 h-10 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
        style={{
          background: 'rgba(255, 107, 53, 0.1)',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)'
        }}
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-accent-orange)' }} />
      </motion.button>

      <div className="relative z-10 h-screen flex">
        {/* LEFT SIDEBAR - Folder Structure */}
        <motion.div
          className="w-80 border-r border-white/10 backdrop-blur-[30px] flex flex-col"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)' }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/10">
            <h2
              className="text-2xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Knowledge Base
            </h2>
            <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
              All your projects and memories
            </p>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <FolderTree nodes={folderStructure} />
          </div>

          {/* Stats Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {memoryCards.length}
                </div>
                <div className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                  Total
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: 'var(--snaps-accent-blue)' }}
                >
                  {folderStructure.length}
                </div>
                <div className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                  Projects
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: 'var(--snaps-accent-purple)' }}
                >
                  0
                </div>
                <div className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                  Groups
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* MAIN AREA - Knowledge Grid */}
        <div className="flex-1 flex flex-col">
          {/* Search Header */}
          <motion.div
            className="p-8 border-b border-white/10 backdrop-blur-[30px]"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="max-w-4xl mx-auto">
              {/* Neural Search Badge */}
              <motion.div
                className="flex items-center justify-center gap-2 mb-4"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 212, 255, 0.4)',
                    '0 0 40px rgba(0, 212, 255, 0.6)',
                    '0 0 20px rgba(0, 212, 255, 0.4)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(168, 85, 247, 0.2))',
                    border: '1px solid rgba(0, 212, 255, 0.5)',
                    boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(0, 212, 255, 0.1)'
                  }}
                >
                  <Brain className="w-4 h-4" style={{ color: 'var(--snaps-accent-blue)' }} />
                  <span style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Neural Search
                  </span>
                </div>
              </motion.div>

              {/* Search Bar */}
              <div className="relative">
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6"
                  style={{ color: 'var(--snaps-accent-blue)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all your knowledge..."
                  className="w-full pl-16 pr-6 py-5 rounded-2xl backdrop-blur-xl text-lg focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(0, 212, 255, 0.3)',
                    color: 'var(--snaps-text-primary)',
                    boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.6)';
                    e.target.style.boxShadow = '0 0 40px rgba(0, 212, 255, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                    e.target.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.3)';
                  }}
                />
              </div>

              {/* Type Filters */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                  style={{
                    background: 'rgba(0, 212, 255, 0.15)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: 'var(--snaps-accent-blue)'
                  }}
                >
                  <FileText className="w-4 h-4" />
                  Notes
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: 'var(--snaps-accent-purple)'
                  }}
                >
                  <ImageIcon className="w-4 h-4" />
                  Files
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                  style={{
                    background: 'rgba(255, 107, 53, 0.15)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: 'var(--snaps-accent-orange)'
                  }}
                >
                  <Code className="w-4 h-4" />
                  Code
                </button>
              </div>
            </div>
          </motion.div>

          {/* Knowledge Grid */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {memoryCards.filter(card =>
                    card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    card.content.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((card) => (
                    <SnapCard
                      key={card.id}
                      snap={card}
                      projectName={card.project_name}
                      onClick={handleCardClick}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
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