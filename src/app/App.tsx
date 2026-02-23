import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from '@/app/components/home';
import { ProjectWorkspace } from '@/app/components/project-workspace';
import { ActiveChat } from '@/app/components/active-chat';
import { BoardView } from '@/app/components/board-view';
import { NewProject } from '@/app/components/new-project';
import { EditProject } from '@/app/components/edit-project';
import { GenerateDocument } from '@/app/components/generate-document';
import { DocumentsView } from '@/app/components/documents-view';
import { Profile } from '@/app/components/profile';
import { MemoryView } from '@/app/components/memory-view';
import { GlobalBoard } from '@/app/components/global-board';
import { MainLayout } from '@/app/components/main-layout';
import { CalendarView } from '@/app/components/calendar-view';
import { DashboardView } from '@/app/components/dashboard-view';

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/projects" element={<Home />} />
                        <Route path="/new-project" element={<NewProject />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/memory" element={<MemoryView />} />
                        <Route path="/global-board" element={<GlobalBoard />} />
                        <Route path="/calendar" element={<CalendarView />} />
                    </Route>

                    {/* Project Routes */}
                    <Route path="/project/:projectId" element={<ProjectWorkspace />} />
                    <Route path="/project/:projectId/edit" element={<EditProject />} />
                    <Route path="/project/:projectId/docs" element={<DocumentsView />} />
                    <Route path="/project/:projectId/generate" element={<GenerateDocument />} />

                    {/* Chat Routes */}
                    <Route path="/project/:projectId/chat" element={<ActiveChat />} />
                    <Route path="/project/:projectId/chat/:sessionId" element={<ActiveChat />} />

                    {/* Board Routes */}
                    <Route path="/project/:projectId/board" element={<BoardView />} />
                    <Route path="/project/:projectId/board/:boardId" element={<BoardView />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}