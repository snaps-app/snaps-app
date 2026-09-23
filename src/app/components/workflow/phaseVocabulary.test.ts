import { describe, expect, it } from 'vitest';

import {
  aposentadasDeclaradas,
  opcoesDaDiretiva,
  somenteDiretivasLidas,
  temDiretiva,
} from '@/app/components/workflow/phaseVocabulary';
import type { PhaseConfigItem } from '@/services/types';
import type { PhaseDirectivesVocabulary } from '@/services/workflowTemplates';

// Forma real de GET /workflow-templates/phase-directives, recortada.
const vocabulario: PhaseDirectivesVocabulary = {
  directives: [
    { name: 'key', reader: 'x:y', schema: { type: 'string' } },
    { name: 'label', reader: 'x:y', schema: { type: 'string' } },
    { name: 'agent', reader: 'x:y', schema: {} },
    { name: 'tools', reader: 'x:y', schema: {} },
    { name: 'skills', reader: 'x:y', schema: {} },
    { name: 'on_failure', reader: 'x:y', schema: {} },
    {
      name: 'convergence', reader: 'x:y',
      schema: { anyOf: [{ const: 'sprint', type: 'string' }, { type: 'null' }], default: null },
    },
  ],
  retired: [
    { name: 'join_strategy', decision: 'ADR-0045', reason: 'trabalho pronto nao espera' },
    { name: 'on_success', decision: 'ADR-0045', reason: 'nunca foi lida' },
  ],
};

// Um template antigo como a API ainda o devolve ate o push do §7.4.
const faseAntiga = {
  key: 'execution', label: 'Execution', agent: '@playbook-executor',
  tools: [], skills: [], on_failure: 'micro_planning',
  join_strategy: 'wait_all', on_success: null,
  isActive: true, // dado de no do React Flow, nao e diretiva
} as unknown as PhaseConfigItem;

describe('vocabulario de fase lido da API', () => {
  it('gravar tira diretiva aposentada e qualquer chave que o motor nao le', () => {
    const gravada = somenteDiretivasLidas(faseAntiga, vocabulario) as unknown as Record<string, unknown>;

    expect(gravada).not.toHaveProperty('join_strategy');
    expect(gravada).not.toHaveProperty('on_success');
    expect(gravada).not.toHaveProperty('isActive');
    expect(gravada).toMatchObject({ key: 'execution', on_failure: 'micro_planning' });
  });

  it('avisa so da aposentada que tem valor', () => {
    const avisos = aposentadasDeclaradas(faseAntiga, vocabulario).map(r => r.name);

    expect(avisos).toEqual(['join_strategy']);
  });

  it('opcoes de enum vem do schema da API, nao de lista no app', () => {
    expect(opcoesDaDiretiva(vocabulario, 'convergence')).toEqual(['sprint']);
    expect(opcoesDaDiretiva(vocabulario, 'nao_existe')).toEqual([]);
  });

  it('sem vocabulario, nenhum campo de diretiva e oferecido', () => {
    expect(temDiretiva(null, 'convergence')).toBe(false);
    expect(temDiretiva(vocabulario, 'convergence')).toBe(true);
    expect(temDiretiva(vocabulario, 'join_strategy')).toBe(false);
  });
});
