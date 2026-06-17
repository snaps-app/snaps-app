import { Handle, Position } from '@xyflow/react';
import { Bot, GitBranch, GitMerge, Settings, Wrench } from 'lucide-react';

export const CustomPhaseNode = ({ data, selected }: any) => {
  const isBranching = data.branching_strategy && data.branching_strategy !== 'None' && data.branching_strategy !== '';
  const isJoining = data.join_strategy && data.join_strategy !== 'None' && data.join_strategy !== '';

  return (
    <div className={`p-4 rounded-xl border text-left transition-all w-[240px] relative ${
      data.isActive 
        ? 'bg-blue-500/15 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] text-white' 
        : data.isCompleted
        ? 'bg-emerald-500/5 border-emerald-500/30 opacity-70 text-gray-300'
        : selected
        ? 'bg-purple-500/15 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)] text-white'
        : 'bg-[#111]/90 border-white/10 hover:border-white/20 text-gray-300'
    }`}>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-purple-500 border-none" />
      
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{data.key}</span>
        <div className="flex gap-1.5">
          {isBranching && <span title={`Branch: ${data.branching_strategy}`}><GitBranch className="w-3.5 h-3.5 text-blue-400" /></span>}
          {isJoining && <span title={`Join: ${data.join_strategy}`}><GitMerge className="w-3.5 h-3.5 text-purple-400" /></span>}
        </div>
      </div>

      <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{data.label}</h4>
      
      <div className="flex items-center gap-1.5 text-xs text-white/60 mb-2 font-medium">
        <Bot className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span className="truncate">{data.agent || 'No agent assigned'}</span>
      </div>

      <div className="flex gap-2 text-[10px] text-white/40 border-t border-white/5 pt-2">
        <span className="flex items-center gap-0.5"><Settings className="w-3 h-3 text-white/30" /> {data.tools?.length || 0} tools</span>
        <span>•</span>
        <span className="flex items-center gap-0.5"><Wrench className="w-3 h-3 text-white/30" /> {data.skills?.length || 0} skills</span>
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-purple-500 border-none" />
    </div>
  );
};
