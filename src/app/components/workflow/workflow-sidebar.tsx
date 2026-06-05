import { useState, useEffect } from 'react';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import type { PhaseConfigItem } from '@/services/types';

interface WorkflowSidebarProps {
  phase: PhaseConfigItem;
  metadata: {
    available_tools: string[];
    available_skills: string[];
    available_agents: string[];
  };
  allPhases: PhaseConfigItem[];
  onUpdate: (phase: PhaseConfigItem) => void;
  onDelete: () => void;
}

export function WorkflowSidebar({ phase, metadata, allPhases, onUpdate, onDelete }: WorkflowSidebarProps) {
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

  // Sync internal state when selecting a different node
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

  const variableChips = ['{{sprint_name}}', '{{sprint_tag}}', '{{sprint_id}}', '{{project_id}}', '{{execution_id}}', '{{agent_name}}', '{{timestamp}}'];

  return (
    <div className="space-y-4 text-left">
      {/* Label and Key */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Phase Key</label>
          <input
            type="text"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              handleChange('key', e.target.value);
            }}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Phase Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              handleChange('label', e.target.value);
            }}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Agent */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Assigned Agent</label>
        <select
          value={agent}
          onChange={(e) => {
            setAgent(e.target.value);
            handleChange('agent', e.target.value);
          }}
          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
        >
          <option value="" disabled>Select agent...</option>
          {metadata.available_agents.map(ag => (
            <option key={ag} value={ag}>{ag}</option>
          ))}
        </select>
      </div>

      {/* Tools selection */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider flex items-center justify-between">
          <span>Allowed Tools</span>
          <span className="text-[9px] text-white/20">({selectedTools.length} selected)</span>
        </label>
        <div className="max-h-36 overflow-y-auto border border-white/5 bg-black/20 rounded-lg p-2 space-y-1 scrollbar-hide">
          {metadata.available_tools.length === 0 ? (
            <span className="text-xs text-white/30 italic p-1 block">No tools available</span>
          ) : metadata.available_tools.map(tool => {
            const active = selectedTools.includes(tool);
            return (
              <button
                key={tool}
                onClick={() => handleToggleTool(tool)}
                className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-xs transition-colors ${
                  active ? 'bg-purple-500/10 text-purple-300' : 'hover:bg-white/5 text-white/50'
                }`}
              >
                {active ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5" />}
                <span className="truncate">{tool}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills selection */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider flex items-center justify-between">
          <span>Allowed Skills</span>
          <span className="text-[9px] text-white/20">({selectedSkills.length} selected)</span>
        </label>
        <div className="max-h-36 overflow-y-auto border border-white/5 bg-black/20 rounded-lg p-2 space-y-1 scrollbar-hide">
          {metadata.available_skills.length === 0 ? (
            <span className="text-xs text-white/30 italic p-1 block">No skills available</span>
          ) : metadata.available_skills.map(skill => {
            const active = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => handleToggleSkill(skill)}
                className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-xs transition-colors ${
                  active ? 'bg-purple-500/10 text-purple-300' : 'hover:bg-white/5 text-white/50'
                }`}
              >
                {active ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5" />}
                <span className="truncate">{skill}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Entry Prompt Template</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {variableChips.map(chip => (
            <button
              key={`entry-${chip}`}
              onClick={() => {
                const newVal = entryPrompt + (entryPrompt.endsWith(' ') || entryPrompt.length === 0 ? '' : ' ') + chip;
                setEntryPrompt(newVal);
                handleChange('entry_prompt', newVal);
              }}
              className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-500/40 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
        <textarea
          value={entryPrompt}
          onChange={(e) => {
            setEntryPrompt(e.target.value);
            handleChange('entry_prompt', e.target.value);
          }}
          placeholder="System prompt context supplied to agent when entering phase..."
          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 h-16 resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Exit Prompt Template</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {variableChips.map(chip => (
            <button
              key={`exit-${chip}`}
              onClick={() => {
                const newVal = exitPrompt + (exitPrompt.endsWith(' ') || exitPrompt.length === 0 ? '' : ' ') + chip;
                setExitPrompt(newVal);
                handleChange('exit_prompt', newVal);
              }}
              className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-500/40 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
        <textarea
          value={exitPrompt}
          onChange={(e) => {
            setExitPrompt(e.target.value);
            handleChange('exit_prompt', e.target.value);
          }}
          placeholder="Rules / expectations to evaluate before advancing this phase..."
          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500 h-16 resize-none"
        />
      </div>

      {/* Strategies */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Branching Strategy</label>
          <select
            value={branching}
            onChange={(e) => {
              setBranching(e.target.value);
              handleChange('branching_strategy', e.target.value);
            }}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="None">None</option>
            <option value="per_selected_plan">Per Selected Plan</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Join Strategy</label>
          <select
            value={join}
            onChange={(e) => {
              setJoin(e.target.value);
              handleChange('join_strategy', e.target.value);
            }}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="None">None</option>
            <option value="wait_all">Wait All</option>
            <option value="wait_any">Wait Any</option>
          </select>
        </div>
      </div>

      {/* Conditional Transitions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider text-emerald-400">On Success</label>
          <select
            value={onSuccess}
            onChange={(e) => {
              setOnSuccess(e.target.value);
              handleChange('on_success', e.target.value);
            }}
            className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="None">None (Default next)</option>
            {allPhases.filter(p => p.key !== key).map(p => (
              <option key={`success-${p.key}`} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider text-red-400">On Failure</label>
          <select
            value={onFailure}
            onChange={(e) => {
              setOnFailure(e.target.value);
              handleChange('on_failure', e.target.value);
            }}
            className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
          >
            <option value="None">None (Default halt)</option>
            {allPhases.filter(p => p.key !== key).map(p => (
              <option key={`failure-${p.key}`} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advance Conditions */}
      <div className="space-y-2 border-t border-white/5 pt-3">
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider block">Advance Conditions</label>
        <div className="space-y-2 bg-black/20 border border-white/5 rounded-lg p-2.5 max-h-56 overflow-y-auto custom-scrollbar">
          {[
            { key: 'sprint_linked', label: 'Require Sprint Linked' },
            { key: 'plan_approved', label: 'Require Strategic Plan Approved' },
            { key: 'tactical_plans_approved', label: 'Require Tactical Plans Approved' },
            { key: 'plan_selected', label: 'Require Plan Selected for Execution' },
            { key: 'bdd_scenarios_generated', label: 'Require BDD Scenarios Generated' },
            { key: 'tasks_finished', label: 'Require Tasks Finished (Assurance)' },
            { key: 'cards_done', label: 'Require All Cards Validated (Done)' },
            { key: 'bdd_validated', label: 'Require BDD Design Approved' },
            { key: 'ci_passed', label: 'Require CI Passed (ci_gate)' },
          ].map(cond => {
            const isChecked = !!advanceConditions[cond.key];
            return (
              <button
                key={cond.key}
                type="button"
                onClick={() => {
                  const nextVal = !isChecked;
                  const nextConditions = { ...advanceConditions, [cond.key]: nextVal };
                  setAdvanceConditions(nextConditions);
                  handleChange('advance_conditions', nextConditions);
                }}
                className="w-full flex items-center justify-between p-1.5 rounded text-left text-xs transition-colors hover:bg-white/5"
              >
                <span className="text-white/70 text-[11px]">{cond.label}</span>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer shrink-0 ${
                  isChecked ? 'bg-purple-500' : 'bg-white/10'
                }`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                    isChecked ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SDLC v4.0 Fields */}
      <div className="space-y-3 border-t border-white/5 pt-3">
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider block">SDLC v4.0 Config</label>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Max Retries</label>
          <input
            type="number"
            min={0}
            value={maxRetries}
            onChange={(e) => {
              setMaxRetries(e.target.value);
              handleChange('max_retries', e.target.value);
            }}
            placeholder="No limit"
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-wider">Allowed Commands (comma-separated)</label>
          <input
            type="text"
            value={allowedCommands}
            onChange={(e) => {
              setAllowedCommands(e.target.value);
              handleChange('allowed_commands', e.target.value);
            }}
            placeholder="e.g. pytest, git, npm test"
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !autoAdvance;
            setAutoAdvance(next);
            handleChange('auto_advance', next);
          }}
          className="w-full flex items-center justify-between p-1.5 rounded text-left text-xs transition-colors hover:bg-white/5"
        >
          <span className="text-white/70 text-[11px]">Auto-Advance Phase</span>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${autoAdvance ? 'bg-purple-500' : 'bg-white/10'}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${autoAdvance ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="border-t border-white/5 pt-4">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-bold text-xs"
        >
          <Trash2 className="w-4 h-4" /> Delete Phase
        </button>
      </div>
    </div>
  );
}
