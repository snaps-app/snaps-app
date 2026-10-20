/** Cockpit: abas de raízes, rota e 404 (TP-3 da Sprint 24.0). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const A = 'aaaaaaaa-1111-4111-8111-111111111111';
const B = 'bbbbbbbb-2222-4222-8222-222222222222';
const X = 'cccccccc-3333-4333-8333-333333333333'; // sem acesso
const FILHO_DE_A = 'dddddddd-4444-4444-8444-444444444444';

vi.mock('@/services/auth.service', () => ({
    onAuthStateChange: (cb: (u: { id: string }) => void) => {
        queueMicrotask(() => cb({ id: 'eu' }));
        return { data: { subscription: { unsubscribe: () => undefined } } };
    },
}));
vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'eu' } } }) } },
}));
vi.mock('@/services/members', () => ({ getProjectMembers: async () => [{ user_id: 'eu', role: 'admin' }] }));
vi.mock('@/services/projects', () => ({ getProject: vi.fn() }));
vi.mock('@/services/agentExecutions', () => ({
    getExecutionBranchesPage: vi.fn(),
    getAgentExecution: vi.fn(),
    updateAgentExecutionStatus: vi.fn(),
}));

import { getAgentExecution, getExecutionBranchesPage, updateAgentExecutionStatus } from '@/services/agentExecutions';
import { abrirAba, chaveDasAbas, gravarAbas, lerAbas, ABAS_VAZIAS } from '@/services/cockpitAbas';
import { renderComConsulta } from '@/test/comConsulta';
import type { ExecutionListItem } from '@/services/types';
import { AVISO_SEM_ACESSO, PaginaDoCockpit } from './PaginaDoCockpit';

function linha(id: string, root: string, sprint: string): ExecutionListItem {
    return {
        id, root_id: root, project_id: `p-${root.slice(0, 1)}`, status: 'in_progress', phase: 'execution',
        sprint_ids: [], agent_name: 'Coder', created_at: '2026-10-20', updated_at: '2026-10-20', lock_version: 1,
        project_name: 'Snaps', sprint_name: sprint, workflow_name: 'SDLC', card_codes: [],
    } as ExecutionListItem;
}

const BRANCHES: Record<string, ExecutionListItem[]> = {
    [A]: [linha(A, A, 'Sprint 24.0')],
    [B]: [linha(B, B, 'Sprint 23.0')],
    [FILHO_DE_A]: [linha(FILHO_DE_A, A, 'Sprint 24.0'), linha(A, A, 'Sprint 24.0')],
};

function OndeEstou() {
    const l = useLocation();
    return <p data-testid="destino">{l.pathname + l.search}</p>;
}

function abrir(caminho: string) {
    return renderComConsulta(
        <MemoryRouter initialEntries={[caminho]}>
            <Routes>
                <Route path="/cockpit/:rootId?" element={<><PaginaDoCockpit /><OndeEstou /></>} />
            </Routes>
        </MemoryRouter>,
    );
}

const barra = () => screen.getByRole('tablist', { name: 'Raízes abertas' });
const buscasPor = (termo: string) =>
    vi.mocked(getExecutionBranchesPage).mock.calls.filter(([p]) => p.search === termo).length;

beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getAgentExecution).mockReset();
    vi.mocked(getExecutionBranchesPage).mockReset();
    vi.mocked(getExecutionBranchesPage).mockImplementation(async ({ search }) => {
        const items = BRANCHES[search ?? ''] ?? [];
        return { items, page: 1, page_size: 1, total_branches: items.length ? 1 : 0, totals: { total: 0, done: 0, active: 0, failed: 0, discarded: 0 } };
    });
});
afterEach(() => window.localStorage.clear());

describe('PaginaDoCockpit', () => {
    it('restaura as abas do usuário e abre a da rota, com rótulo "projeto · sprint"', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, B));
        abrir(`/cockpit/${A}?no=${A}`);

        await screen.findByRole('tablist');
        await waitFor(() => expect(within(barra()).getAllByRole('tab').map((t) => t.textContent)).toEqual(
            ['Snaps · Sprint 23.0', 'Snaps · Sprint 24.0'],
        ));
        expect(within(barra()).getByRole('tab', { selected: true })).toHaveTextContent('Snaps · Sprint 24.0');
        expect(await screen.findByRole('heading', { name: 'Snaps · Sprint 24.0' })).toBeInTheDocument();
        expect(lerAbas('eu').abas.map((a) => a.rootId)).toEqual([B, A]);
    });

    it('aba inativa só consulta o rótulo, uma vez, e nunca o conteúdo', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, B));
        abrir(`/cockpit/${A}`);
        await screen.findByRole('heading', { name: 'Snaps · Sprint 24.0' });

        expect(buscasPor(B)).toBe(1);
        expect(getAgentExecution).not.toHaveBeenCalled();
    });

    it('raiz que responde 404 sai da barra com aviso, sem exibir dado', async () => {
        gravarAbas('eu', abrirAba(abrirAba(ABAS_VAZIAS, X), B));
        abrir(`/cockpit/${A}`);

        expect(await screen.findByText(AVISO_SEM_ACESSO)).toBeInTheDocument();
        await waitFor(() => expect(within(barra()).getAllByRole('tab')).toHaveLength(2));
        expect(barra()).not.toHaveTextContent(X.slice(0, 8));
        expect(lerAbas('eu').abas.map((a) => a.rootId)).toEqual([B, A]);
    });

    it('a raiz ativa sem acesso mostra o aviso no lugar do conteúdo', async () => {
        abrir(`/cockpit/${X}`);
        expect(await screen.findByRole('alert')).toHaveTextContent(AVISO_SEM_ACESSO);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('raiz que não é UUID não chega a ser buscada', async () => {
        abrir('/cockpit/acc98642');
        expect(await screen.findByRole('alert')).toHaveTextContent(AVISO_SEM_ACESSO);
        expect(getExecutionBranchesPage).not.toHaveBeenCalled();
    });

    it('o seletor foca a aba que já existe, sem duplicar', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, B));
        abrir(`/cockpit/${A}`);
        await screen.findByRole('heading', { name: 'Snaps · Sprint 24.0' });
        vi.mocked(getExecutionBranchesPage).mockImplementationOnce(async () => ({
            items: BRANCHES[B], page: 1, page_size: 10, total_branches: 1,
            totals: { total: 0, done: 0, active: 0, failed: 0, discarded: 0 },
        }));

        fireEvent.click(screen.getByRole('button', { name: 'Abrir raiz' }));
        fireEvent.click(await screen.findByRole('button', { name: /Snaps · Sprint 23\.0/ }));

        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${B}?no=${B}`));
        expect(within(barra()).getAllByRole('tab')).toHaveLength(2);
        expect(within(barra()).getByRole('tab', { selected: true })).toHaveTextContent('Snaps · Sprint 23.0');
    });

    it('fechar a aba ativa vai para a vizinha e não cancela a execução', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, B));
        abrir(`/cockpit/${A}`);
        await screen.findByRole('heading', { name: 'Snaps · Sprint 24.0' });

        fireEvent.click(screen.getByRole('button', { name: 'Fechar aba Snaps · Sprint 24.0' }));

        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${B}?no=${B}`));
        expect(lerAbas('eu').abas.map((a) => a.rootId)).toEqual([B]);
        expect(updateAgentExecutionStatus).not.toHaveBeenCalled();
    });

    it('rota com o id de um filho abre a aba da raiz dele, com o filho selecionado', async () => {
        abrir(`/cockpit/${FILHO_DE_A}`);
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${A}?no=${FILHO_DE_A}`));
        await waitFor(() => expect(lerAbas('eu').abas.map((a) => a.rootId)).toEqual([A]));
        expect(lerAbas('eu').abas[0].no).toBe(FILHO_DE_A);
    });

    it('/cockpit sem raiz volta para a última aba ativa', async () => {
        gravarAbas('eu', abrirAba(abrirAba(ABAS_VAZIAS, A), B, { no: B, aba: 'plano' }));
        abrir('/cockpit');
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${B}?no=${B}&aba=plano`));
    });

    it('grava sob a chave do usuário', async () => {
        abrir(`/cockpit/${A}`);
        await screen.findByRole('heading', { name: 'Snaps · Sprint 24.0' });
        expect(window.localStorage.getItem(chaveDasAbas('eu'))).toContain(A);
    });
});
