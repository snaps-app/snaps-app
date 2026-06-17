import { createDecision, deleteDecision, getDecisions, updateDecision } from '@/services/decisions';
import type { Decision } from '@/services/types';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { ArrowLeft, Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Spinner } from '@/app/components/ui/spinner';

const INPUT_CLS = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-red-500 text-white placeholder:text-gray-600';
const SELECT_CLS = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-red-500 text-white';

export function DecisionsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [context, setContext] = useState('');
  const [decisionContent, setDecisionContent] = useState('');
  const [consequences, setConsequences] = useState('');
  const [status, setStatus] = useState<'proposed' | 'accepted' | 'deprecated'>('proposed');

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        await fetchDecisions();
      } catch (error) {
        console.error('Failed to load decisions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  const fetchDecisions = async () => {
    try {
      const data = await getDecisions(projectId!);
      setDecisions(data);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    }
  };

  const handleOpenModal = (decision?: Decision) => {
    if (decision) {
      setEditingDecision(decision);
      setTitle(decision.title);
      setCode(decision.code || '');
      setContext(decision.context || '');
      setDecisionContent(decision.decision || '');
      setConsequences(decision.consequences || '');
      setStatus(decision.status || 'proposed');
    } else {
      setEditingDecision(null);
      setTitle('');
      setCode('');
      setContext('');
      setDecisionContent('');
      setConsequences('');
      setStatus('proposed');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !projectId || isSaving) return;
    setIsSaving(true);
    try {
      if (editingDecision) {
        await updateDecision(editingDecision.id, {
          title, code, context, decision: decisionContent, consequences, status
        });
      } else {
        await createDecision(projectId, {
          title, code: code || 'ADR-00', context, decision: decisionContent, consequences, status
        });
      }
      setIsModalOpen(false);
      fetchDecisions();
    } catch (error) {
      console.error('Failed to save decision:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this decision?')) return;
    try {
      await deleteDecision(id);
      fetchDecisions();
    } catch (error) {
      console.error('Failed to delete decision:', error);
    }
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
            <Spinner size="lg" label="Loading decisions..." color="red" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 h-screen flex flex-col max-w-5xl mx-auto p-6">
        {/* Header */}
        <motion.div
          className="p-6 border-b border-white/10 backdrop-blur-3xl rounded-3xl mb-6 flex items-center justify-between"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/project/${projectId}`)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              Architecture Decisions (ADR)
            </h1>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            New ADR
          </button>
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          <AnimatePresence>
            {decisions.map(decision => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">{decision.code}</span>
                      {decision.title}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${
                        decision.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        decision.status === 'deprecated' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                      }`}>
                        {decision.status}
                      </span>
                    </h3>

                    {decision.context && (
                      <div className="text-sm">
                        <strong className="text-gray-400 block mb-1">Context:</strong>
                        <p className="text-gray-200 line-clamp-2">{decision.context}</p>
                      </div>
                    )}
                    {decision.decision && (
                      <div className="text-sm">
                        <strong className="text-gray-400 block mb-1">Decision:</strong>
                        <p className="text-gray-200 line-clamp-2">{decision.decision}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    <button
                      onClick={() => handleOpenModal(decision)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(decision.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {decisions.length === 0 && (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-3xl">
              No architectural decisions recorded. Start making history!
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{editingDecision ? 'Edit Decision' : 'New Decision'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Code (ADR-#)</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className={`${INPUT_CLS} font-mono`}
                      placeholder="ADR-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className={SELECT_CLS}
                    >
                      <option value="proposed">Proposed</option>
                      <option value="accepted">Accepted</option>
                      <option value="deprecated">Deprecated</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="Decision title..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Context</label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className={`${INPUT_CLS} h-24 resize-none`}
                    placeholder="Why are we making this decision?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Decision</label>
                  <textarea
                    value={decisionContent}
                    onChange={(e) => setDecisionContent(e.target.value)}
                    className={`${INPUT_CLS} h-24 resize-none`}
                    placeholder="What is the decision?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Consequences</label>
                  <textarea
                    value={consequences}
                    onChange={(e) => setConsequences(e.target.value)}
                    className={`${INPUT_CLS} h-24 resize-none`}
                    placeholder="What becomes easier/harder after this?"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim() || isSaving}
                  className="px-6 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Save ADR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
