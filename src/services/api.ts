
import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

// --- Configuration ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach Supabase JWT to every request when available
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
        config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    return config;
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
    card_type?: 'feature' | 'bug' | 'support' | 'tech-debt';
    description: string;
    status: string;
    priority: 'Low' | 'Medium' | 'High';
    due_date?: string;
    labels?: string[];
    epic_id?: string;
    sprint_id?: string;          // FK to sprints.id
    github_issue_number?: number; // Phase 3 prep
    github_issue_url?: string;    // Phase 3 prep
    source?: string;              // manual | github | mcp
    repo_name?: string;           // which repo this card belongs to
    tasks?: Task[];
    bdd_scenarios?: any[];
    bdd_validated?: boolean;
    created_at: string;
    updated_at: string;
}

export interface CardWithProject extends Card {
    project_id: string;
    project_name: string;
    board_color?: string;
    epic_name?: string;
    epic_color?: string;
    sprint_name?: string;
    sprint_tag?: string;
}

// --- Sprint Interfaces ---
export interface Sprint {
    id: string;
    project_id: string;
    epic_id?: string;
    name: string;
    tag: string;
    status: 'planning' | 'active' | 'review' | 'done';
    objective?: string;
    start_date?: string;
    end_date?: string;
    retrospective?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface SprintCreate {
    project_id: string;
    name: string;
    tag: string;
    status?: string;
    objective?: string;
    epic_id?: string;
    start_date?: string;
    end_date?: string;
}

// --- Plan Interfaces ---
export interface Plan {
    id: string;
    project_id: string;
    sprint_id?: string;
    title: string;
    content?: string;
    status: 'draft' | 'approved' | 'executed' | 'archived';
    author?: string;
    created_at: string;
    updated_at: string;
}

export interface PlanCreate {
    project_id: string;
    title: string;
    content?: string;
    status?: string;
    author?: string;
    sprint_id?: string;
}

// --- Decision Interfaces ---
export interface Decision {
    id: string;
    project_id: string;
    code: string;
    title: string;
    context?: string;
    decision?: string;
    consequences?: string;
    status: 'proposed' | 'accepted' | 'deprecated';
    created_at: string;
    updated_at: string;
}

export interface DecisionCreate {
    project_id: string;
    code: string;
    title: string;
    context?: string;
    decision?: string;
    consequences?: string;
    status?: string;
    parent_id?: string;
    root_id?: string;
    branch_type?: string;
}

// --- Governance Interfaces ---
export type AgentInstructionType = 'ide_persona' | 'fleet_agent' | 'security';
export type AgentScope = 'global' | 'project';
export type GovernanceDocType = 'playbook' | 'strategy' | 'prd' | 'context' | 'roadmap' | 'other';
export type SkillScope = 'global' | 'project';
export type ResourceType = 'api_proxy' | 'ui_component' | 'documentation' | 'other';

export interface AgentInstruction {
    id: string;
    name: string;
    type: AgentInstructionType;
    instructions: string;
    project_id?: string;
    scope: AgentScope;
    created_at: string;
    updated_at: string;
    skills?: Skill[];
}

export interface GovernanceDoc {
    id: string;
    name: string;
    type: GovernanceDocType;
    content: string;
    project_id?: string;
    scope?: AgentScope;
    created_at: string;
    updated_at: string;
}

export interface Skill {
    id: string;
    name: string;
    content: string;
    language: string;
    params_schema?: Record<string, any>;
    version?: string;
    scope: SkillScope;
    project_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Resource {
    id: string;
    name: string;
    type: ResourceType;
    content: string;
    meta_data?: Record<string, any>;
    project_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Board {
    id: string;
    project_id: string;
    name: string;
    code?: string;
    board_type?: 'roadmap' | 'support' | 'general';
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

export const getProjectGovernanceDocs = async (projectId: string): Promise<GovernanceDoc[]> => {
    const response = await api.get('/governance-docs/', { params: { project_id: projectId } });
    // Note: backend might need to filter by project_id if it doesn't already
    return response.data.filter((d: any) => d.project_id === projectId);
};

// --- TestPlan & QA Functions ---
export interface TestPlan {
    id: string;
    project_id: string;
    sprint_id?: string;
    title: string;
    content?: string;
    status: 'draft' | 'active' | 'passed' | 'failed';
    execution_log?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface TestPlanCreate {
    project_id: string;
    sprint_id?: string;
    title: string;
    content?: string;
    status?: string;
    execution_log?: Record<string, any>;
}

export interface TroubleReport {
    sprint_id: string;
    sprint_name: string;
    total_cards: number;
    failed_bdd_cards: CardWithProject[];
    markdown_report: string;
}

export const getTestPlans = async (projectId: string, sprintId?: string): Promise<TestPlan[]> => {
    const response = await api.get(`/projects/${projectId}/test_plans/`, {
        params: sprintId ? { sprint_id: sprintId } : {}
    });
    return response.data;
};

export const createTestPlan = async (projectId: string, data: Omit<TestPlanCreate, 'project_id'>): Promise<TestPlan> => {
    const response = await api.post(`/projects/${projectId}/test_plans/`, { project_id: projectId, ...data });
    return response.data;
};

export const updateTestPlan = async (testPlanId: string, data: Partial<TestPlanCreate>): Promise<TestPlan> => {
    const response = await api.patch(`/test_plans/${testPlanId}`, data);
    return response.data;
};

export const deleteTestPlan = async (testPlanId: string): Promise<void> => {
    await api.delete(`/test_plans/${testPlanId}`);
};

export const getTroubleReport = async (projectId: string, sprintId: string): Promise<TroubleReport> => {
    const response = await api.get(`/projects/${projectId}/sprints/${sprintId}/trouble-report`);
    return response.data;
};

export const getCardExecutionPrompt = async (cardId: string): Promise<string> => {
    const response = await api.get(`/api/cards/${cardId}/execution-prompt`);
    return response.data.prompt;
};

export const getSprintExecutionPrompt = async (sprintId: string): Promise<string> => {
    const response = await api.get(`/api/sprints/${sprintId}/execution-prompt`);
    return response.data.prompt;
};

// --- GitHub Sync Functions ---
export interface GithubConfig {
    id: string;
    project_id: string;
    repo_owner: string;
    repo_name: string;
    github_pat: string;
    last_sync_at?: string;
    sync_status?: string;
    sync_error?: string;
    created_at: string;
    updated_at: string;
}

export interface GithubConfigCreate {
    repo_owner: string;
    repo_name: string;
    github_pat: string;
}

export const getGithubConfig = async (projectId: string): Promise<GithubConfig> => {
    const response = await api.get(`/projects/${projectId}/github-config`);
    return response.data;
};

export const upsertGithubConfig = async (projectId: string, data: GithubConfigCreate): Promise<GithubConfig> => {
    const response = await api.post(`/projects/${projectId}/github-config`, data);
    return response.data;
};

export const syncGithubProject = async (projectId: string): Promise<{ message: string }> => {
    const response = await api.post(`/projects/${projectId}/github-config/sync`);
    return response.data;
};

// --- Project API Key Functions ---
export interface ProjectApiKeyCreate {
    name: string;
    allowed_origins?: string[];
}

export interface ProjectApiKeyPublic {
    id: string;
    project_id: string;
    name: string;
    is_active: boolean;
    allowed_origins: string[];
    created_at: string;
    last_used_at?: string;
}

export interface ProjectApiKeyCreated extends ProjectApiKeyPublic {
    key: string;
}

export const getProjectApiKeys = async (projectId: string): Promise<ProjectApiKeyPublic[]> => {
    const response = await api.get(`/projects/${projectId}/api-keys`);
    return response.data;
};

export const createProjectApiKey = async (projectId: string, data: ProjectApiKeyCreate): Promise<ProjectApiKeyCreated> => {
    const response = await api.post(`/projects/${projectId}/api-keys`, data);
    return response.data;
};

export const revokeProjectApiKey = async (projectId: string, keyId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/api-keys/${keyId}`);
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
export const getSnaps = async (projectId: string, skip: number = 0, limit: number = 100, sprintId?: string, agentExecutionId?: string): Promise<Snap[]> => {
    const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
    });
    if (sprintId) params.append('sprint_id', sprintId);
    if (agentExecutionId) params.append('agent_execution_id', agentExecutionId);
    
    const response = await api.get(`/projects/${projectId}/snaps/`, { params });
    return response.data;
};

export const createSnap = async (data: SnapCreate): Promise<Snap> => {
    const response = await api.post('/snaps/', data);
    return response.data;
};

export const updateSnap = async (snapId: string, data: Partial<SnapCreate>): Promise<Snap> => {
    const response = await api.patch(`/snaps/${snapId}`, data);
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

export const getCard = async (cardId: string): Promise<Card> => {
    const response = await api.get(`/cards/${cardId}`);
    return response.data;
};

export const deleteCard = async (cardId: string): Promise<void> => {
    await api.delete(`/cards/${cardId}`);
};

export const updateCardStatus = async (cardId: string, status: string): Promise<Card> => {
    const response = await api.patch(`/cards/${cardId}/status`, null, { params: { status } });
    return response.data;
};

// --- Sprint Functions ---
export const getSprints = async (projectId: string): Promise<Sprint[]> => {
    const response = await api.get(`/projects/${projectId}/sprints/`);
    return response.data;
};

export const getCardsBySprint = async (sprintId: string): Promise<Card[]> => {
    const response = await api.get(`/sprints/${sprintId}/cards`);
    return response.data;
};

export const createSprint = async (projectId: string, data: Omit<SprintCreate, 'project_id'>): Promise<Sprint> => {
    const response = await api.post(`/projects/${projectId}/sprints/`, { project_id: projectId, ...data });
    return response.data;
};

export const updateSprint = async (sprintId: string, data: Partial<SprintCreate>): Promise<Sprint> => {
    const response = await api.patch(`/sprints/${sprintId}`, data);
    return response.data;
};

export const deleteSprint = async (sprintId: string): Promise<void> => {
    await api.delete(`/sprints/${sprintId}`);
};

// --- Plan Functions ---
export const getPlans = async (projectId: string, sprintId?: string): Promise<Plan[]> => {
    const response = await api.get(`/projects/${projectId}/plans/`, {
        params: sprintId ? { sprint_id: sprintId } : {}
    });
    return response.data;
};

export const createPlan = async (projectId: string, data: Omit<PlanCreate, 'project_id'>): Promise<Plan> => {
    const response = await api.post(`/projects/${projectId}/plans/`, { project_id: projectId, ...data });
    return response.data;
};

export const updatePlan = async (planId: string, data: Partial<PlanCreate>): Promise<Plan> => {
    const response = await api.patch(`/plans/${planId}`, data);
    return response.data;
};

export const deletePlan = async (planId: string): Promise<void> => {
    await api.delete(`/plans/${planId}`);
};

// --- Decision Functions ---
export const getDecisions = async (projectId: string): Promise<Decision[]> => {
    const response = await api.get(`/projects/${projectId}/decisions/`);
    return response.data;
};

export const createDecision = async (projectId: string, data: Omit<DecisionCreate, 'project_id'>): Promise<Decision> => {
    const response = await api.post(`/projects/${projectId}/decisions/`, { project_id: projectId, ...data });
    return response.data;
};

export const updateDecision = async (decisionId: string, data: Partial<DecisionCreate>): Promise<Decision> => {
    const response = await api.patch(`/decisions/${decisionId}`, data);
    return response.data;
};

export const deleteDecision = async (decisionId: string): Promise<void> => {
    await api.delete(`/decisions/${decisionId}`);
};

// --- Snap Status ---
export const updateSnapStatus = async (snapId: string, status: string): Promise<any> => {
    const response = await api.patch(`/snaps/${snapId}/status`, { status });
    return response.data;
};

// --- Migration Runner ---
export const applyMigrations = async (): Promise<any> => {
    const response = await api.post('/migrations/apply');
    return response.data;
};

export const getMigrationStatus = async (): Promise<any> => {
    const response = await api.get('/migrations/status');
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

export const cloneYesterdayExecutions = async (date?: string): Promise<DailyExecution[]> => {
    const response = await api.post('/daily_executions/clone_yesterday', null, { params: { date } });
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

const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:8000';

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

// --- Governance CRUD ---
export const getAgents = async (projectId?: string): Promise<AgentInstruction[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/agents/', { params });
    return response.data;
};

export const getAgent = async (agentId: string): Promise<AgentInstruction> => {
    const response = await api.get(`/agents/${agentId}`);
    return response.data;
};

export const createAgent = async (data: Partial<AgentInstruction>): Promise<AgentInstruction> => {
    const response = await api.post('/agents/', data);
    return response.data;
};

export const updateAgent = async (agentId: string, data: Partial<AgentInstruction>): Promise<AgentInstruction> => {
    const response = await api.patch(`/agents/${agentId}`, data);
    return response.data;
};

export const deleteAgent = async (agentId: string): Promise<void> => {
    await api.delete(`/agents/${agentId}`);
};

export const bindSkillToAgent = async (agentId: string, skillId: string): Promise<AgentInstruction> => {
    const response = await api.post(`/agents/${agentId}/skills/${skillId}`);
    return response.data;
};

export const unbindSkillFromAgent = async (agentId: string, skillId: string): Promise<AgentInstruction> => {
    const response = await api.delete(`/agents/${agentId}/skills/${skillId}`);
    return response.data;
};

export const getGovernanceDocs = async (): Promise<GovernanceDoc[]> => {
    const response = await api.get('/governance-docs/');
    return response.data;
};

export const createGovernanceDoc = async (data: Partial<GovernanceDoc>): Promise<GovernanceDoc> => {
    const response = await api.post('/governance-docs/', data);
    return response.data;
};

export const updateGovernanceDoc = async (docId: string, data: Partial<GovernanceDoc>): Promise<GovernanceDoc> => {
    const response = await api.patch(`/governance-docs/${docId}`, data);
    return response.data;
};

export const deleteGovernanceDoc = async (docId: string): Promise<void> => {
    await api.delete(`/governance-docs/${docId}`);
};

export interface BridgeProcessResult {
    doc_id: string;
    sprints_created: { id: string; name: string; tag: string; objective: string }[];
    cards_created: { id: string; title: string }[];
}

export const processGovernanceDoc = async (docId: string): Promise<BridgeProcessResult> => {
    const response = await api.post(`/governance-docs/${docId}/process`);
    return response.data;
};

export const getSkills = async (projectId?: string): Promise<Skill[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/skills/', { params });
    return response.data;
};

export const createSkill = async (data: Partial<Skill>): Promise<Skill> => {
    const response = await api.post('/skills/', data);
    return response.data;
};

export const updateSkill = async (skillId: string, data: Partial<Skill>): Promise<Skill> => {
    const response = await api.patch(`/skills/${skillId}`, data);
    return response.data;
};

export const deleteSkill = async (skillId: string): Promise<void> => {
    await api.delete(`/skills/${skillId}`);
};

export const getResources = async (projectId?: string): Promise<Resource[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/resources/', { params });
    return response.data;
};

export const createResource = async (data: Partial<Resource>): Promise<Resource> => {
    const response = await api.post('/resources/', data);
    return response.data;
};

export const updateResource = async (resourceId: string, data: Partial<Resource>): Promise<Resource> => {
    const response = await api.patch(`/resources/${resourceId}`, data);
    return response.data;
};

export const deleteResource = async (resourceId: string): Promise<void> => {
    await api.delete(`/resources/${resourceId}`);
};

// --- Agent Execution Functions (Sprint 4.6) ---
export interface AgentTaskExecution {
    id: string;
    project_id: string;
    status: 'pending' | 'in_progress' | 'awaiting_advance' | 'done' | 'failed';
    phase: 'micro_planning' | 'execution' | 'assurance' | 'retro';
    sprint_ids: string[];
    card_ids: string[];
    agent_name: string;
    prompt_snapshot: string | { entry: string; exit?: string };
    context_data: any;
    advance_conditions: any;
    created_at: string;
    updated_at: string;
}

export interface AgentTaskExecutionCreate {
    project_id: string;
    phase: 'macro_planning' | 'micro_planning' | 'execution' | 'assurance' | 'retro';
    sprint_ids: string[];
    card_ids: string[];
    context_data?: any;
}

export const createAgentExecution = async (data: AgentTaskExecutionCreate): Promise<AgentTaskExecution> => {
    const response = await api.post('/api/agent-executions/', data);
    return response.data;
};

export const getAgentExecution = async (executionId: string): Promise<AgentTaskExecution> => {
    const response = await api.get(`/api/agent-executions/${executionId}`);
    return response.data;
};

export const getAgentExecutionTree = async (executionId: string): Promise<AgentTaskExecution[]> => {
    const response = await api.get(`/api/agent-executions/${executionId}/tree`);
    return response.data;
};

export const getActiveAgentExecutions = async (projectId: string): Promise<AgentTaskExecution[]> => {
    const response = await api.get(`/api/projects/${projectId}/agent-executions/active`);
    return response.data;
};

export const advanceAgentExecution = async (executionId: string, instructions?: string): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/advance`, { instructions });
    return response.data;
};

export const updateAgentExecutionStatus = async (executionId: string, status: string): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/status`, { status });
    return response.data;
};

export const rollbackAgentExecution = async (executionId: string, targetPhase: string): Promise<AgentTaskExecution> => {
    const response = await api.patch(`/api/agent-executions/${executionId}/rollback?target_phase=${targetPhase}`);
    return response.data;
};

export const syncAgentExecution = async (executionId: string, instructions?: string): Promise<AgentTaskExecution> => {
    const response = await api.post(`/api/agent-executions/${executionId}/sync`, { instructions });
    return response.data;
};

export const getAllAgentExecutions = async (skip = 0, limit = 100): Promise<AgentTaskExecution[]> => {
    const response = await api.get('/api/agent-executions/', { params: { skip, limit } });
    return response.data;
};

const apiService = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    getGithubConfig,
    upsertGithubConfig,
    syncGithubProject,
    getTroubleReport,

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

    // Sprint Engine
    getSprints,
    getCardsBySprint,
    createSprint,
    updateSprint,
    deleteSprint,
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getDecisions,
    createDecision,
    updateDecision,
    deleteDecision,

    // Governance
    getAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    bindSkillToAgent,
    unbindSkillFromAgent,
    getGovernanceDocs,
    createGovernanceDoc,
    updateGovernanceDoc,
    deleteGovernanceDoc,
    processGovernanceDoc,
    getSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    getResources,
    createResource,
    updateResource,
    deleteResource,

    // Snaps
    updateSnapStatus,

    // Migrations
    applyMigrations,
    getMigrationStatus,
    getAgentExecution,
    getActiveAgentExecutions,
    getAllAgentExecutions,
    rollbackAgentExecution,
    syncAgentExecution,

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


