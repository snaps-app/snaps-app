import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { Home } from '@/app/components/layout/home';
import { ProjectWorkspace } from '@/app/components/project/project-workspace';
import { ActiveChat } from '@/app/components/chat/active-chat';
import { BoardView } from '@/app/components/views/board-view';
import { NewProject } from '@/app/components/project/new-project';
import { ProjectSettings } from '@/app/components/project/project-settings';
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
import { TimeView } from '@/app/views/TimeView';
import { ProjectTimeView } from '@/app/views/ProjectTimeView';
import { supabase } from '@/lib/supabaseClient';

/**
 * Rota antiga -> aba do Hub de Settings (B3).
 *
 * `/edit` e `/members` continuam respondendo. Link salvo por alguem no
 * navegador, num card ou num e-mail nao pode virar 404 porque a tela foi
 * reorganizada -- a mudanca e nossa, o custo nao e de quem guardou o link.
 */
function RedirecionaParaSettings({ aba }: { aba: string }) {
    const { projectId } = useParams<{ projectId: string }>();
    return <Navigate to={`/project/${projectId}/settings/${aba}`} replace />;
}

function AuthRedirector() {
    const navigate = useNavigate();

    useEffect(() => {
        // Convites/recovery mais recentes do Supabase chegam via query string
        // (?token_hash=...&type=invite ou PKCE ?code=...), nao so via hash
        // fragment (#access_token=...&type=invite). Checar so o hash deixava
        // esses links caindo direto no /login por falta de sessao.
        const search = window.location.search;
        const hash = window.location.hash;
        const authLinkPattern = /type=invite|type=recovery|token_hash=|[?&]code=/;
        const isAuthLink = authLinkPattern.test(search) || authLinkPattern.test(hash);

        const redirectToUpdatePassword = () => {
            if (window.location.pathname !== '/update-password') {
                navigate('/update-password' + search + hash);
            }
        };

        if (isAuthLink) {
            redirectToUpdatePassword();
        }

        const { data } = supabase.auth.onAuthStateChange((event) => {
            // Convite dispara SIGNED_IN, nao PASSWORD_RECOVERY. So redireciona
            // por esse evento quando a URL de entrada era mesmo um link de
            // convite/recovery, senao todo login normal cairia aqui tambem.
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isAuthLink)) {
                redirectToUpdatePassword();
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
                        <Route path="/project/:projectId/settings" element={<RedirecionaParaSettings aba="general" />} />
                        <Route path="/project/:projectId/settings/:tab" element={<ProjectSettings />} />
                        <Route path="/project/:projectId/edit" element={<RedirecionaParaSettings aba="general" />} />
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
                        <Route path="/project/:projectId/members" element={<RedirecionaParaSettings aba="members" />} />
                        <Route path="/project/:projectId/time" element={<ProjectTimeView />} />
                    </Route>

                    {/* Fullscreen sem sidebar, mas NAO sem autenticacao.
                        Estas duas rotas ficavam fora do bloco protegido: a
                        guarda estava presa ao `MainLayout`, entao sair do
                        layout era sair da autenticacao junto. Aqui o
                        `ProtectedRoute` envolve um `Outlet`, e nao o layout —
                        e o que desacopla as duas coisas e impede a proxima
                        tela fullscreen de repetir o erro. */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <Outlet />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/project/:projectId/execution/:executionId" element={<ExecutionCockpit />} />
                        <Route path="/project/:projectId/execution/:executionId/scratch" element={<ScratchView />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            </IngestQueueProvider>
        </BrowserRouter>
    );
}
