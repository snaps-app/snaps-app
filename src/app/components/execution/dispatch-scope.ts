/**
 * Escopo de despacho e override humano (SNA-SUP-81).
 *
 * A API termina toda recusa de avanco com uma linha fixa que diz quais
 * condicoes o humano pode dispensar. Requisito do PO: nenhum gate se sobrepoe
 * ao override humano, entao toda recusa precisa virar algo clicavel aqui.
 */

const MARCADOR = 'Human override available (project admin, with reason; agents cannot):';

export const parseOverridableConditions = (detail?: string | null): string[] => {
    if (!detail || typeof detail !== 'string') return [];
    const linha = detail.split('\n').reverse().find(l => l.startsWith(MARCADOR));
    if (!linha) return [];
    return linha.slice(MARCADOR.length).split(',').map(s => s.trim()).filter(Boolean);
};

/** Recusas que nao sao condicao do template, com o texto para o humano. */
export const ROTULOS_ESTRUTURAIS: Record<string, string> = {
    single_execution_multiple_plans: 'Varios planos para uma execucao so (sem fan-out adiante)',
    required_env: 'Configuracao exigida pela proxima fase (required_env)',
    agent_profile: 'Perfil do agente da proxima fase',
    dispatch_scope_fan_out: 'Plano do escopo de despacho fora do conjunto executavel ou com aprovacao desatualizada',
};

export interface DispatchScopePlan {
    id: string;
    title?: string;
    status?: string;
    approval?: 'current' | 'stale' | 'missing';
    approved_revision?: number | null;
}

export interface DispatchScope {
    plan_ids: string[];
    card_ids: string[];
    plans: DispatchScopePlan[];
    deferred_plans: DispatchScopePlan[];
    reason: string;
    set_by?: { actor_id?: string; actor_kind?: string };
    set_at?: string;
    phase?: string;
}

export const escopoDaExecucao = (contextData: any): DispatchScope | null => {
    const escopo = contextData?.dispatch_scope;
    return escopo && Array.isArray(escopo.plan_ids) && escopo.plan_ids.length > 0 ? escopo : null;
};
