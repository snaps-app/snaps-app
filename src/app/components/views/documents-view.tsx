import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, File, Plus, Upload, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { useParams, useNavigate } from 'react-router-dom';
import { getGovernanceDocs, createGovernanceDoc, updateGovernanceDoc, deleteGovernanceDoc, processGovernanceDoc } from '@/services/governance';
import { getProject } from '@/services/projects';
import type { GovernanceDoc } from '@/services/types';
import { PrdImportModal } from '@/app/components/modals/prd-import-modal';
import { Spinner } from '@/app/components/ui/spinner';

import { DocEditorModal } from '@/app/components/documents/doc-editor-modal';
import { DocViewerModal } from '@/app/components/documents/doc-viewer-modal';
import { DocCard, FileDocument } from '@/app/components/documents/doc-card';

const mockDocuments: FileDocument[] = [
  {
    id: '1',
    name: 'Zettelkasten Method Guide',
    type: 'generated',
    format: 'md',
    size: '24 KB',
    date: '2h ago'
  },
  {
    id: '2',
    name: 'Second Brain Framework Overview',
    type: 'generated',
    format: 'pdf',
    size: '156 KB',
    date: '5h ago'
  },
  {
    id: '3',
    name: 'PARA Method Explained',
    type: 'generated',
    format: 'docx',
    size: '48 KB',
    date: '1d ago'
  },
  {
    id: '4',
    name: 'Research Paper - Knowledge Management',
    type: 'imported',
    format: 'pdf',
    size: '2.4 MB',
    date: '2d ago'
  },
  {
    id: '5',
    name: 'Meeting Notes 2024',
    type: 'imported',
    format: 'txt',
    size: '12 KB',
    date: '3d ago'
  },
  {
    id: '6',
    name: 'Project Roadmap',
    type: 'imported',
    format: 'xlsx',
    size: '86 KB',
    date: '4d ago'
  }
];

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'generated' | 'imported' | 'governance'>('governance');
  const [project, setProject] = useState<any>(null);

  // Governance State
  const [govDocs, setGovDocs] = useState<GovernanceDoc[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<GovernanceDoc | null>(null);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Bridge Ingest state
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<{ docId: string; sprints: number; cards: number } | null>(null);

  // Form state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<string>('prd');
  const [docContent, setDocContent] = useState('');

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
        content: `# PRD — [Nome do Produto] (Agent-Centric SSoT)

## 1. Visão Geral (Overview)
Descreva a proposta de valor, persona e o problema central que o produto resolve.

## 2. Arquitetura Técnica e Stack (Source of Truth)
Liste as tecnologias base (Ex: Next.js 16, Tailwind, Supabase) e padrões de projeto essenciais exigidos para os agentes de desenvolvimento.

## 3. Estrutura de Navegação (Navigation Topology)
Mapeie a topologia geral: Layouts principais, barras de navegação (Top Bar, Bottom Nav) e hierarquia de rotas.

## 4. Detalhamento das Páginas e Rotas
Liste as páginas/rotas de forma exaustiva. Para cada página, defina os componentes React (ex: \`HomeClient.tsx\`, \`HeroSearch.tsx\`) que a compõem e a lógica de UI correspondente.

## 5. System Intents e Inteligência
Como a IA/Agente se comporta neste sistema? Quais metadados e "intents" o sistema deve emitir para suportar uma interação autônoma?

## 6. Modelagem e Glossário de Dados
Liste as principais tabelas, views e RPCs (PostgreSQL) que compõem a base de dados desta aplicação.

## 7. Requisitos de Segurança e Autenticação
Descreva regras de RLS (Row Level Security), métodos de login (Ex: Magic Link, OTP) e controle de acesso.

## 8. Gaps Conhecidos e Fora de Escopo
O que explicitamente NÃO será construído nesta iteração.
`,
      },
      roadmap: {
        filename: 'roadmap-template.md',
        content: `# Roadmap — [Nome do Projeto]

## Sprint 1.0: [Título da Sprint]
**Objetivo:** Descreva o objetivo principal desta sprint.
### Cards
- Card 1
- Card 2
- Card 3

## Sprint 1.1: [Título da Sprint]
**Objetivo:** Descreva o objetivo principal desta sprint.
### Cards
- Card 1
- Card 2

## Sprint 2.0: [Título da Sprint]
**Objetivo:** Descreva o objetivo principal desta sprint.
### Cards
- Card 1
- Card 2
- Card 3
`,
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

  const fetchDocs = async () => {
    try {
      const all = await getGovernanceDocs();
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

  const resetForm = () => {
    setEditingId(null);
    setDocName(''); setDocType('prd'); setDocContent('');
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (item: GovernanceDoc) => {
    setEditingId(item.id);
    setDocName(item.name); setDocType(item.type); setDocContent(item.content);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const data = { name: docName, type: docType as any, scope: 'project' as any, project_id: projectId, content: docContent };
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

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            <Spinner size="lg" label="Loading documents..." color="green" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate(`/project/${projectId}`)}
        className="fixed top-6 left-6 z-20 w-10 h-10 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
        style={{
          background: 'rgba(255, 107, 53, 0.1)',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)'
        }}
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-accent-orange)' }} />
      </motion.button>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <motion.h1
              className="text-4xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Documents
            </motion.h1>
            <motion.p
              className="text-sm"
              style={{ color: 'var(--snaps-text-secondary)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Browse and manage documents for {project?.name || 'your project'}
            </motion.p>
          </div>

          {/* Tabs */}
          <div className="flex justify-between items-center mb-6">
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                onClick={() => setActiveTab('governance')}
                className="relative px-6 py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: activeTab === 'governance' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: activeTab === 'governance' ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'governance' ? 'var(--snaps-accent-green)' : 'var(--snaps-text-secondary)',
                  boxShadow: activeTab === 'governance' ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Strategy & PRDs
                <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: activeTab === 'governance' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)' }}>
                  {govDocs.length}
                </span>
              </motion.button>

              <motion.button
                onClick={() => setActiveTab('generated')}
                className="relative px-6 py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: activeTab === 'generated'
                    ? 'rgba(0, 212, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: activeTab === 'generated'
                    ? '1px solid rgba(0, 212, 255, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'generated'
                    ? 'var(--snaps-accent-blue)'
                    : 'var(--snaps-text-secondary)',
                  boxShadow: activeTab === 'generated'
                    ? '0 0 20px rgba(0, 212, 255, 0.3)'
                    : 'none'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Generated Documents
                <span
                  className="ml-2 px-2 py-0.5 rounded text-xs"
                  style={{
                    background: activeTab === 'generated'
                      ? 'rgba(0, 212, 255, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {mockDocuments.filter(d => d.type === 'generated').length}
                </span>
              </motion.button>

              <motion.button
                onClick={() => setActiveTab('imported')}
                className="relative px-6 py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: activeTab === 'imported'
                    ? 'rgba(168, 85, 247, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: activeTab === 'imported'
                    ? '1px solid rgba(168, 85, 247, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'imported'
                    ? 'var(--snaps-accent-purple)'
                    : 'var(--snaps-text-secondary)',
                  boxShadow: activeTab === 'imported'
                    ? '0 0 20px rgba(168, 85, 247, 0.3)'
                    : 'none'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Imported Documents
                <span
                  className="ml-2 px-2 py-0.5 rounded text-xs"
                  style={{
                    background: activeTab === 'imported'
                      ? 'rgba(168, 85, 247, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {mockDocuments.filter(d => d.type === 'imported').length}
                </span>
              </motion.button>
            </motion.div>

            <AnimatePresence>
              {activeTab === 'governance' && (
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Template
                    </motion.button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-10 hidden group-hover:block">
                      <button onClick={() => downloadTemplate('prd')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" /> prd-template.md
                      </button>
                      <button onClick={() => downloadTemplate('roadmap')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                        <Map className="w-4 h-4 text-violet-400" /> roadmap-template.md
                      </button>
                    </div>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setImportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 font-bold hover:bg-violet-500/20 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Importar
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300 font-bold hover:from-green-500/30 hover:to-emerald-500/30 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    New Doc
                  </motion.button>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Documents Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'governance'
                ? govDocs.map((doc, index) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      index={index}
                      onView={() => { setViewDoc(doc); setViewModalOpen(true); }}
                      onEdit={() => openEdit(doc)}
                      onDelete={() => handleDelete(doc.id)}
                      onIngest={(e) => handleIngest(doc, e)}
                      ingestingId={ingestingId}
                      ingestResult={ingestResult}
                    />
                  ))
                : filteredDocuments.map((fileDoc, index) => (
                    <DocCard
                      key={fileDoc.id}
                      fileDoc={fileDoc}
                      index={index}
                      onView={() => {}}
                      onDelete={() => {}}
                    />
                  ))
              }
            </motion.div>
          </AnimatePresence>

          {/* Empty State */}
          {((activeTab !== 'governance' && filteredDocuments.length === 0) || (activeTab === 'governance' && govDocs.length === 0)) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <File className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--snaps-text-secondary)', opacity: 0.5 }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--snaps-text-primary)' }}>
                No documents yet
              </h3>
              <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                {activeTab === 'generated' ? 'Generate your first document to get started' : activeTab === 'imported' ? 'Import documents to see them here' : 'Create a PRD or Strategy context for your project'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* CRUD Modal */}
      <DocEditorModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        editingId={editingId}
        docName={docName}
        setDocName={setDocName}
        docType={docType}
        setDocType={setDocType}
        docContent={docContent}
        setDocContent={setDocContent}
        isSaving={isSaving}
        onSave={handleSave}
      />

      {/* View Modal */}
      <DocViewerModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        viewDoc={viewDoc}
        onEdit={() => {
          if (viewDoc) {
            setViewModalOpen(false);
            openEdit(viewDoc);
          }
        }}
      />

      {/* PRD / Roadmap Import Modal */}
      <AnimatePresence>
        {importModalOpen && projectId && (
          <PrdImportModal
            projectId={projectId}
            onClose={() => { setImportModalOpen(false); fetchDocs(); }}
            onImported={() => { setImportModalOpen(false); fetchDocs(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
