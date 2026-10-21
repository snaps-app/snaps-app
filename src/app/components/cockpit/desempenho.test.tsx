/**
 * Metas de desempenho do Cockpit (ADR-0071; TP-4, task 7), provadas contando
 * as chamadas. A API é a de mentira (`src/test/cockpitFalso.ts`): cada GET que
 * a tela faz passa por ela. O stream SSE é contado à parte (conexões).
 *
 * Esta task está na lista "nunca se corta" do plano.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

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
vi.mock('@/services/members', () => ({ getProjectMembers: async () => [{ user_id: 'eu', role: 'admin' }] }));

import { invalidateCachedData } from '@/services/client';
import { abrirAba, gravarAbas, ABAS_VAZIAS } from '@/services/cockpitAbas';
import { renderComConsulta } from '@/test/comConsulta';
import {
    EXEC_TP1, EXEC_TP2, OUTRA_RAIZ, RAIZ, REVISAO, contarGets, evento, getsFeitos, reiniciarCockpitFalso, streamFalso,
} from '@/test/cockpitFalso';
import { chavesDoEvento } from './superficie/invalidarPorEvento';
import { comoEventoDoNo, JANELA_DO_REPLAY_MS } from './conversa/useEventosDoNo';
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

const ARVORE = /^\/api\/agent-executions\/[^/]+\/arvore$/;
const DIRETIVAS = /phase-directives$/;
const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
/** Espera a tela parar de pedir: nenhum GET novo por 150 ms. */
async function estabilizar() {
    let antes = -1;
    while (antes !== getsFeitos().length) {
        antes = getsFeitos().length;
        await esperar(150);
    }
}
const irPara = async (nome: RegExp, id: string) => {
    fireEvent.click(screen.getByRole('button', { name: nome }));
    await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`?no=${id}`));
    await estabilizar();
};

beforeEach(() => {
    window.localStorage.clear();
    invalidateCachedData('');
    reiniciarCockpitFalso();
});
afterEach(() => window.localStorage.clear());

describe('metas de desempenho (ADR-0071)', () => {
    it('abrir uma raiz: 1 chamada a /arvore; phase-directives só na primeira raiz da sessão', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, OUTRA_RAIZ));
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await screen.findByLabelText('Cabeçalho do nó');
        await estabilizar();
        expect(contarGets(ARVORE)).toBe(1);
        expect(contarGets(DIRETIVAS)).toBe(1);

        fireEvent.click(within(screen.getByRole('tablist', { name: 'Raízes abertas' })).getByRole('tab', { name: /Sprint 23\.0/ }));
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${OUTRA_RAIZ}`));
        await screen.findByLabelText('Cabeçalho do nó');
        await estabilizar();
        expect(getsFeitos().filter((u) => u === `/api/agent-executions/${OUTRA_RAIZ}/arvore`)).toHaveLength(1);
        expect(contarGets(DIRETIVAS)).toBe(1);
    });

    it('trocar de aba de raiz e voltar (dentro de 10 min): nenhuma chamada nova para a árvore', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, OUTRA_RAIZ));
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await screen.findByLabelText('Cabeçalho do nó');
        await estabilizar();
        const barra = () => within(screen.getByRole('tablist', { name: 'Raízes abertas' }));

        fireEvent.click(barra().getByRole('tab', { name: /Sprint 23\.0/ }));
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${OUTRA_RAIZ}`));
        await estabilizar();
        fireEvent.click(barra().getByRole('tab', { name: /Sprint 24\.0/ }));
        await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent(`/cockpit/${RAIZ}`));
        await screen.findByLabelText('Cabeçalho do nó');
        await estabilizar();

        expect(getsFeitos().filter((u) => u === `/api/agent-executions/${RAIZ}/arvore`)).toHaveLength(1);
    });

    it('abrir um nó de uma raiz já aberta: no máximo 3 chamadas (resumo, node-snapshot e a aba aberta)', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await screen.findByLabelText('Cabeçalho do nó');
        await estabilizar();
        const antes = getsFeitos().length;

        await irPara(/^Plan review, concluído/, REVISAO);

        const novas = getsFeitos().slice(antes);
        expect(novas.length).toBeLessThanOrEqual(3);
        expect(novas).toEqual(expect.arrayContaining([
            `/api/agent-executions/${REVISAO}/resumo`,
            `/api/agent-executions/${REVISAO}/node-snapshot`,
        ]));
        expect(novas.filter((u) => ARVORE.test(u) || DIRETIVAS.test(u))).toEqual([]);
    });

    it('voltar a um nó concluído já visto na sessão: 0 chamadas e nenhum stream novo', async () => {
        abrir(`/cockpit/${RAIZ}?no=${EXEC_TP2}`);
        await screen.findByLabelText('Cabeçalho do nó');
        await estabilizar();
        await irPara(/^Execution, atual/, EXEC_TP1);
        const antes = getsFeitos().length;
        const conexoesAntes = streamFalso.conexoes.length;

        await irPara(/^Execution, concluído/, EXEC_TP2);

        expect(getsFeitos().slice(antes)).toEqual([]);
        expect(streamFalso.conexoes.slice(conexoesAntes).map((c) => c.executionId)).not.toContain(EXEC_TP2);
    });

    it('evento de um nó invalida só as chaves de invalidarPorEvento, sem refetch geral', async () => {
        const { cliente } = abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        await screen.findByLabelText('Cabeçalho do nó');
        await estabilizar();
        await esperar(JANELA_DO_REPLAY_MS + 100);
        const invalidar = vi.spyOn(cliente, 'invalidateQueries');
        const antes = getsFeitos().length;

        const aprovado = evento('plan_approved', EXEC_TP1, { plan_id: 'pl-1', content_revision: 2 });
        act(() => streamFalso.abertas()[0].emitir(aprovado));
        await estabilizar();

        const esperadas = chavesDoEvento(comoEventoDoNo(aprovado, EXEC_TP1), { executionId: EXEC_TP1, rootId: RAIZ });
        expect(invalidar.mock.calls.map(([filtro]) => filtro?.queryKey)).toEqual(esperadas);
        // Só o resumo está montado entre as chaves invalidadas (a aba Plano está fechada).
        expect(getsFeitos().slice(antes)).toEqual([`/api/agent-executions/${EXEC_TP1}/resumo`]);
    });

    it('trava: refetchInterval em components/cockpit/** só no indicador de última chamada', () => {
        const raiz = dirname(fileURLToPath(import.meta.url));
        const todos = (dir: string): string[] => readdirSync(dir).flatMap((nome) => {
            const caminho = join(dir, nome);
            return statSync(caminho).isDirectory() ? todos(caminho) : [caminho];
        });
        const comRelogio = todos(raiz)
            .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f))
            .filter((f) => /refetchInterval/.test(readFileSync(f, 'utf-8')))
            .map((f) => relative(raiz, f).replace(/\\/g, '/'));
        expect(comRelogio).toEqual(['cabecalho/UltimaChamadaAoSnaps.tsx']);
    });
});
