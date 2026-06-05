import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderArchive, Brain, Activity, Calendar } from 'lucide-react';

export function BottomNav() {
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
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 backdrop-blur-[30px] flex items-center justify-around pb-safe pt-2 px-2"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)' }}
        >
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="flex flex-col items-center justify-center p-2 min-w-[64px]"
                    >
                        <div
                            className={`p-1.5 rounded-lg mb-1 transition-all ${isActive
                                ? 'bg-gradient-to-br from-[#00D4FF]/20 to-[#A855F7]/20 text-[#00D4FF]'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <item.icon className="w-6 h-6" />
                        </div>
                        <span
                            className={`text-[10px] font-medium ${isActive ? 'text-[#00D4FF]' : 'text-zinc-500'
                                }`}
                        >
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
