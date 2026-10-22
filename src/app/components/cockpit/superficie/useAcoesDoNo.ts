/**
 * As ações do nó no Cockpit novo, num hook só (P5). As abas, o cabeçalho e a
 * Conversa (TP-4) agem por aqui.
 *
 * - Cada ação chama a MESMA função de serviço que o Cockpit atual chama
 *   (`useCockpitActions.ts`, `useCockpitPlans.ts`, `services/*`). Nenhuma
 *   rota nova de mutação.
 * - O papel vem do `ProjectRoleProvider` da aba de raiz (TP-3, ADR-0020):
 *   viewer não tem ação; member avança, aprova, valida, registra e mexe no
 *   contexto e no prompt; rollback é só de admin. A API recusa de novo se a
 *   tela errar.
 * - Override é do dono da árvore ou de admin (ADR-0072), e QUEM decide é a
 *   API: o chamador passa o `pode_override` do `/resumo`. O app não refaz a
 *   regra. Sem o campo (API anterior à ADR-0072, que só aceitava admin), vale
 *   o papel admin, para a tela não oferecer o que aquele servidor recusaria.
 * - Depois do sucesso, a ação invalida `resumo(id)`, a aba afetada e, quando
 *   muda a árvore, o prefixo `raiz(rootId)` (árvore e rótulo das abas) e `snapshot(id)`. O evento SSE também chega
 *   e invalida o mesmo; invalidar duas vezes é inofensivo.
 * - O override fica num ponto só (`override`): o TP-6 do E7 troca a
 *   implementação pela rota unificada `POST /override` AQUI dentro (X2).
 *
 * O Cockpit atual não usa este hook; o TP-4 o apaga na integração.
 */
import { useCallback, useMemo, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useProjectRole } from '@/contexts/project-role-context';
import {
    advanceAgentExecution,
    createExecutionOverrideDecision,
    rollbackAgentExecution,
    syncAgentExecution,
    updateAgentExecutionStatus,
} from '@/services/agentExecutions';
import { updateCard } from '@/services/cards';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { approvePlan, updatePlan } from '@/services/plans';
import { updateTestPlan } from '@/services/testPlans';
import type { AgentTaskExecution, Card } from '@/services/types';
import type { ChaveDeAba } from './catalogo';

export type NomeDaAcao =
    | 'avancar' | 'rollback' | 'override'
    | 'aprovarPlano' | 'mudarStatusDoPlano' | 'pedirAjusteNoPlano'
    | 'validarBdd' | 'aprovarCenario'
    | 'registrarResultadoDeTestPlan' | 'salvarSelecaoDeTestPlans'
    | 'salvarContexto' | 'marcarEntradaExecutada';

const SO_ADMIN: ReadonlySet<NomeDaAcao> = new Set(['rollback']);

export const TODAS_AS_ACOES: readonly NomeDaAcao[] = [
    'avancar', 'rollback', 'override', 'aprovarPlano', 'mudarStatusDoPlano', 'pedirAjusteNoPlano',
    'validarBdd', 'aprovarCenario', 'registrarResultadoDeTestPlan', 'salvarSelecaoDeTestPlans',
    'salvarContexto', 'marcarEntradaExecutada',
];

/**
 * Quais ações o papel permite. Função pura, para o teste e para quem esconde
 * botão. `podeOverride` é o que a API disse (ADR-0072); `undefined` é API sem
 * o campo, e aí só admin, como ela aceitava.
 */
export function acoesPermitidas(role: string | null, podeEscrever: boolean, podeOverride?: boolean): Set<NomeDaAcao> {
    if (!podeEscrever) return new Set();
    const admin = role === 'admin' || role === 'owner';
    return new Set(TODAS_AS_ACOES.filter((a) => {
        if (a === 'override') return podeOverride ?? admin;
        return admin || !SO_ADMIN.has(a);
    }));
}

/**
 * O texto de uma ação recusada, para a pessoa. Revisão em conflito não é erro
 * dela: a tela já foi relida por `executar`, e basta repetir.
 */
export function textoDaRecusa(erro: unknown): string {
    const resposta = (erro as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
    const detalhe = resposta?.data?.detail;
    if (resposta?.status === 409 && typeof detalhe === 'string' && /revision mismatch/i.test(detalhe)) {
        return 'A execução mudou desde a última leitura (outra gravação ou outra pessoa). A tela foi atualizada: confira e repita a ação.';
    }
    if (typeof detalhe === 'string' && detalhe) return detalhe;
    return (erro as Error)?.message || 'Não foi possível concluir a ação. Tente de novo.';
}

/** Plano como o Cockpit lê de `context_data.plans`. */
export interface PlanoDoNo {
    id: string;
    title?: string;
    status?: string;
    content_revision?: number;
    approved_content_hash?: string | null;
}

export interface ContextoParaSalvar {
    missionContext?: string;
    docIds?: string[];
    decisionIds?: string[];
}

type NoDoHook = Pick<AgentTaskExecution, 'id' | 'lock_version'> & { root_id?: string | null };

export interface OpcoesDasAcoes {
    /** `pode_override` do `/resumo` do nó (ADR-0072). */
    podeOverride?: boolean;
}

export function useAcoesDoNo(execution: NoDoHook | null, { podeOverride }: OpcoesDasAcoes = {}) {
    const cliente = useQueryClient();
    const { role, can } = useProjectRole();
    const [emAndamento, setEmAndamento] = useState<NomeDaAcao | null>(null);
    const permitidas = useMemo(() => acoesPermitidas(role, can('write'), podeOverride), [role, can, podeOverride]);

    const id = execution?.id ?? null;
    const rootId = execution?.root_id || id;

    const executar = useCallback(async <T,>(
        nome: NomeDaAcao,
        abas: ChaveDeAba[],
        mudaArvore: boolean,
        acao: (no: NoDoHook) => Promise<T>,
    ): Promise<T> => {
        if (!execution) throw new Error('nenhum nó selecionado');
        if (!permitidas.has(nome)) throw new Error(`ação não permitida para o papel: ${nome}`);
        setEmAndamento(nome);
        const reler = (comArvore: boolean) => {
            const alvo: QueryKey[] = [chaves.resumo(execution.id), ...abas.map((a) => chaves.aba(execution.id, a))];
            if (comArvore && rootId) alvo.push(chaves.raiz(rootId), chaves.snapshot(execution.id));
            return Promise.all(alvo.map((queryKey) => cliente.invalidateQueries({ queryKey })));
        };
        try {
            const resultado = await acao(execution);
            await reler(mudaArvore);
            return resultado;
        } catch (erro) {
            // A falha pode ter vindo depois de o servidor gravar (a resposta se
            // perdeu), ou de uma revisão que a árvore em cache não tinha: um
            // `/sync` sobe a revisão duas vezes. Sem reler, a próxima tentativa
            // sai com a revisão velha e toma 409 (aceite DEV da 24.0).
            await reler(true).catch(() => undefined);
            throw erro;
        } finally {
            setEmAndamento(null);
        }
    }, [execution, permitidas, cliente, rootId]);

    const acoes = useMemo(() => {
        /** Override humano das condições, com motivo obrigatório. Ponto único (X2). */
        const override = (condicoes: string[], motivo: string) =>
            executar('override', ['no'], true, async (no) => {
                if (!motivo.trim()) throw new Error('o override exige um motivo');
                const decisao = await createExecutionOverrideDecision(no.id, motivo.trim(), condicoes);
                return advanceAgentExecution(no.id, undefined, undefined, undefined, true,
                    decisao.execution_revision, decisao.decision_id, condicoes);
            });

        const mudarStatusDoPlano = (plano: PlanoDoNo, status: string) =>
            executar('mudarStatusDoPlano', ['plano'], false, async () => {
                // O mesmo caminho de `useCockpitPlans.updatePlanStatus`.
                if (status === 'approved' && !plano.approved_content_hash) {
                    if (typeof plano.content_revision !== 'number') {
                        throw new Error('Plan revision is missing; reload before approving.');
                    }
                    return approvePlan(plano.id, plano.content_revision);
                }
                return updatePlan(plano.id, { status, expected_content_revision: plano.content_revision });
            });

        return {
            avancar: () => executar('avancar', ['no'], true, (no) =>
                advanceAgentExecution(no.id, undefined, undefined, undefined, false, no.lock_version)),
            rollback: (faseAlvo: string) => executar('rollback', ['no'], true, (no) =>
                rollbackAgentExecution(no.id, faseAlvo, no.lock_version)),
            override,
            aprovarPlano: (plano: PlanoDoNo) => executar('aprovarPlano', ['plano'], false, () => {
                if (typeof plano.content_revision !== 'number') {
                    throw new Error('Revisão do plano ausente; recarregue antes de aprovar.');
                }
                return approvePlan(plano.id, plano.content_revision, 'cockpit:reapproval-confirmed');
            }),
            mudarStatusDoPlano,
            pedirAjusteNoPlano: (plano: PlanoDoNo) => mudarStatusDoPlano(plano, 'draft'),
            validarBdd: (card: Card) => executar('validarBdd', ['cenarios', 'cards'], false, () => {
                const cenarios = (card.bdd_scenarios || []).map((s: any) => ({ ...s, validated: true }));
                return updateCard(card.id, { bdd_validated: true, bdd_scenarios: cenarios });
            }),
            aprovarCenario: (card: Card, indice: number, cenario: any) =>
                executar('aprovarCenario', ['cenarios'], false, () => {
                    const cenarios = [...(card.bdd_scenarios || [])];
                    cenarios[indice] = { ...cenario, validated: !cenario.validated };
                    return updateCard(card.id, {
                        bdd_scenarios: cenarios,
                        bdd_validated: cenarios.every((s: any) => s.validated),
                    });
                }),
            registrarResultadoDeTestPlan: (testPlanId: string, resultado: 'passed' | 'failed') =>
                executar('registrarResultadoDeTestPlan', ['testplans'], false, () =>
                    updateTestPlan(testPlanId, { status: resultado })),
            salvarSelecaoDeTestPlans: (ids: string[]) =>
                executar('salvarSelecaoDeTestPlans', ['testplans', 'contexto'], true, (no) =>
                    syncAgentExecution(no.id, undefined, undefined, undefined, ids, no.lock_version)),
            // O sync muda a revisão do nó, que a árvore leve carrega: `mudaArvore`.
            salvarContexto: ({ missionContext, docIds, decisionIds }: ContextoParaSalvar) =>
                executar('salvarContexto', ['contexto', 'prompt'], true, (no) =>
                    syncAgentExecution(no.id, missionContext, docIds, decisionIds, undefined, no.lock_version)),
            /** F24: "marcar a entrada como executada" é a transição `pending → in_progress`. */
            marcarEntradaExecutada: () => executar('marcarEntradaExecutada', ['prompt'], true, (no) =>
                updateAgentExecutionStatus(no.id, 'in_progress', no.lock_version)),
        };
    }, [executar]);

    /** Cópia local: não grava nada, então qualquer papel copia. */
    const copiarPrompt = useCallback((texto: string) => navigator.clipboard?.writeText(texto), []);

    return {
        acoes,
        copiarPrompt,
        pode: (nome: NomeDaAcao) => permitidas.has(nome),
        podeAgir: permitidas.size > 0,
        /** Admin ou owner: rollback e escopo de despacho. O override não diz isto (ADR-0072). */
        ehAdmin: permitidas.has('rollback'),
        emAndamento,
    };
}

export type AcoesDoNo = ReturnType<typeof useAcoesDoNo>;
