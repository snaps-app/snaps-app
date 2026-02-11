import { useState } from 'react';
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
import { Button } from '@/app/components/button';
import api, { Project } from '@/services/api';
import { useEffect } from 'react';

export default function App() {
    const [currentView, setCurrentView] = useState<'home' | 'project' | 'chat' | 'board' | 'new-project' | 'edit-project' | 'generate-document' | 'documents' | 'profile' | 'memory'>('home');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    const fetchProjects = async () => {
        try {
            const data = await api.getProjects();
            setProjects(data);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleProjectClick = (projectId: string) => {
        setSelectedProjectId(projectId);
        setCurrentView('project');
    };

    const handleBackToHome = () => {
        setCurrentView('home');
        setSelectedProjectId(null);
        setSelectedSessionId(null);
    };

    const handleBackToProject = () => {
        setCurrentView('project');
        setSelectedSessionId(null);
    };

    const handleChatOpen = (sessionId: string) => {
        setSelectedSessionId(sessionId);
        setCurrentView('chat');
    };

    const handleBoardOpen = (projectId: string) => {
        setSelectedProjectId(projectId);
        setCurrentView('board');
    };

    const handleNewProject = () => {
        setCurrentView('new-project');
    };

    const handleEditProject = () => {
        setCurrentView('edit-project');
    };

    const handleGenerateDocument = () => {
        setCurrentView('generate-document');
    };

    const handleDocumentsView = () => {
        setCurrentView('documents');
    };

    const handleCreateProject = async (project: { name: string; description: string; instructions: string; template: string }) => {
        console.log('Creating project:', project);
        try {
            await api.createProject(project);
            await fetchProjects();
            setCurrentView('home');
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    };

    const handleUpdateProject = (project: { name: string; description: string; instructions: string; template: string }) => {
        console.log('Updating project:', project);
        // In a real app, update the project
        setCurrentView('project');
    };

    const handleGenerateDoc = (doc: { prompt: string; format: string; selectedSnaps: string[] }) => {
        console.log('Generating document:', doc);
        // In a real app, generate the document
        setCurrentView('project');
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--snaps-bg)' }}>
            {/* Content */}
            {currentView === 'home' && <Home projects={projects} onProjectClick={handleProjectClick} onNewProject={handleNewProject} onProfileClick={() => setCurrentView('profile')} onMemoryClick={() => setCurrentView('memory')} />}
            {currentView === 'project' && <ProjectWorkspace projectId={selectedProjectId} onBack={handleBackToHome} onChatOpen={handleChatOpen} onBoardOpen={handleBoardOpen} onEdit={handleEditProject} onGenerateDocument={handleGenerateDocument} onDocumentsView={handleDocumentsView} />}
            {currentView === 'chat' && <ActiveChat sessionId={selectedSessionId} onBack={handleBackToProject} />}
            {currentView === 'board' && <BoardView projectId={selectedProjectId} onBack={handleBackToProject} />}
            {currentView === 'new-project' && <NewProject onBack={handleBackToHome} onCreate={handleCreateProject} />}
            {currentView === 'edit-project' && <EditProject onBack={handleBackToProject} onUpdate={handleUpdateProject} />}
            {currentView === 'generate-document' && <GenerateDocument onBack={handleBackToProject} onGenerate={handleGenerateDoc} />}
            {currentView === 'documents' && <DocumentsView onBack={handleBackToProject} />}
            {currentView === 'profile' && <Profile onBack={handleBackToHome} />}
            {currentView === 'memory' && <MemoryView onBack={handleBackToHome} />}
        </div>
    );
}