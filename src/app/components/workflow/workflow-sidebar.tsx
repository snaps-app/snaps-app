import { useEffect, useState } from 'react';
import { Trash2, CheckSquare, Square, Maximize2, X } from 'lucide-react';
import type { PhaseConfigItem } from '@/services/types';
import { useWorkflowSidebar } from '@/app/components/workflow/useWorkflowSidebar';
import {
  aposentadasDeclaradas,
  condicoesParaEditar,
  rotuloDaCondicao,
} from '@/app/components/workflow/phaseVocabulary';
import { agenteParaGravar, agenteSelecionado } from '@/app/components/workflow/phaseAgent';
import { DirectiveField } from '@/app/components/workflow/DirectiveField';
import type { PhaseDirectivesVocabulary } from '@/services/workflowTemplates';

interface WorkflowSidebarProps {
  phase: PhaseConfigItem;
  metadata: {
    available_tools: string[];
    available_skills: string[];
    available_agents: string[];
  };
  allPhases: PhaseConfigItem[];
  /** Vocabulario de fase lido da API; os campos de diretiva vem daqui. */
  vocabulary: PhaseDirectivesVocabulary | null;
  onUpdate: (phase: PhaseConfigItem) => void;
  onDelete: () => void;
}

const ABAS = ['Geral', 'Ferramentas', 'Prompts', 'Fluxo', 'Diretivas', 'Condições'] as const;
type Aba = typeof ABAS[number];

// Diretivas com editor proprio nesta tela. Todas as outras que o vocabulario
// da API trouxer sao montadas pelo schema em `DirectiveField`.
const EDITOR_PROPRIO = new Set([
  'key', 'label', 'agent', 'tools', 'skills', 'entry_prompt', 'exit_prompt',
  'branching_strategy', 'on_failure', 'advance_conditions',
]);
// So decide a ABA de uma diretiva montada pelo schema; nao cria campo. A que
// nao esta aqui vai para "Diretivas".
const NA_ABA_FLUXO = new Set(['convergence', 'stage', 'execution_mode']);

const labelClass = 'text-[10px] font-black uppercase text-white/40 tracking-wider';
const inputClass = 'w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500';

const variableChips = ['{{sprint_name}}', '{{sprint_tag}}', '{{sprint_id}}', '{{project_id}}', '{{execution_id}}', '{{agent_name}}', '{{timestamp}}'];

export function WorkflowSidebar({ phase, metadata, allPhases, vocabulary, onUpdate, onDelete }: WorkflowSidebarProps) {
  const {
    label,
    setLabel,
    key,
    setKey,
    agent,
    setAgent,
    selectedTools,
    selectedSkills,
    entryPrompt,
    setEntryPrompt,
    exitPrompt,
    setExitPrompt,
    branching,
    setBranching,
    onFailure,
    setOnFailure,
    advanceConditions,
    setAdvanceConditions,
    handleChange,
    handleDirective,
    handleToggleTool,
    handleToggleSkill
  } = useWorkflowSidebar({ phase, onUpdate });

  const [aba, setAba] = useState<Aba>('Geral');
  const [expandido, setExpandido] = useState<'entry' | 'exit' | null>(null);

  const aposentadas = vocabulary ? aposentadasDeclaradas(phase, vocabulary) : [];
  const valores = phase as unknown as Record<string, unknown>;
  const diretivasMontadas = (vocabulary?.directives || []).filter(d => !EDITOR_PROPRIO.has(d.name));
  const camposDa = (destino: 'Fluxo' | 'Diretivas') =>
    diretivasMontadas
      .filter(d => (NA_ABA_FLUXO.has(d.name) ? 'Fluxo' : 'Diretivas') === destino)
      .map(d => (
        <DirectiveField
          key={d.name}
          nome={d.name}
          schema={d.schema}
          defs={vocabulary?.defs}
          value={valores[d.name]}
          onChange={v => handleDirective(d.name, v)}
        />
      ));

  const agenteNaTela = agenteSelecionado(agent, metadata.available_agents);

  const prompts = {
    entry: {
      rotulo: 'Entry Prompt Template',
      valor: entryPrompt,
      placeholder: 'System prompt context supplied to agent when entering phase...',
      mudar: (v: string) => { setEntryPrompt(v); handleChange('entry_prompt', v); },
    },
    exit: {
      rotulo: 'Exit Prompt Template',
      valor: exitPrompt,
      placeholder: 'Rules / expectations to evaluate before advancing this phase...',
      mudar: (v: string) => { setExitPrompt(v); handleChange('exit_prompt', v); },
    },
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 text-left">
      <div role="tablist" aria-label="Propriedades da fase" className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
        {ABAS.map(nome => (
          <button
            key={nome}
            type="button"
            role="tab"
            aria-selected={aba === nome}
            onClick={() => setAba(nome)}
            className={`px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors ${
              aba === nome ? 'bg-white/10 text-white border border-white/15' : 'text-white/50 hover:bg-white/5 border border-transparent'
            }`}
          >
            {nome}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={aba} className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
        {aba === 'Geral' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="phase-key" className={labelClass}>Phase Key</label>
                <input
                  id="phase-key"
                  type="text"
                  value={key}
                  onChange={(e) => { setKey(e.target.value); handleChange('key', e.target.value); }}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="phase-label" className={labelClass}>Phase Label</label>
                <input
                  id="phase-label"
                  type="text"
                  value={label}
                  onChange={(e) => { setLabel(e.target.value); handleChange('label', e.target.value); }}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phase-agent" className={labelClass}>Assigned Agent</label>
              <select
                id="phase-agent"
                value={agenteNaTela.valor}
                onChange={(e) => {
                  // Reescolher o valor desconhecido mantem o que estava gravado.
                  const gravado = agenteNaTela.desconhecido && e.target.value === agent
                    ? agent
                    : agenteParaGravar(e.target.value, agent, allPhases);
                  setAgent(gravado);
                  handleChange('agent', gravado);
                }}
                className={inputClass}
              >
                <option value="" disabled>Select agent...</option>
                {agenteNaTela.desconhecido && (
                  <option value={agent}>{agent} (desconhecido)</option>
                )}
                {metadata.available_agents.map(ag => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>
              {agenteNaTela.desconhecido && (
                <p className="text-[10px] text-amber-300">
                  <span className="font-mono">{agent}</span> não está entre os agentes cadastrados.
                </p>
              )}
            </div>
          </>
        )}

        {aba === 'Ferramentas' && (
          <>
            <ListaMarcavel titulo="Allowed Tools" vazio="No tools available" itens={metadata.available_tools} marcados={selectedTools} alternar={handleToggleTool} />
            <ListaMarcavel titulo="Allowed Skills" vazio="No skills available" itens={metadata.available_skills} marcados={selectedSkills} alternar={handleToggleSkill} />
          </>
        )}

        {aba === 'Prompts' && (['entry', 'exit'] as const).map(qual => (
          <EditorDePrompt
            key={qual}
            id={`prompt-${qual}`}
            {...prompts[qual]}
            onExpandir={() => setExpandido(qual)}
          />
        ))}

        {aba === 'Fluxo' && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="phase-branching" className={labelClass}>Branching Strategy</label>
              <select
                id="phase-branching"
                value={branching}
                onChange={(e) => { setBranching(e.target.value); handleChange('branching_strategy', e.target.value); }}
                className={inputClass}
              >
                <option value="None">None</option>
                <option value="per_selected_plan">Per Selected Plan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="phase-on-failure" className={`${labelClass} text-red-400`}>On Failure</label>
              <select
                id="phase-on-failure"
                value={onFailure}
                onChange={(e) => { setOnFailure(e.target.value); handleChange('on_failure', e.target.value); }}
                className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="None">None (Default halt)</option>
                {allPhases.filter(p => p.key !== key).map(p => (
                  <option key={`failure-${p.key}`} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            {camposDa('Fluxo')}
            {aposentadas.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                {aposentadas.map(r => (
                  <p key={r.name} className="text-[10px] text-amber-300">
                    <span className="font-mono">{r.name}</span> foi aposentada pela {r.decision} e sai ao salvar — {r.reason}.
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {aba === 'Diretivas' && (
          vocabulary
            ? camposDa('Diretivas')
            : <p className="text-xs text-white/40 italic">O vocabulário de fase não carregou da API; as diretivas não podem ser exibidas.</p>
        )}

        {aba === 'Condições' && (
          <div className="space-y-1 bg-black/20 border border-white/5 rounded-lg p-2.5">
            {condicoesParaEditar(vocabulary, advanceConditions).map(cond => {
              const isChecked = !!advanceConditions[cond.name];
              return (
                <button
                  key={cond.name}
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  title={cond.name}
                  onClick={() => {
                    const nextConditions = { ...advanceConditions, [cond.name]: !isChecked };
                    setAdvanceConditions(nextConditions);
                    handleChange('advance_conditions', nextConditions);
                  }}
                  className="w-full flex items-center justify-between gap-2 p-1.5 rounded text-left text-xs transition-colors hover:bg-white/5"
                >
                  <span className="text-white/70 text-[11px]">
                    {rotuloDaCondicao(cond)}
                    {cond.kind === 'human_judgment' && <span className="ml-1 text-[10px] text-amber-300">(julgamento humano)</span>}
                    {cond.kind === 'unknown' && <span className="ml-1 text-[10px] text-red-400">(o motor não conhece)</span>}
                  </span>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${isChecked ? 'bg-purple-500' : 'bg-white/10'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-white/5 pt-4">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-bold text-xs"
        >
          <Trash2 className="w-4 h-4" /> Delete Phase
        </button>
      </div>

      {expandido && (
        <ModalDePrompt {...prompts[expandido]} onFechar={() => setExpandido(null)} />
      )}
    </div>
  );
}

function ListaMarcavel({ titulo, vazio, itens, marcados, alternar }: {
  titulo: string; vazio: string; itens: string[]; marcados: string[]; alternar: (item: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className={`${labelClass} flex items-center justify-between`}>
        <span>{titulo}</span>
        <span className="text-[9px] text-white/20">({marcados.length} selected)</span>
      </label>
      <div className="max-h-64 overflow-y-auto border border-white/5 bg-black/20 rounded-lg p-2 space-y-1">
        {itens.length === 0 ? (
          <span className="text-xs text-white/30 italic p-1 block">{vazio}</span>
        ) : itens.map(item => {
          const active = marcados.includes(item);
          return (
            <button
              key={item}
              onClick={() => alternar(item)}
              className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-xs transition-colors ${
                active ? 'bg-purple-500/10 text-purple-300' : 'hover:bg-white/5 text-white/50'
              }`}
            >
              {active ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5" />}
              <span className="truncate">{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipsDeVariavel({ valor, mudar }: { valor: string; mudar: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {variableChips.map(chip => (
        <button
          key={chip}
          type="button"
          onClick={() => mudar(valor + (valor.endsWith(' ') || valor.length === 0 ? '' : ' ') + chip)}
          className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-500/40 transition-colors"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

const textareaClass =
  'w-full flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono leading-relaxed text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 resize-none select-text';

/** Metade da altura util do painel para cada prompt, nunca menos de 12rem. */
function EditorDePrompt({ id, rotulo, valor, placeholder, mudar, onExpandir }: {
  id: string; rotulo: string; valor: string; placeholder: string; mudar: (v: string) => void; onExpandir: () => void;
}) {
  return (
    <div className="flex-1 min-h-[12rem] flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClass}>{rotulo}</label>
        <button
          type="button"
          onClick={onExpandir}
          aria-label={`Expandir ${rotulo}`}
          title="Tela cheia"
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <ChipsDeVariavel valor={valor} mudar={mudar} />
      <textarea id={id} value={valor} onChange={e => mudar(e.target.value)} placeholder={placeholder} className={textareaClass} />
    </div>
  );
}

/** Tela cheia: edita o MESMO estado do painel, entao fechar devolve o texto intacto. */
function ModalDePrompt({ rotulo, valor, placeholder, mudar, onFechar }: {
  rotulo: string; valor: string; placeholder: string; mudar: (v: string) => void; onFechar: () => void;
}) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [onFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
      className="fixed inset-0 z-50 flex flex-col gap-3 p-6 bg-[var(--snaps-bg)]/90 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[var(--snaps-text-h4)] font-medium text-[var(--snaps-text-primary)]">{rotulo}</h3>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar tela cheia"
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ChipsDeVariavel valor={valor} mudar={mudar} />
      <textarea
        aria-label={`${rotulo} (tela cheia)`}
        autoFocus
        value={valor}
        onChange={e => mudar(e.target.value)}
        placeholder={placeholder}
        className={`${textareaClass} text-[var(--snaps-text-body)] border-white/20 rounded-[var(--radius-xl)] p-4`}
      />
    </div>
  );
}
