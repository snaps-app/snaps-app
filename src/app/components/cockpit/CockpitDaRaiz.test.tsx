/**
 * O Cockpit montado (TP-4 da Sprint 24.0): cabeçalho, History, Superfície e
 * Conversa sincronizados pelo nó, com a API e o stream de mentira
 * (`src/test/cockpitFalso.ts`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const papel = vi.hoisted(() => ({ role: 'admin' as string }));

vi.mock('@/services/client', async (original) => ({
    ...(await original<typeof import('@/services/client')>()),
    api: (await import('@/test/cockpitFalso')).apiFalsa,
}));
vi.mock('@/services/executionStream', async (original) => ({
    ...(await original<typeof import('@/services/executionStream')>()),
    conectarStreamDeExecucao: (await import('@/test/cockpitFalso')).streamFalso.conectar,
}));
vi.mock('@/services/auth.service', () => ({
    onAuthStateChange: (cb: (u: { id: string }) => void) => {
        queueMicrotask(() => cb({ id: 'eu' }));
        return { data: { subscription: { unsubscribe: () => undefined } } };
    },
}));
vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: {
        getUser: async () => ({ data: { user: { id: 'eu' } } }),
        getSession: async () => ({ data: { session: null } }),
    } },
}));
vi.mock('@/services/members', () => ({ getProjectMembers: async () => [{ user_id: 'eu', role: papel.role }] }));
vi.mock('@/services/workflowTemplates', async (original) => ({
    ...(await original<typeof import('@/services/workflowTemplates')>()),
    getWorkflowTemplates: vi.fn(),
}));

import { invalidateCachedData } from '@/services/client';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import { chaveDoLayout } from '@/services/cockpitLayout';
import { abrirAba, gravarAbas, ABAS_VAZIAS } from '@/services/cockpitAbas';
import { renderComConsulta } from '@/test/comConsulta';
import {
    CARD_1, EXEC_TP1, EXEC_TP2, OUTRA_RAIZ, RAIZ, REVISAO, apiFalsa, card, estadoDaApi, evento, reiniciarCockpitFalso,
    resumoPadrao, streamFalso,
} from '@/test/cockpitFalso';
import { JANELA_DO_REPLAY_MS } from './conversa/useEventosDoNo';
import { AVISO_DO_COMPOSER } from './conversa/ConversaDoNo';
import { PaginaDoCockpit } from './PaginaDoCockpit';

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

const cabecalho = () => screen.findByLabelText('Cabeçalho do nó');
const conversa = () => screen.getByTestId('conversa');
const fimDoReplay = () => act(() => new Promise((r) => setTimeout(r, JANELA_DO_REPLAY_MS + 100)));

beforeEach(() => {
    window.localStorage.clear();
    invalidateCachedData('');
    reiniciarCockpitFalso();
    papel.role = 'admin';
    vi.mocked(getWorkflowTemplates).mockClear();
});
afterEach(() => window.localStorage.clear());

describe('Cockpit montado', () => {
    it('três painéis lado a lado e o cabeçalho com identidade, status, gates e cards do escopo', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();

        expect(screen.getByRole('region', { name: 'Workflow' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Superfície' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Conversa' })).toBeInTheDocument();
        expect(within(topo).getByRole('heading', { name: 'Snaps · Sprint 24.0' })).toBeInTheDocument();
        expect(within(topo).getByTestId('identidade-do-no')).toHaveTextContent('execution · TP-1 · a0000004');
        expect(within(topo).getByTestId('status-do-no')).toHaveTextContent('Em andamento');
        const gates = within(topo).getByRole('list', { name: 'Gates da fase' });
        expect(gates).toHaveTextContent('Tasks concluídas (cards em assurance)');
        expect(gates).toHaveTextContent('CI verde');
        expect(await within(topo).findByRole('group', { name: 'Cards do escopo' })).toHaveTextContent('SNA-1');
    });

    it('gates vêm do snapshot do nó: o catálogo de workflows nunca é consultado', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await cabecalho();
        await screen.findByRole('group', { name: 'Cards do escopo' });
        expect(getWorkflowTemplates).not.toHaveBeenCalled();
    });

    it('selecionar um nó no Workflow leva a Superfície e a Conversa para ele, na cor da raiz', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await cabecalho();
        fireEvent.click(await screen.findByRole('button', { name: /^Plan review, concluído/ }));

        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${RAIZ}?no=${REVISAO}`));
        const chip = within(conversa()).getByTestId('identidade-do-no');
        expect(chip).toHaveTextContent('plan_review · a0000003');
        expect(chip).toHaveAttribute('data-cor', 'var(--snaps-accent-indigo)');
        await waitFor(() => expect(streamFalso.conexoes.map((c) => c.executionId)).toContain(REVISAO));
        expect(await screen.findByRole('tablist', { name: 'Abas do nó' })).toBeInTheDocument();
    });

    it('a Conversa mostra "execution · TP-1" na cor do TP-1, e o nó irmão que mudou ganha novidade', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await cabecalho();
        const chip = within(conversa()).getByTestId('identidade-do-no');
        expect(chip).toHaveTextContent('execution · TP-1');
        expect(chip).toHaveAttribute('data-cor', 'var(--snaps-accent-blue)');

        await fimDoReplay();
        // O TP-2 mudou no servidor; um evento do nó atual faz a árvore voltar.
        const arvore = estadoDaApi.arvores[RAIZ];
        estadoDaApi.arvores[RAIZ] = { ...arvore, nos: arvore.nos.map((n) => (n.id === EXEC_TP2 ? { ...n, updated_at: '2026-10-21T09:00:00Z' } : n)) };
        act(() => streamFalso.abertas()[0].emitir(evento('execution_status_changed', EXEC_TP1, { from_status: 'pending', to_status: 'in_progress' })));

        expect(await screen.findByText('1 novo')).toBeInTheDocument();
        expect(within(conversa()).getByText('Status: pending → in_progress')).toBeInTheDocument();
    });

    it('o composer existe e está desabilitado até a Sprint 25.0', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await cabecalho();
        const campo = within(conversa()).getByRole('textbox', { name: 'Mensagem para o agente' });
        expect(campo).toBeDisabled();
        expect(campo).toHaveAttribute('placeholder', AVISO_DO_COMPOSER);
    });

    it('viewer não vê Avançar, Rollback nem Override', async () => {
        papel.role = 'viewer';
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();
        await screen.findByRole('group', { name: 'Cards do escopo' });
        await waitFor(() => expect(within(topo).queryByRole('button', { name: /Avançar|Rollback|Override/ })).not.toBeInTheDocument());
    });

    it('member avança, mas não vê Rollback nem Override', async () => {
        papel.role = 'member';
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();
        expect(await within(topo).findByRole('button', { name: 'Avançar' })).toBeInTheDocument();
        expect(within(topo).queryByRole('button', { name: /Rollback/ })).not.toBeInTheDocument();
        expect(within(topo).queryByRole('button', { name: 'Override' })).not.toBeInTheDocument();
    });

    it('com gate pendente, Avançar fica desabilitado e diz o que falta', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();
        const avancar = await within(topo).findByRole('button', { name: 'Avançar' });
        await waitFor(() => expect(avancar).toBeDisabled());
        expect(topo).toHaveTextContent('Faltam: Tasks concluídas (cards em assurance)');
    });

    it('com os gates ok, Avançar pede o avanço e abre o nó criado', async () => {
        estadoDaApi.cards[CARD_1] = card(CARD_1, 'assurance');
        const NOVO = 'a0000009-0000-4000-8000-000000000009';
        estadoDaApi.aoAvancar = () => ({ id: NOVO, phase: 'ci_gate', status: 'pending' });
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();
        const avancar = await within(topo).findByRole('button', { name: 'Avançar' });
        await waitFor(() => expect(avancar).toBeEnabled());

        fireEvent.click(avancar);

        await waitFor(() => expect(apiFalsa.patch).toHaveBeenCalledWith(
            `/api/agent-executions/${EXEC_TP1}/advance`, expect.anything(), expect.anything(),
        ));
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`?no=${NOVO}`));
    });

    it('override pede motivo e só aplica com ele', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();
        fireEvent.click(await within(topo).findByRole('button', { name: 'Override' }));
        const dialogo = screen.getByRole('dialog', { name: /Override do gate · execution/ });
        expect(within(dialogo).getByRole('checkbox', { name: /Tasks concluídas/ })).toBeChecked();
        const aplicar = within(dialogo).getByRole('button', { name: 'Aplicar override' });
        expect(aplicar).toBeDisabled();
        fireEvent.change(within(dialogo).getByRole('textbox', { name: 'Motivo do override' }), { target: { value: 'CI fora do ar' } });
        expect(aplicar).toBeEnabled();
    });

    it('timer, "Registrar horas" e "Sessões" no nó atual; nada disso no nó concluído', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();
        expect(await within(topo).findByTestId('timer-da-execucao')).toBeInTheDocument();
        expect(within(topo).getByRole('button', { name: 'Registrar horas' })).toBeInTheDocument();
        expect(within(topo).getByRole('button', { name: 'Sessões' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^Execution, concluído/ }));
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`?no=${EXEC_TP2}`));
        const outro = await cabecalho();
        await waitFor(() => expect(within(outro).queryByTestId('timer-da-execucao')).not.toBeInTheDocument());
        expect(within(outro).queryByRole('button', { name: 'Registrar horas' })).not.toBeInTheDocument();
        expect(within(outro).queryByRole('button', { name: 'Sessões' })).not.toBeInTheDocument();
        expect(within(outro).getByTestId('snapshot-somente-leitura')).toHaveTextContent('Snapshot · somente leitura');
    });

    it('com duas abas de raiz abertas, só o nó selecionado da aba visível tem stream', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, OUTRA_RAIZ));
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await cabecalho();
        await waitFor(() => expect(streamFalso.abertas()).toHaveLength(1));
        expect(streamFalso.abertas()[0].executionId).toBe(EXEC_TP1);
        expect(streamFalso.conexoes.some((c) => c.executionId === OUTRA_RAIZ)).toBe(false);
    });

    it('nó concluído recebe o replay uma vez e não reconecta, nem ao voltar a ele', async () => {
        streamFalso.replay[EXEC_TP2] = [evento('phase_advanced', EXEC_TP2, { from_phase: 'plan_review', to_phase: 'execution' })];
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP2}`);
        await cabecalho();
        expect(await within(conversa()).findByText('Fase avançou: plan_review → execution')).toBeInTheDocument();
        await waitFor(() => expect(streamFalso.abertas()).toHaveLength(0));

        fireEvent.click(screen.getByRole('button', { name: /^Execution, atual/ }));
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`?no=${EXEC_TP1}`));
        fireEvent.click(screen.getByRole('button', { name: /^Execution, concluído/ }));
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`?no=${EXEC_TP2}`));

        expect(await within(conversa()).findByText('Fase avançou: plan_review → execution')).toBeInTheDocument();
        expect(streamFalso.conexoes.filter((c) => c.executionId === EXEC_TP2)).toHaveLength(1);
    });

    it('recolher o cabeçalho deixa uma linha com o nó, o status e os cards', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const topo = await cabecalho();
        await within(topo).findByRole('group', { name: 'Cards do escopo' });
        fireEvent.click(within(topo).getByRole('button', { name: 'Recolher cabeçalho' }));

        const linha = await cabecalho();
        expect(within(linha).getByTestId('identidade-do-no')).toHaveTextContent('execution · TP-1');
        expect(within(linha).getByTestId('cards-no-cabecalho-recolhido')).toHaveTextContent('1 card');
        expect(within(linha).getByRole('button', { name: 'Avançar' })).toBeInTheDocument();
    });

    it('a Superfície recolhida mantém a luz da pendência, e o layout fica salvo para o usuário', async () => {
        estadoDaApi.resumos[EXEC_TP1] = resumoPadrao({
            pendencias: [{ tipo: 'plano_aguardando_aprovacao', aba: 'plano', recurso_id: 'pl-1', desde: null, acao: 'Aprovar plano' }],
        });
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await cabecalho();
        await screen.findByRole('tablist', { name: 'Abas do nó' });
        fireEvent.click(screen.getByRole('button', { name: 'Recolher Superfície' }));

        const trilho = screen.getByTestId('trilho-superficie');
        expect(trilho).toHaveTextContent('Superfície · Plano');
        expect(within(trilho).getByLabelText('ação sua pendente')).toBeInTheDocument();
        expect(JSON.parse(window.localStorage.getItem(chaveDoLayout('eu')) ?? '{}').recolhidos.superficie).toBe(true);
    });
});
