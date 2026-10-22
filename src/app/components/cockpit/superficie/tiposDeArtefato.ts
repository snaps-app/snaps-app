import type { ChaveDeAba } from './catalogo';
export const TIPOS_DE_REVISAO = ['peer_review','code_review','ci_review','release_review'];
export function abaDoArtefato(tipo: unknown): ChaveDeAba | null {
    if (typeof tipo !== 'string') return null;
    if (TIPOS_DE_REVISAO.includes(tipo)) return 'revisoes';
    if (tipo === 'walkthrough') return 'walkthroughs';
    if (tipo === 'retrospective') return 'retro';
    if (tipo === 'scratch') return 'scratch';
    return null;
}
