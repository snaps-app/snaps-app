import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  Position, 
  Handle,
  MarkerType,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Bot, 
  Wrench, 
  Shield, 
  GitBranch, 
  GitMerge, 
  Settings, 
  Trash2, 
  Plus, 
  Save, 
  FolderKanban, 
  FileCode, 
  Sparkles, 
  Play, 
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import apiService, { 
  WorkflowTemplate, 
  PhaseConfigItem, 
  WorkflowTemplateCreate 
} from '@/services/api';

// Custom Node Component representing a Phase in the pipeline
const CustomPhaseNode = ({ data, selected }: any) => {
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
          {isBranching && <GitBranch className="w-3.5 h-3.5 text-blue-400" title={`Branch: ${data.branching_strategy}`} />}
          {isJoining && <GitMerge className="w-3.5 h-3.5 text-purple-400" title={`Join: ${data.join_strategy}`} />}
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
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
        apiService.getWorkflowTemplatesMetadata(),
        apiService.getWorkflowTemplates()
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
              const isJoin = target.join_strategy && target.join_strategy !== 'None' && target.join_strategy !== '';

              newEdges.push({
                id: `edge-${source.key}-${target.key}`,
                source: source.key,
                target: target.key,
                animated: isBranch || isJoin,
                style: {
                  stroke: isBranch ? '#3b82f6' : isJoin ? '#a855f7' : '#ffffff20',
                  strokeWidth: 2,
                  strokeDasharray: (isBranch || isJoin) ? '5, 5' : undefined,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: isBranch ? '#3b82f6' : isJoin ? '#a855f7' : '#555555',
                },
              });
            }
            setNodes(newNodes);
            setEdges(newEdges);
          } else {
            setSelectedTemplate(null);
          }
        }
      } else {
        setSelectedTemplate(null);
      }
    } catch (e) {
      console.error('Error loading workflow engine metadata/templates:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setSelectedNodeId(null);
    buildFlowFromPhases(template.phases);
  };

  const buildFlowFromPhases = (phases: PhaseConfigItem[]) => {
    const newNodes = phases.map((phase, index) => ({
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
    for (let i = 0; i < phases.length - 1; i++) {
      const source = phases[i];
      const target = phases[i + 1];
      const isBranch = source.branching_strategy && source.branching_strategy !== 'None' && source.branching_strategy !== '';
      const isJoin = target.join_strategy && target.join_strategy !== 'None' && target.join_strategy !== '';

      newEdges.push({
        id: `edge-${source.key}-${target.key}`,
        source: source.key,
        target: target.key,
        animated: isBranch || isJoin,
        style: {
          stroke: isBranch ? '#3b82f6' : isJoin ? '#a855f7' : '#ffffff20',
          strokeWidth: 2,
          strokeDasharray: (isBranch || isJoin) ? '5, 5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isBranch ? '#3b82f6' : isJoin ? '#a855f7' : '#555555',
        },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Sync back React Flow state changes into the active template phases sequence
  const syncPhasesFromNodes = (updatedNodes: Node[]) => {
    if (!selectedTemplate) return;
    
    // Sort nodes horizontally to determine sequence order
    const sortedNodes = [...updatedNodes].sort((a, b) => a.position.x - b.position.x);
    const updatedPhases = sortedNodes.map(node => node.data as PhaseConfigItem);

    const newTemplate = {
      ...selectedTemplate,
      phases: updatedPhases
    };
    setSelectedTemplate(newTemplate);
    buildFlowFromPhases(updatedPhases);
  };

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id);
  };

  // Node drawer details updates
  const handleUpdateNodeData = (updatedPhase: PhaseConfigItem) => {
    const updatedNodes = nodes.map(node => {
      if (node.id === selectedNodeId) {
        // If the key changed, we update node ID too
        const isKeyChanged = updatedPhase.key !== node.id;
        return {
          ...node,
          id: updatedPhase.key,
          data: updatedPhase
        };
      }
      return node;
    });

    if (updatedPhase.key !== selectedNodeId) {
      setSelectedNodeId(updatedPhase.key);
    }
    
    syncPhasesFromNodes(updatedNodes);
  };

  // Drag stop handler - visually reorder nodes based on horizontal position
  const handleNodeDragStop = () => {
    syncPhasesFromNodes(nodes);
  };

  // Open the modal for creating a template
  const openCreateModal = () => {
    setModalTemplateName('');
    setModalSourceTemplateId('scratch');
    setShowCreateModal(true);
  };

  // Confirm creation from modal settings (name + source template clone or scratch)
  const handleConfirmCreate = async () => {
    if (!modalTemplateName.trim()) return;
    setShowCreateModal(false);
    setLoading(true);

    const stateName = modalTemplateName;
    const sourceId = modalSourceTemplateId;

    try {
      let initialPhases: PhaseConfigItem[] = [];
      if (sourceId !== 'scratch') {
        const sourceTmpl = templates.find(t => t.id === sourceId);
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
            agent: metadata.available_agents[0] || '',
            tools: metadata.available_tools ? [...metadata.available_tools] : [],
            skills: metadata.available_skills ? [...metadata.available_skills] : [],
            entry_prompt: null,
            exit_prompt: null,
            branching_strategy: null,
            join_strategy: null
          }
        ];
      }

      const payload: WorkflowTemplateCreate = {
        name: stateName,
        phases: initialPhases,
        default_agents: initialPhases.map(p => p.agent).filter(Boolean)
      };

      const result = await apiService.createWorkflowTemplate(payload);

      // Refresh list
      const tmpls = await apiService.getWorkflowTemplates();
      setTemplates(tmpls);

      // Navigate to the newly created template's edit view
      navigate(`/workflow-editor/${result.id}`);
    } catch (e) {
      console.error('Error creating template:', e);
      alert('Error creating workflow template.');
    } finally {
      setLoading(false);
    }
  };

  // Add a new phase to the template
  const handleAddPhase = () => {
    if (!selectedTemplate) return;
    
    const key = `phase_${selectedTemplate.phases.length + 1}`;
    const newPhase: PhaseConfigItem = {
      key,
      label: `New Phase ${selectedTemplate.phases.length + 1}`,
      agent: metadata.available_agents[0] || '',
      // All selected by default
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
        // Create new
        result = await apiService.createWorkflowTemplate(payload);
      } else {
        // Update existing
        result = await apiService.updateWorkflowTemplate(selectedTemplate.id, payload);
      }

      // Refresh list
      const tmpls = await apiService.getWorkflowTemplates();
      setTemplates(tmpls);
      
      // Select saved template
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
      await apiService.deleteWorkflowTemplate(selectedTemplate.id);
      const tmpls = await apiService.getWorkflowTemplates();
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/governance?tab=workflows')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-black/40 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 text-gray-300 hover:text-purple-300 transition-all duration-300 cursor-pointer mr-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] animate-fade-in"
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
                  className="bg-transparent text-white font-bold text-lg focus:outline-none border-b border-transparent focus:border-purple-500/50 transition-all w-60"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Template Selector Dropdown */}
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
                  <PropertiesDrawer 
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
          
          {/* Custom style overrides for React Flow controls and interactive MiniMap */}
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
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                  New Workflow Template
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">Template Name</label>
                  <input
                    type="text"
                    value={modalTemplateName}
                    onChange={(e) => setModalTemplateName(e.target.value)}
                    placeholder="e.g. Custom SDLC Pipeline"
                    className="w-full bg-black/45 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 text-sm"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">Start From</label>
                  <select
                    value={modalSourceTemplateId}
                    onChange={(e) => setModalSourceTemplateId(e.target.value)}
                    className="w-full bg-black/45 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                  >
                    <option value="scratch">Scratch (Empty template)</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        Clone: {t.name} ({t.phases.length} {t.phases.length === 1 ? 'phase' : 'phases'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/25">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCreate}
                  disabled={!modalTemplateName.trim()}
                  className="px-6 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs cursor-pointer"
                >
                  Create Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Drawer components for phase inputs
interface PropertiesDrawerProps {
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

function PropertiesDrawer({ phase, metadata, allPhases, onUpdate, onDelete }: PropertiesDrawerProps) {
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
    <div className="space-y-4">
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
        <label className="text-[10px] font-black uppercase text-white/40 tracking-wider flex items-center justify-between">
          <span>Advance Conditions</span>
        </label>
        
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
