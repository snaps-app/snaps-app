
import axios from 'axios';

// --- Configuration ---
const API_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interfaces ---

export interface Project {
    id: string;
    name: string;
    description: string;
    instructions: string;
    template: string;
    settings?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface ProjectCreate {
    name: string;
    description: string;
    instructions: string;
    template: string;
    settings?: Record<string, any>;
}

export interface Snap {
    id: string;
    project_id: string;
    name: string;
    description: string;
    content: string;
    snadds?: {
        group_id?: string;
        labels?: string[];
        status?: string;
    };
    created_at: string;
    updated_at: string;
}

export interface SnapCreate {
    project_id: string;
    name: string;
    description: string;
    content: string;
    snadds?: {
        group_id?: string;
        labels?: string[];
        status?: string;
    };
}

export interface Task {
    id: string;
    card_id: string;
    title: string;
    completed: boolean;
    runner_id?: string;
    created_at: string;
}

export interface Card {
    id: string;
    board_id: string;
    title: string;
    description: string;
    status: 'todo' | 'inprogress' | 'done';
    priority: 'Low' | 'Medium' | 'High';
    due_date?: string;
    labels?: string[]; // Simplified to strings for now, backend expects UUIDs? Let's assume strings or IDs 
    tasks?: Task[]; // Populated if backend returns them
    created_at: string;
    updated_at: string;
}

export interface Board {
    id: string;
    project_id: string;
    name: string;
    columns?: any;
    cards?: Card[];
}

// --- Project Functions ---
export const getProjects = async (skip = 0, limit = 100): Promise<Project[]> => {
    const response = await api.get('/projects/', { params: { skip, limit } });
    return response.data;
};

export const getProject = async (projectId: string): Promise<Project> => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
};

export const createProject = async (data: ProjectCreate): Promise<Project> => {
    const response = await api.post('/projects/', data);
    return response.data;
};

// --- Snap Functions ---
export const getSnaps = async (projectId: string, skip = 0, limit = 100): Promise<Snap[]> => {
    const response = await api.get(`/projects/${projectId}/snaps/`, { params: { skip, limit } });
    return response.data;
};

export const createSnap = async (data: SnapCreate): Promise<Snap> => {
    const response = await api.post('/snaps/', data);
    return response.data;
};

export const getAllSnaps = async (): Promise<{ snaps: Snap[], projects: Project[] }> => {
    const projects = await getProjects();
    const snapsPromises = projects.map(p => getSnaps(p.id).then(snaps => snaps.map(s => ({ ...s, project_name: p.name }))));
    const snapsArrays = await Promise.all(snapsPromises);
    const allSnaps = snapsArrays.flat();
    return { snaps: allSnaps, projects };
};

export const getProjectBoard = async (projectId: string): Promise<Board> => {
    const response = await api.get(`/projects/${projectId}/board`);
    return response.data;
};

export const createCard = async (boardId: string, data: Partial<Card>): Promise<Card> => {
    const response = await api.post(`/boards/${boardId}/cards/`, { board_id: boardId, ...data });
    return response.data;
};

export const updateCard = async (cardId: string, data: Partial<Card>): Promise<Card> => {
    const response = await api.patch(`/cards/${cardId}`, data);
    return response.data;
};

export const deleteCard = async (cardId: string): Promise<void> => {
    await api.delete(`/cards/${cardId}`);
};

export const updateCardStatus = async (cardId: string, status: string): Promise<Card> => {
    const response = await api.patch(`/cards/${cardId}/status`, null, { params: { status } });
    return response.data;
};

// Tasks (Sub-items)
export const createTask = async (cardId: string, title: string): Promise<Task> => {
    const response = await api.post(`/cards/${cardId}/tasks/`, { title });
    return response.data;
};

export const updateTask = async (taskId: string, data: Partial<Task>): Promise<Task> => {
    const response = await api.patch(`/tasks/${taskId}`, data);
    return response.data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
};

// --- Chat Interfaces ---
export interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export interface Chat {
    id: string;
    project_id: string;
    title: string;
    created_at: string;
}

const AGENT_URL = 'http://localhost:8001';

// --- Chat Functions ---
export const createChat = async (projectId: string, title: string): Promise<Chat> => {
    const response = await api.post(`/projects/${projectId}/chats/`, { project_id: projectId, title });
    return response.data;
};

export const listChats = async (projectId: string): Promise<Chat[]> => {
    const response = await api.get(`/projects/${projectId}/chats/`);
    return response.data;
};

export const getChatHistory = async (chatId: string): Promise<Message[]> => {
    const response = await api.get(`/chats/${chatId}/history`);
    return response.data;
};

export const createMessage = async (chatId: string, content: string, role: 'user' | 'assistant' = 'user'): Promise<Message> => {
    const response = await api.post(`/chats/${chatId}/messages/`, { chat_id: chatId, content, role });
    return response.data;
};

export const streamChat = async (projectId: string, message: string, onEvent: (event: any) => void) => {
    const response = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message })
    });

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    onEvent(data);
                } catch (e) {
                    console.error("Error parsing SSE chunk:", e);
                }
            }
        }
    }
};

const apiService = {
    getProjects,
    getProject,
    createProject,
    getSnaps,
    createSnap,
    getAllSnaps,
    getProjectBoard,
    createCard,
    updateCard,
    deleteCard,
    updateCardStatus,
    createTask,
    updateTask,
    deleteTask,
    createChat,
    listChats,
    getChatHistory,
    createMessage,
    streamChat,
    importDocument: async (projectId: string, fileName: string, fileContent: string, onEvent: (event: any) => void) => {
        const message = `IMPORT_FILE: ${fileName}\nContent:\n${fileContent}`;
        return apiService.streamChat(projectId, message, onEvent);
    }
};

export default apiService;
