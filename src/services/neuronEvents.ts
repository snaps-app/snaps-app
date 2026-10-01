/**
 * Contrato C6 (Neuron -> app): os eventos do SSE do `POST /chat`.
 *
 * Os exemplos em `__fixtures__/eventos_c6.json` sao os mesmos que o Neuron
 * testa (`neuron-agent/contrato/eventos_c6.json`). Tipo desconhecido e
 * ignorado: o Neuron pode ganhar eventos novos sem quebrar o app.
 */

export type VarianteTag = 'blue' | 'orange' | 'purple' | 'green' | 'pink';
export interface TagSnap { label: string; variant: VarianteTag }

export interface SnapReferenciado {
  id: string;
  title: string;
  content: string;
  tags: TagSnap[];
  timestamp: string | null;
  trust_level: string | null;
  source_ref: unknown;
}

export interface SnapSugerido {
  id: string;
  title: string;
  content: string;
  tags: TagSnap[];
  confidence: number;
  timestamp: string;
}

export type CodigoErroNeuron = 'grant_expired' | 'sem_chave' | 'modelo_sem_preco' | 'tool_error' | 'interno';

export type EventoNeuron =
  | { type: 'thinking'; content: string }
  | { type: 'token'; content: string }
  | { type: 'tool_start'; tool: string; resumo: string }
  | { type: 'tool_end'; tool: string; ok: boolean; resumo: string }
  | { type: 'snaps_referenced'; snaps: SnapReferenciado[] }
  | { type: 'snap_suggested'; snap: SnapSugerido }
  | { type: 'board_changed'; entidades: Array<{ tipo: 'card' | 'task'; id: string }> }
  | { type: 'guardrail_tripped'; guarda: string; limite: number; valor: number }
  | { type: 'error'; code: CodigoErroNeuron; message: string }
  | {
      type: 'done';
      perfil: string;
      uso: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number };
      custo_usd: number;
      preco_estimado: boolean;
      incompleto: boolean;
    };

const CAMPOS: Record<EventoNeuron['type'], string[]> = {
  thinking: ['content'],
  token: ['content'],
  tool_start: ['tool', 'resumo'],
  tool_end: ['tool', 'ok', 'resumo'],
  snaps_referenced: ['snaps'],
  snap_suggested: ['snap'],
  board_changed: ['entidades'],
  guardrail_tripped: ['guarda', 'limite', 'valor'],
  error: ['code', 'message'],
  done: ['perfil', 'uso', 'custo_usd', 'preco_estimado', 'incompleto'],
};

/** Devolve o evento do C6 ou `null` para tipo desconhecido ou campo faltando. */
export function lerEventoNeuron(dado: unknown): EventoNeuron | null {
  if (!dado || typeof dado !== 'object') return null;
  const tipo = (dado as { type?: unknown }).type;
  if (typeof tipo !== 'string' || !(tipo in CAMPOS)) return null;
  const campos = CAMPOS[tipo as EventoNeuron['type']];
  if (!campos.every((c) => c in (dado as object))) return null;
  return dado as EventoNeuron;
}

/**
 * Le um corpo SSE (`data: <json>`) e entrega cada evento do C6.
 *
 * Guarda o resto da linha entre pedacos: um `data:` cortado ao meio pela rede
 * nao pode virar JSON invalido descartado.
 */
export async function lerSSE(corpo: ReadableStream<Uint8Array>, aoEvento: (e: EventoNeuron) => void): Promise<void> {
  const leitor = corpo.getReader();
  const decodificador = new TextDecoder();
  let resto = '';
  const processar = (linha: string) => {
    if (!linha.startsWith('data: ')) return;
    try {
      const evento = lerEventoNeuron(JSON.parse(linha.slice(6)));
      if (evento) aoEvento(evento);
    } catch {
      // linha que nao e JSON: ignorada, como tipo desconhecido
    }
  };
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    resto += decodificador.decode(value, { stream: true });
    const linhas = resto.split('\n');
    resto = linhas.pop() ?? '';
    linhas.forEach(processar);
  }
  resto += decodificador.decode();
  if (resto) processar(resto);
}
