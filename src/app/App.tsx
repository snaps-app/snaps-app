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
import { PlansView } from '@/app/components/plans-view';
import { DecisionsView } from '@/app/components/decisions-view';
import { SupportView } from '@/app/components/support-view';
import { Login } from '@/app/components/login';
import { UserManagement } from '@/app/components/user-management';
import { ProtectedRoute } from '@/app/components/protected-route';
import { GovernanceView } from '@/app/components/governance-view';
import { AIExecutions } from '@/app/components/ai-executions';
import { WorkflowEditorCanvas } from '@/app/components/workflow-editor';
import { QAView } from '@/app/components/qa-view';
import { RetroView } from '@/app/components/retro-view';
import { TimelineView } from '@/app/components/timeline-view';
import { ExecutionCockpit } from '@/app/components/execution-cockpit';
import { ScratchView } from '@/app/components/scratch-view';

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />

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
                        <Route path="/admin/users" element={<UserManagement />} />

                        {/* Project Routes */}
                        <Route
                            path="/project/:projectId"
                            element={<ProjectWorkspace />}
                        />
                        <Route
                            path="/project/:projectId/edit"
                            element={<EditProject />}
                        />
                        <Route
                            path="/project/:projectId/docs"
                            element={<DocumentsView />}
                        />
                        <Route
                            path="/project/:projectId/generate"
                            element={<GenerateDocument />}
                        />
                        <Route
                            path="/project/:projectId/chat"
                            element={<ActiveChat />}
                        />
                        <Route
                            path="/project/:projectId/chat/:sessionId"
                            element={<ActiveChat />}
                        />
                        <Route
                            path="/project/:projectId/board"
                            element={<BoardView />}
                        />
                        <Route
                            path="/project/:projectId/board/:boardId"
                            element={<BoardView />}
                        />
                        <Route
                            path="/project/:projectId/plans"
                            element={<PlansView />}
                        />
                        <Route
                            path="/project/:projectId/decisions"
                            element={<DecisionsView />}
                        />
                        <Route
                            path="/project/:projectId/qa"
                            element={<QAView />}
                        />
                        <Route
                            path="/project/:projectId/retro"
                            element={<RetroView />}
                        />
                        <Route
                            path="/project/:projectId/timeline"
                            element={<TimelineView />}
                        />
                        <Route
                            path="/project/:projectId/executions"
                            element={<AIExecutions />}
                        />
                    </Route>
                    {/* Execution Cockpit — standalone fullscreen, no sidebar */}
                    <Route
                        path="/project/:projectId/execution/:executionId"
                        element={<ExecutionCockpit />}
                    />
                    {/* Scratchpad — standalone fullscreen, no sidebar */}
                    <Route
                        path="/project/:projectId/execution/:executionId/scratch"
                        element={<ScratchView />}
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}