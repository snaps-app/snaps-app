import { useState } from 'react';
import { Sidebar } from '@/app/components/layout/sidebar';
import { BottomNav } from '@/app/components/layout/bottom-nav';
import { Outlet, useParams } from 'react-router-dom';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { ContextSidebar } from '@/app/components/layout/context-sidebar';
import { ProjectRoleProvider } from '@/contexts/project-role-context';

export function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { projectId } = useParams<{ projectId?: string }>();

  return (
    <ProjectRoleProvider projectId={projectId}>
      <div className="flex h-screen w-full relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
        {/* Global Background */}
        <NeuralBackground />
        
        {/* Left Sidebar: Global Navigation */}
        <div className="hidden md:flex relative z-20">
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        </div>

        {/* Main View Area */}
        <main className="flex-1 relative z-10 overflow-hidden flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto pb-20 md:pb-0 scrollbar-hide">
            <Outlet />
          </div>
        </main>

        {/* Right Sidebar: Project Context */}
        <div className="hidden md:flex relative z-20 h-full">
          <ContextSidebar />
        </div>

        <BottomNav />
      </div>
    </ProjectRoleProvider>
  );
}
