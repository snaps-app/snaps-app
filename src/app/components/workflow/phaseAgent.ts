/**
 * Agente da fase: templates gravam '@playbook-executor', o metadata lista
 * 'playbook-executor'. Comparar cru fazia o <select> nao casar nenhuma opcao,
 * e o navegador exibia outra (antigravity-assurance na execution do SDLC v4.0,
 * SNA-RD-176).
 */
import type { PhaseConfigItem } from '@/services/types';

export const semArroba = (agente?: string | null): string => (agente || '').replace(/^@/, '');

/** Opcao do <select> que corresponde ao agente, ou o proprio valor, marcado como desconhecido. */
export function agenteSelecionado(
    agente: string | null | undefined,
    disponiveis: string[],
): { valor: string; desconhecido: boolean } {
    const nome = semArroba(agente);
    if (!nome) return { valor: '', desconhecido: false };
    const opcao = disponiveis.find(d => semArroba(d) === nome);
    return opcao ? { valor: opcao, desconhecido: false } : { valor: agente as string, desconhecido: true };
}

/** Grava no formato que o template ja usa: com '@' se a fase (ou, vazia, o template) usa. */
export function agenteParaGravar(
    escolhido: string,
    atual: string | null | undefined,
    fases: PhaseConfigItem[],
): string {
    const nome = semArroba(escolhido);
    if (!nome) return '';
    const usaArroba = atual ? atual.startsWith('@') : fases.some(f => f.agent?.startsWith('@'));
    return usaArroba ? `@${nome}` : nome;
}
