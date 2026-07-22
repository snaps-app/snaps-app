import React from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Bot, 
  Settings, 
  Plus, 
  Sparkles, 
  X,
} from 'lucide-react';
import type { PhaseConfigItem } from '@/services/types';

import { CustomPhaseNode } from '@/app/components/workflow/custom-phase-node';
import { WorkflowSidebar } from '@/app/components/workflow/workflow-sidebar';
import { WorkflowCreateModal } from '@/app/components/workflow/workflow-create-modal';
import { useWorkflowEditor } from '@/app/components/workflow/useWorkflowEditor';
import { WorkflowEditorHeader } from '@/app/components/workflow/WorkflowEditorHeader';

const nodeTypes = {
  phase: CustomPhaseNode,
};

export function WorkflowEditorCanvas() {
  const {
    templateId,
    navigate,
    templates,
    selectedTemplate,
    metadata,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    selectedNodeId,
    setSelectedNodeId,
    loading,
    saving,
    templateName,
    setTemplateName,
    showCreateModal,
    setShowCreateModal,
    modalTemplateName,
    setModalTemplateName,
    modalSourceTemplateId,
    setModalSourceTemplateId,
    handleSelectTemplate,
    handleNodeClick,
    handleNodeDragStop,
    handleUpdateNodeData,
    openCreateModal,
    handleConfirmCreate,
    handleAddPhase,
    handleDeletePhase,
    handleSaveTemplate,
    handleDeleteTemplate,
    selectedNode
  } = useWorkflowEditor();

  return (
    <>
      {!selectedTemplate ? (
        <div className="flex flex-col h-[70vh] bg-black/20 border border-white/10 rounded-2xl p-6 overflow-y-auto scrollbar-hide relative animate-fade-in">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs z-20">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-sm text-gray-400">Loading Templates...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Workflow Templates
                  </h2>
                  <p className="text-xs text-white/40 mt-1">
                    Manage reusable autonomous pipeline templates for your agentic executions.
                  </p>
                </div>
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all cursor-pointer animate-fade-in"
                >
                  <Plus className="w-4 h-4" /> New Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(tmpl => {
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        if (tmpl.id) navigate(`/workflow-editor/${tmpl.id}`);
                      }}
                      className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-purple-500/30 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between group h-48 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:to-purple-500/[0.03] transition-all duration-300 pointer-events-none" />
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">Template</span>
                          <span className="text-[10px] text-white/30">
                            {tmpl.phases.length} {tmpl.phases.length === 1 ? 'phase' : 'phases'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                          {tmpl.name}
                        </h3>
                        
                        <div className="mt-3 flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
                          {tmpl.phases.map((phase, idx) => (
                            <React.Fragment key={phase.key}>
                              <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-white/50 whitespace-nowrap">
                                {phase.label}
                              </div>
                              {idx < tmpl.phases.length - 1 && (
                                <span className="text-white/20 text-[9px] shrink-0">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                        <span className="text-[9px] text-white/30 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-purple-400/70" />
                          {tmpl.phases.map(p => p.agent).filter((v, i, a) => a.indexOf(v) === i).length} unique agents
                        </span>
                        <span className="text-[9px] text-white/30 group-hover:text-purple-300 font-medium transition-colors flex items-center gap-0.5">
                          Edit Workflow →
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div
                  onClick={openCreateModal}
                  className="border border-dashed border-white/10 hover:border-purple-500/30 hover:bg-white/[0.01] rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group h-48"
                >
                  <div className="p-3 rounded-full bg-purple-500/5 group-hover:bg-purple-500/10 border border-white/5 group-hover:border-purple-500/20 text-purple-400 group-hover:scale-110 transition-all duration-300 mb-3">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    Create New Template
                  </h3>
                  <p className="text-[11px] text-white/30 max-w-[200px] mt-1">
                    Start building a customized execution pipeline from scratch.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={`flex flex-col bg-[#0a0a0c] overflow-hidden ${templateId ? 'absolute inset-0 z-50 rounded-none border-none' : 'h-[70vh] relative border border-white/10 rounded-2xl'}`}>
          {/* Top Header Panel */}
          <WorkflowEditorHeader
            navigate={navigate}
            templateName={templateName}
            setTemplateName={setTemplateName}
            selectedTemplate={selectedTemplate}
            templates={templates}
            handleSelectTemplate={handleSelectTemplate}
            handleAddPhase={handleAddPhase}
            handleSaveTemplate={handleSaveTemplate}
            handleDeleteTemplate={handleDeleteTemplate}
            saving={saving}
          />

          {/* Main Split Layout: Canvas + Drawer */}
          <div className="flex-1 flex overflow-hidden">
            {/* Canvas Area */}
            <div className="flex-1 h-full bg-[#0a0a0c] relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-20">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-sm text-gray-400 ml-3">Loading Canvas...</span>
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  onNodeClick={handleNodeClick}
                  onNodeDragStop={handleNodeDragStop}
                  fitView
                  className="bg-dot-pattern"
                >
                  <Background color="#333" gap={16} />
                  <Controls />
                  <MiniMap 
                    nodeColor={() => '#581c87'} 
                    maskColor="rgba(0, 0, 0, 0.7)" 
                    className="!bg-black/90 !border-white/10" 
                    pannable
                    zoomable
                  />
                </ReactFlow>
              )}
            </div>

            {/* Right properties Drawer Panel - Only visible when a node is selected */}
            {selectedNode && (
              <div className="w-96 border-l border-white/10 bg-[#0d0d0f]/90 backdrop-blur-md flex flex-col overflow-y-auto z-10 animate-slide-in">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-400" /> Properties Configurator
                  </h3>
                  <button 
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-5 flex-1">
                  <WorkflowSidebar 
                    phase={selectedNode.data as PhaseConfigItem}
                    metadata={metadata}
                    allPhases={nodes.map(n => n.data as PhaseConfigItem)}
                    onUpdate={handleUpdateNodeData}
                    onDelete={() => handleDeletePhase(selectedNode.id)}
                  />
                </div>
              </div>
            )}
          </div>
          
          <style>{`
            .react-flow__controls {
              background: rgba(15, 15, 20, 0.85) !important;
              backdrop-filter: blur(8px);
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              border-radius: 12px !important;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              gap: 2px;
              padding: 4px !important;
            }
            .react-flow__controls-button {
              background: rgba(255, 255, 255, 0.03) !important;
              border: none !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
              color: rgba(255, 255, 255, 0.75) !important;
              fill: currentColor !important;
              transition: all 0.2s ease !important;
              width: 28px !important;
              height: 28px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              border-radius: 6px !important;
            }
            .react-flow__controls-button:last-child {
              border-bottom: none !important;
            }
            .react-flow__controls-button:hover {
              background: rgba(168, 85, 247, 0.2) !important;
              color: #a855f7 !important;
            }
            .react-flow__controls-button svg {
              width: 14px !important;
              height: 14px !important;
              fill: currentColor !important;
            }
            .react-flow__minimap {
              background: rgba(15, 15, 20, 0.9) !important;
              backdrop-filter: blur(8px);
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              border-radius: 12px !important;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
              overflow: hidden;
            }
            .react-flow__minimap-mask {
              fill: rgba(0, 0, 0, 0.6) !important;
            }
            .react-flow__minimap-node {
              fill: #581c87 !important;
              stroke: none !important;
            }
          `}</style>
        </div>
      )}

      {/* Create Template Modal */}
      <WorkflowCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        modalTemplateName={modalTemplateName}
        setModalTemplateName={setModalTemplateName}
        modalSourceTemplateId={modalSourceTemplateId}
        setModalSourceTemplateId={setModalSourceTemplateId}
        templates={templates}
        onConfirm={handleConfirmCreate}
      />
    </>
  );
}
