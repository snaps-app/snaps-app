import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import {
  createWorkflowTemplate,
  deleteWorkflowTemplate,
  getWorkflowTemplates,
  getWorkflowTemplatesMetadata,
  updateWorkflowTemplate
} from '@/services/workflowTemplates';
import { VersionConflictError } from '@/services/versionedWrite';
import type { WorkflowTemplate, PhaseConfigItem, WorkflowTemplateCreate } from '@/services/types';

export function useWorkflowEditor() {
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  // A versao do template como o editor o CARREGOU do servidor.
  //
  // Estado separado, e nao `selectedTemplate.lock_version`, porque
  // `selectedTemplate` e reescrito a cada arrasto de fase e a cada edicao de
  // no. Deixar a versao viajar junto com o rascunho e como acabaria sendo
  // sobrescrita por um objeto montado na tela. Esta so muda quando o servidor
  // devolve estado novo: no load e depois de um save bem-sucedido.
  const [baseLockVersion, setBaseLockVersion] = useState<number | undefined>(undefined);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTemplateName, setModalTemplateName] = useState('');
  const [modalSourceTemplateId, setModalSourceTemplateId] = useState('scratch');

  const buildFlowFromPhases = (phases: PhaseConfigItem[]) => {
    const newNodes = phases.map((phase, index) => {
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
            updated_at: new Date().toISOString(),
            // Rascunho ainda nao gravado (`id: ''`): nasce na versao 1, como
            // qualquer registro novo. Nao ha base com que conflitar ate o
            // primeiro POST.
            lock_version: 1
          };
          setSelectedTemplate(newTemplate);
          setTemplateName(newTemplate.name);
          setSelectedNodeId(null);
          // Rascunho nao gravado: nao ha base no servidor com que conflitar.
          setBaseLockVersion(undefined);

          buildFlowFromPhases(initialPhases);
        } else {
          const matched = tmpls.find(t => t.id === templateId);
          if (matched) {
            setSelectedTemplate(matched);
            setTemplateName(matched.name);
            setSelectedNodeId(null);
            setBaseLockVersion(matched.lock_version);
            
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
        setBaseLockVersion(undefined);
      }
    } catch (e) {
      console.error('Failed to load workflow data: ' + e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadataAndTemplates();
  }, [templateId]);

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setSelectedNodeId(null);
    // So aqui e no load a versao base se move: os dois pontos em que o objeto
    // vem do servidor. Qualquer outra reatribuicao seria um rascunho local.
    setBaseLockVersion(template.lock_version);
    setSaveError(null);
    buildFlowFromPhases(template.phases);
  };

  const handleNodeClick = (_event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
  };

  const handleNodeDragStop = (_event: React.MouseEvent, node: any) => {
    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, position: node.position } : n));
  };

  const handleUpdateNodeData = (updatedPhase: PhaseConfigItem) => {
    if (!selectedTemplate) return;
    
    const index = selectedTemplate.phases.findIndex(p => p.key === selectedNodeId);
    if (index === -1) return;

    const updatedPhases = [...selectedTemplate.phases];
    updatedPhases[index] = updatedPhase;

    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          id: updatedPhase.key,
          data: {
            ...updatedPhase,
          }
        };
      }
      return n;
    }));

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

  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !templateName.trim()) return;
    setSaving(true);
    setSaveError(null);

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
        result = await updateWorkflowTemplate(
          selectedTemplate.id, payload, baseLockVersion);
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
      // O rascunho NAO e descartado aqui: `selectedTemplate` e `nodes` seguem
      // como estao. Num conflito, o trabalho da pessoa e a unica copia da
      // alteracao dela — recarregar por baixo seria apagar exatamente o que a
      // recusa existe para proteger.
      setSaveError(
        e instanceof VersionConflictError
          ? `${e.message} Suas alteracoes continuam nesta tela: abra o template `
            + `atual em outra aba, reaplique-as e salve de novo.`
          : 'Nao foi possivel salvar o workflow template. Tente de novo.'
      );
    } finally {
      setSaving(false);
    }
  };

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

  return {
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
    saveError,
    baseLockVersion,
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
  };
}
