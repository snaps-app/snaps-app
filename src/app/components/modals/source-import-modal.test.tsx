/**
 * A esteira: upload -> extracao -> decomposicao.
 *
 * O portao de tamanho vive aqui. A decomposicao so pergunta quando a espera
 * passa de um minuto, e a pergunta traz os numeros que a justificam -- perguntar
 * sem dizer "quantas chamadas" e "quanto tempo" e so um obstaculo.
 *
 * Falha em qualquer etapa preserva o documento. O binario fica guardado no
 * servidor, entao reprocessar nunca exige subir o arquivo de novo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/sourceDocuments', () => ({
  uploadSourceDocument: vi.fn(),
  extractSourceDocument: vi.fn(),
  decomposeSourceDocument: vi.fn(),
}));

import {
  uploadSourceDocument,
  extractSourceDocument,
  decomposeSourceDocument,
} from '@/services/sourceDocuments';
import { SourceImportModal } from '@/app/components/modals/source-import-modal';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';
const DOC = { id: 'doc-1', name: 'aula.pdf', status: 'uploaded', raw_data: { mimetype: 'application/pdf' } };

const abrir = (props: any = {}) =>
  render(
    <SourceImportModal
      projectId={PROJETO}
      onClose={props.onClose ?? vi.fn()}
      onPronto={props.onPronto ?? vi.fn()}
      {...props}
    />,
  );

async function escolherArquivo(nome = 'aula.pdf') {
  const arquivo = new File(['x'], nome, { type: 'application/pdf' });
  await userEvent.upload(screen.getByLabelText(/arquivo/i), arquivo);
  return arquivo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadSourceDocument).mockResolvedValue(DOC as any);
  vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 24, status: 'extracted' } as any);
  vi.mocked(decomposeSourceDocument).mockResolvedValue({
    group_id: 'lote-1', criados: 14, pulados_ja_promovidos: 0, blocos: 24,
  } as any);
});

describe('caminho automatico', () => {
  it('sobe, extrai e decompoe sem perguntar quando o documento e pequeno', async () => {
    // 24 blocos sao 2 chamadas, poucos segundos. Perguntar aqui seria um clique
    // a toa.
    const onPronto = vi.fn();
    abrir({ onPronto });
    await escolherArquivo();
    await userEvent.click(screen.getByRole('button', { name: /importar/i }));

    await waitFor(() => expect(decomposeSourceDocument).toHaveBeenCalled());
    expect(uploadSourceDocument).toHaveBeenCalledWith(PROJETO, expect.any(File));
    expect(extractSourceDocument).toHaveBeenCalledWith(PROJETO, 'doc-1');
    expect(onPronto).toHaveBeenCalledWith(expect.objectContaining({ group_id: 'lote-1', criados: 14 }));
  });
});

describe('portao de tamanho', () => {
  it('para e pergunta acima do limite, com chamadas e tempo na tela', async () => {
    vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 127, status: 'extracted' } as any);
    abrir();
    await escolherArquivo();
    await userEvent.click(screen.getByRole('button', { name: /importar/i }));

    expect(await screen.findByText(/127 blocos/i)).toBeInTheDocument();
    expect(screen.getByText(/11 chamadas/i)).toBeInTheDocument();
    expect(screen.getByText(/2 min/i)).toBeInTheDocument();
    // Nao pode ter decomposto sozinho.
    expect(decomposeSourceDocument).not.toHaveBeenCalled();
  });

  it('decompoe depois da confirmacao', async () => {
    vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 127, status: 'extracted' } as any);
    abrir();
    await escolherArquivo();
    await userEvent.click(screen.getByRole('button', { name: /importar/i }));
    await userEvent.click(await screen.findByRole('button', { name: /decompor mesmo assim/i }));
    await waitFor(() => expect(decomposeSourceDocument).toHaveBeenCalledWith(PROJETO, 'doc-1'));
  });

  it('recusar deixa o documento extraido, para decompor depois', async () => {
    // Nao e cancelamento: o upload e a extracao ja aconteceram e nao se perdem.
    vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 127, status: 'extracted' } as any);
    const onPronto = vi.fn();
    abrir({ onPronto });
    await escolherArquivo();
    await userEvent.click(screen.getByRole('button', { name: /importar/i }));
    await userEvent.click(await screen.findByRole('button', { name: /agora não/i }));

    expect(decomposeSourceDocument).not.toHaveBeenCalled();
    expect(onPronto).toHaveBeenCalledWith(expect.objectContaining({ group_id: null }));
  });
});

describe('quando falha', () => {
  it('mostra a recusa do backend com o texto dele', async () => {
    const recusa: any = new Error('Request failed');
    recusa.response = { status: 413, data: { detail: 'arquivo de 40 MB excede o limite de 25 MB' } };
    vi.mocked(uploadSourceDocument).mockRejectedValue(recusa);
    abrir();
    await escolherArquivo();
    await userEvent.click(screen.getByRole('button', { name: /importar/i }));
    expect(await screen.findByText(/excede o limite de 25 MB/i)).toBeInTheDocument();
  });

  it('falha na extracao avisa que o arquivo ficou guardado', async () => {
    // Sem isso o usuario sobe o mesmo arquivo de novo, sem precisar.
    const erro: any = new Error('falhou');
    erro.response = { status: 500, data: { detail: 'PdfReadError: arquivo corrompido' } };
    vi.mocked(extractSourceDocument).mockRejectedValue(erro);
    abrir();
    await escolherArquivo();
    await userEvent.click(screen.getByRole('button', { name: /importar/i }));

    expect(await screen.findByText(/arquivo corrompido/i)).toBeInTheDocument();
    expect(screen.getByText(/continua guardado/i)).toBeInTheDocument();
  });
});

describe('antes de escolher arquivo', () => {
  it('nao deixa importar nada', async () => {
    abrir();
    expect(screen.getByRole('button', { name: /importar/i })).toBeDisabled();
  });
});
