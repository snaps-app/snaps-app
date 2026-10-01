/**
 * Snaps do chat: os que o Neuron referenciou no turno (C6 `snaps_referenced`)
 * e os que o Snapper sugeriu (`snap_suggested`), nas interfaces da tela.
 */
import { createSnap, getSnaps } from '@/services/snaps';
import type { SnapReferenciado, SnapSugerido, TagSnap, VarianteTag } from '@/services/neuronEvents';
import type { Snap } from '@/services/types';
import type { ReferencedSnap } from './referenced-snap-card';
import type { SuggestedSnap } from './suggested-snap-card';

const VARIANTES: VarianteTag[] = ['blue', 'orange', 'purple', 'green', 'pink'];
const CONTEUDO_MAX = 500;
/** No reload, os referenciados são lidos da lista do projeto (não há GET por id). */
const LIMITE_LEITURA = 500;

const hora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export const referenciadoDoEvento = (s: SnapReferenciado): ReferencedSnap => ({
  id: s.id,
  title: s.title,
  content: s.content,
  tags: s.tags,
  timestamp: hora(s.timestamp),
  isActive: true,
});

export const sugeridoDoEvento = (s: SnapSugerido): SuggestedSnap => ({ ...s, timestamp: hora(s.timestamp) });

const tagsDoSnap = (snap: Snap): TagSnap[] =>
  (snap.snadds?.labels ?? []).map((label, i) => ({ label, variant: VARIANTES[i % VARIANTES.length] }));

export const referenciadoDoSnap = (snap: Snap): ReferencedSnap => ({
  id: snap.id,
  title: snap.name,
  content: (snap.content ?? '').slice(0, CONTEUDO_MAX),
  tags: tagsDoSnap(snap),
  timestamp: hora(snap.created_at),
  isActive: false,
});

export async function carregarReferenciados(projectId: string, ids: string[]): Promise<ReferencedSnap[]> {
  if (ids.length === 0) return [];
  const procurados = new Set(ids);
  const snaps = await getSnaps(projectId, 0, LIMITE_LEITURA, undefined, undefined, { bypassCache: true });
  return snaps.filter((s) => procurados.has(s.id)).map(referenciadoDoSnap);
}

/** Aceitar a sugestão grava o snap em nome do usuário (`POST /snaps/`, papel member). */
export const aceitarSugestao = (projectId: string, s: SuggestedSnap) =>
  createSnap({
    project_id: projectId,
    name: s.title,
    description: 'Sugerido pelo Snapper no chat',
    content: s.content,
    snadds: { labels: s.tags.map((t) => t.label) },
  });

export const juntarPorId = <T extends { id: string }>(atuais: T[], novos: T[]): T[] => {
  const vistos = new Set(atuais.map((a) => a.id));
  return [...atuais, ...novos.filter((n) => !vistos.has(n.id))];
};
