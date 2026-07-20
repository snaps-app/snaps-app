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
