/**
 * Properties Configurator (SNA-RD-176). Os blocos seguem os 5 cenarios BDD do
 * card. O vocabulario e o JSON REAL de GET /workflow-templates/phase-directives,
 * gerado do snaps-api: um vocabulario escrito a mao aqui provaria so que o
 * editor funciona com o que o teste imaginou.
 */
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { WorkflowSidebar } from '@/app/components/workflow/workflow-sidebar';
import { somenteDiretivasLidas } from '@/app/components/workflow/phaseVocabulary';
import type { PhaseConfigItem } from '@/services/types';
import type { PhaseDirectivesVocabulary } from '@/services/workflowTemplates';
import vocabularioReal from './__fixtures__/phase-directives.json';

const vocabulario = vocabularioReal as unknown as PhaseDirectivesVocabulary;

const metadata = {
  available_tools: ['snaps_get_execution_context_tool'],
  available_skills: ['simplify'],
  // Como a API devolve: sem '@'. A ordem poe outro agente primeiro, que era o
  // que o navegador exibia quando nenhuma opcao casava.
  available_agents: ['antigravity-assurance', 'playbook-executor'],
};

// Fase `ci_gate` do SDLC v4.0 depois do push da 22.0.
const faseSdlc = (): PhaseConfigItem => ({
  key: 'ci_gate', label: 'CI Gate', agent: '@playbook-executor',
  tools: [], skills: [],
  entry_prompt: 'Rode o CI.', exit_prompt: null,
  branching_strategy: null, on_failure: 'execution',
  advance_conditions: { ci_passed: true },
  max_retries: 3, allowed_commands: ['pytest'], auto_advance: true,
  stage: 'preview',
  session_policy: { mode: 'fresh' },
  context_budget: { max_tokens: 60000 },
});

/** O editor real guarda a fase fora do sidebar; o harness faz o mesmo. */
function montar(fase: PhaseConfigItem = faseSdlc(), vocab: PhaseDirectivesVocabulary | null = vocabulario) {
  const onUpdate = vi.fn();
  const atual = { fase };
  function Harness() {
    const [phase, setPhase] = useState(fase);
    return (
      <WorkflowSidebar
        phase={phase}
        metadata={metadata}
        allPhases={[phase, { ...phase, key: 'execution', label: 'Execution' }]}
        vocabulary={vocab}
        onUpdate={p => { atual.fase = p; onUpdate(p); setPhase(p); }}
        onDelete={() => {}}
      />
    );
  }
  render(<Harness />);
  return { onUpdate, atual };
}

const abrir = (nome: string) => fireEvent.click(screen.getByRole('tab', { name: nome }));

describe('Properties Configurator em abas', () => {
  it('mostra as seis abas, com cada grupo de campos na sua', () => {
    montar();
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(
      ['Geral', 'Ferramentas', 'Prompts', 'Fluxo', 'Diretivas', 'Condições'],
    );
    expect(screen.getByLabelText('Phase Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Assigned Agent')).toBeInTheDocument();

    abrir('Ferramentas');
    expect(screen.getByText('Allowed Tools')).toBeInTheDocument();
    expect(screen.getByText('Allowed Skills')).toBeInTheDocument();

    abrir('Fluxo');
    expect(screen.getByLabelText('Branching Strategy')).toBeInTheDocument();
    expect(screen.getByLabelText('On Failure')).toBeInTheDocument();
    expect(screen.getByLabelText('convergence')).toBeInTheDocument();
    expect(screen.getByLabelText('stage')).toBeInTheDocument();

    abrir('Diretivas');
    expect(screen.getByLabelText('max_retries')).toBeInTheDocument();
    expect(screen.getByLabelText('allowed_commands')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'auto_advance' })).toBeInTheDocument();
    expect(screen.getByText('session_policy')).toBeInTheDocument();
    expect(screen.getByText('context_budget')).toBeInTheDocument();
  });

  it('trocar de aba nao perde edicao nao salva', () => {
    const { atual } = montar();
    fireEvent.change(screen.getByLabelText('Phase Label'), { target: { value: 'CI Gate editado' } });
    abrir('Prompts');
    fireEvent.change(screen.getByLabelText('Entry Prompt Template'), { target: { value: 'novo prompt' } });
    abrir('Diretivas');
    fireEvent.change(screen.getByLabelText('allowed_commands'), { target: { value: 'pytest, npm ' } });
    abrir('Geral');

    expect(screen.getByLabelText('Phase Label')).toHaveValue('CI Gate editado');
    abrir('Prompts');
    expect(screen.getByLabelText('Entry Prompt Template')).toHaveValue('novo prompt');
    abrir('Diretivas');
    expect(screen.getByLabelText('allowed_commands')).toHaveValue('pytest, npm');
    expect(atual.fase).toMatchObject({
      label: 'CI Gate editado', entry_prompt: 'novo prompt', allowed_commands: ['pytest', 'npm'],
    });
  });
});

describe('Prompts com espaco de verdade', () => {
  it('editor monoespacado que cresce com o painel, com os chips de variavel', () => {
    montar();
    abrir('Prompts');
    const entry = screen.getByLabelText('Entry Prompt Template');
    expect(entry).toHaveClass('font-mono', 'flex-1');
    expect(entry.parentElement).toHaveClass('flex-1', 'min-h-[12rem]');

    fireEvent.click(screen.getAllByRole('button', { name: '{{sprint_tag}}' })[0]);
    expect(entry).toHaveValue('Rode o CI. {{sprint_tag}}');
  });

  it('tela cheia edita o mesmo texto e ele volta intacto ao fechar', () => {
    const { atual } = montar();
    abrir('Prompts');
    fireEvent.click(screen.getByRole('button', { name: 'Expandir Exit Prompt Template' }));

    const dialogo = screen.getByRole('dialog', { name: 'Exit Prompt Template' });
    const grande = within(dialogo).getByLabelText('Exit Prompt Template (tela cheia)');
    const texto = 'linha 1\n  linha 2 com {{sprint_id}}\n\nlinha 4';
    fireEvent.change(grande, { target: { value: texto } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Fechar tela cheia' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Exit Prompt Template')).toHaveValue(texto);
    expect(atual.fase.exit_prompt).toBe(texto);
  });

  it('Esc fecha a tela cheia', () => {
    montar();
    abrir('Prompts');
    fireEvent.click(screen.getByRole('button', { name: 'Expandir Entry Prompt Template' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Diretivas novas visiveis e editaveis a partir do vocabulario da API', () => {
  it('stage, session_policy (mode fresh) e context_budget aparecem com o valor declarado', () => {
    montar();
    abrir('Fluxo');
    expect(screen.getByLabelText('stage')).toHaveValue('preview');

    abrir('Diretivas');
    expect(screen.getByLabelText('session_policy.mode')).toHaveValue('fresh');
    expect(screen.getByLabelText(/^context_budget.max_tokens/)).toHaveValue(60000);
    // Opcoes saem do schema servido, inclusive dentro de $defs.
    const modos = within(screen.getByLabelText('session_policy.mode')).getAllByRole('option').map(o => o.getAttribute('value'));
    expect(modos).toEqual(['', 'auto', 'sticky', 'fresh']);
  });

  it('editar session_policy.mode muda so ela', () => {
    const { atual } = montar();
    abrir('Diretivas');
    fireEvent.change(screen.getByLabelText('session_policy.mode'), { target: { value: 'sticky' } });

    expect(atual.fase.session_policy).toEqual({ mode: 'sticky' });
    expect(atual.fase.stage).toBe('preview');
    expect(atual.fase.context_budget).toEqual({ max_tokens: 60000 });
  });

  it('esvaziar o unico campo de um objeto volta a diretiva para nao declarada', () => {
    const { atual } = montar();
    abrir('Diretivas');
    fireEvent.change(screen.getByLabelText('session_policy.mode'), { target: { value: '' } });
    expect(atual.fase.session_policy).toBeNull();
  });

  it('nao ha lista local: diretiva nova no vocabulario vira campo sem mudar o app', () => {
    const comNova: PhaseDirectivesVocabulary = {
      ...vocabulario,
      directives: [...vocabulario.directives, {
        name: 'diretiva_do_futuro', reader: 'x:y',
        schema: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }], default: null },
      }],
    };
    const { atual } = montar(faseSdlc(), comNova);
    abrir('Diretivas');
    fireEvent.change(screen.getByLabelText('diretiva_do_futuro'), { target: { value: '7' } });
    expect((atual.fase as unknown as Record<string, unknown>).diretiva_do_futuro).toBe(7);
  });

  it('sem vocabulario nenhum campo de diretiva e inventado', () => {
    montar(faseSdlc(), null);
    abrir('Diretivas');
    expect(screen.queryByLabelText('max_retries')).not.toBeInTheDocument();
    expect(screen.getByText(/vocabulário de fase não carregou/)).toBeInTheDocument();
  });

  it('salvar sem mexer nas diretivas nao altera stage, session_policy nem context_budget', () => {
    const original = faseSdlc();
    const { atual } = montar(original);
    // Edita outra coisa, em outra aba, e depois grava como o editor grava.
    fireEvent.change(screen.getByLabelText('Phase Label'), { target: { value: 'Outro' } });
    abrir('Condições');
    fireEvent.click(screen.getByRole('switch', { name: /Tasks finished/ }));

    const gravada = somenteDiretivasLidas(atual.fase, vocabulario);
    expect(gravada.stage).toBe(original.stage);
    expect(gravada.session_policy).toEqual(original.session_policy);
    expect(gravada.context_budget).toEqual(original.context_budget);
    expect(gravada).toMatchObject({ max_retries: 3, allowed_commands: ['pytest'], auto_advance: true });
  });
});

describe('Agente exibido e o agente da fase', () => {
  it("'@playbook-executor' aparece como playbook-executor, nao como a primeira opcao", () => {
    montar();
    const select = screen.getByLabelText('Assigned Agent') as HTMLSelectElement;
    expect(select.value).toBe('playbook-executor');
    expect(select.selectedOptions[0].textContent).toBe('playbook-executor');
  });

  it('agente fora da lista aparece como desconhecido, nunca como outra opcao', () => {
    montar({ ...faseSdlc(), agent: '@fantasma' });
    const select = screen.getByLabelText('Assigned Agent') as HTMLSelectElement;
    expect(select.value).toBe('@fantasma');
    expect(select.selectedOptions[0].textContent).toBe('@fantasma (desconhecido)');
    expect(screen.getByText(/não está entre os agentes cadastrados/)).toBeInTheDocument();
  });

  it("trocar o agente grava no formato do template, com '@'", () => {
    const { atual } = montar();
    fireEvent.change(screen.getByLabelText('Assigned Agent'), { target: { value: 'antigravity-assurance' } });
    expect(atual.fase.agent).toBe('@antigravity-assurance');
  });

  it("template sem '@' continua sem '@'", () => {
    const { atual } = montar({ ...faseSdlc(), agent: 'antigravity-assurance' });
    fireEvent.change(screen.getByLabelText('Assigned Agent'), { target: { value: 'playbook-executor' } });
    expect(atual.fase.agent).toBe('playbook-executor');
  });

  it('salvar sem mexer no agente mantem o valor gravado', () => {
    const { atual } = montar();
    fireEvent.change(screen.getByLabelText('Phase Label'), { target: { value: 'x' } });
    expect(atual.fase.agent).toBe('@playbook-executor');
  });
});

describe('Rotulos de condicao sem nome de fase embutido', () => {
  it('as condicoes e os rotulos vem do catalogo da API, sem citar fase', () => {
    montar();
    abrir('Condições');
    const rotulos = screen.getAllByRole('switch').map(s => s.textContent || '');
    const catalogo = vocabulario.conditions!.map(c => c.name);

    expect(rotulos).toHaveLength(catalogo.length);
    expect(screen.getAllByRole('switch').map(s => s.getAttribute('title'))).toEqual(catalogo);
    for (const r of rotulos) {
      expect(r).not.toMatch(/\((Assurance|ci_gate|Done)\)/);
    }
    expect(screen.getByRole('switch', { name: /^Tasks finished$/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /^Ci passed$/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /Questions answered/ })).toHaveTextContent('julgamento humano');
  });

  it('condicao declarada que o motor nao conhece continua visivel, marcada', () => {
    montar({ ...faseSdlc(), advance_conditions: { ci_passed: true, gate_inventado: true } });
    abrir('Condições');
    expect(screen.getByRole('switch', { name: /Gate inventado/ })).toHaveTextContent('o motor não conhece');
  });
});
