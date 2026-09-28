/**
 * Cliente das rotas de sistema do Neuron (contrato C4, TP-5).
 *
 * Todas exigem `super_admin`; as outras pessoas recebem 403. Erros chegam no
 * formato FastAPI `{"detail": "..."}` com copy de produto, e a tela mostra o
 * `detail` como veio.
 */
import { api } from './client';

export interface Chave {
  configurada: boolean;
  ultimos4: string | null;
  gravada_por: { id: string; email: string } | null;
  gravada_em: string | null;
}

export interface ModeloSalvo {
  id: string;
  model_id: string;
  label: string | null;
  price_input_usd_mtok: number | null;
  price_output_usd_mtok: number | null;
  adicionado_por: string | null;
  adicionado_em: string;
}

export type CategoriaModelo = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Categoria {
  categoria: CategoriaModelo;
  rotulo: string;
  model_id: string | null;
  effort: string | null;
  fixa: boolean;
  lock_version: number;
}

export interface EventoDeConfiguracao {
  em: string;
  por: string | null;
  entidade: string;
  chave: string;
  antes: unknown;
  depois: unknown;
}

export interface ConfiguracaoNeuron {
  chave: Chave;
  modelos: ModeloSalvo[];
  categorias: Categoria[];
  historico: EventoDeConfiguracao[];
}

export interface NovoModelo {
  model_id: string;
  label?: string;
  price_input_usd_mtok?: number;
  price_output_usd_mtok?: number;
}

export const getConfiguracaoNeuron = async (): Promise<ConfiguracaoNeuron> =>
  (await api.get('/api/system/neuron')).data;

export const gravarChave = async (valor: string): Promise<Chave> =>
  (await api.put('/api/system/neuron/chave', { valor })).data;

export const testarChave = async (): Promise<{ ok: boolean; mensagem: string }> =>
  (await api.post('/api/system/neuron/chave/testar')).data;

export const adicionarModelo = async (modelo: NovoModelo): Promise<ModeloSalvo> =>
  (await api.post('/api/system/neuron/modelos', modelo)).data;

export const trocarModeloDaCategoria = async (
  categoria: CategoriaModelo,
  model_id: string,
  lock_version: number,
): Promise<Categoria> =>
  (await api.patch(`/api/system/neuron/categorias/${categoria}`, { model_id, lock_version })).data;

/** O `detail` da API, ou uma frase de produto quando ele não veio. */
export const detalheDoErro = (erro: unknown, padrao = 'Não foi possível concluir. Tente de novo.'): string => {
  const detalhe = (erro as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detalhe === 'string' && detalhe ? detalhe : padrao;
};

export const statusDoErro = (erro: unknown): number | undefined =>
  (erro as { response?: { status?: number } })?.response?.status;
