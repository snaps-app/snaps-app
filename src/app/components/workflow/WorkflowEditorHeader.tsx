import { Sparkles, Plus, Save, Trash2 } from 'lucide-react';
import type { WorkflowTemplate } from '@/services/types';

interface WorkflowEditorHeaderProps {
  navigate: (path: string) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  selectedTemplate: WorkflowTemplate | null;
  templates: WorkflowTemplate[];
  handleSelectTemplate: (template: WorkflowTemplate) => void;
  handleAddPhase: () => void;
  handleSaveTemplate: () => void;
  handleDeleteTemplate: () => void;
  saving: boolean;
}

export function WorkflowEditorHeader({
  navigate,
  templateName,
  setTemplateName,
  selectedTemplate,
  templates,
  handleSelectTemplate,
  handleAddPhase,
  handleSaveTemplate,
  handleDeleteTemplate,
  saving
}: WorkflowEditorHeaderProps) {
  return (
    <div className="p-4 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-4 z-10">
      <div className="flex items-center gap-3 animate-fade-in">
        <button
          onClick={() => navigate('/governance?tab=workflows')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-black/40 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 text-gray-300 hover:text-purple-300 transition-all duration-300 cursor-pointer mr-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
        >
          ← Back to Templates
        </button>
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Workflow Engine</span>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template Name"
            className="bg-transparent text-white font-bold text-lg focus:outline-none border-b border-transparent focus:border-purple-500/50 transition-all w-60 text-left"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selectedTemplate?.id || ''}
          onChange={(e) => {
            const matched = templates.find(t => t.id === e.target.value);
            if (matched) handleSelectTemplate(matched);
          }}
          className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 min-w-[200px]"
        >
          <option value="" disabled>Select template...</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button
          onClick={handleAddPhase}
          disabled={!selectedTemplate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 font-bold hover:bg-violet-500/20 transition-all disabled:opacity-40"
          title="Append Phase Node"
        >
          <Plus className="w-4 h-4 text-violet-400" /> Phase
        </button>

        <button
          onClick={handleSaveTemplate}
          disabled={!selectedTemplate || saving || !templateName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 font-bold hover:from-purple-500/30 hover:to-blue-500/30 transition-all disabled:opacity-40"
        >
          <Save className="w-4 h-4 text-purple-400" />
          {saving ? 'Saving...' : 'Save'}
        </button>

        <button
          onClick={handleDeleteTemplate}
          disabled={!selectedTemplate}
          className="p-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 transition-all disabled:opacity-40"
          title="Delete Template"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
