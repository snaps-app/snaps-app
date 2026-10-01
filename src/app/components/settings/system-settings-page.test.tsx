/** SNA-RD-186: Settings do sistema, "Neuron — chave e modelos". */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/app/components/layout/use-current-user', () => ({ useCurrentUser: vi.fn() }));
vi.mock('@/app/components/layout/user-zone-menu', () => ({ UserZoneMenu: () => null }));
vi.mock('@/services/system-settings', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/services/system-settings')>();
  return {
    ...real,
    getConfiguracaoNeuron: vi.fn(),
    gravarChave: vi.fn(),
    testarChave: vi.fn(),
    adicionarModelo: vi.fn(),
    trocarModeloDaCategoria: vi.fn(),
  };
});

import { useCurrentUser } from '@/app/components/layout/use-current-user';
import { Sidebar } from '@/app/components/layout/sidebar';
import { SystemSettingsPage } from './system-settings-page';
import {
  adicionarModelo,
  getConfiguracaoNeuron,
  gravarChave,
  testarChave,
  trocarModeloDaCategoria,
  type ConfiguracaoNeuron,
} from '@/services/system-settings';

const usuario = (globalRole: 'super_admin' | 'user' | null, loading = false) =>
  vi.mocked(useCurrentUser).mockReturnValue({ email: 'po@snaps.test', globalRole, loading, roleError: false });

const categorias = (modeloB = 'modelo-b') => [
  { categoria: 'A' as const, rotulo: 'raciocínio', model_id: 'modelo-a', effort: 'high', fixa: false, lock_version: 1 },
  { categoria: 'B' as const, rotulo: 'síntese', model_id: modeloB, effort: 'medium', fixa: false, lock_version: 3 },
  { categoria: 'E' as const, rotulo: 'execução', model_id: null, effort: null, fixa: true, lock_version: 1 },
];

const CONFIG: ConfiguracaoNeuron = {
  chave: { configurada: true, ultimos4: '1234', gravada_por: { id: 'u1', email: 'po@snaps.test' }, gravada_em: '2026-09-28T12:00:00Z' },
  modelos: [
    { id: 'm1', model_id: 'modelo-a', label: 'Modelo A', price_input_usd_mtok: 4, price_output_usd_mtok: 20, adicionado_por: 'u1', adicionado_em: '2026-09-28T12:00:00Z' },
    { id: 'm2', model_id: 'modelo-b', label: null, price_input_usd_mtok: null, price_output_usd_mtok: null, adicionado_por: 'u1', adicionado_em: '2026-09-28T12:00:00Z' },
  ],
  categorias: categorias(),
  historico: [{ em: '2026-09-28T12:05:00Z', por: 'po@snaps.test', entidade: 'system_model_categories', chave: 'B', antes: 'modelo-a', depois: 'modelo-b' }],
};

const VAZIO: ConfiguracaoNeuron = {
  chave: { configurada: false, ultimos4: null, gravada_por: null, gravada_em: null },
  modelos: [],
  categorias: [],
  historico: [],
};

const pagina = () => render(<MemoryRouter><SystemSettingsPage /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(getConfiguracaoNeuron).mockReset();
});

describe('sidebar', () => {
  it('mostra Settings só para super_admin', () => {
    usuario('super_admin');
    const { unmount } = render(<MemoryRouter><Sidebar isCollapsed={false} onToggle={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    unmount();
    usuario('user');
    render(<MemoryRouter><Sidebar isCollapsed={false} onToggle={() => {}} /></MemoryRouter>);
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});

describe('estados', () => {
  it('carregando', () => {
    usuario(null, true);
    pagina();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });

  it('sem permissão para quem não é super_admin, sem chamar a API', () => {
    usuario('user');
    pagina();
    expect(screen.getByRole('alert')).toHaveTextContent('Você não tem permissão');
    expect(getConfiguracaoNeuron).not.toHaveBeenCalled();
  });

  it('erro da API com opção de tentar de novo', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockRejectedValue({ response: { status: 500 } });
    pagina();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.getByText('Tentar de novo')).toBeInTheDocument();
  });

  it('vazio: sem chave e sem modelos', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValue(VAZIO);
    pagina();
    expect(await screen.findByText(/Nenhuma chave configurada/)).toBeInTheDocument();
    expect(screen.getByText('Nenhum modelo salvo')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma troca registrada ainda')).toBeInTheDocument();
  });
});

describe('chave', () => {
  it('mostra só os metadados e o valor digitado não fica no DOM depois de salvar', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValue(VAZIO);
    vi.mocked(gravarChave).mockResolvedValue({ configurada: true, ultimos4: '9z9z', gravada_por: { id: 'u1', email: 'po@snaps.test' }, gravada_em: '2026-09-28T13:00:00Z' });
    const { container } = pagina();
    const campo = await screen.findByLabelText('Nova chave');
    const segredo = 'valor-de-teste-da-chave-9z9z';
    fireEvent.change(campo, { target: { value: segredo } });
    fireEvent.click(screen.getByText('Salvar chave'));
    await waitFor(() => expect(screen.getByTestId('estado-chave')).toHaveTextContent('configurada · ••••9z9z · por po@snaps.test'));
    expect(gravarChave).toHaveBeenCalledWith(segredo);
    expect((campo as HTMLInputElement).value).toBe('');
    expect(container.innerHTML).not.toContain(segredo);
    expect(campo).toHaveAttribute('type', 'password');
  });

  it('testar chave mostra o resultado em linguagem de produto', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValue(CONFIG);
    vi.mocked(testarChave).mockResolvedValue({ ok: true, mensagem: 'A chave funciona.' });
    pagina();
    fireEvent.click(await screen.findByText('Testar chave'));
    expect(await screen.findByText('A chave funciona.')).toBeInTheDocument();
  });
});

describe('modelos e categorias', () => {
  it('recusa de modelo inválido mostra o detail da API', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValue(CONFIG);
    vi.mocked(adicionarModelo).mockRejectedValue({ response: { status: 422, data: { detail: 'A Models API não reconhece `modelo-x`.' } } });
    pagina();
    fireEvent.change(await screen.findByLabelText('ID do modelo'), { target: { value: 'modelo-x' } });
    fireEvent.click(screen.getByText('Adicionar modelo'));
    expect(await screen.findByText('A Models API não reconhece `modelo-x`.')).toBeInTheDocument();
  });

  it('modelo válido com rótulo e preço entra na lista', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValueOnce(CONFIG).mockResolvedValueOnce({
      ...CONFIG,
      modelos: [...CONFIG.modelos, { id: 'm3', model_id: 'modelo-c', label: 'Modelo C', price_input_usd_mtok: 1, price_output_usd_mtok: 5, adicionado_por: 'u1', adicionado_em: '2026-09-28T13:00:00Z' }],
    });
    vi.mocked(adicionarModelo).mockResolvedValue({} as never);
    pagina();
    fireEvent.change(await screen.findByLabelText('ID do modelo'), { target: { value: 'modelo-c' } });
    fireEvent.change(screen.getByLabelText('Rótulo (opcional)'), { target: { value: 'Modelo C' } });
    fireEvent.change(screen.getByLabelText('Preço de entrada US$/MTok (opcional)'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Preço de saída US$/MTok (opcional)'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('Adicionar modelo'));
    expect(adicionarModelo).toHaveBeenCalledWith({ model_id: 'modelo-c', label: 'Modelo C', price_input_usd_mtok: 1, price_output_usd_mtok: 5 });
    expect(await within(await screen.findByRole('list', { name: 'Lista de modelos' })).findByText('Modelo C (modelo-c)')).toBeInTheDocument();
  });

  it('troca de categoria envia lock_version, e a E aparece fixa sem seletor', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValueOnce(CONFIG).mockResolvedValueOnce({ ...CONFIG, categorias: categorias('modelo-a') });
    vi.mocked(trocarModeloDaCategoria).mockResolvedValue({} as never);
    pagina();
    fireEvent.change(await screen.findByLabelText('Modelo da categoria B'), { target: { value: 'modelo-a' } });
    await waitFor(() => expect(trocarModeloDaCategoria).toHaveBeenCalledWith('B', 'modelo-a', 3));
    expect(await screen.findByText('Categoria B agora usa modelo-a.')).toBeInTheDocument();
    expect(screen.getByTestId('categoria-E')).toHaveTextContent('executores externos (Axon)');
    expect(screen.queryByLabelText('Modelo da categoria E')).not.toBeInTheDocument();
  });

  it('409 recarrega e avisa', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValue(CONFIG);
    vi.mocked(trocarModeloDaCategoria).mockRejectedValue({ response: { status: 409, data: { detail: 'lock' } } });
    pagina();
    fireEvent.change(await screen.findByLabelText('Modelo da categoria B'), { target: { value: 'modelo-a' } });
    expect(await screen.findByText(/Outra pessoa mudou esta categoria antes/)).toBeInTheDocument();
    expect(getConfiguracaoNeuron).toHaveBeenCalledTimes(2);
  });

  it('mostra o histórico e as seções futuras desabilitadas', async () => {
    usuario('super_admin');
    vi.mocked(getConfiguracaoNeuron).mockResolvedValue(CONFIG);
    pagina();
    expect(await screen.findByRole('list', { name: 'Trocas recentes' })).toHaveTextContent('system_model_categories B: modelo-a → modelo-b');
    expect(screen.getByText('Guardrails do Neuron').closest('[aria-disabled="true"]')).not.toBeNull();
  });
});
