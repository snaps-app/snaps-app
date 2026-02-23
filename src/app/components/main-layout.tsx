import { useState } from 'react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { Outlet } from 'react-router-dom';

export function MainLayout() {
  console.log('MainLayout rendering');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <div className="hidden md:flex">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </div>

      <main className="flex-1 relative overflow-hidden h-screen overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
