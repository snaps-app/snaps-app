import { createPlan, deletePlan, getPlans, updatePlan } from '@/services/plans';
import type { Plan } from '@/services/types';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { ArrowLeft, Plus, Edit2, Trash2, Calendar, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PlanToCardsWizard } from '@/app/components/modals/plan-to-cards-wizard';
import { Spinner } from '@/app/components/ui/spinner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const INPUT_CLS = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 text-white placeholder:text-gray-600';
const SELECT_CLS = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 text-white';

export function PlansView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [wizardPlan, setWizardPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        await fetchPlans();
      } catch (error) {
        console.error('Failed to load plans:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  const fetchPlans = async () => {
    try {
      const data = await getPlans(projectId!);
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setTitle(plan.title);
      setContent(plan.content || '');
      setStatus(plan.status || 'draft');
    } else {
      setEditingPlan(null);
      setTitle('');
      setContent('');
      setStatus('draft');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !projectId || isSaving) return;
    setIsSaving(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, { title, content, status });
      } else {
        await createPlan(projectId, { title, content, status });
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await deletePlan(id);
      fetchPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
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
            <Spinner size="lg" label="Loading plans..." color="green" />
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
              <Calendar className="w-6 h-6 text-green-400" />
              Plans (Sprint Engine)
            </h1>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Plan
          </button>
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          <AnimatePresence>
            {plans.map(plan => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                      {plan.title}
                      <span className="text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider bg-white/10 border-white/20 text-gray-300">
                        {plan.status}
                      </span>
                    </h3>
                    {plan.content && (
                      <div className="prose prose-invert max-w-none text-gray-400 text-sm mt-2 select-text cursor-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {plan.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {plan.status === 'draft' && (
                      <button
                        onClick={() => setWizardPlan(plan)}
                        className="p-2 rounded-lg hover:bg-green-500/10 text-green-500 hover:text-green-400"
                        title="Convert to Cards"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal(plan)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {plans.length === 0 && (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-3xl">
              No plans yet. Create one to get started!
            </div>
          )}
        </div>
      </div>

      {/* Plan to Cards Wizard */}
      <AnimatePresence>
        {wizardPlan && projectId && (
          <PlanToCardsWizard
            plan={wizardPlan}
            projectId={projectId}
            onClose={() => setWizardPlan(null)}
            onDone={() => setWizardPlan(null)}
          />
        )}
      </AnimatePresence>

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
                <h2 className="text-xl font-bold text-white">{editingPlan ? 'Edit Plan' : 'New Plan'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="Plan title..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={SELECT_CLS}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Content / Details</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={`${INPUT_CLS} h-40 resize-none`}
                    placeholder="Describe the plan..."
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
                  className="px-6 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Save Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
