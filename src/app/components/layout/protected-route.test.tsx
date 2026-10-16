/** Guard sem sessao manda para o login guardando o destino (SNA-SUP-84). */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('@/services/auth.service', () => ({
  onAuthStateChange: (callback: (user: null) => void) => {
    queueMicrotask(() => callback(null));
    return { data: { subscription: { unsubscribe: () => undefined } } };
  },
}));

import { ProtectedRoute } from './protected-route';

function OndeEstou() {
  const location = useLocation();
  return <div data-testid="destino">{location.pathname + location.search}</div>;
}

describe('ProtectedRoute', () => {
  it('sem sessao vai para /login com next do caminho atual', async () => {
    render(
      <MemoryRouter initialEntries={['/project/p1/execution/e1?tab=log']}>
        <Routes>
          <Route path="/login" element={<OndeEstou />} />
          <Route path="*" element={<ProtectedRoute><div>privado</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('destino')).toHaveTextContent(
      '/login?next=%2Fproject%2Fp1%2Fexecution%2Fe1%3Ftab%3Dlog',
    );
  });
});
