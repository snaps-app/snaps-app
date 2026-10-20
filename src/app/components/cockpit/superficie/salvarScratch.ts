/**
 * Nota de scratch do time (P21), numa função só.
 *
 * A nota só nasce quando há texto. A janela do Cockpit atual cria "New
 * Scratch" vazio ao abrir (`scratch-view.tsx`, F32), e é de lá que vêm as
 * notas vazias do acervo. Abrir a aba Scratch não chama nada daqui.
 *
 * O agente não lê o scratch: para falar com o agente existe o mission context.
 */
import { createSnap, updateSnap } from '@/services/snaps';
import type { Snap, SnapCreate } from '@/services/types';

export interface RascunhoDeScratch {
    projectId: string;
    executionId: string;
    /** Nota existente; sem ela, cria uma nova (se houver texto). */
    notaId?: string | null;
    nome: string;
    conteudo: string;
}

interface Dependencias {
    createSnap: (dados: SnapCreate) => Promise<Snap>;
    updateSnap: (id: string, dados: Partial<SnapCreate>) => Promise<Snap>;
}

export function temTexto(rascunho: Pick<RascunhoDeScratch, 'nome' | 'conteudo'>): boolean {
    return rascunho.conteudo.trim().length > 0;
}

/** Devolve a nota salva, ou `null` quando não havia o que criar. */
export async function salvarScratch(
    rascunho: RascunhoDeScratch,
    deps: Dependencias = { createSnap, updateSnap },
): Promise<Snap | null> {
    const nome = rascunho.nome.trim() || 'Nota';
    if (rascunho.notaId) {
        return deps.updateSnap(rascunho.notaId, { name: nome, content: rascunho.conteudo });
    }
    if (!temTexto(rascunho)) return null;
    return deps.createSnap({
        project_id: rascunho.projectId,
        agent_execution_id: rascunho.executionId,
        name: nome,
        content: rascunho.conteudo,
        description: 'Scratch note',
        snadds: { type: 'scratch', agent_execution_id: rascunho.executionId, status: 'active' } as SnapCreate['snadds'],
    });
}
