import type { PhaseConfigItem } from '@/services/types';
import { useMemo } from 'react';
import { ReactFlow, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PreviewPhaseNode } from '@/app/components/workflow/preview-phase-node';

const nodeTypes = {
  phase: PreviewPhaseNode,
};

interface WorkflowFlowPreviewProps {
  phases: PhaseConfigItem[];
  activePhaseKey?: string;
  completedPhaseKeys?: string[];
}

export const WorkflowFlowPreview: React.FC<WorkflowFlowPreviewProps> = ({
  phases,
  activePhaseKey,
  completedPhaseKeys = []
}) => {
  const { nodes, edges } = useMemo(() => {
    if (!phases || phases.length === 0) return { nodes: [], edges: [] };

    // Determine active / completed states
    const isCompleted = (key: string, idx: number) => {
      if (completedPhaseKeys.length > 0) {
        return completedPhaseKeys.includes(key);
      }
      if (!activePhaseKey) return false;
      const activeIdx = phases.findIndex(p => p.key === activePhaseKey);
      return activeIdx > -1 && idx < activeIdx;
    };

    const nodes = phases.map((phase, index) => {
      const isActive = phase.key === activePhaseKey;
      const completed = isCompleted(phase.key, index);
      
      return {
        id: phase.key,
        type: 'phase',
        position: { x: index * 240 + 20, y: 35 },
        data: {
          ...phase,
          isActive,
          isCompleted: completed,
          tools: phase.tools || [],
          skills: phase.skills || [],
        },
      };
    });

    const edges = [];
    for (let i = 0; i < phases.length - 1; i++) {
      const source = phases[i];
      const target = phases[i + 1];
      const isBranch = source.branching_strategy && source.branching_strategy !== 'None' && source.branching_strategy !== '';
      const isJoin = target.join_strategy && target.join_strategy !== 'None' && target.join_strategy !== '';

      const isEdgeCompleted = isCompleted(source.key, i) && (isCompleted(target.key, i + 1) || target.key === activePhaseKey);

      edges.push({
        id: `preview-edge-${source.key}-${target.key}`,
        source: source.key,
        target: target.key,
        animated: isBranch || isJoin || (source.key === activePhaseKey),
        style: {
          stroke: isBranch 
            ? '#3b82f6' 
            : isJoin 
            ? '#a855f7' 
            : isEdgeCompleted 
            ? '#10b98140' 
            : '#ffffff15',
          strokeWidth: 1.5,
          strokeDasharray: (isBranch || isJoin) ? '4, 4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isBranch ? '#3b82f6' : isJoin ? '#a855f7' : isEdgeCompleted ? '#10b98180' : '#444444',
        },
      });
    }

    return { nodes, edges };
  }, [phases, activePhaseKey, completedPhaseKeys]);

  return (
    <div className="w-full h-full min-h-[160px] bg-black/30 rounded-2xl border border-white/5 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={false}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#fff" gap={12} size={1} className="opacity-[0.02]" />
      </ReactFlow>
    </div>
  );
};
