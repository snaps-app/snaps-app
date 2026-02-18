import { useEffect, useState } from 'react';
import { Plus, Settings, FolderOpen, Search, MessageSquare, Tag as TagIcon, Clock, Hash, ArrowLeft, LayoutDashboard, KanbanSquare, Upload, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// import { Button } from './button'; // Unused
import { Card } from './card';
import { Tag } from './tag';
import { NeuralBackground } from './neural-background';
import { SnapModal } from './snap-modal';
import { SnapDetailModal } from './snap-detail-modal';
import api, { Snap, Project, Chat } from '@/services/api';

import { SnapCard } from './snap-card';
import { BoardListModal } from './board-list-modal';
import { useParams, useNavigate } from 'react-router-dom';

// ... interface Conversation ... (keep or import if shared)
interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  isActive?: boolean;
}

const allTags = [
  { label: 'All', count: 0 }
];

export function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState('All');
  const [isSnapModalOpen, setIsSnapModalOpen] = useState(false);
  const [isSnapDetailModalOpen, setIsSnapDetailModalOpen] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<any | null>(null); // Snap from API but adapted for UI modal
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // const [importStatus, setImportStatus] = useState<string | null>(null); // Unused
  const [isBoardListModalOpen, setIsBoardListModalOpen] = useState(false);

  const fetchProject = async () => {
    if (!projectId) return;
    try {
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchSnaps = async () => {
    if (!projectId) return;
    try {
      const data = await api.getSnaps(projectId);
      setSnaps(data);
    } catch (error) {
      console.error('Failed to fetch snaps:', error);
    }
  };

  const fetchConversations = async () => {
    if (!projectId) return;
    try {
      const chats = await api.listChats(projectId);
      const mappedConversations: Conversation[] = chats.map((chat: Chat) => ({

        id: chat.id,
        title: chat.title,
        lastMessage: 'Open conversation to see messages', // Placeholder
        timestamp: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isActive: false
      }));
      setConversations(mappedConversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSnaps();
      fetchProject();
      fetchConversations();
    }
  }, [projectId]);


  const handleCreateSnap = async (snapData: { title: string; content: string; tags: string[] }) => {
    if (!projectId) return;
    try {
      await api.createSnap({
        project_id: projectId,
        name: snapData.title || 'Quick Snap',
        description: '',
        content: snapData.content,
        snadds: {
          labels: snapData.tags
        }
      });
      setIsSnapModalOpen(false);
      fetchSnaps();
    } catch (error) {
      console.error('Failed to create snap:', error);
    }
  };

  // ... render ...

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

      {/* Main Container */}
      <div className="relative z-10 h-screen flex">
        {/* LEFT PANEL - Conversations (25%) */}
        <motion.div
          className="w-1/4 border-r border-white/10 backdrop-blur-[30px] flex flex-col"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Panel Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-2xl font-bold flex-1"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {project?.name || 'Loading Request...'}
              </h2>

              {/* Dashboard Button */}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="w-10 h-10 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  boxShadow: '0 2px 10px rgba(0, 212, 255, 0.2)'
                }}
                title="Back to Dashboard"
              >
                <LayoutDashboard className="w-5 h-5" style={{ color: 'var(--snaps-accent-blue)' }} />
              </motion.button>

            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--snaps-text-secondary)]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-[var(--snaps-text-primary)] placeholder:text-[var(--snaps-text-secondary)] focus:outline-none focus:border-[var(--snaps-accent-blue)] transition-all"

              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations
              .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((conversation, index) => (
                <motion.div

                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}

                  onClick={() => {
                    setActiveConversation(conversation.id);
                    navigate(`/project/${projectId}/chat/${conversation.id}`);
                  }}
                  className="relative cursor-pointer group"
                >
                  {/* Active Beam */}
                  {conversation.id === activeConversation && (
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--snaps-accent-blue)] to-[var(--snaps-accent-purple)]"
                      layoutId="activeBeam"
                      style={{
                        boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)'
                      }}
                    />
                  )}

                  <div
                    className="px-6 py-4 transition-all"
                    style={{
                      backgroundColor: conversation.id === activeConversation
                        ? 'rgba(0, 212, 255, 0.1)'
                        : 'transparent'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare
                        className="w-5 h-5 mt-0.5 flex-shrink-0"
                        style={{
                          color: conversation.id === activeConversation
                            ? 'var(--snaps-accent-blue)'
                            : 'var(--snaps-text-secondary)'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold mb-1 truncate"
                          style={{
                            color: conversation.id === activeConversation
                              ? 'var(--snaps-text-primary)'
                              : 'var(--snaps-text-primary)',
                            fontSize: '14px'
                          }}
                        >
                          {conversation.title}
                        </h3>
                        <p
                          className="text-xs truncate mb-1"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          {conversation.lastMessage}
                        </p>
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          <Clock className="w-3 h-3" />
                          {conversation.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-white/10 space-y-3">
            {/* Generate Document Button */}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/project/${projectId}/generate`)}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: 'var(--snaps-accent-green)',
                boxShadow: '0 2px 10px rgba(34, 197, 94, 0.2)'
              }}
            >
              <FileText className="w-5 h-5" />
              Generate Document
            </motion.button>


            {/* New Chat Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/project/${projectId}/chat`)}
              className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)'
              }}
            >
              <Plus className="w-5 h-5" />
              New Chat
            </motion.button>
          </div>
        </motion.div>

        {/* RIGHT PANEL - Project Memory (75%) */}
        <div className="flex-1 flex flex-col">
          {/* Panel Header */}
          <motion.div
            className="p-6 border-b border-white/10 backdrop-blur-[30px]"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-2xl font-bold"
                style={{ color: 'var(--snaps-text-primary)' }}
              >
                Project Memory
              </h2>
              <div className="flex items-center gap-3">
                {/* Add Snap Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSnapModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)',
                    color: 'white'
                  }}
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">Adicionar Snap</span>
                </motion.button>

                {/* Import Document Button */}
                <input
                  type="file"
                  id="doc-import-input"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !projectId) return;

                    try {
                      const content = await file.text();
                      // Call importDocument with a callback for events
                      await api.importDocument(projectId, file.name, content, (event: any) => {
                        console.log('Import Event:', event);
                        if (event.type === 'done') {
                          fetchSnaps(); // Refresh snaps once done
                        }
                      });
                    } catch (error) {
                      console.error('Import failed:', error);
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => document.getElementById('doc-import-input')?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: 'var(--snaps-accent-blue)'
                  }}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">Importar Documento</span>
                </motion.button>

                {/* Board View Button */}
                {projectId && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      console.log('Board View clicked - opening modal');
                      setIsBoardListModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      boxShadow: '0 2px 10px rgba(168, 85, 247, 0.2)'
                    }}
                  >
                    <KanbanSquare className="w-5 h-5" style={{ color: 'var(--snaps-accent-purple)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--snaps-accent-purple)' }}>
                      Board View
                    </span>
                  </motion.button>
                )}

                <div className="flex items-center gap-2">
                  <TagIcon className="w-5 h-5" style={{ color: 'var(--snaps-accent-blue)' }} />
                  <span style={{ color: 'var(--snaps-text-secondary)' }} className="text-sm">
                    {snaps.length} snaps
                  </span>
                </div>
              </div>
            </div>

            {/* Tag Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {allTags.map((tag) => (
                <button
                  key={tag.label}
                  onClick={() => setSelectedTag(tag.label)}
                  className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                  style={{
                    backgroundColor: selectedTag === tag.label
                      ? 'rgba(0, 212, 255, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: selectedTag === tag.label
                      ? '1px solid var(--snaps-accent-blue)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    color: selectedTag === tag.label
                      ? 'var(--snaps-accent-blue)'
                      : 'var(--snaps-text-secondary)',
                    boxShadow: selectedTag === tag.label
                      ? '0 0 20px rgba(0, 212, 255, 0.3)'
                      : 'none'
                  }}
                >
                  {tag.label} <span style={{ opacity: 0.6 }}>({tag.count})</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Snaps Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {snaps.map((snap) => (
                  <SnapCard
                    key={snap.id}
                    snap={snap}
                    onClick={(snap) => {
                      setSelectedSnap(snap);
                      setIsSnapDetailModalOpen(true);
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Floating Action Buttons - Right Edge */}
        <motion.div
          className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {/* Back Button - Orange */}

          <motion.button
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center transition-all"
            style={{
              background: 'rgba(255, 107, 53, 0.1)',
              border: '2px solid rgba(255, 107, 53, 0.5)',
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4)'
            }}
          >
            <ArrowLeft className="w-6 h-6" style={{ color: 'var(--snaps-accent-orange)' }} />
          </motion.button>


          {/* Settings Button - Purple */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(`/project/${projectId}/edit`)}
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
            onClick={() => navigate(`/project/${projectId}/docs`)}
            className="w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center transition-all"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: '2px solid rgba(0, 212, 255, 0.5)',
              boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)'
            }}
          >
            <FolderOpen className="w-6 h-6" style={{ color: 'var(--snaps-accent-blue)' }} />
          </motion.button>

          {/* Upload Button - Green */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => document.getElementById('doc-import-input')?.click()}
            className="w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center transition-all"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid rgba(34, 197, 94, 0.5)',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
            }}
          >
            <Upload className="w-6 h-6" style={{ color: 'var(--snaps-accent-green)' }} />
          </motion.button>
        </motion.div>
      </div>

      {/* Snap Modal */}
      <SnapModal
        isOpen={isSnapModalOpen}
        onClose={() => setIsSnapModalOpen(false)}
        onSave={handleCreateSnap}
      />

      {/* Snap Detail Modal */}
      <SnapDetailModal
        isOpen={isSnapDetailModalOpen}
        onClose={() => setIsSnapDetailModalOpen(false)}
        snap={selectedSnap}
      />

      {projectId && (
        <BoardListModal
          isOpen={isBoardListModalOpen}
          onClose={() => setIsBoardListModalOpen(false)}
          projectId={projectId}
          onSelectBoard={(boardId) => {
            setIsBoardListModalOpen(false);
            navigate(`/project/${projectId}/board/${boardId}`);
          }}
          onAddBoard={() => {
            setIsBoardListModalOpen(false);
            navigate(`/project/${projectId}/board`);
          }}
        />
      )}
    </div>
  );
}