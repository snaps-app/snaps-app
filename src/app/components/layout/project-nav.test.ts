/**
 * O checklist de saída do card 850de8e0, verificado em vez de prometido.
 *
 * A exigência é "nenhuma rota do menu atual fica sem destino equivalente no
 * novo agrupamento". Um parágrafo de PR afirmando isso envelhece na primeira
 * mudança; este teste falha.
 *
 * O risco nomeado no plano estratégico é repetir o "Add Snap" morto (C17):
 * tirar a rota antes de o substituto existir. Por isso há duas afirmações
 * complementares — toda rota antiga continua coberta, e todo destino oferecido
 * existe de fato no router.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildProjectNav, buildContextualDestinations, PROJECT_NAV_GROUPS } from './project-nav';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(join(AQUI, '..', '..', 'App.tsx'), 'utf-8');

/** Cada `<Route>` do App.tsx: template de caminho -> trecho do elemento. */
const ROTAS_DO_ROUTER = new Map<string, string>(
  [...APP.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/?>/g)].map(
    (m) => [m[1], m[2]] as [string, string],
  ),
);

/** `/settings/general` casa com o template `/settings/:tab` que o B2 declarou. */
function casaComTemplate(rota: string, template: string): boolean {
  const alvo = rota.split('/');
  const modelo = template.split('/');
  return (
    alvo.length === modelo.length &&
    alvo.every((seg, i) => modelo[i] === seg || modelo[i].startsWith(':'))
  );
}

function existeNoRouter(rota: string): boolean {
  const semQuery = rota.split('?')[0];
  return [...ROTAS_DO_ROUTER.keys()].some((template) => casaComTemplate(semQuery, template));
}

/**
 * Depois do Hub de Settings (B2) uma rota antiga pode estar coberta de duas
 * formas: continuar sendo destino oferecido, ou ser um redirect para o destino
 * que a substituiu. `/edit` e `/members` viraram o segundo caso. Redirect conta
 * como alcançável — o que o checklist proíbe é a rota sumir, não ela encaminhar.
 */
function ehRedirect(rota: string): boolean {
  return (ROTAS_DO_ROUTER.get(rota) ?? '').includes('RedirecionaParaSettings');
}

/**
 * Montar a navegação com os próprios nomes de parâmetro devolve os templates de
 * rota, e não caminhos concretos — o que deixa comparar direto com o router.
 */
const BOARDS = [{ id: ':boardId', name: 'Roadmap' }] as never[];
const SECOES = buildProjectNav(':projectId', BOARDS);
const CONTEXTUAIS = buildContextualDestinations(':projectId');
const MEMORY_TABS = [':projectId/docs', ':projectId/decisions'].map((p) => `/project/${p}`);

const COBERTOS = new Set<string>([
  ...SECOES.flatMap((s) => s.items.map((i) => i.path)),
  ...CONTEXTUAIS.map((d) => d.path),
  ...MEMORY_TABS,
]);

/** A lateral de projeto antes do reagrupamento, rota a rota. */
const MENU_ANTIGO: Array<[string, string]> = [
  ['Overview', '/project/:projectId'],
  ['Boards', '/project/:projectId/board/:boardId'],
  ['Timeline', '/project/:projectId/timeline'],
  ['Plans', '/project/:projectId/plans'],
  ['Decisions', '/project/:projectId/decisions'],
  ['Documents', '/project/:projectId/docs'],
  ['QA Engine', '/project/:projectId/qa'],
  ['AI Executions', '/project/:projectId/executions'],
  ['Retrospective', '/project/:projectId/retro'],
  ['Time', '/project/:projectId/time'],
  ['Chat', '/project/:projectId/chat'],
  ['Members', '/project/:projectId/members'],
  ['Settings', '/project/:projectId/edit'],
];

describe('Zona Projeto reagrupada', () => {
  it('tem exatamente os três grupos do PRD §3.3', () => {
    expect(SECOES.map((s) => s.group)).toEqual([...PROJECT_NAV_GROUPS]);
  });

  it('oferece cerca de 9 destinos, não os 15 de antes', () => {
    // Com os três boards reais (Roadmap, Suporte e QA, Team Kanban) são 9.
    const tresBoards = buildProjectNav('p1', [
      { id: 'b1', name: 'Roadmap' },
      { id: 'b2', name: 'Suporte e QA' },
      { id: 'b3', name: 'Team Kanban' },
    ] as never[]);
    const total = tresBoards.reduce((soma, s) => soma + s.items.length, 0);
    expect(total).toBe(9);
  });

  it.each(MENU_ANTIGO)('%s continua alcançável (%s)', (_rotulo, rota) => {
    expect(COBERTOS.has(rota) || ehRedirect(rota)).toBe(true);
  });

  it('nenhum destino oferecido é item morto — todos existem no router', () => {
    const mortos = [...COBERTOS].filter((rota) => !existeNoRouter(rota));
    expect(mortos).toEqual([]);
  });

  it('nenhuma rota de projeto foi removida do router nesta sprint', () => {
    // Reagrupar não é apagar: a lateral encolheu, o router não.
    for (const [rotulo, rota] of MENU_ANTIGO) {
      expect(APP.includes(`path="${rota}"`), `${rotulo} (${rota}) sumiu do router`).toBe(true);
    }
  });
});
