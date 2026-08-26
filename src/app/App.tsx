import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Home } from '@/app/components/layout/home';
import { ProjectWorkspace } from '@/app/components/project/project-workspace';
import { ActiveChat } from '@/app/components/chat/active-chat';
import { BoardView } from '@/app/components/views/board-view';
import { NewProject } from '@/app/components/project/new-project';
import { EditProject } from '@/app/components/project/edit-project';
import { GenerateDocument } from '@/app/components/views/generate-document';
import { DocumentsView } from '@/app/components/views/documents-view';
import { SourceDocumentView } from '@/app/components/views/source-document-view';
import { IngestQueueProvider } from '@/app/ingest/ingestQueue';
import { IngestToast } from '@/app/ingest/ingest-toast';
import { Profile } from '@/app/components/views/profile';
import { MemoryView } from '@/app/components/views/memory-view';
import { GlobalBoard } from '@/app/components/views/global-board';
import { MainLayout } from '@/app/components/layout/main-layout';
import { CalendarView } from '@/app/components/views/calendar-view';
import { DashboardView } from '@/app/components/views/dashboard-view';
import { PlansView } from '@/app/components/views/plans-view';
import { DecisionsView } from '@/app/components/views/decisions-view';
import { SupportView } from '@/app/components/views/support-view';
import { Login } from '@/app/components/views/login';
import { UserManagement } from '@/app/components/views/user-management';
import { UpdatePassword } from '@/app/components/views/update-password';
import { ProtectedRoute } from '@/app/components/layout/protected-route';
import { GovernanceView } from '@/app/components/views/governance-view';
import { AIExecutions } from '@/app/components/views/ai-executions';
import { WorkflowEditorCanvas } from '@/app/components/workflow/workflow-editor';
import { QAView } from '@/app/components/views/qa-view';
import { RetroView } from '@/app/components/views/retro-view';
import { TimelineView } from '@/app/components/views/timeline-view';
import { ExecutionCockpit } from '@/app/components/execution/execution-cockpit';
import { ScratchView } from '@/app/components/views/scratch-view';
import { MembersView } from '@/app/components/views/members-view';
import { TimeView } from '@/app/views/TimeView';
import { ProjectTimeView } from '@/app/views/ProjectTimeView';
import { supabase } from '@/lib/supabaseClient';

function AuthRedirector() {
    const navigate = useNavigate();

    useEffect(() => {
        const hash = window.location.hash;
        if (hash && (hash.includes('type=invite') || hash.includes('type=recovery'))) {
            if (window.location.pathname !== '/update-password') {
                navigate('/update-password' + hash);
            }
        }

        const { data } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                if (window.location.pathname !== '/update-password') {
                    navigate('/update-password');
                }
            }
        });
        return () => data.subscription.unsubscribe();
    }, [navigate]);

    return null;
}

export default function App() {
    return (
        <BrowserRouter>
            {/* A fila de importacao envolve as rotas de proposito: dentro delas,
                navegar para revisar um material desmontaria o provider e mataria
                os uploads em curso. */}
            <IngestQueueProvider>
            <div className="min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
                <AuthRedirector />
                <IngestToast />
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/update-password" element={<UpdatePassword />} />

                    {/* Protected: main layout including project routes */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        {/* Global Routes */}
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/ai-executions" element={<AIExecutions />} />
                        <Route path="/projects" element={<Home />} />
                        <Route path="/new-project" element={<NewProject />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/memory" element={<MemoryView />} />
                        <Route path="/global-board" element={<GlobalBoard />} />
                        <Route path="/calendar" element={<CalendarView />} />
                        <Route path="/governance" element={<GovernanceView />} />
                        <Route path="/workflow-editor/:templateId" element={<WorkflowEditorCanvas />} />
                        <Route path="/workflow-editor/new" element={<WorkflowEditorCanvas />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/time" element={<TimeView />} />

                        {/* Project Routes */}
                        <Route path="/project/:projectId" element={<ProjectWorkspace />} />
                        <Route path="/project/:projectId/edit" element={<EditProject />} />
                        <Route path="/project/:projectId/docs" element={<DocumentsView />} />
                        <Route path="/project/:projectId/documents/:docId" element={<SourceDocumentView />} />
                        <Route path="/project/:projectId/generate" element={<GenerateDocument />} />
                        <Route path="/project/:projectId/chat" element={<ActiveChat />} />
                        <Route path="/project/:projectId/chat/:sessionId" element={<ActiveChat />} />
                        <Route path="/project/:projectId/board" element={<BoardView />} />
                        <Route path="/project/:projectId/board/:boardId" element={<BoardView />} />
                        <Route path="/project/:projectId/plans" element={<PlansView />} />
                        <Route path="/project/:projectId/decisions" element={<DecisionsView />} />
                        <Route path="/project/:projectId/qa" element={<QAView />} />
                        <Route path="/project/:projectId/retro" element={<RetroView />} />
                        <Route path="/project/:projectId/timeline" element={<TimelineView />} />
                        <Route path="/project/:projectId/executions" element={<AIExecutions />} />
                        <Route path="/project/:projectId/members" element={<MembersView />} />
                        <Route path="/project/:projectId/time" element={<ProjectTimeView />} />
                    </Route>

                    {/* Execution Cockpit — standalone fullscreen, no sidebar */}
                    <Route path="/project/:projectId/execution/:executionId" element={<ExecutionCockpit />} />
                    {/* Scratchpad — standalone fullscreen, no sidebar */}
                    <Route path="/project/:projectId/execution/:executionId/scratch" element={<ScratchView />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            </IngestQueueProvider>
        </BrowserRouter>
    );
}
