import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Outlet } from 'react-router-dom';

export function MainLayout() {
  console.log('MainLayout rendering');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <main className="flex-1 relative overflow-hidden h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
