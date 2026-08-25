import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGovernanceDocs, createGovernanceDoc, updateGovernanceDoc, deleteGovernanceDoc, processGovernanceDoc } from '@/services/governance';
import { getProject } from '@/services/projects';
import type { GovernanceDoc } from '@/services/types';
import type { FileDocument } from '@/app/components/documents/doc-card';

// Os dados falsos que ocupavam este arquivo foram removidos. Eram tres itens
// fixos -- "Zettelkasten Method Guide", "PARA Method Explained", "Research
// Paper - Knowledge Management" -- que alimentavam as abas Generated e
// Imported. O contador delas parecia informacao e nao era.
//
// `Imported` virou `Source documents` e le do backend. `Generated` continua
// sem implementacao, e agora diz isso em vez de mostrar arquivo inventado.
const mockDocuments: FileDocument[] = [];

export function useDocumentsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'generated' | 'imported' | 'governance'>('governance');
  const [project, setProject] = useState<any>(null);

  const [govDocs, setGovDocs] = useState<GovernanceDoc[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<GovernanceDoc | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<{ docId: string; sprints: number; cards: number } | null>(null);

  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<string>('prd');
  const [docContent, setDocContent] = useState('');
  const [docPublicVisible, setDocPublicVisible] = useState(false);

  const fetchDocs = async () => {
    if (!projectId) return;
    try {
      // Filtra no servidor para nao esbarrar no limit=100 do endpoint conforme a base cresce.
      // O filtro local permanece porque a API tambem retorna docs globais (project_id null),
      // que nao pertencem a esta view.
      const all = await getGovernanceDocs(projectId);
      setGovDocs(all.filter((d: any) => d.project_id === projectId));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        await Promise.all([
          getProject(projectId).then(setProject),
          fetchDocs()
        ]);
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  const handleIngest = async (doc: GovernanceDoc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ingestingId) return;
    if (!confirm(`Ingerir "${doc.name}" como Roadmap? Isso criará Sprints e Cards automaticamente.`)) return;
    setIngestingId(doc.id);
    setIngestResult(null);
    try {
      const result = await processGovernanceDoc(doc.id);
      setIngestResult({ docId: doc.id, sprints: result.sprints_created.length, cards: result.cards_created.length });
      setTimeout(() => setIngestResult(null), 6000);
    } catch (err) {
      console.error('Ingest failed:', err);
      alert('Falha ao ingerir o roadmap. Verifique se o documento está no formato correto.');
    } finally {
      setIngestingId(null);
    }
  };

  const downloadTemplate = (type: 'prd' | 'roadmap') => {
    const templates = {
      prd: {
        filename: 'prd-template.md',
        content: `# PRD — [Nome do Produto] (Agent-Centric SSoT)\n\n## 1. Visão Geral (Overview)\nDescreva a proposta de valor, persona e o problema central que o produto resolve.\n\n## 2. Arquitetura Técnica e Stack (Source of Truth)\nListe as tecnologias base (Ex: Next.js 16, Tailwind, Supabase) e padrões de projeto essenciais exigidos para os agentes de desenvolvimento.\n\n## 3. Estrutura de Navegação (Navigation Topology)\nMapeie a topologia geral: Layouts principais, barras de navegação (Top Bar, Bottom Nav) e hierarquia de rotas.\n\n## 4. Detalhamento das Páginas e Rotas\nListe as páginas/rotas de forma exaustiva. Para cada página, defina os componentes React (ex: \`HomeClient.tsx\`, \`HeroSearch.tsx\`) que a compõem e a lógica de UI correspondente.\n\n## 5. System Intents e Inteligência\nComo a IA/Agente se comporta neste sistema? Quais metadados e "intents" o sistema deve emitir para suportar uma interação autônoma?\n\n## 6. Modelagem e Glossário de Dados\nListe as principais tabelas, views e RPCs (PostgreSQL) que compõem a base de dados desta aplicação.\n\n## 7. Requisitos de Segurança e Autenticação\nDescreva regras de RLS (Row Level Security), métodos de login (Ex: Magic Link, OTP) e controle de acesso.\n\n## 8. Gaps Conhecidos e Fora de Escopo\nO que explicitamente NÃO será construído nesta iteração.\n`,
      },
      roadmap: {
        filename: 'roadmap-template.md',
        content: `# Roadmap — [Nome do Projeto]\n\n## Sprint 1.0: [Título da Sprint]\n**Objetivo:** Descreva o objetivo principal desta sprint.\n### Cards\n- Card 1\n- Card 2\n- Card 3\n\n## Sprint 1.1: [Título da Sprint]\n**Objetivo:** Descreva o objetivo principal desta sprint.\n### Cards\n- Card 1\n- Card 2\n\n## Sprint 2.0: [Título da Sprint]\n**Objetivo:** Descreva o objetivo principal desta sprint.\n### Cards\n- Card 1\n- Card 2\n- Card 3\n`,
      },
    };

    const { filename, content } = templates[type];
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setEditingId(null);
    setDocName(''); setDocType('prd'); setDocContent(''); setDocPublicVisible(false);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (item: GovernanceDoc) => {
    setEditingId(item.id);
    setDocName(item.name); setDocType(item.type); setDocContent(item.content);
    setDocPublicVisible(!!item.public_visible);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const data = { name: docName, type: docType as any, scope: 'project' as any, project_id: projectId, content: docContent, public_visible: docPublicVisible };
      editingId ? await updateGovernanceDoc(editingId, data) : await createGovernanceDoc(data);
      setModalOpen(false); resetForm(); fetchDocs();
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try { await deleteGovernanceDoc(id); fetchDocs(); } catch (e) { console.error(e); }
  };

  const filteredDocuments = mockDocuments.filter(doc => doc.type === activeTab);

  return {
    projectId,
    navigate,
    activeTab,
    setActiveTab,
    project,
    govDocs,
    modalOpen,
    setModalOpen,
    isSaving,
    editingId,
    viewModalOpen,
    setViewModalOpen,
    viewDoc,
    setViewDoc,
    importModalOpen,
    setImportModalOpen,
    isLoading,
    ingestingId,
    ingestResult,
    docName,
    setDocName,
    docType,
    setDocType,
    docContent,
    setDocContent,
    docPublicVisible,
    setDocPublicVisible,
    fetchDocs,
    handleIngest,
    downloadTemplate,
    resetForm,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    filteredDocuments,
    mockDocuments
  };
}
