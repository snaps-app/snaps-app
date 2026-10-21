/**
 * Evento de `execution_events` → linha da Conversa (P15; TP-4 da Sprint 24.0).
 *
 * Nunca mostra campo sensível. A tela não confia no payload: só lê os campos
 * que cada descrição nomeia, e só se forem identificadores curtos (fase,
 * status, operação, repo, SHA) ou números. Texto livre (motivo, pergunta,
 * erro) e qualquer valor com cara de credencial ficam de fora. Evento que a
 * tela não conhece mostra o nome técnico, e nada do payload.
 *
 * Cobre os eventos do catálogo atual (`services/execution_events.py`), o
 * `pr_heads_captured` do TP-1 e os do E7 (`request_*`, `execution_paused`,
 * `execution_resumed`, `agent_question`, `agent_answer`,
 * `supervision_mode_changed`), que chegam quando a raiz do E7 entrar.
 */

export type TomDoEvento = 'neutro' | 'sucesso' | 'atencao' | 'erro' | 'info' | 'roxo';

export interface EventoParaDescrever {
    name: string;
    payload?: Record<string, unknown> | null;
}

export interface DescricaoDoEvento {
    texto: string;
    tom: TomDoEvento;
    conhecido: boolean;
}

/** Identificador curto: `execution`, `snaps-app`, `b341d60`, `ci_passed`. */
const IDENTIFICADOR = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,63}$/;
/** O que parece credencial não passa, nem com formato de identificador. */
const PARECE_SEGREDO = /(^eyJ)|(^gh[opsu]_)|(^sk-)|(bearer)|(token)|(secret)|(password)/i;

function campo(payload: Record<string, unknown> | null | undefined, chave: string): string | null {
    const valor = payload?.[chave];
    if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
    if (typeof valor !== 'string' || !IDENTIFICADOR.test(valor) || PARECE_SEGREDO.test(valor)) return null;
    return valor;
}

function lista(payload: Record<string, unknown> | null | undefined, chave: string): string[] {
    const valor = payload?.[chave];
    if (!Array.isArray(valor)) return [];
    return valor.filter((v): v is string => typeof v === 'string' && IDENTIFICADOR.test(v) && !PARECE_SEGREDO.test(v));
}

const seta = (de: string | null, para: string | null) => (de || para ? `${de ?? '?'} → ${para ?? '?'}` : '');
const com = (texto: string, extra: string | null | undefined) => (extra ? `${texto}: ${extra}` : texto);

type Descritor = (p: Record<string, unknown> | null | undefined) => Omit<DescricaoDoEvento, 'conhecido'>;

/** Linha do `pr_heads_captured`: "snaps-app #88 · b341d60". */
function heads(p: Record<string, unknown> | null | undefined): string {
    const itens = Array.isArray(p?.heads) ? (p!.heads as Record<string, unknown>[]) : [];
    return itens
        .map((h) => {
            const repo = campo(h, 'repo') ?? 'repo';
            const numero = campo(h, 'pr_number');
            const sha = campo(h, 'head_sha');
            return `${repo}${numero ? ` #${numero}` : ''} · ${sha ? sha.slice(0, 7) : 'não capturado'}`;
        })
        .join('; ');
}

const DESCRITORES: Record<string, Descritor> = {
    command_received: (p) => ({ texto: com('Comando recebido', campo(p, 'operation')), tom: 'neutro' }),
    command_completed: (p) => ({ texto: com('Comando concluído', campo(p, 'status')), tom: 'sucesso' }),
    command_failed: (p) => ({ texto: com('Comando recusado', campo(p, 'error_code')), tom: 'erro' }),
    execution_created: () => ({ texto: 'Nó criado', tom: 'info' }),
    phase_advanced: (p) => ({ texto: com('Fase avançou', seta(campo(p, 'from_phase'), campo(p, 'to_phase'))), tom: 'sucesso' }),
    phase_rolled_back: (p) => ({ texto: com('Rollback', seta(campo(p, 'from_phase'), campo(p, 'to_phase'))), tom: 'atencao' }),
    execution_status_changed: (p) => ({ texto: com('Status', seta(campo(p, 'from_status'), campo(p, 'to_status'))), tom: 'info' }),
    execution_updated: (p) => ({ texto: com('Nó atualizado', lista(p, 'fields').join(', ')), tom: 'neutro' }),
    workflow_changed: () => ({ texto: 'Workflow do nó trocado', tom: 'atencao' }),
    execution_tombstoned: () => ({ texto: 'Nó descartado', tom: 'atencao' }),
    authorization_decided: (p) => ({
        texto: com('Autorização', [campo(p, 'operation'), campo(p, 'outcome')].filter(Boolean).join(' → ')),
        tom: 'neutro',
    }),
    override_authorized: (p) => ({ texto: com('Override autorizado', lista(p, 'conditions').join(', ')), tom: 'atencao' }),
    override_applied: (p) => ({ texto: com('Override aplicado', lista(p, 'conditions').join(', ')), tom: 'atencao' }),
    side_effect_intent: (p) => ({
        texto: com('Efeito pedido', [campo(p, 'provider'), campo(p, 'operation')].filter(Boolean).join(' · ')),
        tom: 'neutro',
    }),
    side_effect_receipt: (p) => ({
        texto: com('Efeito confirmado', [campo(p, 'provider'), campo(p, 'operation'), campo(p, 'status')].filter(Boolean).join(' · ')),
        tom: 'sucesso',
    }),
    plan_approved: (p) => ({ texto: com('Plano aprovado', campo(p, 'content_revision') && `revisão ${campo(p, 'content_revision')}`), tom: 'sucesso' }),
    plan_approval_invalidated: (p) => ({
        texto: com('Aprovação do plano invalidada', seta(campo(p, 'old_revision'), campo(p, 'new_revision'))),
        tom: 'atencao',
    }),
    artifact_submitted: () => ({ texto: 'Artefato submetido', tom: 'info' }),
    test_plan_verdict_recorded: (p) => ({ texto: com('Resultado do test plan', campo(p, 'verdict')), tom: 'info' }),
    gate_evaluated: (p) => {
        const resultado = campo(p, 'result');
        const gate = campo(p, 'gate') ?? 'gate';
        return {
            texto: `Gate ${gate}: ${resultado === 'passed' ? 'aprovado' : resultado === 'failed' ? 'recusado' : resultado ?? '?'}`,
            tom: resultado === 'failed' ? 'erro' : resultado === 'passed' ? 'sucesso' : 'neutro',
        };
    },
    phase_directive_retired: (p) => ({ texto: com('Diretiva de fase aposentada', campo(p, 'directive')), tom: 'neutro' }),
    phase_converged: (p) => ({ texto: com('Fase convergiu', seta(campo(p, 'from_phase'), campo(p, 'to_phase'))), tom: 'info' }),
    execution_delivered_closed: () => ({ texto: 'Nó fechado como entregue', tom: 'sucesso' }),
    pr_heads_captured: (p) => ({ texto: com('SHA do head registrado', heads(p)), tom: 'info' }),
    dispatch_scope_set: (p) => ({ texto: `Escopo de despacho definido: ${lista(p, 'plan_ids').length} plano(s)`, tom: 'atencao' }),
    dispatch_scope_cleared: () => ({ texto: 'Escopo de despacho removido', tom: 'neutro' }),
    // E7: pedidos do Neuron, pausa, perguntas e modo de supervisão.
    request_pending: (p) => ({ texto: com('Pedido do Neuron esperando você', campo(p, 'operation')), tom: 'atencao' }),
    request_executed: (p) => ({ texto: com('Pedido do Neuron executado', campo(p, 'operation')), tom: 'sucesso' }),
    request_refused: (p) => ({ texto: com('Pedido do Neuron recusado pelo Soma', campo(p, 'refusal_code')), tom: 'erro' }),
    request_rejected: (p) => ({ texto: com('Pedido do Neuron recusado por você', campo(p, 'operation')), tom: 'neutro' }),
    request_stale: (p) => ({ texto: com('Pedido do Neuron ficou velho: o nó mudou', campo(p, 'operation')), tom: 'neutro' }),
    request_changed: (p) => ({ texto: com('Pedido do Neuron mudou de estado', campo(p, 'state')), tom: 'neutro' }),
    execution_paused: () => ({ texto: 'Nó pausado', tom: 'atencao' }),
    execution_resumed: () => ({ texto: 'Nó retomado', tom: 'info' }),
    agent_question: () => ({ texto: 'Pergunta ao agente', tom: 'roxo' }),
    agent_answer: () => ({ texto: 'Resposta do agente', tom: 'roxo' }),
    supervision_mode_changed: (p) => ({
        texto: com('Modo de supervisão', seta(campo(p, 'from_mode') ?? campo(p, 'from'), campo(p, 'to_mode') ?? campo(p, 'to'))),
        tom: 'roxo',
    }),
};

const SESSAO: Record<string, string> = {
    started: 'iniciada', continued: 'continuada', compaction_requested: 'compactação pedida', compacted: 'compactada',
    rollover_requested: 'troca pedida', rolled_over: 'trocada', resumed: 'retomada', failed: 'falhou',
};

export function descreverEvento(evento: EventoParaDescrever): DescricaoDoEvento {
    const descritor = DESCRITORES[evento.name];
    if (descritor) return { ...descritor(evento.payload), conhecido: true };
    if (evento.name.startsWith('session.')) {
        const fase = SESSAO[evento.name.slice('session.'.length)];
        if (fase) return { texto: `Sessão técnica ${fase}`, tom: fase === 'falhou' ? 'erro' : 'neutro', conhecido: true };
    }
    return { texto: evento.name, tom: 'neutro', conhecido: false };
}
