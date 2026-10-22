/**
 * Checagem de novidades das abas de raiz (ADR-0071, exceção 5b), com a página
 * inteira montada sobre a API falsa e o relógio falso. Cobre os cenários do
 * card 49cbcc29:
 *   - "[automatizado] Novidade de nó não selecionado pela checagem periódica";
 *   - "[automatizado] Novidade em aba de raiz inativa";
 *   - "[automatizado] Checagem sem mudança não baixa a árvore";
 *   - e a medição pedida: quantas chamadas a checagem faz em 10 min com uma
 *     raiz visível e uma inativa.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

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
import { chavesDeConsulta } from '@/services/chavesDeConsulta';
import { renderComConsulta } from '@/test/comConsulta';
import {
    EXEC_TP1, EXEC_TP2, OUTRA_RAIZ, RAIZ, apiFalsa, estadoDaApi, getsFeitos, reiniciarCockpitFalso, respostasDaArvore, resumoPadrao,
} from '@/test/cockpitFalso';
import { PaginaDoCockpit } from '../PaginaDoCockpit';
import { INTERVALO_DA_ABA_VISIVEL_MS, INTERVALO_DAS_ABAS_INATIVAS_MS } from './useNovidadesDasRaizes';

const T0 = Date.parse('2026-10-21T12:00:00Z');
const MIN = 60_000;

function OndeEstou() {
    const l = useLocation();
    return <p data-testid="destino">{l.pathname + l.search}</p>;
}

const passar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

/**
 * Um intervalo inteiro, e depois a tela assenta. Com relógio falso, o TanStack
 * só avisa o React no `setTimeout(0)` seguinte à busca, que o relógio falso só
 * roda no próximo avanço; sem assentar, duas buscas caem no mesmo render.
 */
async function intervalo(ms: number) {
    await passar(ms);
    for (let i = 0; i < 4; i += 1) await passar(25);
}

/** Avança de pouco em pouco até a condição valer (o relógio é falso: `findBy` não anda sozinho). */
async function ate(condicao: () => boolean, limite = 3_000) {
    for (let t = 0; t < limite && !condicao(); t += 25) await passar(25);
    expect(condicao()).toBe(true);
}

async function abrir(caminho: string) {
    const montada = renderComConsulta(
        <MemoryRouter initialEntries={[caminho]}>
            <Routes>
                <Route path="/cockpit/:rootId?" element={<><PaginaDoCockpit /><OndeEstou /></>} />
            </Routes>
        </MemoryRouter>,
    );
    await ate(() => !!screen.queryByLabelText('Cabeçalho do nó') && !!screen.queryByRole('list', { name: 'History da árvore' }));
    await passar(1_000); // o resto da abertura: cards, snapshot, stream e o fim do replay
    return montada;
}

const arvoreDe = (rootId: string) => `/api/agent-executions/${rootId}/arvore`;
const getsDaArvore = (rootId: string) => getsFeitos().filter((u) => u === arvoreDe(rootId)).length;
const botaoDoNo = (nome: RegExp) => within(screen.getByRole('list', { name: 'History da árvore' })).getByRole('button', { name: nome });
const abaDaBarra = (nome: RegExp) => within(screen.getByRole('tablist', { name: 'Raízes abertas' })).getByRole('tab', { name: nome });

/** O nó mudou no servidor: outra revisão, outro `updated_at`. */
function mudarNoServidor(rootId: string, noId: string, mudanca: Record<string, unknown> = {}) {
    const arvore = estadoDaApi.arvores[rootId];
    estadoDaApi.arvores[rootId] = {
        ...arvore,
        nos: arvore.nos.map((n) => (n.id === noId
            ? { ...n, lock_version: n.lock_version + 1, updated_at: new Date(Date.now()).toISOString(), ...mudanca }
            : n)),
    };
}

function definirVisibilidade(estado: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
    document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(T0);
    window.localStorage.clear();
    invalidateCachedData('');
    reiniciarCockpitFalso();
    definirVisibilidade('visible');
});
afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    definirVisibilidade('visible');
});

describe('checagem de novidades (ADR-0071, 5b)', () => {
    it('os intervalos ficam num lugar só: 60 s na aba visível, 180 s nas inativas', () => {
        expect(INTERVALO_DA_ABA_VISIVEL_MS).toBe(60_000);
        expect(INTERVALO_DAS_ABAS_INATIVAS_MS).toBe(180_000);
    });

    it('nó não selecionado que muda no servidor ganha a marca em até 60 s; selecioná-lo apaga a marca', async () => {
        await abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        expect(screen.queryByText(/\d novos?$/)).not.toBeInTheDocument();

        mudarNoServidor(RAIZ, EXEC_TP2, { status: 'awaiting_advance' });
        await intervalo(INTERVALO_DA_ABA_VISIVEL_MS);

        expect(botaoDoNo(/^Execution, atual, awaiting_advance/)).toHaveTextContent('1 novo');

        fireEvent.click(botaoDoNo(/^Execution, atual, awaiting_advance/));
        await ate(() => screen.getByTestId('destino').textContent?.includes(`?no=${EXEC_TP2}`) ?? false);
        await passar(100);
        expect(botaoDoNo(/^Execution, atual, awaiting_advance/)).not.toHaveTextContent('1 novo');
    });

    it('com o TP-1 na Conversa, os nós do TP-2 e do TP-3 que mudam no servidor ganham a marca em até 60 s, sem recarregar', async () => {
        const TP3 = 'a0000006-0000-4000-8000-000000000006';
        const arvore = estadoDaApi.arvores[RAIZ];
        const tp2 = arvore.nos.find((n) => n.id === EXEC_TP2)!;
        estadoDaApi.arvores[RAIZ] = {
            ...arvore,
            nos: [...arvore.nos, { ...tp2, id: TP3, plan_id: 'pl-3', plano_titulo: 'TP-3 · E21 · Integração', status: 'in_progress' }],
        };
        await abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        expect(within(screen.getByTestId('conversa')).getByTestId('identidade-do-no')).toHaveTextContent('execution · TP-1');
        const getsAntes = getsFeitos().length;

        mudarNoServidor(RAIZ, EXEC_TP2, { status: 'rolled_back' });
        mudarNoServidor(RAIZ, TP3, { status: 'awaiting_advance' });
        await intervalo(INTERVALO_DA_ABA_VISIVEL_MS);

        expect(botaoDoNo(/^Execution, desfeito/)).toHaveTextContent('1 novo');
        expect(botaoDoNo(/^Execution, atual, awaiting_advance/)).toHaveTextContent('1 novo');
        expect(botaoDoNo(/^Execution, atual, in_progress/)).not.toHaveTextContent('novo');
        expect(getsFeitos().slice(getsAntes).filter((u) => /\/arvore$/.test(u))).toEqual([arvoreDe(RAIZ)]);
    });

    it('sessão aberta por outra pessoa em outro nó: em até 60 s o timer relê o tempo da árvore, sem marca de novidade', async () => {
        await abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const resumoDoTp1 = () => getsFeitos().filter((u) => u === `/api/agent-executions/${EXEC_TP1}/resumo`).length;
        const antes = resumoDoTp1();
        estadoDaApi.resumos[EXEC_TP1] = resumoPadrao({
            sessoes: { encerradas_segundos: 3_600, ativas_desde: [new Date(Date.now()).toISOString()] },
        });
        const arvore = estadoDaApi.arvores[RAIZ];
        estadoDaApi.arvores[RAIZ] = {
            ...arvore,
            nos: arvore.nos.map((n) => (n.id === EXEC_TP2 ? { ...n, sessoes: '1:1:1761048000:0' } : n)),
        };

        await intervalo(INTERVALO_DA_ABA_VISIVEL_MS);

        expect(resumoDoTp1()).toBe(antes + 1);
        expect(screen.queryByText(/\d novos?$/)).not.toBeInTheDocument();
        // A sessão da outra pessoa (aberta há 60 s, quando a checagem rodou) já anda no relógio do navegador.
        await passar(5_000);
        expect(screen.getByTestId('timer-da-execucao').textContent).toMatch(/^01:01:0[5-9]/);
    });

    it('nó que ganha um filho mostra a marca, e o filho novo também', async () => {
        await abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const arvore = estadoDaApi.arvores[RAIZ];
        const NOVO = 'a0000009-0000-4000-8000-000000000009';
        const tp2 = arvore.nos.find((n) => n.id === EXEC_TP2)!;
        estadoDaApi.arvores[RAIZ] = {
            ...arvore,
            nos: [...arvore.nos, { ...tp2, id: NOVO, parent_id: EXEC_TP2, phase: 'ci_gate', status: 'pending', created_at: '2026-10-21T12:00:30Z' }],
        };

        await intervalo(INTERVALO_DA_ABA_VISIVEL_MS);

        expect(botaoDoNo(/^Execution, concluído/)).toHaveTextContent('1 novo');
        expect(botaoDoNo(/^CI gate, atual/)).toHaveTextContent('1 novo');
    });

    it('sem mudança: manda If-None-Match, recebe 304, a árvore em cache é a mesma e o Workflow não redesenha', async () => {
        const { cliente } = await abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const antes = cliente.getQueryData(chavesDeConsulta.arvore(RAIZ));
        const workflow = screen.getByRole('region', { name: 'Workflow' });
        const mutacoes: MutationRecord[] = [];
        const observador = new MutationObserver((m) => mutacoes.push(...m));
        observador.observe(workflow, { subtree: true, childList: true, characterData: true, attributes: true });
        const respostasAntes = respostasDaArvore.length;

        await intervalo(INTERVALO_DA_ABA_VISIVEL_MS);
        observador.disconnect();

        expect(respostasDaArvore.slice(respostasAntes)).toEqual([{ rootId: RAIZ, status: 304, condicional: true }]);
        expect(cliente.getQueryData(chavesDeConsulta.arvore(RAIZ))).toBe(antes);
        expect(mutacoes).toEqual([]);
        expect(screen.queryByText(/\d novos?$/)).not.toBeInTheDocument();
    });

    it('aba de raiz inativa já vista: a marca chega à barra em até 180 s; abrir a aba apaga a marca da aba e o nó mostra a novidade', async () => {
        gravarAbas('eu', abrirAba(abrirAba(ABAS_VAZIAS, RAIZ, { no: EXEC_TP1 }), OUTRA_RAIZ));
        await abrir(`/cockpit/${OUTRA_RAIZ}`);
        fireEvent.click(abaDaBarra(/Sprint 24\.0/));
        await ate(() => screen.getByTestId('destino').textContent?.startsWith(`/cockpit/${RAIZ}`) ?? false);
        await passar(1_000);
        expect(within(abaDaBarra(/Sprint 23\.0/)).queryByTestId('novidade-da-aba')).not.toBeInTheDocument();

        mudarNoServidor(OUTRA_RAIZ, OUTRA_RAIZ, { status: 'awaiting_advance' });
        await intervalo(INTERVALO_DAS_ABAS_INATIVAS_MS);

        expect(within(abaDaBarra(/Sprint 23\.0/)).getByTestId('novidade-da-aba')).toBeInTheDocument();
        expect(within(abaDaBarra(/Sprint 24\.0/)).queryByTestId('novidade-da-aba')).not.toBeInTheDocument();

        fireEvent.click(abaDaBarra(/Sprint 23\.0/));
        await ate(() => screen.getByTestId('destino').textContent?.startsWith(`/cockpit/${OUTRA_RAIZ}`) ?? false);
        await passar(500);
        expect(within(abaDaBarra(/Sprint 23\.0/)).queryByTestId('novidade-da-aba')).not.toBeInTheDocument();
    });

    it('aba inativa nunca aberta: nenhuma busca ao abrir a página; a primeira checagem é a base e a mudança seguinte acende a aba', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, OUTRA_RAIZ));
        await abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        expect(getsDaArvore(OUTRA_RAIZ)).toBe(0);

        await intervalo(INTERVALO_DAS_ABAS_INATIVAS_MS);
        expect(getsDaArvore(OUTRA_RAIZ)).toBe(1);
        expect(within(abaDaBarra(/Sprint 23\.0/)).queryByTestId('novidade-da-aba')).not.toBeInTheDocument();

        mudarNoServidor(OUTRA_RAIZ, OUTRA_RAIZ);
        await intervalo(INTERVALO_DAS_ABAS_INATIVAS_MS);
        expect(within(abaDaBarra(/Sprint 23\.0/)).getByTestId('novidade-da-aba')).toBeInTheDocument();
    });

    it('com a página oculta, nenhuma checagem acontece; ao voltar, a próxima vem no intervalo', async () => {
        gravarAbas('eu', abrirAba(ABAS_VAZIAS, OUTRA_RAIZ));
        await abrir(`/cockpit/${RAIZ}?no=${EXEC_TP1}`);
        const antes = respostasDaArvore.length;

        definirVisibilidade('hidden');
        await passar(10 * MIN);
        expect(respostasDaArvore.length).toBe(antes);

        definirVisibilidade('visible');
        await intervalo(INTERVALO_DA_ABA_VISIVEL_MS);
        expect(respostasDaArvore.slice(antes).map((r) => r.rootId)).toEqual([RAIZ]);
    });

    it('medição: 10 min com uma raiz visível e uma inativa', async () => {
        gravarAbas('eu', abrirAba(abrirAba(ABAS_VAZIAS, RAIZ, { no: EXEC_TP1 }), OUTRA_RAIZ));
        await abrir(`/cockpit/${OUTRA_RAIZ}`);
        fireEvent.click(abaDaBarra(/Sprint 24\.0/));
        await ate(() => screen.getByTestId('destino').textContent?.startsWith(`/cockpit/${RAIZ}`) ?? false);
        await passar(1_000);
        const getsAntes = getsFeitos().length;
        const respostasAntes = respostasDaArvore.length;

        await passar(10 * MIN);

        const checagens = respostasDaArvore.slice(respostasAntes);
        const daVisivel = checagens.filter((r) => r.rootId === RAIZ);
        const daInativa = checagens.filter((r) => r.rootId === OUTRA_RAIZ);
        // eslint-disable-next-line no-console
        console.info(`checagem de novidades em 10 min: visível ${daVisivel.length}, inativa ${daInativa.length}, `
            + `304 ${checagens.filter((r) => r.status === 304).length} de ${checagens.length}`);
        expect(daVisivel).toHaveLength(10);
        expect(daInativa).toHaveLength(3);
        expect(checagens.every((r) => r.status === 304 && r.condicional)).toBe(true);
        // A checagem só toca a árvore: nada de snapshot, resumo ou aba de nó.
        expect(getsFeitos().slice(getsAntes).filter((u) => !/\/arvore$/.test(u))).toEqual([]);
        expect(apiFalsa.get).toHaveBeenCalledTimes(getsAntes + 13);
    });
});
