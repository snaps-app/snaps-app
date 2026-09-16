import React from 'react';
import { getProjectBoards } from '@/services/boards';
import type { Board } from '@/services/types';
import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { buildProjectNav } from '@/app/components/layout/project-nav';
import { ContextSidebarSkeleton } from '@/app/components/layout/zone-skeletons';

export function ContextSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const [isOpen, setIsOpen] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  // Carregando, vazio e erro são três estados distintos (card 8e548c10): um
  // projeto sem boards não pode parecer uma falha de carregamento, e uma falha
  // não pode parecer um projeto sem boards.
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [boardsError, setBoardsError] = useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let ativo = true;
    setIsLoadingBoards(true);
    setBoardsError(false);
    getProjectBoards(projectId)
      .then((data) => {
        if (ativo) setBoards(data);
      })
      .catch((error) => {
        console.error('Failed to load project boards:', error);
        if (ativo) {
          setBoards([]);
          setBoardsError(true);
        }
      })
      .finally(() => {
        if (ativo) setIsLoadingBoards(false);
      });
    return () => {
      ativo = false;
    };
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

  const sections = buildProjectNav(projectId, boards);

  return (
    <div className="relative flex">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Collapse project navigation' : 'Expand project navigation'}
        className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--snaps-bg)] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all z-[60] shadow-xl"
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

        {isLoadingBoards ? (
          <ContextSidebarSkeleton />
        ) : (
          <nav
            aria-label="Project navigation"
            className={`flex-1 overflow-y-auto scrollbar-hide py-4 flex flex-col gap-5 px-3 transition-all duration-300 ${
              isNavigating ? 'opacity-50 pointer-events-none' : 'opacity-100'
            }`}
          >
            {boardsError && (
              <p
                role="status"
                className="px-3 text-[11px] leading-snug"
                style={{ color: 'var(--snaps-error)' }}
              >
                Não foi possível carregar os boards do projeto.
              </p>
            )}

            {sections.map((section) => (
              <div key={section.group} className="flex flex-col gap-1">
                <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                  {section.group}
                </p>

                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;

                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group overflow-hidden shrink-0 ${
                        isActive ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <div
                          className="absolute right-0 top-2 bottom-2 w-1 rounded-full"
                          style={{ backgroundColor: 'var(--snaps-accent-blue)' }}
                        />
                      )}

                      <div
                        className={`p-1.5 rounded-lg ${isActive ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                        style={isActive ? { color: 'var(--snaps-accent-blue)' } : undefined}
                      >
                        <item.icon className="w-4 h-4" />
                      </div>

                      <span
                        className={`text-sm font-medium whitespace-nowrap truncate ${
                          isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        )}
      </motion.div>
    </div>
  );
}
