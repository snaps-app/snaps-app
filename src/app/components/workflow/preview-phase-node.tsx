import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, GitBranch, GitMerge, Settings, Wrench } from 'lucide-react';

export const PreviewPhaseNode = ({ data }: any) => {
  const isBranching = data.branching_strategy && data.branching_strategy !== 'None' && data.branching_strategy !== '';
  const isJoining = data.join_strategy && data.join_strategy !== 'None' && data.join_strategy !== '';

  return (
    <div className={`p-3 rounded-xl border text-left transition-all w-[185px] relative text-[11px] ${
      data.isActive 
        ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.25)] text-white font-semibold' 
        : data.isCompleted
        ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60 text-gray-400'
        : 'bg-[#111] border-white/5 text-gray-500'
    }`}>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 !bg-purple-500 border-none" />
      
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-wider font-bold">{data.key}</span>
        <div className="flex gap-1">
          {isBranching && <GitBranch className="w-3.5 h-3.5 text-blue-400" title={`Branch: ${data.branching_strategy}`} />}
          {isJoining && <GitMerge className="w-3.5 h-3.5 text-purple-400" title={`Join: ${data.join_strategy}`} />}
        </div>
      </div>

      <h4 className="text-[11px] font-bold text-white mb-0.5 line-clamp-1">{data.label}</h4>
      
      <div className="flex items-center gap-1 text-[9px] text-white/50 mb-1.5 font-medium">
        <Bot className="w-3 h-3 text-purple-400 shrink-0" />
        <span className="truncate">{data.agent || 'No agent'}</span>
      </div>

      <div className="flex gap-2 text-[8px] text-white/30 border-t border-white/5 pt-1.5">
        <span className="flex items-center gap-0.5"><Settings className="w-2.5 h-2.5 text-white/35" /> {data.tools?.length || 0} tools</span>
        <span>•</span>
        <span className="flex items-center gap-0.5"><Wrench className="w-2.5 h-2.5 text-white/35" /> {data.skills?.length || 0} skills</span>
      </div>

      <Handle type="source" position={Position.Right} className="w-1.5 h-1.5 !bg-purple-500 border-none" />
    </div>
  );
};
