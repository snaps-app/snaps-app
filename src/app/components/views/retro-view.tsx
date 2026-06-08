import { createSprint, getSprints, updateSprint } from '@/services/sprints';
import type { Sprint } from '@/services/types';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { ArrowLeft, RotateCcw, Plus, CheckCircle, AlertCircle, Lightbulb, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Spinner } from '@/app/components/ui/spinner';
import { useProjectRole } from '@/contexts/project-role-context';

const INPUT_CLS = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 text-white placeholder:text-gray-600 resize-none';

interface RetroData {
  went_well: string;
  went_wrong: string;
  action_items: string;
}

export function RetroView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { can } = useProjectRole();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [retro, setRetro] = useState<RetroData>({ went_well: '', went_wrong: '', action_items: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        await fetchSprints();
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  const fetchSprints = async () => {
    try {
      const data = await getSprints(projectId!);
      setSprints(data);
      // Pre-select the most recent done/review sprint
      const candidate = data.find(s => s.status === 'done' || s.status === 'review') ?? data[0] ?? null;
      if (candidate) selectSprint(candidate);
    } catch (e) {
      console.error(e);
    }
  };

  const selectSprint = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setSaved(false);
    const retros = sprint.retrospective as any;
    if (retros) {
      setRetro({
        went_well: retros.went_well ?? '',
        went_wrong: retros.went_wrong ?? '',
        action_items: retros.action_items ?? '',
      });
    } else {
      setRetro({ went_well: '', went_wrong: '', action_items: '' });
    }
  };

  const handleSave = async () => {
    if (!selectedSprint || isSaving) return;
    setIsSaving(true);
    try {
      await updateSprint(selectedSprint.id, { retrospective: retro } as any);
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateCorrective = async () => {
    if (!selectedSprint || isGenerating) return;
    setIsGenerating(true);
    try {
      // Derive X.5 sprint name from current tag (e.g., "sprint-4" -> "sprint-4.5")
      const baseTag = selectedSprint.tag.replace(/\.5$/, '');
      const correctiveTag = `${baseTag}.5`;
      const correctiveName = `${selectedSprint.name} — Corrective`;

      await createSprint(projectId!, {
        name: correctiveName,
        tag: correctiveTag,
        status: 'planning',
        objective: `Corrective sprint based on retro: ${retro.action_items}`,
        epic_id: selectedSprint.epic_id,
      });

      navigate(`/project/${projectId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
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
            <Spinner size="lg" label="Loading retrospectives..." color="purple" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 h-screen flex flex-col max-w-4xl mx-auto p-6">
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
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <RotateCcw className="w-6 h-6 text-purple-400" />
                Sprint Retrospective
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Capture lessons learned and plan corrections</p>
            </div>
          </div>
        </motion.div>

        {/* Sprint Selector */}
        <motion.div
          className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Sprint</label>
          <div className="flex flex-wrap gap-2">
            {sprints.map(sprint => (
              <button
                key={sprint.id}
                onClick={() => selectSprint(sprint)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedSprint?.id === sprint.id
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {sprint.name}
                <span className="ml-2 text-xs opacity-60">[{sprint.tag}]</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Retro Form */}
        <AnimatePresence>
          {selectedSprint && (
            <motion.div
              key={selectedSprint.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto space-y-4"
            >
              {/* Went Well */}
              <div className="p-5 rounded-2xl bg-white/5 border border-green-500/20">
                <label className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-3">
                  <CheckCircle className="w-4 h-4" />
                  What went well?
                </label>
                <textarea
                  rows={4}
                  value={retro.went_well}
                  onChange={e => setRetro(r => ({ ...r, went_well: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Describe the successes and positives..."
                  disabled={!can('write')}
                />
              </div>

              {/* Went Wrong */}
              <div className="p-5 rounded-2xl bg-white/5 border border-red-500/20">
                <label className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-3">
                  <AlertCircle className="w-4 h-4" />
                  What could be improved?
                </label>
                <textarea
                  rows={4}
                  value={retro.went_wrong}
                  onChange={e => setRetro(r => ({ ...r, went_wrong: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Identify friction points and blockers..."
                  disabled={!can('write')}
                />
              </div>

              {/* Action Items */}
              <div className="p-5 rounded-2xl bg-white/5 border border-yellow-500/20">
                <label className="flex items-center gap-2 text-sm font-semibold text-yellow-400 mb-3">
                  <Lightbulb className="w-4 h-4" />
                  Action items
                </label>
                <textarea
                  rows={4}
                  value={retro.action_items}
                  onChange={e => setRetro(r => ({ ...r, action_items: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Concrete next steps for improvement..."
                  disabled={!can('write')}
                />
              </div>

              {/* Actions */}
              {can('write') && (
                <div className="flex gap-3 pb-6">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : saved ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : null}
                    {saved ? 'Saved!' : 'Save Retrospective'}
                  </button>

                  <button
                    onClick={handleGenerateCorrective}
                    disabled={isGenerating || !retro.action_items.trim()}
                    className="flex-1 px-4 py-3 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Generate X.5 Corrective Sprint
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedSprint && sprints.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-3xl">
            No sprints found. Create a sprint to write a retrospective.
          </div>
        )}
      </div>
    </div>
  );
}
