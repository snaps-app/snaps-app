/** Papel no projeto pela regra de `resolve_project_role` da API. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'eu' } } } })) } },
}));
vi.mock('@/services/projects', () => ({ getProject: vi.fn() }));
vi.mock('@/services/members', () => ({ getProjectMembers: vi.fn() }));

import { getProject } from '@/services/projects';
import { getProjectMembers } from '@/services/members';
import { resolverPapelNoProjeto } from './usePapelNoProjeto';

beforeEach(() => {
  vi.mocked(getProject).mockResolvedValue({ id: 'p1', user_id: 'dono' } as never);
  vi.mocked(getProjectMembers).mockResolvedValue([
    { user_id: 'eu', email: 'eu@snaps.test', role: 'member' },
  ]);
});

describe('resolverPapelNoProjeto', () => {
  it('super_admin conta como owner sem consultar o projeto', async () => {
    expect(await resolverPapelNoProjeto('p1', 'super_admin')).toBe('owner');
    expect(getProject).not.toHaveBeenCalled();
  });

  it('dono do projeto é owner', async () => {
    vi.mocked(getProject).mockResolvedValue({ id: 'p1', user_id: 'eu' } as never);
    expect(await resolverPapelNoProjeto('p1', 'user')).toBe('owner');
  });

  it('membro recebe o papel da lista, e quem não está nela é viewer', async () => {
    expect(await resolverPapelNoProjeto('p1', 'user')).toBe('member');
    vi.mocked(getProjectMembers).mockResolvedValue([]);
    expect(await resolverPapelNoProjeto('p1', 'user')).toBe('viewer');
  });
});
