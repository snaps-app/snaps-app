import { ArrowLeft, FileText, Download, File, Plus, Upload, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { PrdImportModal } from '@/app/components/modals/prd-import-modal';
import { Spinner } from '@/app/components/ui/spinner';

import { DocEditorModal } from '@/app/components/documents/doc-editor-modal';
import { DocViewerModal } from '@/app/components/documents/doc-viewer-modal';
import { DocCard } from '@/app/components/documents/doc-card';
import { useDocumentsView } from '@/app/components/views/useDocumentsView';
import { SourceDocumentsTab } from '@/app/components/documents/source-documents-tab';
import { listSourceDocuments } from '@/services/sourceDocuments';
import { useIngestQueue } from '@/app/ingest/ingestQueue';
import { ImportDestinationModal } from '@/app/components/modals/import-destination-modal';
import { SourceImportModal } from '@/app/components/modals/source-import-modal';
import { useEffect, useState } from 'react';
import type { DestinoImportacao } from '@/app/components/modals/import-destination-modal';

export function DocumentsView() {
  const {
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
  } = useDocumentsView();

  // Qual passo da importacao esta aberto. `destino` e a pergunta; os dois
  // valores seguintes sao os fluxos que ela despacha.
  const [perguntandoDestino, setPerguntandoDestino] = useState(false);
  const [importandoSource, setImportandoSource] = useState(false);
  // Muda a cada importacao concluida, so para a aba recarregar a lista.
  const [recarga, setRecarga] = useState(0);

  // A fila importa em segundo plano; `versao` muda a cada material que passa a
  // existir no servidor. E o que faz a lista se atualizar sozinha enquanto os
  // outros ainda sobem -- sem isto o usuario teria de recarregar a pagina para
  // ver o que ja chegou.
  const { versao } = useIngestQueue();

  // A badge da aba. `null` = ainda nao sei (ou a busca falhou), e nesse caso
  // ela nao aparece -- zero e uma afirmacao, e mostrar "0" ao lado de tres
  // materiais reais e o mesmo defeito dos dados falsos que sairam daqui.
  // A busca vive aqui, e nao so na aba, porque a aba inicial e Governance: sem
  // isto o numero so ficaria certo depois de alguem clicar em Source documents.
  const [qtdSource, setQtdSource] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let vivo = true;
    listSourceDocuments(projectId)
      .then((l) => vivo && setQtdSource(l.length))
      .catch(() => vivo && setQtdSource(null));
    return () => { vivo = false; };
  }, [projectId, recarga, versao]);

  const escolherDestino = (d: DestinoImportacao) => {
    setPerguntandoDestino(false);
    if (d === 'governance') setImportModalOpen(true);
    else setImportandoSource(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
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
                Source documents
                <span
                  className="ml-2 px-2 py-0.5 rounded text-xs"
                  style={{
                    background: activeTab === 'imported'
                      ? 'rgba(168, 85, 247, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {qtdSource ?? '—'}
                </span>
              </motion.button>
            </motion.div>

            <AnimatePresence>
              {(activeTab === 'governance' || activeTab === 'imported') && (
                <div className="flex items-center gap-2">
                  <div className="relative group" style={{ display: activeTab === 'governance' ? undefined : 'none' }}>
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
                    onClick={() => setPerguntandoDestino(true)}
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
                    style={{ display: activeTab === 'governance' ? undefined : 'none' }}
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
              className={activeTab === 'imported' ? 'flex flex-col gap-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'imported' && projectId ? (
                <SourceDocumentsTab
                  key={`${recarga}-${versao}`}
                  projectId={projectId}
                  onAbrir={(d) => navigate(`/project/${projectId}/documents/${d.id}`)}
                  onContagem={setQtdSource}
                />
              ) : activeTab === 'governance'
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
                  ))}
            </motion.div>
          </AnimatePresence>

          {/* Empty State */}
          {((activeTab === 'generated' && filteredDocuments.length === 0) || (activeTab === 'governance' && govDocs.length === 0)) && (
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
                {/* A aba `imported` cuida do proprio vazio: ela sabe distinguir
                    "nao ha material" de "a chamada falhou", e as duas coisas
                    precisam de telas diferentes. */}
                {activeTab === 'generated'
                  ? 'Geração de documentos ainda não foi construída.'
                  : 'Create a PRD or Strategy context for your project'}
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
        publicVisible={docPublicVisible}
        setPublicVisible={setDocPublicVisible}
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

      {/* Para onde vai o arquivo. O "Importar" tinha um destino so, e por isso
          quem tentava trazer uma aula por aqui nao chegava a lugar nenhum. */}
      <AnimatePresence>
        {perguntandoDestino && (
          <ImportDestinationModal
            onEscolher={escolherDestino}
            onClose={() => setPerguntandoDestino(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importandoSource && projectId && (
          <SourceImportModal
            projectId={projectId}
            onClose={() => {
              setImportandoSource(false);
              // A aba muda porque e onde os materiais vao aparecer -- um por
              // um, conforme a fila anda.
              setActiveTab('imported');
            }}
          />
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
