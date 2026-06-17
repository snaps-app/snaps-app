import React from 'react';
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

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [globalRole, setGlobalRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    import('@/lib/supabaseClient').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user?.email) {
          setUserEmail(data.session.user.email);
          fetchGlobalRole(data.session.access_token);
        }
      });
      supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? null);
        if (session) {
          fetchGlobalRole(session.access_token);
        } else {
          setGlobalRole(null);
        }
      });
    });
  }, []);

  const fetchGlobalRole = async (token: string) => {
    try {
      const { api } = await import('@/services/client');
      const response = await api.get('/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setGlobalRole(response.data.global_role);
    } catch (e) {
      console.error("Failed to fetch global role", e);
    }
  };

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
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
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
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:bg-white/10"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Items - Scrollable area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group overflow-hidden shrink-0 ${
                isActive ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00D4FF] to-[#A855F7] rounded-full"
                />
              )}

              <div className={`p-2 rounded-lg ${isActive ? 'text-[#00D4FF]' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
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
      </div>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#A855F7] p-[1px]">
            <div className="w-full h-full rounded-full bg-[#0A0A0A] flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {userEmail ? userEmail.substring(0, 2) : 'BB'}
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
              <span className="text-xs font-bold text-white truncate" title={userEmail || 'Bruno Bogochvol'}>{userEmail || 'Bruno Bogochvol'}</span>
              <span className="text-[10px] text-zinc-500">Admin</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
