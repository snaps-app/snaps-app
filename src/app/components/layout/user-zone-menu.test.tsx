/**
 * Zona do Usuário: navegação que existe e papel que é verdade (card 10159d7e).
 *
 * C1 era a falta da área do usuário — `/profile` existia sem nenhuma navegação.
 * C2 era o papel "Admin" escrito no cliente, verdadeiro por acaso para quem
 * desenvolvia e falso para todo o resto, já que `global_role` só admite
 * `super_admin` e `user`.
 *
 * O caso que mais importa aqui é o do papel que NÃO chega: a interface diz que
 * não sabe, em vez de desenhar uma credencial que não confirmou.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { UserZoneMenu } from './user-zone-menu';
import { api } from '@/services/client';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/services/client', () => ({ api: { get: vi.fn() } }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

const comSessao = () =>
  (supabase.auth.getSession as never as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { session: { access_token: 'tok', user: { email: 'ana@exemplo.com' } } },
  });

const renderizar = () =>
  render(
    <MemoryRouter>
      <UserZoneMenu />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  comSessao();
});

describe('papel exibido', () => {
  it('mostra o papel vindo de global_role, não uma constante', async () => {
    (api.get as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { global_role: 'user' },
    });

    renderizar();

    expect(await screen.findByText('Usuário')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('super_admin aparece com o rótulo do seu papel', async () => {
    (api.get as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { global_role: 'super_admin' },
    });

    renderizar();

    expect(await screen.findByText('Super Admin')).toBeInTheDocument();
  });

  it('quando o papel não chega, diz que não sabe em vez de inventar', async () => {
    (api.get as never as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('falhou'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderizar();

    expect(await screen.findByText('Papel indisponível')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuário')).not.toBeInTheDocument();
  });

  it('papel irreconhecível também é falta de dado, não um palpite', async () => {
    (api.get as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { global_role: 'algo_que_nao_existe' },
    });

    renderizar();

    expect(await screen.findByText('Papel indisponível')).toBeInTheDocument();
  });
});

describe('destinos do menu', () => {
  it('leva ao Perfil e ao Storage, que têm tela', async () => {
    (api.get as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { global_role: 'user' },
    });

    renderizar();
    await screen.findByText('Usuário');
    await userEvent.click(screen.getByLabelText('Abrir menu do usuário'));

    expect(await screen.findByRole('menuitem', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Storage' })).toBeInTheDocument();
  });

  it('não oferece destino do E9, que ainda não tem tela (C17)', async () => {
    (api.get as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { global_role: 'super_admin' },
    });

    renderizar();
    await screen.findByText('Super Admin');
    await userEvent.click(screen.getByLabelText('Abrir menu do usuário'));
    await screen.findByRole('menuitem', { name: 'Perfil' });

    for (const morto of ['Axon Connections', 'Minhas Máquinas', 'MCP Servers']) {
      expect(screen.queryByRole('menuitem', { name: morto })).not.toBeInTheDocument();
    }
  });

  it('Users só aparece para super_admin', async () => {
    (api.get as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { global_role: 'user' },
    });

    renderizar();
    await screen.findByText('Usuário');
    await userEvent.click(screen.getByLabelText('Abrir menu do usuário'));
    await screen.findByRole('menuitem', { name: 'Perfil' });

    expect(screen.queryByRole('menuitem', { name: 'Users' })).not.toBeInTheDocument();
  });
});

describe('o "Admin" escrito no cliente', () => {
  it('não existe mais no código da barra lateral', async () => {
    const aqui = dirname(fileURLToPath(import.meta.url));
    const fonte = readFileSync(join(aqui, 'sidebar.tsx'), 'utf-8');
    // Só o rótulo renderizado importa; comentários explicando o defeito ficam.
    expect(fonte).not.toMatch(/>\s*Admin\s*</);
    expect(fonte).not.toContain("'Admin'");
  });
});
