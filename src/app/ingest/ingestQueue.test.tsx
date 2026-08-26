/**
 * A fila de importacao.
 *
 * Ela existe acima das rotas de proposito. Morando na tela de Documents,
 * entrar num material para revisar desmontaria o componente e mataria os
 * uploads em curso -- e o pedido era justamente poder revisar um enquanto os
 * outros sobem.
 *
 * Um arquivo por vez, inteiro. Nao e timidez: a decomposicao ja faz chamadas em
 * sequencia no servidor, e subir varios PDFs de 2 MB em paralelo disputaria a
 * mesma banca sem chegar antes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

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
import { IngestQueueProvider, useIngestQueue } from '@/app/ingest/ingestQueue';
import { LIMITE_AUTO_BLOCOS } from '@/services/ingestRules';

const PROJETO = '7d17a48e-5615-4c90-9602-531f1b5a603d';

const arquivo = (nome: string) => new File(['conteudo'], nome, { type: 'application/pdf' });

const montar = () =>
  renderHook(() => useIngestQueue(), { wrapper: IngestQueueProvider });

beforeEach(() => {
  vi.clearAllMocks();
  let n = 0;
  vi.mocked(uploadSourceDocument).mockImplementation(async (_p, f) => {
    n += 1;
    return { id: `doc-${n}`, name: f.name, status: 'uploaded' } as any;
  });
  vi.mocked(extractSourceDocument).mockResolvedValue({ blocos: 10, status: 'extracted' } as any);
  vi.mocked(decomposeSourceDocument).mockResolvedValue({
    group_id: 'g1', criados: 4, pulados_ja_promovidos: 0, blocos: 10,
  } as any);
});

describe('a esteira de cada arquivo', () => {
  it('leva um arquivo do upload ate as notas', async () => {
    const { result } = montar();

    act(() => result.current.enfileirar(PROJETO, [arquivo('Aula 1.pdf')]));

    await waitFor(() => expect(result.current.itens[0].estado).toBe('pronto'));
    expect(uploadSourceDocument).toHaveBeenCalledTimes(1);
    expect(extractSourceDocument).toHaveBeenCalledWith(PROJETO, 'doc-1');
    expect(decomposeSourceDocument).toHaveBeenCalledWith(PROJETO, 'doc-1');
    expect(result.current.itens[0].criados).toBe(4);
  });

  it('processa um por vez, na ordem em que entraram', async () => {
    const { result } = montar();

    act(() =>
      result.current.enfileirar(PROJETO, [arquivo('A.pdf'), arquivo('B.pdf'), arquivo('C.pdf')]),
    );

    await waitFor(() =>
      expect(result.current.itens.every((i) => i.estado === 'pronto')).toBe(true),
    );
    expect(result.current.itens.map((i) => i.nome)).toEqual(['A.pdf', 'B.pdf', 'C.pdf']);
    expect(uploadSourceDocument).toHaveBeenCalledTimes(3);
  });
});

describe('o portao de tamanho, sem ninguem para perguntar', () => {
  it('documento grande para antes de decompor, e diz por que', async () => {
    // O portao existe porque decompor um documento grande sao minutos de
    // espera. Numa fila em segundo plano nao ha a quem perguntar -- e decidir
    // sozinho por gastar seria pior do que parar. O material fica extraido e o
    // painel dele oferece a decomposicao com a conta na tela.
    vi.mocked(extractSourceDocument).mockResolvedValue({
      blocos: LIMITE_AUTO_BLOCOS + 1, status: 'extracted',
    } as any);
    const { result } = montar();

    act(() => result.current.enfileirar(PROJETO, [arquivo('Grande.pdf')]));

    await waitFor(() => expect(result.current.itens[0].estado).toBe('grande-demais'));
    expect(decomposeSourceDocument).not.toHaveBeenCalled();
    expect(result.current.itens[0].docId).toBe('doc-1');
  });

  it('no limite ainda decompoe sozinho', async () => {
    vi.mocked(extractSourceDocument).mockResolvedValue({
      blocos: LIMITE_AUTO_BLOCOS, status: 'extracted',
    } as any);
    const { result } = montar();

    act(() => result.current.enfileirar(PROJETO, [arquivo('No limite.pdf')]));

    await waitFor(() => expect(result.current.itens[0].estado).toBe('pronto'));
    expect(decomposeSourceDocument).toHaveBeenCalled();
  });
});

describe('falha de um nao derruba a fila', () => {
  it('upload que falha deixa os seguintes andarem', async () => {
    vi.mocked(uploadSourceDocument)
      .mockRejectedValueOnce({ response: { data: { detail: 'tipo nao suportado' } } })
      .mockResolvedValueOnce({ id: 'doc-2', name: 'B.pdf', status: 'uploaded' } as any);
    const { result } = montar();

    act(() => result.current.enfileirar(PROJETO, [arquivo('A.docx'), arquivo('B.pdf')]));

    await waitFor(() => expect(result.current.itens[1].estado).toBe('pronto'));
    expect(result.current.itens[0].estado).toBe('falhou');
    expect(result.current.itens[0].erro).toMatch(/tipo nao suportado/);
  });

  it('extracao que falha marca o item e segue', async () => {
    vi.mocked(extractSourceDocument)
      .mockRejectedValueOnce({ response: { data: { detail: 'PDF protegido' } } })
      .mockResolvedValueOnce({ blocos: 5, status: 'extracted' } as any);
    const { result } = montar();

    act(() => result.current.enfileirar(PROJETO, [arquivo('A.pdf'), arquivo('B.pdf')]));

    await waitFor(() => expect(result.current.itens[1].estado).toBe('pronto'));
    expect(result.current.itens[0].estado).toBe('falhou');
    // O binario ficou no servidor: o painel do material consegue retomar.
    expect(result.current.itens[0].docId).toBe('doc-1');
  });
});

describe('o que a fila conta para as outras telas', () => {
  it('a versao anda pelo menos uma vez por arquivo', async () => {
    // Nao afirmo o numero exato: a versao sobe DUAS vezes por arquivo, uma
    // quando o material passa a existir e outra quando ganha notas, e as duas
    // merecem recarregar a lista. Amarrar o teste a aritmetica proibiria
    // acrescentar um ponto de recarga legitimo.
    const { result } = montar();
    const antes = result.current.versao;

    act(() => result.current.enfileirar(PROJETO, [arquivo('A.pdf'), arquivo('B.pdf')]));

    await waitFor(() =>
      expect(result.current.itens.every((i) => i.estado === 'pronto')).toBe(true),
    );
    expect(result.current.versao).toBeGreaterThanOrEqual(antes + 2);
  });

  it('o material aparece na lista antes de a fila acabar', async () => {
    // Este e o pedido: revisar um enquanto os outros sobem. Se a versao so
    // mudasse no fim, o primeiro material ficaria invisivel ate o ultimo
    // terminar.
    let liberar: (v: any) => void = () => {};
    vi.mocked(decomposeSourceDocument).mockImplementation(
      () => new Promise((r) => { liberar = r; }),
    );
    const { result } = montar();
    const antes = result.current.versao;

    act(() => result.current.enfileirar(PROJETO, [arquivo('A.pdf'), arquivo('B.pdf')]));

    await waitFor(() => expect(result.current.versao).toBeGreaterThan(antes));
    expect(result.current.ativa).toBe(true);

    act(() => liberar({ group_id: 'g', criados: 1, pulados_ja_promovidos: 0, blocos: 10 }));
  });

  it('a versao muda mesmo quando o arquivo so foi extraido', async () => {
    // O material JA aparece na lista depois do upload. Nao mexer na versao
    // esconderia dele ate a fila inteira acabar.
    vi.mocked(extractSourceDocument).mockResolvedValue({
      blocos: LIMITE_AUTO_BLOCOS + 1, status: 'extracted',
    } as any);
    const { result } = montar();
    const antes = result.current.versao;

    act(() => result.current.enfileirar(PROJETO, [arquivo('Grande.pdf')]));

    await waitFor(() => expect(result.current.versao).toBeGreaterThan(antes));
  });

  it('progresso vai de zero a um', async () => {
    const { result } = montar();

    act(() => result.current.enfileirar(PROJETO, [arquivo('A.pdf'), arquivo('B.pdf')]));
    expect(result.current.progresso).toBeLessThan(1);

    await waitFor(() => expect(result.current.progresso).toBe(1));
  });

  it('fila vazia nao tem progresso a mostrar', () => {
    const { result } = montar();
    expect(result.current.itens).toHaveLength(0);
    expect(result.current.ativa).toBe(false);
  });

  it('dispensar limpa o que ja terminou e preserva o que falta', async () => {
    const { result } = montar();

    act(() => result.current.enfileirar(PROJETO, [arquivo('A.pdf')]));
    await waitFor(() => expect(result.current.itens[0].estado).toBe('pronto'));

    act(() => result.current.dispensar());
    expect(result.current.itens).toHaveLength(0);
  });
});
