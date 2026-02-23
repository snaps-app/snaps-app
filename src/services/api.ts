
import axios from 'axios';

// --- Configuration ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export interface Epic {
    id: string;
    project_id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
}

export interface EpicCreate {
    project_id: string;
    name: string;
    color: string;
}

export interface Task {
    id: string;
    card_id: string;
    title: string;
    code?: string;
    completed: boolean;
    runner_id?: string;
    created_at: string;
}

export interface Card {
    id: string;
    board_id: string;
    title: string;
    code?: string;
    description: string;
    status: string;
    priority: 'Low' | 'Medium' | 'High';
    due_date?: string;
    labels?: string[]; // Simplified to strings for now, backend expects UUIDs? Let's assume strings or IDs 
    epic_id?: string;
    tasks?: Task[]; // Populated if backend returns them
    created_at: string;
    updated_at: string;
}

export interface CardWithProject extends Card {
    project_id: string;
    project_name: string;
    board_color?: string;
    epic_name?: string;
    epic_color?: string;
}

export interface Board {
    id: string;
    project_id: string;
    name: string;
    code?: string;
    color?: string;
    columns?: { id: string; title: string; color?: string }[];
    cards?: Card[];
}

export interface Scheduling {
    id: string;
    project_id: string;
    epic_id?: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    status: string;
    recurrence?: string;
    created_at: string;
    updated_at: string;
}

export interface SchedulingCreate {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    epic_id?: string;
    status?: string;
    recurrence?: string;
}

export interface DailyExecution {
    id: string;
    project_id: string;
    epic_id?: string;
    title: string;
    description?: string;
    date: string;
    start_hour: string;
    end_hour: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface DailyExecutionCreate {
    title: string;
    description?: string;
    date: string;
    start_hour: string;
    end_hour: string;
    epic_id?: string;
    status?: string;
    card_id?: string;
    task_id?: string;
}

export interface SchedulingWithProject extends Scheduling {
    project_name: string;
    epic_name?: string;
    epic_color?: string;
    board_color?: string;
}

export interface DailyExecutionWithProject extends DailyExecution {
    project_name: string;
    epic_name?: string;
    epic_color?: string;
    board_color?: string;
}

export interface BoardWithProject extends Board {
    project_name: string;
}

export interface DashboardStats {
    total_projects: number;
    total_cards: number;
    total_tasks: number;
    total_snaps: number;
    recent_boards: BoardWithProject[];
}

// --- Routine Interfaces ---
export interface Routine {
    id: string;
    title: string;
    description?: string;
    recurrence_type: string;  // 'daily' | 'weekdays'
    recurrence_days: number[];  // [0=Sun, 1=Mon, ..., 6=Sat]
    default_start_hour?: string;
    default_end_hour?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RoutineCreate {
    title: string;
    description?: string;
    recurrence_type: string;
    recurrence_days?: number[];
    default_start_hour?: string;
    default_end_hour?: string;
}

export interface RoutineWithStatus extends Routine {
    completion_status: string | null;  // null = planned
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

export const updateProject = async (projectId: string, data: Partial<ProjectCreate>): Promise<Project> => {
    const response = await api.patch(`/projects/${projectId}`, data);
    return response.data;
};

// --- Epic Functions ---
export const getEpics = async (projectId: string): Promise<Epic[]> => {
    const response = await api.get(`/projects/${projectId}/epics/`);
    return response.data;
};

export const createEpic = async (projectId: string, data: EpicCreate): Promise<Epic> => {
    const response = await api.post(`/projects/${projectId}/epics/`, data);
    return response.data;
};

export const updateEpic = async (epicId: string, data: Partial<EpicCreate>): Promise<Epic> => {
    const response = await api.patch(`/epics/${epicId}`, data);
    return response.data;
};

export const deleteEpic = async (epicId: string): Promise<void> => {
    await api.delete(`/epics/${epicId}`);
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

export const getAllCards = async (skip = 0, limit = 100): Promise<CardWithProject[]> => {
    const response = await api.get('/cards/', { params: { skip, limit } });
    return response.data;
};

export const getProjectBoard = async (projectId: string): Promise<Board> => {
    const response = await api.get(`/projects/${projectId}/board`);
    return response.data;
};

export const getProjectBoards = async (projectId: string): Promise<Board[]> => {
    const response = await api.get(`/projects/${projectId}/boards`);
    return response.data;
};

export const getBoard = async (boardId: string): Promise<Board> => {
    const response = await api.get(`/boards/${boardId}`);
    return response.data;
};

export const createBoard = async (projectId: string, data: Partial<Board>): Promise<Board> => {
    const response = await api.post(`/projects/${projectId}/boards`, { project_id: projectId, ...data });
    return response.data;
};

export const updateBoard = async (boardId: string, data: Partial<Board>): Promise<Board> => {
    const response = await api.patch(`/boards/${boardId}`, data);
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

// --- Scheduling Functions ---
export const createScheduling = async (projectId: string, data: SchedulingCreate): Promise<Scheduling> => {
    const response = await api.post(`/projects/${projectId}/schedulings/`, { project_id: projectId, ...data });
    return response.data;
};

export const getSchedulings = async (projectId: string): Promise<Scheduling[]> => {
    const response = await api.get(`/projects/${projectId}/schedulings/`);
    return response.data;
};

export const updateScheduling = async (schedulingId: string, data: Partial<SchedulingCreate>): Promise<Scheduling> => {
    const response = await api.patch(`/schedulings/${schedulingId}`, data);
    return response.data;
};

export const deleteScheduling = async (schedulingId: string): Promise<void> => {
    await api.delete(`/schedulings/${schedulingId}`);
};

// --- Daily Execution Functions ---
export const createDailyExecution = async (projectId: string, data: DailyExecutionCreate): Promise<DailyExecution> => {
    const response = await api.post(`/projects/${projectId}/daily_executions/`, { project_id: projectId, ...data });
    return response.data;
};

export const getDailyExecutions = async (projectId: string): Promise<DailyExecution[]> => {
    const response = await api.get(`/projects/${projectId}/daily_executions/`);
    return response.data;
};

export const updateDailyExecution = async (executionId: string, data: Partial<DailyExecutionCreate>): Promise<DailyExecution> => {
    const response = await api.patch(`/daily_executions/${executionId}`, data);
    return response.data;
};

export const deleteDailyExecution = async (executionId: string): Promise<void> => {
    await api.delete(`/daily_executions/${executionId}`);
};

// --- Global Calendar Functions ---
export const getAllSchedulings = async (skip = 0, limit = 500): Promise<SchedulingWithProject[]> => {
    const response = await api.get('/schedulings/', { params: { skip, limit } });
    return response.data;
};

export const getAllDailyExecutions = async (skip = 0, limit = 500): Promise<DailyExecutionWithProject[]> => {
    const response = await api.get('/daily_executions/', { params: { skip, limit } });
    return response.data;
};

export const cloneYesterdayExecutions = async (): Promise<DailyExecution[]> => {
    const response = await api.post('/daily_executions/clone_yesterday');
    return response.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

// --- Routine Functions ---
export const createRoutine = async (data: RoutineCreate): Promise<Routine> => {
    const response = await api.post('/routines/', data);
    return response.data;
};

export const getRoutines = async (): Promise<Routine[]> => {
    const response = await api.get('/routines/');
    return response.data;
};

export const getRoutinesForDate = async (date: string): Promise<RoutineWithStatus[]> => {
    const response = await api.get('/routines/today', { params: { date } });
    return response.data;
};

export const updateRoutine = async (id: string, data: Partial<RoutineCreate & { active?: boolean }>): Promise<Routine> => {
    const response = await api.patch(`/routines/${id}`, data);
    return response.data;
};

export const deleteRoutine = async (id: string): Promise<void> => {
    await api.delete(`/routines/${id}`);
};

export const setRoutineCompletion = async (routineId: string, date: string, status: string): Promise<void> => {
    await api.put(`/routines/${routineId}/complete`, { date, status });
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

const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:8001';

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
    console.log('[API] streamChat calling:', { projectId, message });
    const response = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] streamChat error:', { status: response.status, body: errorText });
        throw new Error(`Chat API Error ${response.status}: ${errorText}`);
    }

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
    updateProject,

    // Epic Functions
    getEpics,
    createEpic,
    updateEpic,
    deleteEpic,

    getSnaps,
    createSnap,
    getAllSnaps,
    getProjectBoard,
    getProjectBoards,
    getBoard,
    createBoard,
    updateBoard,
    createCard,
    updateCard,
    deleteCard,
    updateCardStatus,
    getAllCards,
    createTask,
    updateTask,
    deleteTask,
    createChat,
    listChats,
    getChatHistory,
    createMessage,
    streamChat,

    // Scheduling
    createScheduling,
    getSchedulings,
    updateScheduling,
    deleteScheduling,

    // Daily Execution
    createDailyExecution,
    getDailyExecutions,
    updateDailyExecution,
    deleteDailyExecution,

    // Global
    getAllSchedulings,
    getAllDailyExecutions,
    cloneYesterdayExecutions,
    getDashboardStats,

    // Routines
    createRoutine,
    getRoutines,
    getRoutinesForDate,
    updateRoutine,
    deleteRoutine,
    setRoutineCompletion,

    importDocument: async (projectId: string, fileName: string, fileContent: string, onEvent: (event: any) => void) => {
        const message = `IMPORT_FILE: ${fileName}\nContent:\n${fileContent}`;
        // Use the dedicated /import endpoint
        console.log('[API] importDocument calling /import:', { projectId, fileName });

        const response = await fetch(`${AGENT_URL}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, message })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API] importDocument error:', { status: response.status, body: errorText });
            throw new Error(`Import API Error ${response.status}: ${errorText}`);
        }

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
    }
};

export default apiService;
