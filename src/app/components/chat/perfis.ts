/**
 * Perfis do Neuron no chat (decisão do PO, 28/09).
 *
 * As chaves não mudam; o nome de produto vem sempre com o descritor (D85).
 * Member, Admin e Owner do projeto (e super_admin, que a API trata como owner)
 * escolhem; o viewer usa só o Chatter. A autorização de verdade é do grant
 * (C2.4): o seletor só evita oferecer o que o servidor recusaria.
 */
import type { PerfilNeuron } from '@/services/chats';

export type PapelNoProjeto = 'owner' | 'admin' | 'member' | 'viewer';

export const PERFIS: Array<{ key: PerfilNeuron; rotulo: string }> = [
  { key: 'project_chat', rotulo: 'Chatter — informação' },
  { key: 'board_planner', rotulo: 'Planner — board' },
  { key: 'orchestrator', rotulo: 'Coder — orquestração' },
];

export const PERFIL_PADRAO: PerfilNeuron = 'project_chat';

export const MOTIVO_SO_CHATTER = 'Viewer do projeto usa só o Chatter. Peça o papel member para planejar ou orquestrar.';

export const podeEscolherPerfil = (papel: PapelNoProjeto | null): boolean =>
  papel === 'owner' || papel === 'admin' || papel === 'member';

/** Planner e aceite do Snapper pedem member (C2.4 e `POST /snaps/`). */
export const podeEscrever = podeEscolherPerfil;

export const rotuloDoPerfil = (key: unknown): string | null =>
  PERFIS.find((p) => p.key === key)?.rotulo ?? null;

/** Perfil gravado em `tool_calls` da resposta, se houver. */
export const perfilDaMensagem = (toolCalls: unknown): string | null => {
  if (!Array.isArray(toolCalls)) return null;
  const registro = toolCalls.find((t) => t && typeof t === 'object' && 'perfil' in t) as { perfil?: unknown } | undefined;
  return rotuloDoPerfil(registro?.perfil);
};

/** Ids dos snaps referenciados gravados em `tool_calls`. */
export const idsReferenciados = (toolCalls: unknown): string[] => {
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls.flatMap((t) => {
    const ids = (t as { snaps_referenciados?: unknown })?.snaps_referenciados;
    return Array.isArray(ids) ? ids.filter((i): i is string => typeof i === 'string') : [];
  });
};
