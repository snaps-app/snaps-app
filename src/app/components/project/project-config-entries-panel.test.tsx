import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProjectConfigEntriesPanel } from './project-config-entries-panel';
import {
  deleteProjectConfigEntry,
  getProjectConfigEntries,
  getProjectEnvironments,
  importProjectConfigEntries,
  upsertProjectConfigEntry,
} from '@/services/projects';

vi.mock('@/services/projects', () => ({
  getProjectConfigEntries: vi.fn(),
  getProjectEnvironments: vi.fn(),
  upsertProjectConfigEntry: vi.fn(),
  deleteProjectConfigEntry: vi.fn(),
  importProjectConfigEntries: vi.fn(),
}));

const entrada = (over = {}) => ({
  id: 'e1', project_id: 'p1', repo_name: null, key: 'DATABASE_URL',
  kind: 'secret' as const, description: null, value_length: 42,
  created_by_actor_kind: 'human' as const, ...over,
});

const ambiente = (over = {}) => ({
  id: 'env-preview', project_id: 'p1', name: 'default (preview)', stage: 'preview' as const,
  is_default: true, entry_count: 0, materialized_in_workspaces: true,
  materialization_note: null, ...over,
});

const previsao = (over = {}) => ({
  repo_name: null, applied: false, parsed: 2,
  will_create: [{ key: 'NOVA', value_length: 5 }],
  will_overwrite: [{ key: 'DATABASE_URL', value_length: 30, current_value_length: 42 }],
  unchanged: [], warnings: [], ...over,
});

/** Um `File` cujo `.text()` resolve — jsdom nao implementa sozinho. */
const arquivo = (conteudo: string) => {
  const f = new File([conteudo], '.env', { type: 'text/plain' });
  Object.defineProperty(f, 'text', { value: () => Promise.resolve(conteudo) });
  return f;
};

const enviar = async (conteudo = 'DATABASE_URL=novo\nNOVA=valor\n') => {
  const input = screen.getByLabelText(/Arquivo \.env/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [arquivo(conteudo)] } });
};

beforeEach(() => {
  vi.resetAllMocks();
  // Um so ambiente (`preview`) e escolhido automaticamente: os testes
  // exercitam o comportamento por chave/import, nao o seletor em si — esse
  // tem sua propria suite abaixo.
  vi.mocked(getProjectEnvironments).mockResolvedValue([ambiente()]);
  vi.mocked(getProjectConfigEntries).mockResolvedValue([entrada()]);
});
afterEach(cleanup);

describe('Configuracao do projeto: o valor nunca chega a tela', () => {
  it('lista a chave pelo nome e pelo COMPRIMENTO, nunca pelo valor', async () => {
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);

    expect(await screen.findByText('DATABASE_URL')).toBeTruthy();
    expect(screen.getByText(/42 characters/)).toBeTruthy();
  });

  it('esconde o valor enquanto ele e digitado', async () => {
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);

    const campo = await screen.findByLabelText('Value');
    expect(campo.getAttribute('type')).toBe('password');
  });
});

describe('Ambiente: nunca escolhe production sozinho (card SNA-RD-163)', () => {
  it('com um so ambiente, ele e selecionado automaticamente e a lista carrega', async () => {
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);

    await screen.findByText('DATABASE_URL');
    expect(getProjectConfigEntries).toHaveBeenCalledWith('p1', undefined, 'env-preview');
  });

  it('com dois ambientes, comeca em preview e NUNCA em production', async () => {
    vi.mocked(getProjectEnvironments).mockResolvedValue([
      ambiente(),
      ambiente({ id: 'env-prod', name: 'default (production)', stage: 'production' }),
    ]);

    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);

    await waitFor(() => expect(getProjectConfigEntries).toHaveBeenCalledWith(
      'p1', undefined, 'env-preview'));
    const seletor = screen.getByLabelText('Environment') as HTMLSelectElement;
    expect(seletor.value).toBe('env-preview');
  });

  it('trocar para production mostra o aviso de que nenhuma execucao materializa o valor', async () => {
    vi.mocked(getProjectEnvironments).mockResolvedValue([
      ambiente(),
      ambiente({ id: 'env-prod', name: 'default (production)', stage: 'production',
                materialization_note: 'Nenhuma execucao recebe estes valores.' }),
    ]);
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'env-prod' } });

    expect(await screen.findByText(/Nenhuma execucao recebe estes valores/i)).toBeTruthy();
    await waitFor(() => expect(getProjectConfigEntries).toHaveBeenLastCalledWith(
      'p1', undefined, 'env-prod'));
  });

  it('sem preview default e sem ambiente unico, nao ha selecao implicita', async () => {
    vi.mocked(getProjectEnvironments).mockResolvedValue([
      ambiente({ id: 'env-a', name: 'a', stage: 'production' }),
      ambiente({ id: 'env-b', name: 'b', stage: 'production' }),
    ]);

    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);

    await screen.findByText(/Select an environment/i);
    expect(getProjectConfigEntries).not.toHaveBeenCalled();
  });
});

describe('Upload de .env: nada e gravado antes da confirmacao', () => {
  it('a primeira chamada pre-visualiza, com apply falso', async () => {
    vi.mocked(importProjectConfigEntries).mockResolvedValue(previsao());
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    await enviar();

    await waitFor(() => expect(importProjectConfigEntries).toHaveBeenCalledWith(
      'p1', 'DATABASE_URL=novo\nNOVA=valor\n', null, false, 'env-preview'));
  });

  it('mostra o que seria SOBRESCRITO, com o tamanho anterior e o novo', async () => {
    vi.mocked(importProjectConfigEntries).mockResolvedValue(previsao());
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    await enviar();

    expect(await screen.findByText(/OVERWRITTEN/i)).toBeTruthy();
    expect(screen.getByText(/from 42 to 30 characters/)).toBeTruthy();
    expect(screen.getByText(/Nothing has been saved yet/i)).toBeTruthy();
  });

  it('so grava depois de confirmar, e ai com apply verdadeiro', async () => {
    vi.mocked(importProjectConfigEntries).mockResolvedValue(previsao());
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');
    await enviar();
    await screen.findByText(/Nothing has been saved yet/i);

    vi.mocked(importProjectConfigEntries).mockResolvedValue(previsao({ applied: true }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm import/i }));

    await waitFor(() => expect(importProjectConfigEntries).toHaveBeenLastCalledWith(
      'p1', 'DATABASE_URL=novo\nNOVA=valor\n', null, true, 'env-preview'));
  });

  it('cancelar descarta a previsao sem gravar nada', async () => {
    vi.mocked(importProjectConfigEntries).mockResolvedValue(previsao());
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');
    await enviar();
    await screen.findByText(/Nothing has been saved yet/i);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => expect(screen.queryByText(/Nothing has been saved yet/i)).toBeNull());
    expect(importProjectConfigEntries).toHaveBeenCalledTimes(1);
  });

  it('mostra os avisos que o servidor devolveu', async () => {
    vi.mocked(importProjectConfigEntries).mockResolvedValue(
      previsao({ warnings: ['`SEM_IGUAL` nao tem `=` e foi ignorada.'] }));
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    await enviar();

    expect(await screen.findByText(/SEM_IGUAL/)).toBeTruthy();
  });

  it('arquivo recusado pelo servidor vira mensagem, nao tela quebrada', async () => {
    vi.mocked(importProjectConfigEntries).mockRejectedValue({
      response: { data: { detail: 'Nenhuma chave foi encontrada.' } },
    });
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    await enviar('# so comentario\n');

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent', 'Nenhuma chave foi encontrada.');
  });
});

describe('Escopo', () => {
  it('trocar para um repositorio recarrega a lista naquele escopo', async () => {
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api, snaps-app" />);
    await screen.findByText('DATABASE_URL');

    fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'snaps-app' } });

    await waitFor(() => expect(getProjectConfigEntries).toHaveBeenLastCalledWith(
      'p1', 'snaps-app', 'env-preview'));
  });

  it('o upload herda o escopo selecionado', async () => {
    vi.mocked(importProjectConfigEntries).mockResolvedValue(previsao());
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');
    fireEvent.change(screen.getByLabelText('Scope'), { target: { value: 'snaps-api' } });
    await waitFor(() => expect(getProjectConfigEntries).toHaveBeenLastCalledWith(
      'p1', 'snaps-api', 'env-preview'));

    await enviar();

    await waitFor(() => expect(importProjectConfigEntries).toHaveBeenCalledWith(
      'p1', expect.any(String), 'snaps-api', false, 'env-preview'));
  });
});

describe('Uma chave por vez', () => {
  it('salva com o escopo corrente e recarrega', async () => {
    vi.mocked(upsertProjectConfigEntry).mockResolvedValue(entrada());
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'NOVA' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'v' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    await waitFor(() => expect(upsertProjectConfigEntry).toHaveBeenCalledWith(
      'p1', { key: 'NOVA', value: 'v', repo_name: null }, 'env-preview'));
  });

  it('nao salva sem chave ou sem valor', async () => {
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    const botao = screen.getByRole('button', { name: /Add/i }) as HTMLButtonElement;

    expect(botao.disabled).toBe(true);
    fireEvent.click(botao);
    expect(upsertProjectConfigEntry).not.toHaveBeenCalled();
  });

  it('remover pede confirmacao antes, porque o workspace deixa de receber a chave', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProjectConfigEntriesPanel projectId="p1" repoNames="snaps-api" />);
    await screen.findByText('DATABASE_URL');

    fireEvent.click(screen.getByRole('button', { name: /Remove DATABASE_URL/i }));

    expect(confirmar).toHaveBeenCalled();
    expect(deleteProjectConfigEntry).not.toHaveBeenCalled();
    confirmar.mockRestore();
  });
});
