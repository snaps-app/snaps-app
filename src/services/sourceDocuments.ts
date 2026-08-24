import { api } from './client';
import type { Snap } from './types';

/**
 * Cliente do pipeline de ingestao: upload -> extracao -> decomposicao -> revisao.
 *
 * Nada aqui trata erro. E deliberado: quem chama precisa saber a diferenca entre
 * "nao ha documento" e "a chamada falhou", e a camada de servico engolindo a
 * excecao apaga essa diferenca antes de a tela poder decidir. Foi assim que a
 * busca passou a desenhar 401 como "nenhum resultado".
 */

export type SourceDocumentStatus = 'uploaded' | 'extracted' | 'extraction_failed';

export interface SourceDocument {
  id: string;
  project_id: string;
  name: string;
  status: SourceDocumentStatus;
  content: string | null;
  extraction_error?: string | null;
  raw_data?: {
    mimetype?: string;
    size?: number;
    sha256?: string;
    storage_path?: string;
    paginas?: number;
    tem_camada_de_texto?: boolean;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface SourceDocumentBlock {
  id: string;
  /** Identificador estavel dentro do documento, usado na proveniencia do snap. */
  block_id: string;
  page: number | null;
  ordem: number;
  tipo: string;
  content: string;
}

/** A rota por id responde com os blocos junto; a listagem, nao. */
export interface SourceDocumentWithBlocks extends SourceDocument {
  blocks?: SourceDocumentBlock[];
}

export interface ResultadoExtracao {
  blocos: number;
  status: SourceDocumentStatus;
}

export interface ResultadoDecomposicao {
  group_id: string;
  criados: number;
  pulados_ja_promovidos: number;
  blocos: number;
}

export const listSourceDocuments = async (projectId: string): Promise<SourceDocument[]> => {
  const r = await api.get(`/projects/${projectId}/source_documents/`);
  return r.data;
};

export const getSourceDocument = async (
  projectId: string,
  docId: string,
): Promise<SourceDocumentWithBlocks> => {
  const r = await api.get(`/projects/${projectId}/source_documents/${docId}`);
  return r.data;
};

export const uploadSourceDocument = async (
  projectId: string,
  file: File,
): Promise<SourceDocument> => {
  const form = new FormData();
  form.append('file', file);
  // Content-Type limpo de proposito: o browser precisa montar o
  // multipart/form-data COM boundary. Definir na mao omite o boundary e o
  // backend nao consegue separar as partes. Mesmo motivo do comentario em
  // services/storage.ts.
  const r = await api.post(`/projects/${projectId}/source_documents/upload`, form, {
    headers: { 'Content-Type': undefined as any },
  });
  return r.data;
};

export const extractSourceDocument = async (
  projectId: string,
  docId: string,
): Promise<ResultadoExtracao> => {
  const r = await api.post(`/projects/${projectId}/source_documents/${docId}/extract`);
  return r.data;
};

export const decomposeSourceDocument = async (
  projectId: string,
  docId: string,
): Promise<ResultadoDecomposicao> => {
  const r = await api.post(`/projects/${projectId}/source_documents/${docId}/decompose`);
  return r.data;
};

/**
 * A URL assinada do binario original.
 *
 * O bucket e privado, entao nao ha caminho publico a montar. Apontar o
 * navegador para a rota de API tambem nao funciona: uma navegacao de aba nova
 * nao carrega o header de autenticacao. O backend devolve uma URL de validade
 * curta -- e ela que abre.
 */
export const getSourceDocumentDownloadUrl = async (
  projectId: string,
  docId: string,
): Promise<string> => {
  const r = await api.get(`/projects/${projectId}/source_documents/${docId}/download`);
  return r.data.url;
};

export interface FiltroRevisao {
  sourceDocumentId?: string;
  groupId?: string;
}

/**
 * As notas de UM lote, as que ainda esperam decisao.
 *
 * Exige documento ou lote, e recusa antes de sair da tela quando nao tem
 * nenhum dos dois: sem filtro o backend devolveria a base inteira do projeto, e
 * a tela de revisao de um material mostraria notas de todos os outros.
 */
export const getReviewSnaps = async (
  projectId: string,
  filtro: FiltroRevisao,
): Promise<Snap[]> => {
  if (!filtro.sourceDocumentId && !filtro.groupId) {
    throw new Error('getReviewSnaps exige documento ou lote de origem.');
  }
  const params: Record<string, string> = { status: 'staged', limit: '200' } as any;
  if (filtro.sourceDocumentId) params.source_document_id = filtro.sourceDocumentId;
  if (filtro.groupId) params.group_id = filtro.groupId;

  const r = await api.get(`/projects/${projectId}/snaps/`, { params });
  return r.data;
};
