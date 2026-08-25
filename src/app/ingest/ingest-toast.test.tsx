/**
 * O aviso flutuante da fila.
 *
 * Ele e o unico vestigio da importacao depois que a modal fecha, entao carrega
 * duas obrigacoes: dizer o que ainda falta, e nao mentir sobre o que terminou.
 * Um material que parou por ser grande NAO e sucesso nem falha -- e uma decisao
 * pendente, e chamar isso de "pronto" faria o usuario nunca voltar nele.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/app/ingest/ingestQueue', async () => ({
  useIngestQueue: vi.fn(),
}));

import { useIngestQueue } from '@/app/ingest/ingestQueue';
import { IngestToast } from '@/app/ingest/ingest-toast';

const fila = (over: any = {}) => ({
  itens: [],
  progresso: 0,
  ativa: false,
  versao: 0,
  enfileirar: vi.fn(),
  dispensar: vi.fn(),
  ...over,
});

const item = (nome: string, estado: string, over: any = {}) => ({
  id: nome, nome, projectId: 'p', estado, ...over,
});

beforeEach(() => vi.clearAllMocks());

it('fila vazia nao desenha nada', () => {
  vi.mocked(useIngestQueue).mockReturnValue(fila() as any);
  const { container } = render(<IngestToast />);
  expect(container).toBeEmptyDOMElement();
});

it('mostra quantos ja passaram do total', () => {
  vi.mocked(useIngestQueue).mockReturnValue(
    fila({
      itens: [item('A.pdf', 'pronto'), item('B.pdf', 'extraindo'), item('C.pdf', 'esperando')],
      progresso: 0.5,
      ativa: true,
    }) as any,
  );

  render(<IngestToast />);

  expect(screen.getByText(/1 de 3/)).toBeInTheDocument();
  expect(screen.getByText(/50%/)).toBeInTheDocument();
});

it('diz em que etapa o arquivo da vez esta', () => {
  vi.mocked(useIngestQueue).mockReturnValue(
    fila({ itens: [item('Aula 2.pdf', 'decompondo')], progresso: 0.9, ativa: true }) as any,
  );

  render(<IngestToast />);

  expect(screen.getByText('Aula 2.pdf')).toBeInTheDocument();
  expect(screen.getByText(/quebrando em notas/i)).toBeInTheDocument();
});

it('a falha mostra a causa, e o arquivo que falhou', () => {
  vi.mocked(useIngestQueue).mockReturnValue(
    fila({
      itens: [item('A.docx', 'falhou', { erro: 'tipo nao suportado' })],
      progresso: 1,
      ativa: false,
    }) as any,
  );

  render(<IngestToast />);

  expect(screen.getByText('A.docx')).toBeInTheDocument();
  expect(screen.getByText(/tipo nao suportado/)).toBeInTheDocument();
});

it('material grande aparece como decisao pendente, nunca como pronto', () => {
  vi.mocked(useIngestQueue).mockReturnValue(
    fila({
      itens: [item('Grande.pdf', 'grande-demais', { blocos: 127 })],
      progresso: 1,
      ativa: false,
    }) as any,
  );

  render(<IngestToast />);

  expect(screen.getByText(/127 blocos/)).toBeInTheDocument();
  expect(screen.getByText(/espera sua decisão/i)).toBeInTheDocument();
  expect(screen.queryByText(/^pronto$/i)).not.toBeInTheDocument();
});

it('so da para dispensar quando nao ha mais nada rodando', async () => {
  const dispensar = vi.fn();
  vi.mocked(useIngestQueue).mockReturnValue(
    fila({ itens: [item('A.pdf', 'subindo')], progresso: 0.2, ativa: true, dispensar }) as any,
  );

  const { rerender } = render(<IngestToast />);
  expect(screen.queryByRole('button', { name: /dispensar/i })).not.toBeInTheDocument();

  vi.mocked(useIngestQueue).mockReturnValue(
    fila({ itens: [item('A.pdf', 'pronto')], progresso: 1, ativa: false, dispensar }) as any,
  );
  rerender(<IngestToast />);

  await userEvent.click(screen.getByRole('button', { name: /dispensar/i }));
  expect(dispensar).toHaveBeenCalled();
});
