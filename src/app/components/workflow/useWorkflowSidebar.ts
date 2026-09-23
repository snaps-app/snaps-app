import { useState, useEffect } from 'react';
import type { PhaseConfigItem } from '@/services/types';

interface UseWorkflowSidebarProps {
  phase: PhaseConfigItem;
  onUpdate: (phase: PhaseConfigItem) => void;
}

/**
 * Estado dos campos com editor proprio. As demais diretivas (stage,
 * session_policy, context_budget, max_retries...) sao montadas do vocabulario
 * da API e gravadas por `handleDirective`, que so toca a chave editada.
 *
 * Toda edicao sobe na hora por `onUpdate`, com `...phase`: o que nao tem campo
 * na tela atravessa intacto, e trocar de aba nao perde nada (SNA-RD-176).
 */
export function useWorkflowSidebar({ phase, onUpdate }: UseWorkflowSidebarProps) {
  const [label, setLabel] = useState(phase.label);
  const [key, setKey] = useState(phase.key);
  const [agent, setAgent] = useState(phase.agent || '');
  const [selectedTools, setSelectedTools] = useState<string[]>(phase.tools || []);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(phase.skills || []);
  const [entryPrompt, setEntryPrompt] = useState(phase.entry_prompt || '');
  const [exitPrompt, setExitPrompt] = useState(phase.exit_prompt || '');
  const [branching, setBranching] = useState(phase.branching_strategy || 'None');
  const [onFailure, setOnFailure] = useState(phase.on_failure || 'None');
  const [advanceConditions, setAdvanceConditions] = useState<Record<string, any>>(phase.advance_conditions || {});

  useEffect(() => {
    setLabel(phase.label);
    setKey(phase.key);
    setAgent(phase.agent || '');
    setSelectedTools(phase.tools || []);
    setSelectedSkills(phase.skills || []);
    setEntryPrompt(phase.entry_prompt || '');
    setExitPrompt(phase.exit_prompt || '');
    setBranching(phase.branching_strategy || 'None');
    setOnFailure(phase.on_failure || 'None');
    setAdvanceConditions(phase.advance_conditions || {});
  }, [phase]);

  const handleChange = (field: string, value: any) => {
    const updated = {
      ...phase,
      label: field === 'label' ? value : label,
      key: field === 'key' ? value : key,
      agent: field === 'agent' ? value : agent,
      tools: field === 'tools' ? value : selectedTools,
      skills: field === 'skills' ? value : selectedSkills,
      entry_prompt: field === 'entry_prompt' ? (value || null) : (entryPrompt || null),
      exit_prompt: field === 'exit_prompt' ? (value || null) : (exitPrompt || null),
      branching_strategy: field === 'branching_strategy' ? (value === 'None' ? null : value) : (branching === 'None' ? null : branching),
      on_failure: field === 'on_failure' ? (value === 'None' ? null : value) : (onFailure === 'None' ? null : onFailure),
      advance_conditions: field === 'advance_conditions' ? value : advanceConditions,
    };
    onUpdate(updated);
  };

  /** Diretiva montada do vocabulario: grava so ela, sobre a fase atual. */
  const handleDirective = (name: string, value: unknown) => {
    onUpdate({ ...phase, [name]: value } as PhaseConfigItem);
  };

  const handleToggleTool = (tool: string) => {
    const next = selectedTools.includes(tool)
      ? selectedTools.filter(t => t !== tool)
      : [...selectedTools, tool];
    setSelectedTools(next);
    handleChange('tools', next);
  };

  const handleToggleSkill = (skill: string) => {
    const next = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(next);
    handleChange('skills', next);
  };

  return {
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
  };
}
