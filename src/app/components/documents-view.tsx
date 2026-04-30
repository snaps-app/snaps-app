import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Trash2, Eye, File, FileSpreadsheet, Image as ImageIcon, Clock, HardDrive, Plus, Edit2, X, Upload, Map, Copy, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from './neural-background';
import { useParams, useNavigate } from 'react-router-dom';
import api, { GovernanceDoc } from '@/services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrdImportModal } from './prd-import-modal';
import { Spinner } from './ui/spinner';

interface Document {
  id: string;
  name: string;
  type: 'generated' | 'imported';
  format: 'md' | 'docx' | 'pdf' | 'txt' | 'xlsx' | 'png' | 'jpg';
  size: string;
  date: string;
  thumbnail?: string;
}

const mockDocuments: Document[] = [
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

const formatIcons = {
  md: FileText,
  docx: FileText,
  pdf: FileText,
  txt: FileText,
  xlsx: FileSpreadsheet,
  png: ImageIcon,
  jpg: ImageIcon
};

const formatColors = {
  md: { bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)', color: '#00D4FF' },
  docx: { bg: 'rgba(0, 112, 192, 0.1)', border: 'rgba(0, 112, 192, 0.3)', color: '#0070C0' },
  pdf: { bg: 'rgba(255, 59, 48, 0.1)', border: 'rgba(255, 59, 48, 0.3)', color: '#FF3B30' },
  txt: { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' },
  xlsx: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', color: '#22C55E' },
  png: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', color: '#A855F7' },
  jpg: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', color: '#A855F7' }
};

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

  const downloadTemplate = (type: 'prd' | 'roadmap') => {
    const templates = {
      prd: {
        filename: 'prd-template.md',
        content: `# PRD — [Nome do Produto]

## 1. Visão do Produto
Descreva a proposta de valor e o problema que o produto resolve.

## 2. Objetivos
- Objetivo 1
- Objetivo 2

## 3. Requisitos Funcionais
### 3.1 [Módulo]
- RF-01: Descrição do requisito
- RF-02: Descrição do requisito

## 4. Requisitos Não Funcionais
- RNF-01: Performance — tempo de resposta < 2s
- RNF-02: Segurança — autenticação JWT

## 5. Fora de Escopo
- Item fora de escopo 1

## 6. Critérios de Sucesso
- Métrica 1
- Métrica 2
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

  // Form state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<string>('prd');
  const [docContent, setDocContent] = useState('');

  const fetchDocs = async () => {
    try {
      const all = await api.getGovernanceDocs();
      setGovDocs(all.filter((d: any) => d.project_id === projectId));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        await Promise.all([
          api.getProject(projectId).then(setProject),
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
      editingId ? await api.updateGovernanceDoc(editingId, data) : await api.createGovernanceDoc(data);
      setModalOpen(false); resetForm(); fetchDocs();
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try { await api.deleteGovernanceDoc(id); fetchDocs(); } catch (e) { console.error(e); }
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
              {activeTab === 'governance' ? govDocs.map((doc, index) => {
                const colors = { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', color: '#22C55E' };
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="relative rounded-xl backdrop-blur-xl overflow-hidden cursor-pointer group"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div className="flex items-center justify-center h-32 relative" style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                      <FileText className="w-16 h-16" style={{ color: colors.color }} />
                      <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold uppercase" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}>
                        {doc.type}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 truncate" style={{ color: 'var(--snaps-text-primary)' }}>{doc.name}</h3>
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="flex items-center gap-1" style={{ color: 'var(--snaps-text-secondary)' }}><HardDrive className="w-3 h-3" />MD</span>
                        <span className="flex items-center gap-1" style={{ color: 'var(--snaps-text-secondary)' }}><Clock className="w-3 h-3" />{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button onClick={(e) => { e.stopPropagation(); setViewDoc(doc); setViewModalOpen(true); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all" style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', color: 'var(--snaps-accent-blue)' }}>
                          <Eye className="w-3 h-3" /> View
                        </motion.button>
                        <motion.button onClick={(e) => { e.stopPropagation(); openEdit(doc); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--snaps-accent-green)' }}>
                          <Edit2 className="w-3 h-3" />
                        </motion.button>
                        <motion.button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#FF3B30' }}>
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              }) : filteredDocuments.map((doc, index) => {
                const Icon = formatIcons[doc.format];
                const colors = formatColors[doc.format];

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="relative rounded-xl backdrop-blur-xl overflow-hidden cursor-pointer group"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* File Icon Area */}
                    <div
                      className="flex items-center justify-center h-32 relative"
                      style={{
                        background: colors.bg,
                        borderBottom: `1px solid ${colors.border}`
                      }}
                    >
                      <Icon className="w-16 h-16" style={{ color: colors.color }} />

                      {/* Format Badge */}
                      <div
                        className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold uppercase"
                        style={{
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.color
                        }}
                      >
                        .{doc.format}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-4">
                      <h3
                        className="font-semibold mb-2 truncate"
                        style={{ color: 'var(--snaps-text-primary)' }}
                      >
                        {doc.name}
                      </h3>

                      <div className="flex items-center justify-between text-xs mb-3">
                        <span
                          className="flex items-center gap-1"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          <HardDrive className="w-3 h-3" />
                          {doc.size}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          <Clock className="w-3 h-3" />
                          {doc.date}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                          style={{
                            background: 'rgba(0, 212, 255, 0.1)',
                            border: '1px solid rgba(0, 212, 255, 0.3)',
                            color: 'var(--snaps-accent-blue)'
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: 'var(--snaps-accent-green)'
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: 'rgba(255, 59, 48, 0.1)',
                            border: '1px solid rgba(255, 59, 48, 0.3)',
                            color: '#FF3B30'
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at center, ${colors.color}10, transparent 70%)`,
                        boxShadow: `inset 0 0 20px ${colors.color}20`
                      }}
                    />
                  </motion.div>
                );
              })}
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
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Document' : 'New Document'}</h2>
                <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input value={docName} onChange={e => setDocName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500" placeholder="e.g. Sprint 1 PRD" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500">
                    <option value="prd">PRD</option>
                    <option value="context">Context</option>
                    <option value="playbook">Playbook</option>
                    <option value="strategy">Strategy</option>
                    <option value="roadmap">Roadmap</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Content (Markdown)</label>
                  <textarea value={docContent} onChange={e => setDocContent(e.target.value)} className="w-full h-64 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500 resize-none font-mono text-sm" placeholder="# Overview&#10;..." />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                <button onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!docName.trim() || !docContent.trim() || isSaving}
                  className="px-6 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all">
                  {isSaving && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewModalOpen && viewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-green-500/10">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/50">
                <div>
                  <h2 className="text-2xl font-bold text-white">{viewDoc.name}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider font-bold bg-green-500/10 border-green-500/20 text-green-400">{viewDoc.type}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider bg-white/5 border-white/10 text-gray-400">project</span>
                  </div>
                </div>
                <button onClick={() => setViewModalOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-black/40">
                <div className="prose prose-invert prose-green max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    blockquote: ({ children }) => {
                      const textContent = React.Children.toArray(children)
                        .map((child: any) => {
                          if (typeof child === 'string') return child;
                          if (child?.props?.children) {
                            const nested = React.Children.toArray(child.props.children);
                            return nested.map((n: any) => (typeof n === 'string' ? n : n?.props?.children || '')).join('');
                          }
                          return '';
                        })
                        .join('')
                        .trim();
                      const [copied, setCopied] = React.useState(false);
                      return (
                        <blockquote className="relative group">
                          {children}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(textContent);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/15 hover:border-white/20"
                            title="Copiar texto"
                          >
                            {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        </blockquote>
                      );
                    },
                    code: ({ className, children, ...props }) => {
                      const isBlock = className?.includes('language-');
                      if (!isBlock) return <code className={className} {...props}>{children}</code>;
                      const textContent = String(children).replace(/\n$/, '');
                      const [copied, setCopied] = React.useState(false);
                      return (
                        <div className="relative group">
                          <code className={className} {...props}>{children}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(textContent);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
                            title="Copiar código"
                          >
                            {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        </div>
                      );
                    }
                  }}>
                    {viewDoc.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
