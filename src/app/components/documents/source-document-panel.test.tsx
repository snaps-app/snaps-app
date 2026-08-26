/**
 * O painel de um material.
 *
 * A lista responde "em que ponto isto esta". O painel responde as perguntas que
 * a lista nao cabe: por que a extracao falhou, o que exatamente foi lido do
 * arquivo, e o que ainda falta decidir.
 *
 * Duas regras que valem mais do que a aparencia:
 *
 *  - falha de carregamento e uma tela propria, nunca um material vazio. Foi
 *    assim que a busca passou a desenhar 401 como "nenhum resultado";
 *
 *  - a esteira mostra o estado REAL do documento. Um passo desenhado como
 *    concluido quando nao esta e pior do que nao desenhar passo nenhum.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/sourceDocuments', () => ({
  getSourceDocument: vi.fn(),
  extractSourceDocument: vi.fn(),
  decomposeSourceDocument: vi.fn(),
  getSourceDocumentDownloadUrl: vi.fn(),
  getReviewSnaps: vi.fn(),
  getDocumentSnaps: vi.fn(),
  limitePaginasVision: vi.fn(),
}));

import {
  getSourceDocument,
  extractSourceDocument,
  decomposeSourceDocument,
  getSourceDocumentDownloadUrl,
  getReviewSnaps,
  getDocumentSnaps,
  limitePaginasVision,
} from '@/services/sourceDocuments';
import { SourceDocumentPanel } from '@/app/components/documents/source-document-panel';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';
const DOC = 'doc-1';

const bloco = (n: number) => ({
  id: `b${n}`,
  block_id: `p${n}-b1`,
  page: n,
  ordem: n - 1,
  tipo: 'paragrafo',
  content: `Conteudo do bloco ${n}`,
});

const doc = (over: any = {}) => ({
  id: DOC,
  project_id: PROJETO,
  name: 'Aula 03 - Fotossintese.pdf',
  status: 'extracted',
  content: 'texto extraido',
  raw_data: { mimetype: 'application/pdf', size: 2_400_000, paginas: 12 },
  blocks: [bloco(1), bloco(2)],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getReviewSnaps).mockResolvedValue([]);
  vi.mocked(getDocumentSnaps).mockResolvedValue([]);
  vi.mocked(limitePaginasVision).mockReturnValue(null);
});

describe('carregamento', () => {
  it('falha de carregamento vira tela de erro, nao material vazio', async () => {
    vi.mocked(getSourceDocument).mockRejectedValue({
      response: { data: { detail: 'Documento nao encontrado' } },
    });

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    expect(await screen.findByText(/Documento nao encontrado/)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum bloco/i)).not.toBeInTheDocument();
  });

  it('mostra o nome e o que se sabe do arquivo', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    expect(await screen.findByText('Aula 03 - Fotossintese.pdf')).toBeInTheDocument();
    expect(screen.getByText(/2\.3 MB|2\.4 MB/)).toBeInTheDocument();
    expect(screen.getByText(/12 páginas/)).toBeInTheDocument();
  });
});

describe('a esteira', () => {
  it('um documento so enviado nao desenha a extracao como concluida', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ status: 'uploaded', content: null, blocks: [] }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    const extracao = await screen.findByTestId('etapa-extracao');
    expect(extracao).toHaveAttribute('data-estado', 'pendente');
    expect(screen.getByTestId('etapa-upload')).toHaveAttribute('data-estado', 'concluida');
    expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'pendente');
  });

  it('extraido sem notas deixa so a decomposicao pendente', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-extracao')).toHaveAttribute('data-estado', 'concluida'),
    );
    expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'pendente');
  });

  it('a extracao que falhou aparece como falha, com a causa', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({
        status: 'extraction_failed',
        blocks: [],
        extraction_error: 'PDF protegido por senha',
      }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-extracao')).toHaveAttribute('data-estado', 'falhou'),
    );
    expect(screen.getByText('PDF protegido por senha')).toBeInTheDocument();
  });
});

describe('reprocessar', () => {
  it('tentar de novo re-extrai sem pedir novo upload', async () => {
    // O binario continua no storage. Este e o motivo de a extracao ser um passo
    // separado do upload: repetir custa uma chamada, nao um arquivo de novo.
    vi.mocked(getSourceDocument)
      .mockResolvedValueOnce(doc({ status: 'extraction_failed', blocks: [], extraction_error: 'timeout' }) as any)
      .mockResolvedValueOnce(doc() as any);
    vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 2, status: 'extracted' } as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    // Reprocessar NAO autoriza gasto: quem paga Vision acima do teto e o
    // portao, com o preco na tela.
    expect(extractSourceDocument).toHaveBeenCalledWith(PROJETO, DOC, { confirmarVision: false });
    await waitFor(() =>
      expect(screen.getByTestId('etapa-extracao')).toHaveAttribute('data-estado', 'concluida'),
    );
  });

  it('a falha da nova tentativa aparece, e o painel continua de pe', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ status: 'extraction_failed', blocks: [], extraction_error: 'timeout' }) as any,
    );
    vi.mocked(extractSourceDocument).mockRejectedValue({
      response: { data: { detail: 'PDF tem 90 páginas, o limite é 60' } },
    });

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    expect(await screen.findByText(/90 páginas/)).toBeInTheDocument();
    expect(screen.getByText('Aula 03 - Fotossintese.pdf')).toBeInTheDocument();
  });
});

describe('decompor', () => {
  it('um documento so enviado nao oferece decompor', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ status: 'uploaded', content: null, blocks: [] }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await screen.findByText('Aula 03 - Fotossintese.pdf');
    expect(screen.queryByRole('button', { name: /decompor/i })).not.toBeInTheDocument();
  });

  it('poucos blocos decompoem direto', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(decomposeSourceDocument).mockResolvedValue({
      group_id: 'g1', criados: 5, pulados_ja_promovidos: 0, blocos: 2,
    } as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /decompor/i }));

    expect(decomposeSourceDocument).toHaveBeenCalledWith(PROJETO, DOC);
  });

  it('muitos blocos param e mostram a conta antes de gastar a espera', async () => {
    // Mesma regra do modal de importacao: acima do limite a esteira para e
    // mostra chamadas e minutos, porque as chamadas saem em sequencia.
    vi.mocked(getSourceDocument).mockResolvedValue(
      doc({ blocks: Array.from({ length: 127 }, (_, i) => bloco(i + 1)) }) as any,
    );

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /decompor/i }));

    expect(decomposeSourceDocument).not.toHaveBeenCalled();
    const portao = await screen.findByTestId('portao-decomposicao');
    expect(within(portao).getByText(/127 blocos/)).toBeInTheDocument();
    expect(within(portao).getByText(/11 chamadas/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /decompor mesmo assim/i }));
    expect(decomposeSourceDocument).toHaveBeenCalledWith(PROJETO, DOC);
  });
});

describe('os blocos extraidos', () => {
  it('mostra o que foi lido do arquivo, com a pagina de origem', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /ver blocos extraídos/i }));

    expect(screen.getByText('Conteudo do bloco 1')).toBeInTheDocument();
    expect(screen.getByText(/página 2/i)).toBeInTheDocument();
  });
});

describe('baixar o original', () => {
  it('pede a URL assinada em vez de montar um caminho de API', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getSourceDocumentDownloadUrl).mockResolvedValue('https://storage.test/x');
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /baixar original/i }));

    await waitFor(() => expect(abrir).toHaveBeenCalledWith('https://storage.test/x', '_blank'));
  });

  it('documento sem binario diz isso, em vez de abrir uma aba quebrada', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getSourceDocumentDownloadUrl).mockRejectedValue({
      response: { data: { detail: 'documento nao tem binario associado' } },
    });
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /baixar original/i }));

    expect(await screen.findByText(/nao tem binario associado/)).toBeInTheDocument();
    expect(abrir).not.toHaveBeenCalled();
  });
});

describe('revisao', () => {
  it('notas pendentes viram um convite com o numero', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    // A contagem vem de TODAS as notas do material: contando so as `staged`,
    // "ja revisei tudo" ficava indistinguivel de "nunca decompus".
    vi.mocked(getDocumentSnaps).mockResolvedValue([
      { id: 's1', status: 'staged' }, { id: 's2', status: 'staged' }, { id: 's3', status: 'staged' },
    ] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /revisar 3 notas/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'concluida'),
    );
  });

  it('sem notas pendentes nao ha o que revisar', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await screen.findByText('Aula 03 - Fotossintese.pdf');
    expect(screen.queryByRole('button', { name: /revisar \d+ nota/i })).not.toBeInTheDocument();
  });
});

describe('o que saiu deste material', () => {
  const notaAprovada = {
    id: 'a1',
    name: 'Descobrir no Double Diamond',
    content: 'Brainstorming, Matriz CSD, Persona',
    status: 'active',
    trust_level: 'imported',
    source_ref: { page: 12 },
  };

  it('mostra as notas ja aprovadas, com a pagina de origem', async () => {
    // Depois de aprovar o lote a revisao fica vazia -- e correto, ela so lista
    // pendencias. Sem esta secao o material nao tem como responder "o que
    // saiu daqui?", e a unica saida e caçar em Memory.
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getDocumentSnaps).mockResolvedValue([notaAprovada] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /1 nota aprovada/i }));

    const secao = screen.getByTestId('notas-do-material');
    expect(within(secao).getByText('Descobrir no Double Diamond')).toBeInTheDocument();
    expect(within(secao).getByText(/página 12/i)).toBeInTheDocument();
  });

  it('separa o que ja foi aprovado do que ainda espera decisao', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getDocumentSnaps).mockResolvedValue([
      notaAprovada,
      { id: 'p1', name: 'Ainda em revisao', content: 'x', status: 'staged', source_ref: { page: 3 } },
    ] as any);
    vi.mocked(getReviewSnaps).mockResolvedValue([{ id: 'p1' }] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: /1 nota aprovada/i }));

    const secao = screen.getByTestId('notas-do-material');
    expect(within(secao).getByTestId('nota-a1')).toHaveAttribute('data-status', 'active');
    expect(within(secao).getByTestId('nota-p1')).toHaveAttribute('data-status', 'staged');
  });

  it('material sem nota nenhuma nao inventa secao', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await screen.findByText('Aula 03 - Fotossintese.pdf');
    expect(screen.queryByRole('button', { name: /nota aprovada/i })).not.toBeInTheDocument();
  });

  it('a esteira sabe que houve decomposicao mesmo com tudo ja revisado', async () => {
    // Este era o buraco honesto que ficou registrado: sem contar as notas de
    // TODOS os status, "ja revisei tudo" era desenhado igual a "nunca
    // decompus".
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getDocumentSnaps).mockResolvedValue([notaAprovada] as any);
    vi.mocked(getReviewSnaps).mockResolvedValue([] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'concluida'),
    );
  });
});

describe('a quarta etapa: revisao', () => {
  const staged = (id: string) => ({ id, name: id, content: 'x', status: 'staged' });
  const ativa = (id: string) => ({ id, name: id, content: 'x', status: 'active' });

  it('sem nota nenhuma, revisao ainda nao comecou', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    const etapa = await screen.findByTestId('etapa-revisao');
    expect(etapa).toHaveAttribute('data-estado', 'pendente');
  });

  it('notas esperando decisao deixam a revisao em curso, nao concluida', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getDocumentSnaps).mockResolvedValue([staged('s1'), ativa('a1')] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-revisao')).toHaveAttribute('data-estado', 'corrente'),
    );
    // E a decomposicao NAO regride so porque ainda ha o que decidir.
    expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'concluida');
  });

  it('aprovar tudo CONCLUI a revisao -- avanco, nunca retrocesso', async () => {
    // O defeito relatado: com tres etapas, aprovar o ultimo lote zerava o
    // contador de pendentes e a etapa "Decomposto" voltava a cinza. A tela
    // dizia que o usuario tinha andado para tras justamente quando ele
    // completou o trabalho.
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getDocumentSnaps).mockResolvedValue([ativa('a1'), ativa('a2')] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-revisao')).toHaveAttribute('data-estado', 'concluida'),
    );
    expect(screen.getByTestId('etapa-decomposicao')).toHaveAttribute('data-estado', 'concluida');
    expect(within(screen.getByTestId('etapa-revisao')).getByText(/2 notas no contexto/i))
      .toBeInTheDocument();
  });

  it('nenhuma etapa anterior regride quando a revisao termina', async () => {
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    vi.mocked(getDocumentSnaps).mockResolvedValue([ativa('a1')] as any);

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('etapa-revisao')).toHaveAttribute('data-estado', 'concluida'),
    );
    for (const id of ['etapa-upload', 'etapa-extracao', 'etapa-decomposicao']) {
      expect(screen.getByTestId(id)).toHaveAttribute('data-estado', 'concluida');
    }
  });
});

describe('o teto do Vision, e a saida por cima', () => {
  const recusado = doc({ status: 'extraction_failed', blocks: [], extraction_error: 'excede o teto' });

  const recusar = () => {
    vi.mocked(getSourceDocument).mockResolvedValue(recusado as any);
    vi.mocked(extractSourceDocument).mockRejectedValue({ response: { status: 422 } });
    vi.mocked(limitePaginasVision).mockReturnValue({ paginas: 76, teto: 60, custo: 0.8 });
  };

  it('a recusa vira uma escolha com o preco na mesa', async () => {
    // Medido, nao estimado: ~1 centavo por pagina. Pedir autorizacao sem dizer
    // quanto custa nao e escolha informada, e so um obstaculo.
    recusar();

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    const portao = await screen.findByTestId('portao-vision');
    expect(within(portao).getByText(/76 páginas/)).toBeInTheDocument();
    expect(within(portao).getByText(/US\$ 0,80/)).toBeInTheDocument();
  });

  it('confirmar manda a autorizacao explicita', async () => {
    recusar();

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 76, status: 'extracted' } as any);
    vi.mocked(getSourceDocument).mockResolvedValue(doc() as any);
    await userEvent.click(screen.getByRole('button', { name: /extrair mesmo assim/i }));

    expect(extractSourceDocument).toHaveBeenLastCalledWith(PROJETO, DOC, { confirmarVision: true });
  });

  it('desistir nao gasta nada, e o material continua ali', async () => {
    recusar();

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));
    await userEvent.click(screen.getByRole('button', { name: /agora não/i }));

    expect(extractSourceDocument).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('portao-vision')).not.toBeInTheDocument();
    expect(screen.getByText('Aula 03 - Fotossintese.pdf')).toBeInTheDocument();
  });

  it('outra falha de extracao NAO oferece gastar', async () => {
    // `limitePaginasVision` devolve null para qualquer coisa que nao seja o
    // teto. Um PDF com senha nao vira convite para pagar Vision.
    vi.mocked(getSourceDocument).mockResolvedValue(recusado as any);
    vi.mocked(extractSourceDocument).mockRejectedValue({
      response: { data: { detail: 'PDF protegido por senha' } },
    });

    render(<SourceDocumentPanel projectId={PROJETO} docId={DOC} onVoltar={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    expect(await screen.findByText(/PDF protegido por senha/)).toBeInTheDocument();
    expect(screen.queryByTestId('portao-vision')).not.toBeInTheDocument();
  });
});
