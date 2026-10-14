import { describe, expect, it } from 'vitest';
import { lerEventoNeuron } from './neuronEvents';
import { iniciarTurno, reduzirTurno, lerRegistro } from '@/app/components/chat/comum/turno';
import exemplos from './__fixtures__/eventos_c6.json';

describe('C203 C6 financeiro', () => {
  it('aceita as fixtures financeiras compartilhadas com Neuron', () => {
    for (const exemplo of exemplos.cache) {
      expect(lerEventoNeuron(exemplo)).toEqual(exemplo);
    }
  });
  it('preserva quatro contadores, factual NULL e estimativa separada', () => {
    const evento = { type: 'done', perfil: 'project_chat',
      uso: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 40 },
      custo_usd: 0.01, preco_estimado: true, incompleto: false,
      raw_cost_usd: null, estimated_cost_usd: '0.01000000', coverage: 'partial', cost_basis: 'estimated', estimate_source: 'maior_tarifa_cadastrada',
    };
    const lido = lerEventoNeuron(evento)!;
    expect(lido).toEqual(evento);
    let turno = reduzirTurno(iniciarTurno('project_chat'), { type: 'token', content: 'ok' });
    turno = reduzirTurno(turno, lido);
    expect(turno.registro.raw_cost_usd).toBeNull();
    expect(turno.registro.estimated_cost_usd).toBe('0.01000000');
    expect(turno.registro.uso).toEqual(evento.uso);
    expect(lerRegistro(turno.registro, 'ok').raw_cost_usd).toBeNull();
  });

  it('legado sem cache_creation não inventa custo factual nem contadores', () => {
    const evento = { type: 'done', perfil: 'project_chat', uso: { input_tokens: 0, output_tokens: 1, cache_read_input_tokens: 0 },
      custo_usd: 0.02, preco_estimado: true, incompleto: false } as const;
    const turno = reduzirTurno(iniciarTurno('project_chat'), evento);
    expect(turno.registro.raw_cost_usd).toBeUndefined();
    expect(turno.registro.uso).not.toHaveProperty('cache_creation_input_tokens');
    expect(lerRegistro(null, 'ok').uso).toBeUndefined();
    expect(lerRegistro([{ perfil: 'project_chat' }], 'ok').uso).toBeUndefined();
  });
});
