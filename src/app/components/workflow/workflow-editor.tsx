import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Bot, 
  Settings, 
  Plus, 
  Save, 
  Sparkles, 
  X,
  Trash2
} from 'lucide-react';
import {
  createWorkflowTemplate,
  deleteWorkflowTemplate,
  getWorkflowTemplates,
  getWorkflowTemplatesMetadata,
  updateWorkflowTemplate
} from '@/services/workflowTemplates';
import type { 
  WorkflowTemplate, 
  PhaseConfigItem, 
  WorkflowTemplateCreate 
} from '@/services/types';

import { CustomPhaseNode } from '@/app/components/workflow/custom-phase-node';
import { WorkflowSidebar } from '@/app/components/workflow/workflow-sidebar';
import { WorkflowCreateModal } from '@/app/components/workflow/workflow-create-modal';

const nodeTypes = {
  phase: CustomPhaseNode,
};

export function WorkflowEditorCanvas() {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [metadata, setMetadata] = useState<{
    available_tools: string[];
    available_skills: string[];
    available_agents: string[];
  }>({ available_tools: [], available_skills: [], available_agents: [] });

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Loading and action state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Modal State for New Template configuration
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTemplateName, setModalTemplateName] = useState('');
  const [modalSourceTemplateId, setModalSourceTemplateId] = useState('scratch');

  useEffect(() => {
    fetchMetadataAndTemplates();
  }, [templateId]);

  const fetchMetadataAndTemplates = async () => {
    setLoading(true);
    try {
      const [meta, tmpls] = await Promise.all([
        getWorkflowTemplatesMetadata(),
        getWorkflowTemplates()
      ]);
      setMetadata(meta);
      setTemplates(tmpls);

      if (templateId) {
        if (templateId === 'new') {
          const stateName = (location.state as any)?.name || 'New Workflow Template';
          const sourceId = (location.state as any)?.sourceTemplateId || 'scratch';
          
          let initialPhases: PhaseConfigItem[] = [];
          
          if (sourceId !== 'scratch') {
            const sourceTmpl = tmpls.find(t => t.id === sourceId);
            if (sourceTmpl) {
              initialPhases = sourceTmpl.phases.map(p => ({
                ...p,
                tools: p.tools ? [...p.tools] : [],
                skills: p.skills ? [...p.skills] : []
              }));
            }
          }
          
          if (initialPhases.length === 0) {
            initialPhases = [
              {
                key: 'planning',
                label: 'Planning Phase',
                agent: meta.available_agents[0] || '',
                tools: meta.available_tools ? [...meta.available_tools] : [],
                skills: meta.available_skills ? [...meta.available_skills] : [],
                entry_prompt: null,
                exit_prompt: null,
                branching_strategy: null,
                join_strategy: null
              }
            ];
          }

          const newTemplate: WorkflowTemplate = {
            id: '',
            name: stateName,
            phases: initialPhases,
            default_agents: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setSelectedTemplate(newTemplate);
          setTemplateName(newTemplate.name);
          setSelectedNodeId(null);
          
          buildFlowFromPhases(initialPhases);
        } else {
          const matched = tmpls.find(t => t.id === templateId);
          if (matched) {
            setSelectedTemplate(matched);
            setTemplateName(matched.name);
            setSelectedNodeId(null);
            
            const newNodes = matched.phases.map((phase, index) => ({
              id: phase.key,
              type: 'phase',
              position: { x: index * 280 + 50, y: 180 },
              data: {
                ...phase,
                tools: phase.tools || [],
                skills: phase.skills || [],
              },
            }));
            
            const newEdges = [];
            for (let i = 0; i < matched.phases.length - 1; i++) {
              const source = matched.phases[i];
              const target = matched.phases[i + 1];
              const isBranch = source.branching_strategy && source.branching_strategy !== 'None' && source.branching_strategy !== '';
              newEdges.push({
                id: `edge-${source.key}-${target.key}`,
                source: source.key,
                target: target.key,
                animated: !isBranch,
                style: { 
                  stroke: isBranch ? '#3b82f6' : '#a855f7',
                  strokeWidth: 2
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: isBranch ? '#3b82f6' : '#a855f7'
                }
              });
            }
            
            setNodes(newNodes);
            setEdges(newEdges);
          }
        }
      } else {
        setSelectedTemplate(null);
        setTemplateName('');
        setSelectedNodeId(null);
      }
    } catch (e) {
      printError('Failed to load workflow data: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const printError = (msg: string) => {
    console.error(msg);
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setSelectedNodeId(null);
    buildFlowFromPhases(template.phases);
  };

  // Synchronize React Flow nodes/edges layout whenever phases metadata changes
  const buildFlowFromPhases = (phases: PhaseConfigItem[]) => {
    const newNodes = phases.map((phase, index) => {
      // Find existing coordinates from nodes state if present, to prevent layout jumping
      const existingNode = nodes.find(n => n.id === phase.key);
      const position = existingNode ? existingNode.position : { x: index * 280 + 50, y: 180 };
      
      return {
        id: phase.key,
        type: 'phase',
        position,
        data: {
          ...phase,
          tools: phase.tools || [],
          skills: phase.skills || [],
        },
      };
    });

    const newEdges = [];
    for (let i = 0; i < phases.length - 1; i++) {
      const source = phases[i];
      const target = phases[i + 1];
      const isBranch = source.branching_strategy && source.branching_strategy !== 'None' && source.branching_strategy !== '';
      
      newEdges.push({
        id: `edge-${source.key}-${target.key}`,
        source: source.key,
        target: target.key,
        animated: !isBranch,
        style: { 
          stroke: isBranch ? '#3b82f6' : '#a855f7',
          strokeWidth: 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isBranch ? '#3b82f6' : '#a855f7'
        }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Node Selection Handler
  const handleNodeClick = (_event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  };

  // Drag Handler: update position coords of node in memory (doesn't trigger save yet)
  const handleNodeDragStop = (_event: React.MouseEvent, node: any) => {
    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, position: node.position } : n));
  };

  // Properties form callback - updates local states
  const handleUpdateNodeData = (updatedPhase: PhaseConfigItem) => {
    if (!selectedTemplate) return;
    
    // Find index of the updated phase
    const index = selectedTemplate.phases.findIndex(p => p.key === selectedNodeId);
    if (index === -1) return;

    const updatedPhases = [...selectedTemplate.phases];
    updatedPhases[index] = updatedPhase;

    // Update node details inside React Flow directly
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          id: updatedPhase.key, // Update ID if key changed
          data: {
            ...updatedPhase,
          }
        };
      }
      return n;
    }));

    // If key changed, update edges also
    if (updatedPhase.key !== selectedNodeId) {
      setEdges(prev => prev.map(e => {
        let updatedEdge = { ...e };
        if (e.source === selectedNodeId) updatedEdge.source = updatedPhase.key;
        if (e.target === selectedNodeId) updatedEdge.target = updatedPhase.key;
        return updatedEdge;
      }));
      setSelectedNodeId(updatedPhase.key);
    }

    setSelectedTemplate({
      ...selectedTemplate,
      phases: updatedPhases
    });
  };

  // Modal Open Trigger
  const openCreateModal = () => {
    setModalTemplateName('');
    setModalSourceTemplateId('scratch');
    setShowCreateModal(true);
  };

  const handleConfirmCreate = () => {
    setShowCreateModal(false);
    navigate('/workflow-editor/new', { 
      state: { 
        name: modalTemplateName,
        sourceTemplateId: modalSourceTemplateId
      } 
    });
  };

  // Append new phase to workflow
  const handleAddPhase = () => {
    if (!selectedTemplate) return;

    const key = `phase_${selectedTemplate.phases.length + 1}`;
    const newPhase: PhaseConfigItem = {
      key,
      label: `New Phase ${selectedTemplate.phases.length + 1}`,
      agent: metadata.available_agents[0] || '',
      tools: [...metadata.available_tools],
      skills: [...metadata.available_skills],
      entry_prompt: null,
      exit_prompt: null,
      branching_strategy: null,
      join_strategy: null
    };

    const updatedPhases = [...selectedTemplate.phases, newPhase];
    const newTemplate = {
      ...selectedTemplate,
      phases: updatedPhases
    };
    
    setSelectedTemplate(newTemplate);
    buildFlowFromPhases(updatedPhases);
    setSelectedNodeId(key);
  };

  // Delete selected phase
  const handleDeletePhase = (key: string) => {
    if (!selectedTemplate) return;
    if (selectedTemplate.phases.length <= 1) {
      alert('A workflow must have at least one phase.');
      return;
    }

    const updatedPhases = selectedTemplate.phases.filter(p => p.key !== key);
    const newTemplate = {
      ...selectedTemplate,
      phases: updatedPhases
    };

    setSelectedTemplate(newTemplate);
    setSelectedNodeId(null);
    buildFlowFromPhases(updatedPhases);
  };

  // Save the workflow template in the database
  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !templateName.trim()) return;
    setSaving(true);
    
    try {
      const payload: WorkflowTemplateCreate = {
        name: templateName,
        phases: selectedTemplate.phases,
        default_agents: selectedTemplate.phases.map(p => p.agent).filter(Boolean)
      };

      let result: WorkflowTemplate;
      if (!selectedTemplate.id) {
        result = await createWorkflowTemplate(payload);
      } else {
        result = await updateWorkflowTemplate(selectedTemplate.id, payload);
      }

      const tmpls = await getWorkflowTemplates();
      setTemplates(tmpls);
      
      const saved = tmpls.find(t => t.name === result.name) || result;
      if (templateId === 'new' && saved.id) {
        navigate(`/workflow-editor/${saved.id}`);
      } else {
        handleSelectTemplate(saved);
      }
      alert('Workflow template saved successfully!');
    } catch (e) {
      console.error('Error saving template:', e);
      alert('Error saving workflow template.');
    } finally {
      setSaving(false);
    }
  };

  // Delete the template from the database
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (!selectedTemplate.id) {
      setSelectedTemplate(null);
      return;
    }

    if (!confirm(`Are you sure you want to delete template "${selectedTemplate.name}"?`)) return;
    
    try {
      await deleteWorkflowTemplate(selectedTemplate.id);
      const tmpls = await getWorkflowTemplates();
      setTemplates(tmpls);
      if (templateId) {
        navigate('/governance?tab=workflows');
      } else {
        setSelectedTemplate(null);
      }
      alert('Template deleted successfully.');
    } catch (e) {
      console.error('Error deleting template:', e);
      alert('Error deleting template.');
    }
  };

  const selectedNode = selectedNodeId 
    ? nodes.find(n => n.id === selectedNodeId) 
    : null;

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
