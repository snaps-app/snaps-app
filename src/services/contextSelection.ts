import { api } from './client';

/**
 * Selecao de contexto em tres camadas (D84), para a revisao humana antes do
 * dispatch (E5-e, D49). Leitura aqui; a edicao volta pelo `/sync`, que passa
 * pelo resolvedor unico da API e registra a autoria.
 */
export type OrigemDeContexto = 'workflow' | 'herdado' | 'neuron' | 'humano' | 'agente' | 'nao_verificada';

export interface ItemDeContexto {
    tipo: 'card' | 'sprint' | 'plan' | 'governance_doc' | 'decision' | 'test_plan' | 'snap';
    id: string;
    origem: OrigemDeContexto;
    titulo?: string | null;
}

export interface MissionContext {
    texto: string;
    origem: 'humano';
    autor_id: string;
    canal?: string;
    registrado_em?: string;
}

export interface SelecaoDeContexto {
    execution_id: string;
    status: string;
    revisavel: boolean;
    camadas: {
        nucleo: ItemDeContexto[];
        descoberta: ItemDeContexto[];
        mission_context: MissionContext | null;
    };
    handoff: { texto: string; origem: OrigemDeContexto }[];
    historico: {
        origem: OrigemDeContexto;
        autor_id: string | null;
        registrado_em: string;
        adicionados: { tipo: string; id: string }[];
        removidos: { tipo: string; id: string }[];
    }[];
    omitted: { secao: string; motivo: string; tokens_estimados: number; id?: string }[];
    /** Snaps da descoberta semantica que o humano ja recusou (E5-d). */
    snaps_recusados: string[];
}

export const getExecutionContextSelection = async (executionId: string): Promise<SelecaoDeContexto> => {
    const response = await api.get(`/api/agent-executions/${executionId}/context-selection`);
    return response.data;
};

/**
 * Argumentos do `/sync` para deixar a camada 2 sem `removido`.
 *
 * Doc, ADR e test plan saem da lista selecionada. Snap nao e selecionado por
 * lista: ele vem da busca, entao remove-lo e RECUSA-LO (`rejected_snap_ids`),
 * e as listas de selecao nao sao enviadas (ficam como estao).
 */
export const listasSemItem = (
    descoberta: ItemDeContexto[],
    removido: Pick<ItemDeContexto, 'tipo' | 'id'>,
    snapsRecusados: string[] = [],
): { docIds?: string[]; decisionIds?: string[]; testPlanIds?: string[]; rejectedSnapIds?: string[] } => {
    if (removido.tipo === 'snap') {
        return { rejectedSnapIds: [...new Set([...snapsRecusados, removido.id])] };
    }
    const restantes = descoberta.filter(i => !(i.tipo === removido.tipo && i.id === removido.id));
    const doTipo = (tipo: ItemDeContexto['tipo']) => restantes.filter(i => i.tipo === tipo).map(i => i.id);
    return {
        docIds: doTipo('governance_doc'),
        decisionIds: doTipo('decision'),
        testPlanIds: doTipo('test_plan'),
    };
};
