/** Rota antiga do Cockpit -> rota nova, com o nó certo (TP-3 da Sprint 24.0). */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('@/services/agentExecutions', () => ({ getAgentExecution: vi.fn() }));

import { getAgentExecution } from '@/services/agentExecutions';
import { renderComConsulta } from '@/test/comConsulta';
import { RedirecionaParaCockpit } from './redireciona-para-cockpit';

const RAIZ = 'acc98642-1918-40ae-95a9-a5134caa575c';
const NO = '9c52578d-d298-4b2b-bdfc-aa342e1c26ce';

function OndeEstou() {
    const l = useLocation();
    return <p data-testid="destino">{l.pathname + l.search}</p>;
}

function abrir(caminho: string) {
    return renderComConsulta(
        <MemoryRouter initialEntries={[caminho]}>
            <Routes>
                <Route path="/project/:projectId/execution/:executionId" element={<RedirecionaParaCockpit />} />
                <Route path="/project/:projectId/execution/:executionId/scratch" element={<RedirecionaParaCockpit aba="scratch" />} />
                <Route path="/cockpit/:rootId?" element={<OndeEstou />} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => vi.mocked(getAgentExecution).mockReset());

describe('RedirecionaParaCockpit', () => {
    it('execução existente vai para a raiz dela, com o nó', async () => {
        vi.mocked(getAgentExecution).mockResolvedValue({ id: NO, root_id: RAIZ } as never);
        abrir(`/project/p1/execution/${NO}`);
        expect(await screen.findByTestId('destino')).toHaveTextContent(`/cockpit/${RAIZ}?no=${NO}`);
        expect(getAgentExecution).toHaveBeenCalledWith(NO);
    });

    it('/scratch abre a aba Scratch', async () => {
        vi.mocked(getAgentExecution).mockResolvedValue({ id: NO, root_id: RAIZ } as never);
        abrir(`/project/p1/execution/${NO}/scratch`);
        expect(await screen.findByTestId('destino')).toHaveTextContent(`/cockpit/${RAIZ}?no=${NO}&aba=scratch`);
    });

    it('404 mostra o aviso e nenhum dado', async () => {
        vi.mocked(getAgentExecution).mockRejectedValue({ response: { status: 404, data: { detail: 'Projeto Secreto' } } });
        abrir(`/project/p1/execution/${NO}`);
        expect(await screen.findByRole('alert')).toHaveTextContent('Execução sem acesso ou inexistente.');
        expect(screen.queryByTestId('destino')).not.toBeInTheDocument();
        expect(document.body).not.toHaveTextContent('Projeto Secreto');
    });

    it('outra falha não se passa por 404', async () => {
        vi.mocked(getAgentExecution).mockRejectedValue({ response: { status: 500 } });
        abrir(`/project/p1/execution/${NO}`);
        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível abrir esta execução agora.');
    });
});
