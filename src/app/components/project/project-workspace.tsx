import { getProjectBoards } from '@/services/boards';
import { listChats } from '@/services/chats';
import { importDocument } from '@/services/import';
import { getProject } from '@/services/projects';
import { createSnap, getSnaps } from '@/services/snaps';
import type { Board, Chat, Project, Snap } from '@/services/types';
import { useEffect, useState, useMemo } from 'react';
import { Plus, Settings, FolderOpen, Search, MessageSquare, Clock, ArrowLeft, LayoutDashboard, KanbanSquare, Upload, FileText, Tag as TagIcon, Calendar, ShieldAlert, LifeBuoy, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// import { Button } from '@/app/components/shared/button'; // Unused
import { SnapModal } from '@/app/components/modals/snap-modal';
import { SnapDetailModal } from '@/app/components/modals/snap-detail-modal';

import { SnapCard } from '@/app/components/shared/snap-card';
import { BoardListModal } from '@/app/components/modals/board-list-modal';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from '@/app/components/ui/spinner';
import { ProjectRoleProvider } from '@/contexts/project-role-context';

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
  const [boards, setBoards] = useState<Board[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // const [importStatus, setImportStatus] = useState<string | null>(null); // Unused
  const [isBoardListModalOpen, setIsBoardListModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'conversations' | 'memory'>('memory');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProject = async () => {
    if (!projectId) return;
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchBoards = async () => {
    if (!projectId) return;
    try {
      const data = await getProjectBoards(projectId);
      setBoards(data);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    }
  };

  const fetchSnaps = async () => {
    if (!projectId) return;
    try {
      const data = await getSnaps(projectId);
      setSnaps(data);
    } catch (error) {
      console.error('Failed to fetch snaps:', error);
    }
  };

  const fetchConversations = async () => {
    if (!projectId) return;
    try {
      const chats = await listChats(projectId);
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
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        await Promise.all([
          fetchSnaps(),
          fetchProject(),
          fetchBoards(),
          fetchConversations()
        ]);
      } catch (error) {
        console.error('Failed to load workspace data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const supportBoardId = useMemo(() => {
    return boards.find(b => b.board_type === 'support')?.id;
  }, [boards]);


  const handleCreateSnap = async (snapData: { title: string; content: string; tags: string[] }) => {
    if (!projectId) return;
    try {
      await createSnap({
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
    <ProjectRoleProvider projectId={projectId!}>
      <div className="flex-1 flex flex-col h-full relative">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            <Spinner size="lg" label="Loading workspace..." color="blue" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="flex-1 flex flex-col relative z-10 pb-safe md:pb-0">
        {/* Main Content - Project Memory (100%) */}
        <div className="flex-1 flex flex-col w-full">
          {/* Panel Header */}
          <motion.div
            className="h-auto md:h-[100px] p-6 pt-20 md:py-0 border-b border-white/10 backdrop-blur-[30px] flex flex-col justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: 'var(--snaps-text-primary)' }}
                >
                  Project Memory
                </h2>
                <div className="hidden md:flex items-center gap-2">
                  <TagIcon className="w-5 h-5" style={{ color: 'var(--snaps-accent-blue)' }} />
                  <span style={{ color: 'var(--snaps-text-secondary)' }} className="text-sm">
                    {snaps.length} snaps
                  </span>
                </div>
              </div>

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
                      await importDocument(projectId, file.name, content, (event: any) => {
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hidden sm:flex"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: 'var(--snaps-accent-blue)'
                  }}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">Importar Documento</span>
                </motion.button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    </ProjectRoleProvider>
  );
}