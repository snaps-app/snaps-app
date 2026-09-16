import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderArchive,
  Brain,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bot,
  Users,
  Clock
} from 'lucide-react';

import { motion } from 'motion/react';
import { UserZoneMenu } from '@/app/components/layout/user-zone-menu';
import { SidebarNavSkeleton } from '@/app/components/layout/zone-skeletons';
import { useCurrentUser } from '@/app/components/layout/use-current-user';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { globalRole, loading } = useCurrentUser();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Projects', icon: FolderArchive, path: '/projects' },
    { label: 'Memory', icon: Brain, path: '/memory' },
    { label: 'Board', icon: Activity, path: '/global-board' },
    { label: 'Calendar', icon: Calendar, path: '/calendar' },
    { label: 'Governance', icon: Shield, path: '/governance' },
    { label: 'AI Executions', icon: Bot, path: '/ai-executions' },
    { label: 'Time', icon: Clock, path: '/time' },
  ];

  if (globalRole === 'super_admin') {
    navItems.push({ label: 'Users', icon: Users, path: '/users' });
  }

  return (
    <div
      className="relative h-screen border-r border-white/10 backdrop-blur-[30px] flex flex-col z-50"
      style={{
        backgroundColor: 'rgba(10, 10, 10, 0.6)',
        width: isCollapsed ? '80px' : '280px',
        transition: 'width 0.3s ease-in-out'
      }}
    >
      {/* Header / Logo */}
      <div className={`h-[100px] border-b border-white/10 flex items-center flex-shrink-0 transition-all ${
        isCollapsed ? 'justify-center px-0' : 'justify-between px-6'
      }`}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="whitespace-nowrap"
          >
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background:
                  'linear-gradient(135deg, var(--snaps-accent-blue) 0%, var(--snaps-accent-purple) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SNAPS
            </h1>
          </motion.div>
        )}
        <button
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:bg-white/10"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Items - Scrollable area */}
      {loading ? (
        <SidebarNavSkeleton isCollapsed={isCollapsed} />
      ) : (
        <nav
          aria-label="Navegação principal"
          className="flex-1 overflow-y-auto scrollbar-hide py-4 flex flex-col gap-1 px-3"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group overflow-hidden shrink-0 ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                    style={{
                      background:
                        'linear-gradient(to bottom, var(--snaps-accent-blue), var(--snaps-accent-purple))',
                    }}
                  />
                )}

                <div
                  className={`p-2 rounded-lg ${isActive ? '' : 'text-zinc-400 group-hover:text-zinc-200'}`}
                  style={isActive ? { color: 'var(--snaps-accent-blue)' } : undefined}
                >
                  <item.icon className="w-5 h-5" />
                </div>

                {!isCollapsed && (
                  <span
                    className={`font-medium whitespace-nowrap ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Footer / Zona do Usuário */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <UserZoneMenu isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
