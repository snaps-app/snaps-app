/**
 * Carregando · vazio · erro são três estados distintos (card 8e548c10).
 *
 * A regra que não é cosmética: 401/403 renderizam erro de permissão, nunca
 * lista vazia (Neuron D92). "Não há nada" e "você não pode ver" levam a ações
 * opostas — quem vê vazio conclui que o acervo está vazio e vai embora.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZoneError, ZoneEmpty, isPermissionError } from './zone-state';

const comStatus = (status: number) => ({ response: { status } });

describe('erro de permissão não é vazio', () => {
  it.each([401, 403])('%i é tratado como falta de permissão', (status) => {
    expect(isPermissionError(comStatus(status))).toBe(true);
  });

  it.each([404, 500, 0])('%i é erro comum, não permissão', (status) => {
    expect(isPermissionError(comStatus(status))).toBe(false);
  });

  it('falha sem resposta HTTP não vira erro de permissão', () => {
    expect(isPermissionError(new Error('rede caiu'))).toBe(false);
  });

  it('403 renderiza a recusa, e não "nada encontrado"', () => {
    render(<ZoneError error={comStatus(403)} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Você não tem permissão para ver isto');
  });

  it('erro comum oferece nova tentativa; a recusa de permissão não', () => {
    const { unmount } = render(<ZoneError error={comStatus(500)} onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    unmount();

    render(<ZoneError error={comStatus(403)} onRetry={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
  });

  it('vazio é um estado próprio, sem cara de falha', () => {
    render(<ZoneEmpty title="Nenhum documento ainda" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum documento ainda')).toBeInTheDocument();
  });
});
