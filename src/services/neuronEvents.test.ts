/** C6: o app testa os mesmos exemplos que o Neuron e ignora tipo desconhecido. */
import { describe, expect, it } from 'vitest';
import exemplos from './__fixtures__/eventos_c6.json';
import { lerEventoNeuron, lerSSE, type EventoNeuron } from './neuronEvents';

const corpoDe = (pedacos: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      pedacos.forEach((p) => c.enqueue(encoder.encode(p)));
      c.close();
    },
  });
};

describe('lerEventoNeuron', () => {
  it('aceita cada exemplo do contrato', () => {
    const tipos = exemplos.eventos.map((e) => lerEventoNeuron(e)?.type);
    expect(tipos).toEqual([
      'thinking', 'token', 'tool_start', 'tool_end', 'snaps_referenced',
      'snap_suggested', 'board_changed', 'guardrail_tripped', 'error', 'done',
    ]);
  });

  it('ignora tipo desconhecido e evento sem campo obrigatório', () => {
    expect(lerEventoNeuron(exemplos.desconhecido)).toBeNull();
    expect(lerEventoNeuron({ type: 'done', perfil: 'project_chat' })).toBeNull();
    expect(lerEventoNeuron('texto')).toBeNull();
  });
});

describe('lerSSE', () => {
  it('monta linhas partidas entre pedaços e pula o que não conhece', async () => {
    const linhas = exemplos.eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
      + `data: ${JSON.stringify(exemplos.desconhecido)}\n\n: comentario\n\ndata: {quebrado\n\n`;
    const pedacos = linhas.match(/[\s\S]{1,7}/g)!;
    const vistos: EventoNeuron[] = [];
    await lerSSE(corpoDe(pedacos), (e) => vistos.push(e));
    expect(vistos).toHaveLength(exemplos.eventos.length);
    expect(vistos[1]).toEqual({ type: 'token', content: 'O card está em revisão' });
  });
});
