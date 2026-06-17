export interface Project {
    id: string;
    name: string;
    description: string;
    instructions: string;
    template: string;
    user_id?: string;
    settings?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface ProjectDetail extends Project {
    boards: Board[];
    labels: any[];
    source_documents: any[];
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
    project_name?: string;
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
    card_type?: 'feature' | 'bug' | 'support' | 'tech-debt' | 'refactor' | 'chore' | 'sprint_macro';
    description: string;
    status: string;
    priority: 'Low' | 'Medium' | 'High';
    due_date?: string;
    labels?: string[];
    user_ids?: string[];          // assignees (Migration 036)
    epic_id?: string;
    sprint_id?: string;          // FK to sprints.id
    github_issue_number?: number; // Phase 3 prep
    github_issue_url?: string;    // Phase 3 prep
    source?: string;              // manual | github | mcp
    repo_name?: string;           // which repo this card belongs to
    tasks?: Task[];
    task_count?: number;
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
    execution_order?: number;
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
    execution_order?: number;
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
    public_visible?: boolean;
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
    board_type?: 'roadmap' | 'support' | 'general' | 'team_kanban';
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

// --- TestPlan & QA Interfaces ---
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

export interface TestPlanSummary {
    id: string;
    title: string;
    status?: string;
    content?: string;
    created_at?: string;
}

export interface TroubleReport {
    sprint_id: string;
    sprint_name: string;
    total_cards: number;
    failed_bdd_cards: CardWithProject[];
    test_plans: TestPlanSummary[];
    markdown_report?: string;
}

// --- GitHub Sync Interfaces ---
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
    repo_names?: string;
}

export interface GithubConfigCreate {
    repo_owner: string;
    repo_name?: string;
    repo_names?: string;
    github_pat: string;
}

// --- Project API Key Interfaces ---
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

export interface BridgeProcessResult {
    doc_id: string;
    sprints_created: { id: string; name: string; tag: string; objective: string }[];
    cards_created: { id: string; title: string }[];
}

// --- Workflow Template Interfaces ---
export interface PhaseConfigItem {
    key: string;
    label: string;
    agent: string;
    tools: string[];
    skills: string[];
    entry_prompt?: string | null;
    exit_prompt?: string | null;
    branching_strategy?: string | null;
    join_strategy?: string | null;
    on_failure?: string | null;
    on_success?: string | null;
    advance_conditions?: Record<string, any> | null;
    max_retries?: number | null;
    allowed_commands?: string[];
    auto_advance?: boolean;
    execution_mode?: 'sequential' | 'parallel';
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    phases: PhaseConfigItem[];
    default_agents: string[];
    created_at: string;
    updated_at: string;
}

export interface WorkflowTemplateCreate {
    name: string;
    phases: PhaseConfigItem[];
    default_agents: string[];
}

// --- Agent Execution Interfaces ---
export interface AgentTaskExecution {
    id: string;
    project_id: string;
    status: 'pending' | 'in_progress' | 'awaiting_advance' | 'done' | 'failed';
    phase: string;
    sprint_ids: string[];
    card_ids: string[];
    agent_name: string;
    prompt_snapshot?: string | { entry: string; exit?: string };
    context_data?: any;
    advance_conditions: any;
    plan_id?: string;
    parent_id?: string;
    root_id?: string;
    branch_type?: string;
    workflow_template_id?: string;
    created_at: string;
    updated_at: string;
}

export interface AgentTaskExecutionCreate {
    project_id: string;
    phase: string;
    sprint_ids: string[];
    card_ids: string[];
    context_data?: any;
    workflow_template_id?: string;
}

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
