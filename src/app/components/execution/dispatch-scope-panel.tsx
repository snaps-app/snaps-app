import { useState } from 'react';
import { RevisaoDoEscopo } from './revisao-do-escopo';
import { escopoDaExecucao } from './dispatch-scope';
import type { AgentTaskExecution } from '@/services/types';

export function DispatchScopePanel({ execution, onExecutionUpdated, admin = true }: {
    execution: AgentTaskExecution; onExecutionUpdated: (no: AgentTaskExecution) => void; admin?: boolean;
}) {
    const escopo = escopoDaExecucao(execution.context_data);
    const planejamento = ['micro_planning', 'plan_review'].includes(execution.phase);
    const [revisando, setRevisando] = useState(false);
    if (!planejamento && !escopo) return null;
    return <section className="space-y-3">
        {escopo && <div data-testid="dispatch-scope-banner" className="rounded border border-white/10 p-3 text-sm">
            <p>Escopo: {escopo.plans.map(p => p.title || p.id).join(', ')} · {escopo.card_ids.length} cards</p>
            <p>Adiados: {escopo.deferred_plans.map(p => p.title || p.id).join(', ') || 'nenhum'}</p>
            <p>{escopo.reason} · {escopo.set_by?.actor_id}</p>
        </div>}
        {planejamento && admin && <button type="button" onClick={() => setRevisando(v => !v)}>Revisar escopo</button>}
        {planejamento && (!escopo || revisando) && <RevisaoDoEscopo key={`${execution.id}:${execution.lock_version}`} execution={execution} admin={admin}
            onConfirmar={no => { onExecutionUpdated(no); setRevisando(false); }} />}
    </section>;
}
