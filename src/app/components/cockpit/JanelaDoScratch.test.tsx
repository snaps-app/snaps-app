/**
 * Janela do Scratch (item 2): a rota fica fora do `MainLayout`, então o papel
 * do projeto tem de vir de um provider próprio. Sem ele, ninguém edita.
 */
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderComConsulta } from '@/test/comConsulta';

vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'eu' } } }) } },
}));
vi.mock('@/services/members', () => ({
    getProjectMembers: vi.fn(async (projectId: string) => [
        { user_id: 'eu', role: projectId === 'p-membro' ? 'member' : 'viewer' },
    ]),
}));
vi.mock('@/services/projects', () => ({ getProject: vi.fn() }));
vi.mock('@/services/agentExecutions', () => ({ getAgentExecution: vi.fn() }));
vi.mock('@/services/snaps', () => ({ getSnaps: vi.fn(), deleteSnap: vi.fn(), createSnap: vi.fn(), updateSnap: vi.fn() }));

import { getAgentExecution } from '@/services/agentExecutions';
import { getSnaps } from '@/services/snaps';
import JanelaDoScratch from './JanelaDoScratch';

function abrirJanela(projectId: string) {
    vi.mocked(getAgentExecution).mockResolvedValue({
        id: 'raiz', root_id: null, project_id: projectId, status: 'in_progress', phase: 'execution', lock_version: 1,
    } as never);
    renderComConsulta(
        <MemoryRouter initialEntries={[`/project/${projectId}/execution/raiz/scratch`]}>
            <Routes>
                <Route path="/project/:projectId/execution/:executionId/scratch" element={<JanelaDoScratch />} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.mocked(getSnaps).mockResolvedValue([{ id: 'n1', name: 'Nota', content: '# Título', snadds: { type: 'scratch' } } as never]);
});

it('member edita na janela: o papel vem do projeto da execução', async () => {
    abrirJanela('p-membro');
    fireEvent.click(await screen.findByRole('button', { name: 'Nota' }));
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova nota/i })).toBeInTheDocument();
});

it('viewer só lê na janela', async () => {
    abrirJanela('p-viewer');
    fireEvent.click(await screen.findByRole('button', { name: 'Nota' }));
    expect(screen.getByRole('heading', { name: 'Título' })).toBeInTheDocument();
    await vi.waitFor(() => expect(getAgentExecution).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
});
