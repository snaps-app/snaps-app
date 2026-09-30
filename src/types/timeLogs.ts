export interface ExecutionSession {
    id: string;
    agent_execution_id: string;
    user_id: string;
    user_display_name: string;
    started_at: string;
    ended_at: string | null;
    duration_hours: number;
    // Sessão já apontada em um time log: não pode mais ser editada nem excluída.
    time_log_id?: string | null;
    locked?: boolean;
}

export interface TimeLog {
    id: string;
    project_id: string;
    user_id: string;
    card_id: string | null;
    scheduling_id: string | null;
    agent_execution_id: string | null;
    date: string;
    hours: number;
    description: string | null;
    status: 'draft' | 'confirmed';
    card_title?: string;
    scheduling_title?: string;
    user_display_name?: string;
    project_name?: string;
    created_at?: string;
}

export interface TimeLogCreate {
    user_id: string;
    card_id?: string | null;
    scheduling_id?: string | null;
    agent_execution_id?: string | null;
    date: string;
    hours: number;
    description?: string;
    status?: 'draft' | 'confirmed';
    // Sessões da execução cobertas por este apontamento; ficam travadas ao criar.
    session_ids?: string[];
}

export interface TimeLogFilters {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    project_id?: string;
}

export interface DraftEntry {
    date: string;
    hours: number;
    description: string;
    user_id: string;
    session_ids?: string[];
}

export interface Participant {
    user_id: string;
    display_name: string;
    sessions_count: number;
}

export interface TimeDraftResponse {
    drafts: DraftEntry[];
    participants: Participant[];
}
