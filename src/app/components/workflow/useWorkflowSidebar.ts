import { useState, useEffect } from 'react';
import type { PhaseConfigItem } from '@/services/types';

interface UseWorkflowSidebarProps {
  phase: PhaseConfigItem;
  onUpdate: (phase: PhaseConfigItem) => void;
}

export function useWorkflowSidebar({ phase, onUpdate }: UseWorkflowSidebarProps) {
  const [label, setLabel] = useState(phase.label);
  const [key, setKey] = useState(phase.key);
  const [agent, setAgent] = useState(phase.agent || '');
  const [selectedTools, setSelectedTools] = useState<string[]>(phase.tools || []);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(phase.skills || []);
  const [entryPrompt, setEntryPrompt] = useState(phase.entry_prompt || '');
  const [exitPrompt, setExitPrompt] = useState(phase.exit_prompt || '');
  const [branching, setBranching] = useState(phase.branching_strategy || 'None');
  const [join, setJoin] = useState(phase.join_strategy || 'None');
  const [onFailure, setOnFailure] = useState(phase.on_failure || 'None');
  const [onSuccess, setOnSuccess] = useState(phase.on_success || 'None');
  const [advanceConditions, setAdvanceConditions] = useState<Record<string, any>>(phase.advance_conditions || {});
  const [maxRetries, setMaxRetries] = useState<string>(phase.max_retries != null ? String(phase.max_retries) : '');
  const [allowedCommands, setAllowedCommands] = useState<string>((phase.allowed_commands || []).join(', '));
  const [autoAdvance, setAutoAdvance] = useState<boolean>(phase.auto_advance || false);

  useEffect(() => {
    setLabel(phase.label);
    setKey(phase.key);
    setAgent(phase.agent || '');
    setSelectedTools(phase.tools || []);
    setSelectedSkills(phase.skills || []);
    setEntryPrompt(phase.entry_prompt || '');
    setExitPrompt(phase.exit_prompt || '');
    setBranching(phase.branching_strategy || 'None');
    setJoin(phase.join_strategy || 'None');
    setOnFailure(phase.on_failure || 'None');
    setOnSuccess(phase.on_success || 'None');
    setAdvanceConditions(phase.advance_conditions || {});
    setMaxRetries(phase.max_retries != null ? String(phase.max_retries) : '');
    setAllowedCommands((phase.allowed_commands || []).join(', '));
    setAutoAdvance(phase.auto_advance || false);
  }, [phase]);

  const handleChange = (field: string, value: any) => {
    const newMaxRetries = field === 'max_retries' ? value : maxRetries;
    const newAllowedCommands = field === 'allowed_commands' ? value : allowedCommands;
    const newAutoAdvance = field === 'auto_advance' ? value : autoAdvance;
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
      join_strategy: field === 'join_strategy' ? (value === 'None' ? null : value) : (join === 'None' ? null : join),
      on_failure: field === 'on_failure' ? (value === 'None' ? null : value) : (onFailure === 'None' ? null : onFailure),
      on_success: field === 'on_success' ? (value === 'None' ? null : value) : (onSuccess === 'None' ? null : onSuccess),
      advance_conditions: field === 'advance_conditions' ? value : advanceConditions,
      max_retries: newMaxRetries !== '' ? Number(newMaxRetries) : null,
      allowed_commands: typeof newAllowedCommands === 'string'
        ? newAllowedCommands.split(',').map((s: string) => s.trim()).filter(Boolean)
        : newAllowedCommands,
      auto_advance: newAutoAdvance,
    };
    onUpdate(updated);
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
    join,
    setJoin,
    onFailure,
    setOnFailure,
    onSuccess,
    setOnSuccess,
    advanceConditions,
    setAdvanceConditions,
    maxRetries,
    setMaxRetries,
    allowedCommands,
    setAllowedCommands,
    autoAdvance,
    setAutoAdvance,
    handleChange,
    handleToggleTool,
    handleToggleSkill
  };
}
