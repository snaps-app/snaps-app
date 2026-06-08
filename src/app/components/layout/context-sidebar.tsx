import { getProjectBoards } from '@/services/boards';
import type { Board } from '@/services/types';
import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  GitBranch, 
  ClipboardList, 
  FileText, 
  FolderOpen, 
  ShieldCheck, 
  RotateCcw, 
  MessageSquare, 
  Settings,
  ChevronRight,
  ChevronLeft,
  Bot,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectRole } from '@/contexts/project-role-context';


export function ContextSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const { can } = useProjectRole();
  const [isOpen, setIsOpen] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  React.useEffect(() => {
    if (projectId) {
      getProjectBoards(projectId).then(setBoards).catch(console.error);
    }
  }, [projectId]);

  const handleNavigate = (path: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigate(path);
    // Increased timeout to 1200ms to ensure redirects (like SupportView) complete
    // and prevent UI collisions during rapid clicks.
    setTimeout(() => setIsNavigating(false), 1200);
  };

  if (!projectId) return null;

  const projectNavItems = [
    { label: 'Overview', icon: LayoutDashboard, path: `/project/${projectId}` },
    ...boards.map(b => ({
      label: b.name,
      icon: Activity,
      path: `/project/${projectId}/board/${b.id}`
    })),
    { label: 'Timeline', icon: GitBranch, path: `/project/${projectId}/timeline` },
    { label: 'Plans', icon: ClipboardList, path: `/project/${projectId}/plans` },
    { label: 'Decisions', icon: FileText, path: `/project/${projectId}/decisions` },
    { label: 'Documents', icon: FolderOpen, path: `/project/${projectId}/docs` },
    { label: 'QA Engine', icon: ShieldCheck, path: `/project/${projectId}/qa` },
    { label: 'AI Executions', icon: Bot, path: `/project/${projectId}/executions` },
    { label: 'Retrospective', icon: RotateCcw, path: `/project/${projectId}/retro` },
    { label: 'Chat', icon: MessageSquare, path: `/project/${projectId}/chat` },
  ];

  projectNavItems.push({ label: 'Settings', icon: Settings, path: `/project/${projectId}/edit` });

  if (can('manage_members')) {
    projectNavItems.push({ label: 'Members', icon: Users, path: `/project/${projectId}/members` });
  }

  return (
    <div className="relative flex">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0A0A0A] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all z-[60] shadow-xl"
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <motion.div
        initial={false}
        animate={{ width: isOpen ? '240px' : '0px', opacity: isOpen ? 1 : 0 }}
        className="h-screen border-l border-white/10 backdrop-blur-[30px] flex flex-col z-50 overflow-hidden"
        style={{ backgroundColor: 'rgba(10, 10, 10, 0.4)' }}
      >
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            Project Context
          </p>
        </div>

        <div className={`flex-1 overflow-y-auto scrollbar-hide py-4 flex flex-col gap-1 px-3 transition-all duration-300 ${
          isNavigating ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}>
          {projectNavItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group overflow-hidden shrink-0 ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute right-0 top-2 bottom-2 w-1 bg-[#00D4FF] rounded-full" />
                )}

                <div className={`p-1.5 rounded-lg ${isActive ? 'text-[#00D4FF]' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  <item.icon className="w-4 h-4" />
                </div>

                <span className={`text-sm font-medium whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                }`}>
                  {item.label}
                </span>

                {isNavigating && isActive && (
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
