import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Loader2, FileText, Map, File } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api, { BridgeProcessResult } from '@/services/api';

type DocType = 'prd' | 'roadmap';

interface Props {
  projectId: string;
  onClose: () => void;
  onImported?: (result: { type: DocType; docId: string; bridgeResult?: BridgeProcessResult }) => void;
}

type Step = 'form' | 'processing' | 'success' | 'error';

const TYPE_CONFIG: Record<DocType, { label: string; icon: React.ElementType; description: string; color: string }> = {
  prd: {
    label: 'PRD',
    icon: FileText,
    description: 'Product Requirements Document — salvo como fonte de verdade do projeto.',
    color: 'blue',
  },
  roadmap: {
    label: 'Roadmap',
    icon: Map,
    description: 'Roadmap estratégico — o Bridge Architect criará Sprints e Cards automaticamente.',
    color: 'violet',
  },
};

export function PrdImportModal({ projectId, onClose, onImported }: Props) {
  const [docType, setDocType] = useState<DocType>('prd');
  const [docName, setDocName] = useState('');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<BridgeProcessResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = TYPE_CONFIG[docType];
  const Icon = config.icon;

  const readFile = useCallback((file: File) => {
    if (!file.name.endsWith('.md')) {
      setError('Apenas arquivos .md são aceitos.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      setFileName(file.name);
      // Auto-fill name from filename (strip .md extension)
      if (!docName) {
        setDocName(file.name.replace(/\.md$/, ''));
      }
      setError('');
    };
    reader.readAsText(file, 'utf-8');
  }, [docName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleImport = async () => {
    if (!docName.trim() || !content.trim()) {
      setError('Selecione um arquivo .md e preencha o nome.');
      return;
    }

    setError('');
    setStep('processing');

    try {
      const doc = await api.createGovernanceDoc({
        name: docName.trim(),
        type: docType,
        content: content.trim(),
        project_id: projectId,
      });

      let result: BridgeProcessResult | undefined;

      if (docType === 'roadmap') {
        result = await api.processGovernanceDoc(doc.id);
        setBridgeResult(result);
      }

      setStep('success');
      onImported?.({ type: docType, docId: doc.id, bridgeResult: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido.';
      setError(msg);
      setStep('error');
    }
  };

  const resetFile = () => {
    setContent('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${config.color}-500/10`}>
              <Icon size={18} className={`text-${config.color}-400`} />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Importar Documento</h2>
              <p className="text-gray-500 text-xs">Upload de arquivo .md → Snaps</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                {/* Type selector */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Tipo de Documento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(TYPE_CONFIG) as DocType[]).map((t) => {
                      const cfg = TYPE_CONFIG[t];
                      const TIcon = cfg.icon;
                      const isActive = docType === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setDocType(t)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            isActive
                              ? `bg-${cfg.color}-500/10 border-${cfg.color}-500/50 text-${cfg.color}-400`
                              : 'bg-black/30 border-white/10 text-gray-500 hover:border-white/20'
                          }`}
                        >
                          <TIcon size={15} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{config.description}</p>
                </div>

                {/* Drop zone / file picker */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Arquivo .md</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {!fileName ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-3 w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        isDragging
                          ? 'border-violet-500/60 bg-violet-500/5'
                          : 'border-white/15 bg-black/30 hover:border-white/30 hover:bg-black/40'
                      }`}
                    >
                      <Upload size={22} className="text-gray-500" />
                      <div className="text-center">
                        <p className="text-sm text-gray-400">Arraste um arquivo <span className="text-white font-medium">.md</span> ou clique para selecionar</p>
                        <p className="text-xs text-gray-600 mt-0.5">Exportado do NotebookLM ou gerado a partir do template</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/20">
                      <File size={18} className="text-green-400 shrink-0" />
                      <span className="text-sm text-green-300 flex-1 truncate">{fileName}</span>
                      <button onClick={resetFile} className="text-gray-500 hover:text-red-400 transition-colors">
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Nome</label>
                  <input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder={`Ex: ${docType === 'prd' ? 'PRD v2 — Módulo de Auth' : 'Roadmap Q2 2026'}`}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={!docName.trim() || !content.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Upload size={15} />
                  Importar {config.label}
                </button>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 flex flex-col items-center gap-4">
                <Loader2 size={32} className="text-violet-400 animate-spin" />
                <p className="text-white font-medium">Processando documento…</p>
                {docType === 'roadmap' && (
                  <p className="text-gray-500 text-sm text-center max-w-xs">
                    O Bridge Architect está gerando Sprints e Cards a partir do Roadmap.
                  </p>
                )}
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-green-500/10">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Importação concluída!</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {docType === 'prd'
                      ? 'PRD salvo em governance_docs com sucesso.'
                      : 'Roadmap salvo e processado pelo Bridge Architect.'}
                  </p>
                </div>

                {bridgeResult && (
                  <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-left space-y-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Resultado do Bridge</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-violet-400 font-semibold">{bridgeResult.sprints_created.length} Sprints</span>
                      <span className="text-blue-400 font-semibold">{bridgeResult.cards_created.length} Cards</span>
                    </div>
                    <ul className="space-y-1">
                      {bridgeResult.sprints_created.map((s) => (
                        <li key={s.id} className="text-xs text-gray-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button onClick={onClose} className="mt-2 px-6 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-all">
                  Fechar
                </button>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-red-500/10">
                  <AlertCircle size={32} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Erro na importação</p>
                  <p className="text-gray-500 text-sm mt-1">{error}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('form')} className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-all">
                    Tentar novamente
                  </button>
                  <button onClick={onClose} className="px-5 py-2 rounded-xl text-gray-500 text-sm hover:text-white transition-all">
                    Fechar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
