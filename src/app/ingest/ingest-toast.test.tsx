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

describe('sair da frente', () => {
  const fila22 = () =>
    fila({
      itens: [
        item('A.pdf', 'pronto'),
        item('B.pdf', 'grande-demais', { blocos: 96 }),
        item('C.pdf', 'grande-demais', { blocos: 65 }),
        item('D.pdf', 'decompondo'),
      ],
      progresso: 0.4,
      ativa: true,
    }) as any;

  it('minimiza, e a lista de problemas sai da frente', async () => {
    // O aviso cobria os botoes de decisao do painel de revisao. Sobrepor a
    // acao que o proprio aviso pede e o pior lugar possivel para ele estar.
    vi.mocked(useIngestQueue).mockReturnValue(fila22());

    render(<IngestToast />);
    expect(screen.getByText('B.pdf')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /minimizar/i }));

    expect(screen.queryByText('B.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('D.pdf')).not.toBeInTheDocument();
  });

  it('minimizado continua dizendo quanto falta', async () => {
    vi.mocked(useIngestQueue).mockReturnValue(fila22());

    render(<IngestToast />);
    await userEvent.click(screen.getByRole('button', { name: /minimizar/i }));

    // 3 de 4: "grande demais" ja terminou PARA A FILA -- nada mais vai rodar
    // nele. O que falta ali e decisao humana, e quem carrega isso e o selo ao
    // lado, nao o contador.
    expect(screen.getByText(/3 de 4/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });

  it('minimizado avisa que ha decisao esperando, senao esconder vira perder', async () => {
    // Dois materiais pararam por serem grandes. Se o aviso encolhido nao
    // contasse isso, eles ficariam extraidos para sempre sem virar nota.
    vi.mocked(useIngestQueue).mockReturnValue(fila22());

    render(<IngestToast />);
    await userEvent.click(screen.getByRole('button', { name: /minimizar/i }));

    expect(screen.getByText(/2 esperando você/i)).toBeInTheDocument();
  });

  it('nao inventa aviso de decisao quando nao ha nenhuma', async () => {
    vi.mocked(useIngestQueue).mockReturnValue(
      fila({ itens: [item('A.pdf', 'pronto'), item('B.pdf', 'subindo')], progresso: 0.5, ativa: true }) as any,
    );

    render(<IngestToast />);
    await userEvent.click(screen.getByRole('button', { name: /minimizar/i }));

    expect(screen.queryByText(/esperando você/i)).not.toBeInTheDocument();
  });

  it('maximizar traz tudo de volta', async () => {
    vi.mocked(useIngestQueue).mockReturnValue(fila22());

    render(<IngestToast />);
    await userEvent.click(screen.getByRole('button', { name: /minimizar/i }));
    await userEvent.click(screen.getByRole('button', { name: /maximizar/i }));

    expect(screen.getByText('B.pdf')).toBeInTheDocument();
  });
});
