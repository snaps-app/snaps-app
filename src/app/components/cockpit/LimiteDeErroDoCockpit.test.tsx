/** Erro de render no Cockpit aparece escrito, nunca como tela preta (aceite DEV da 24.0). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LimiteDeErroDoCockpit } from './LimiteDeErroDoCockpit';

function Quebra(): never {
    throw new Error('nó sem workflow_snapshot');
}

afterEach(cleanup);

describe('LimiteDeErroDoCockpit', () => {
    it('mostra o erro, onde foi e como sair', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<LimiteDeErroDoCockpit onde="esta raiz"><Quebra /></LimiteDeErroDoCockpit>);

        const alerta = screen.getByRole('alert');
        expect(alerta).toHaveTextContent('Não foi possível mostrar esta raiz.');
        expect(alerta).toHaveTextContent('nó sem workflow_snapshot');
        expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ir para Execuções' })).toHaveAttribute('href', '/ai-executions');
    });

    it('sem erro, mostra o conteúdo', () => {
        render(<LimiteDeErroDoCockpit onde="o Cockpit"><p>conteúdo</p></LimiteDeErroDoCockpit>);
        expect(screen.getByText('conteúdo')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
