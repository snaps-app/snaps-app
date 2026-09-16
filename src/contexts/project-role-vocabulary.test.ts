/**
 * O vocabulário de papel de projeto é o do banco (card 10159d7e).
 *
 * A migration 061 normalizou `visualizer` para `viewer`, e o enum `project_role`
 * nunca admitiu `visualizer`. O cliente, porém, continuou falando o termo
 * aposentado — e isso não era cosmético: um `viewer` vindo do banco não batia
 * com chave nenhuma da tabela de níveis, caía no piso -1 e perdia o direito de
 * ver membros que o próprio papel concede. Pior, a tela de membros ainda
 * OFERECIA "Visualizer", gravando de volta um valor que o enum recusa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeProjectRole, PROJECT_ROLE_LABELS } from './project-role-context';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = join(AQUI, '..');

describe('vocabulário de papel', () => {
  it('usa os quatro termos do enum project_role', () => {
    expect(Object.keys(PROJECT_ROLE_LABELS)).toEqual(['owner', 'admin', 'member', 'viewer']);
  });

  it('normaliza o visualizer legado sem inventar um quinto termo', () => {
    expect(normalizeProjectRole('visualizer')).toBe('viewer');
    expect(normalizeProjectRole('viewer')).toBe('viewer');
    expect(normalizeProjectRole('owner')).toBe('owner');
  });

  it('papel desconhecido vira nulo, não um papel qualquer', () => {
    expect(normalizeProjectRole('gerente')).toBeNull();
    expect(normalizeProjectRole(null)).toBeNull();
  });

  it('a tela de membros não grava mais um papel que o enum recusa', () => {
    const fonte = readFileSync(join(SRC, 'app/components/views/members-view.tsx'), 'utf-8');
    expect(fonte).not.toContain('value="visualizer"');
    expect(fonte).toContain('value="viewer"');
  });
});
