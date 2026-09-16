import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { readFileSync } from 'fs';
import path from 'path';
import { ProjectSettings, SETTINGS_TABS } from './project-settings';
import { useProjectRole } from '@/contexts/project-role-context';
import { getGithubConfig, getProject, getProjectApiKeys } from '@/services/projects';
import { getProjectConfigEntries } from '@/services/projects';

vi.mock('@/services/projects', () => ({
    getProject: vi.fn(),
    updateProject: vi.fn(),
    getGithubConfig: vi.fn(),
    upsertGithubConfig: vi.fn(),
    syncGithubProject: vi.fn(),
    getProjectApiKeys: vi.fn(),
    createProjectApiKey: vi.fn(),
    revokeProjectApiKey: vi.fn(),
    getProjectConfigEntries: vi.fn(),
    upsertProjectConfigEntry: vi.fn(),
    deleteProjectConfigEntry: vi.fn(),
    importProjectConfigEntries: vi.fn(),
}));

vi.mock('@/contexts/project-role-context', () => ({
    useProjectRole: vi.fn(),
}));

vi.mock('@/app/components/views/members-view', () => ({
    MembersView: () => <div>lista de membros</div>,
}));

const papel = (permitidas: string[]) =>
    vi.mocked(useProjectRole).mockReturnValue({
        role: 'owner',
        loading: false,
        can: (acao: string) => permitidas.includes(acao),
    } as any);

const abrir = (aba = 'general') =>
    render(
        <MemoryRouter initialEntries={[`/project/p1/settings/${aba}`]}>
            <Routes>
                <Route path="/project/:projectId/settings/:tab" element={<ProjectSettings />} />
                <Route path="/project/:projectId" element={<div>workspace</div>} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProject).mockResolvedValue({
        id: 'p1', name: 'Snaps', description: 'd', instructions: 'i', template: 'free',
    } as any);
    vi.mocked(getGithubConfig).mockResolvedValue({
        repo_owner: 'snaps-app', repo_names: 'snaps-api', sync_status: 'success', last_sync_at: null,
    } as any);
    vi.mocked(getProjectApiKeys).mockResolvedValue([]);
    vi.mocked(getProjectConfigEntries).mockResolvedValue([]);
    papel(['write', 'manage_members', 'view_members']);
});
afterEach(cleanup);

describe('Hub de Settings (B3)', () => {
    it('as quatro abas com conteudo real aparecem, e nenhuma outra', async () => {
        abrir();

        const abas = await screen.findAllByRole('tab');
        expect(abas.map((a) => a.textContent)).toEqual(['Geral', 'Membros', 'GitHub', 'API Keys']);
    });

    it('nao oferece aba do E22 nem como placeholder (C17/E19: aba vazia e botao morto)', async () => {
        abrir();
        await screen.findAllByRole('tab');

        // Requisitos registrados do E22 (Sprint 30.0). Enquanto nao tiverem
        // conteudo, nao existem como rotulo -- nem com "em breve".
        for (const futura of [/Environments/i, /Axon/i, /Automa[cç][aã]o/i, /Rotinas/i]) {
            expect(screen.queryByRole('tab', { name: futura })).toBeNull();
        }
    });

    it('a aba pedida pela URL e a que abre (link direto para uma aba funciona)', async () => {
        abrir('github');

        await waitFor(() =>
            expect(screen.getByRole('tab', { name: /GitHub/ })).toHaveAttribute('aria-selected', 'true')
        );
    });

    it('trocar de aba troca a URL, para o link continuar sendo copiavel', async () => {
        abrir();
        const aba = await screen.findByRole('tab', { name: /API Keys/ });

        await userEvent.click(aba);

        await waitFor(() => expect(aba).toHaveAttribute('aria-selected', 'true'));
    });

    it('sem view_members a aba Membros nao e oferecida', async () => {
        papel(['write']);
        abrir();

        const abas = await screen.findAllByRole('tab');
        expect(abas.map((a) => a.textContent)).toEqual(['Geral', 'GitHub', 'API Keys']);
    });

    it('URL de uma aba que o papel nao alcanca cai na Geral, nao em tela vazia', async () => {
        papel(['write']);
        abrir('members');

        await waitFor(() =>
            expect(screen.getByRole('tab', { name: /Geral/ })).toHaveAttribute('aria-selected', 'true')
        );
        expect(screen.queryByText('lista de membros')).toBeNull();
    });

    it('papel sem escrita ve a configuracao e nao ve o botao de salvar', async () => {
        papel(['view_members']);
        abrir();

        expect(await screen.findByDisplayValue('Snaps')).toBeDisabled();
        expect(screen.queryByRole('button', { name: /Salvar alteracoes/i })).toBeNull();
    });

    it('papel com escrita edita e salva', async () => {
        abrir();

        expect(await screen.findByDisplayValue('Snaps')).toBeEnabled();
        expect(screen.getByRole('button', { name: /Salvar alteracoes/i })).toBeInTheDocument();
    });
});

describe('Hub de Settings: rotas antigas (B3)', () => {
    const APP = readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf-8');

    it('/edit e /members continuam declaradas e redirecionam para a aba certa', () => {
        // Link antigo salvo por alguem nao pode quebrar porque a tela mudou.
        expect(APP).toMatch(/path="\/project\/:projectId\/edit" element={<RedirecionaParaSettings aba="general" \/>}/);
        expect(APP).toMatch(/path="\/project\/:projectId\/members" element={<RedirecionaParaSettings aba="members" \/>}/);
    });

    it('a rota do hub existe com a aba no caminho', () => {
        expect(APP).toContain('path="/project/:projectId/settings/:tab"');
    });

    it('a lista de abas do hub e a que o card entrega', () => {
        expect([...SETTINGS_TABS]).toEqual(['general', 'members', 'github', 'api-keys']);
    });
});
