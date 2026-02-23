import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderArchive, Brain, Activity, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();


  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Projects', icon: FolderArchive, path: '/projects' },
    { label: 'Memory', icon: Brain, path: '/memory' },
    { label: 'Board', icon: Activity, path: '/global-board' },
    { label: 'Calendar', icon: Calendar, path: '/calendar' },
  ];

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
      <div className="h-[100px] px-6 border-b border-white/10 flex items-center justify-between overflow-hidden">
        <div
          className="whitespace-nowrap"
          style={{ opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}
        >
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: isCollapsed ? 'none' : 'block'
            }}
          >
            Snaps
          </h1>
        </div>
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#A855F7]" />
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-6 flex flex-col gap-2 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group overflow-hidden ${isActive ? 'bg-white/10' : 'hover:bg-white/5'
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

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[100px] -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

    </div>
  );
}
