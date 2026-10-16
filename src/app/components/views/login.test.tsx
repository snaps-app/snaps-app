/** Login volta para o `next` (SNA-SUP-84): antes ia sempre para `/`. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('@/services/auth.service', () => ({
  signIn: vi.fn(async () => ({ user: { id: 'u1', email: 'a@b.c' } })),
  syncUserWithBackend: vi.fn(async () => undefined),
}));

import { Login } from './login';

function OndeEstou() {
  const location = useLocation();
  return <div data-testid="destino">{location.pathname + location.search}</div>;
}

function entrarEm(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<OndeEstou />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.c' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'segredo' } });
  fireEvent.click(screen.getByText('Enter with Email'));
}

describe('Login', () => {
  it('com next vai para o destino, mantendo a query string', async () => {
    entrarEm('/login?next=%2Fproject%2Fp1%2Fexecution%2Fe1%3Ftab%3Dlog');
    await waitFor(() => expect(screen.getByTestId('destino')).toHaveTextContent('/project/p1/execution/e1?tab=log'));
  });

  it('sem next vai para o Dashboard', async () => {
    entrarEm('/login');
    await waitFor(() => expect(screen.getByTestId('destino').textContent).toBe('/'));
  });

  it('next para fora do app cai no Dashboard', async () => {
    entrarEm('/login?next=%2F%2Fevil.com');
    await waitFor(() => expect(screen.getByTestId('destino').textContent).toBe('/'));
  });
});
