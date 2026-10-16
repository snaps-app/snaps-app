/**
 * Estado de aprovacao de um plano, lido dos campos que a API projeta.
 *
 * Editar o conteudo de um plano selecionado ou em execucao invalida a
 * aprovacao, mas o status fica: tira-lo de `in_execution` o tiraria do gate.
 * O status sozinho entao esconde que falta aprovar a revisao corrente — caso
 * do TP4 (rev 3, aprovacao nula, `in_execution`), sem botao no cockpit.
 */

export type PlanApprovalState = 'current' | 'reapproval_pending' | 'none';

const STATUS_QUE_EXIGEM_APROVACAO = ['approved', 'selected', 'in_execution'];

export const planApprovalState = (plan: any): PlanApprovalState => {
    const aprovadaNaRevisaoCorrente = !!plan?.approved_content_hash
        && plan?.approved_revision != null
        && plan.approved_revision === plan.content_revision;
    if (aprovadaNaRevisaoCorrente) return 'current';
    return STATUS_QUE_EXIGEM_APROVACAO.includes(plan?.status) ? 'reapproval_pending' : 'none';
};
