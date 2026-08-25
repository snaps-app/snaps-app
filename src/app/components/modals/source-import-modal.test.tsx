/**
 * A escolha dos materiais.
 *
 * Esta modal JA rodou a esteira inteira (upload -> extracao -> decomposicao),
 * um arquivo por vez, com a tela travada esperando. A esteira mudou de lugar,
 * nao sumiu: mora agora em `app/ingest/ingestQueue`, acima das rotas, e os
 * testes de la cobrem upload, extracao, portao de tamanho e falha isolada de um
 * arquivo sem derrubar os outros.
 *
 * O motivo da mudanca: enquanto a esteira vivia aqui, fechar a modal ou sair da
 * tela matava a importacao. Nao dava para revisar um material enquanto os
 * outros subiam -- que e justamente o que se quer de uma fila.
 *
 * O que sobra aqui e uma responsabilidade so: escolher arquivos e entregar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/app/ingest/ingestQueue', () => ({ useIngestQueue: vi.fn() }));

import { useIngestQueue } from '@/app/ingest/ingestQueue';
import { SourceImportModal } from '@/app/components/modals/source-import-modal';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';

let enfileirar: any;

const abrir = (props: any = {}) => {
  const onClose = props.onClose ?? vi.fn();
  render(<SourceImportModal projectId={PROJETO} {...props} onClose={onClose} />);
  return { onClose };
};

const pdf = (nome: string) => new File(['x'], nome, { type: 'application/pdf' });

const escolher = async (...nomes: string[]) => {
  await userEvent.upload(screen.getByLabelText(/arquivos/i), nomes.map(pdf));
};

beforeEach(() => {
  vi.clearAllMocks();
  enfileirar = vi.fn();
  vi.mocked(useIngestQueue).mockReturnValue({
    itens: [], progresso: 0, ativa: false, versao: 0, enfileirar, dispensar: vi.fn(),
  } as any);
});

describe('escolher', () => {
  it('aceita mais de um arquivo de uma vez', async () => {
    abrir();

    await escolher('Aula 1.pdf', 'Aula 2.pdf', 'Aula 3.pdf');

    expect(screen.getByText('Aula 1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Aula 3.pdf')).toBeInTheDocument();
  });

  it('sem arquivo nao ha o que importar', () => {
    abrir();
    expect(screen.getByRole('button', { name: /importar/i })).toBeDisabled();
  });

  it('da para tirar um da lista antes de mandar', async () => {
    abrir();
    await escolher('Aula 1.pdf', 'Aula 2.pdf');

    await userEvent.click(screen.getByRole('button', { name: /remover aula 1\.pdf/i }));

    expect(screen.queryByText('Aula 1.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('Aula 2.pdf')).toBeInTheDocument();
  });
});

describe('entregar a fila', () => {
  it('enfileira tudo e sai da frente', async () => {
    // Fechar na hora e o comportamento pedido: a fila continua acima das
    // rotas, e o usuario pode ir revisar o que ja chegou.
    const { onClose } = abrir();
    await escolher('Aula 1.pdf', 'Aula 2.pdf');

    await userEvent.click(screen.getByRole('button', { name: /importar 2 materiais/i }));

    expect(enfileirar).toHaveBeenCalledTimes(1);
    const [projeto, arquivos] = enfileirar.mock.calls[0];
    expect(projeto).toBe(PROJETO);
    expect(arquivos.map((f: File) => f.name)).toEqual(['Aula 1.pdf', 'Aula 2.pdf']);
    expect(onClose).toHaveBeenCalled();
  });

  it('o botao diz quantos vao, no singular quando e um so', async () => {
    abrir();
    await escolher('Aula 1.pdf');

    expect(screen.getByRole('button', { name: /importar 1 material$/i })).toBeInTheDocument();
  });

  it('avisa que o trabalho continua depois de fechar', async () => {
    // Sem isto, a modal sumindo parece cancelamento.
    abrir();
    await escolher('Aula 1.pdf');

    expect(screen.getByText(/continua em segundo plano/i)).toBeInTheDocument();
  });
});
