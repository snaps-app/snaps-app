import { updateCard } from '@/services/cards';
import { getCardsBySprint, getSprints } from '@/services/sprints';
import { getTroubleReport } from '@/services/testPlans';
import type { Card, Sprint, TroubleReport } from '@/services/types';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { ArrowLeft, ShieldCheck, AlertCircle, FileText, CheckCircle2, XCircle, ChevronDown, ChevronRight, FlaskConical, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spinner } from '@/app/components/ui/spinner';

const SELECT_CLS = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 text-white';

import { useProjectRole } from '@/contexts/project-role-context';

function BddStatusBadge({ validated }: { validated?: boolean }) {
  if (validated === true) {
    return (
      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-green-500/20 border-green-500/30 text-green-400 uppercase tracking-wider font-bold">
        <CheckCircle2 className="w-3 h-3" /> Validated
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/20 border-amber-500/30 text-amber-400 uppercase tracking-wider font-bold">
      <XCircle className="w-3 h-3" /> Pending
    </span>
  );
}

function CardBddRow({ card, onUpdateCard }: { card: api.Card, onUpdateCard: (cardId: string, updates: Partial<api.Card>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const hasBdd = card.bdd_scenarios && card.bdd_scenarios.length > 0;
  const { can } = useProjectRole();

  const toggleValidation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      await onUpdateCard(card.id, { bdd_validated: !card.bdd_validated });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all ${card.bdd_validated ? 'border-green-500/20 bg-green-500/5' : hasBdd ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10 bg-white/5'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left group"
      >
        <div className="flex-shrink-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {card.code && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-400">{card.code}</span>
              )}
              <span className="text-sm font-semibold text-white truncate">{card.title}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
              <span>{hasBdd ? `${card.bdd_scenarios!.length} scenario${card.bdd_scenarios!.length > 1 ? 's' : ''}` : 'No BDD scenarios'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BddStatusBadge validated={card.bdd_validated} />
            {hasBdd && can('write') && (
              <button
                onClick={toggleValidation}
                disabled={isUpdating}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                  card.bdd_validated
                    ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                    : 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {card.bdd_validated ? 'Mark Pending' : 'Validate'}
              </button>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3 border-t border-white/5 pt-3">
              {hasBdd ? card.bdd_scenarios!.map((bdd: any, idx: number) => (
                <div key={idx} className="rounded-xl bg-black/30 border border-white/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-white">{bdd.title || `Scenario ${idx + 1}`}</span>
                  </div>
                  {bdd.steps && bdd.steps.length > 0 && (
                    <div className="space-y-1 ml-5">
                      {bdd.steps.map((step: any, si: number) => (
                        <div key={si} className="flex items-start gap-2 text-[11px]">
                          <span className={`font-bold uppercase text-[10px] w-10 flex-shrink-0 ${
                            step.type === 'Given' ? 'text-purple-400' :
                            step.type === 'When' ? 'text-blue-400' :
                            step.type === 'Then' ? 'text-green-400' :
                            'text-gray-400'
                          }`}>{step.type}</span>
                          <span className="text-gray-300">{step.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-xs text-gray-500 italic">No BDD scenarios defined for this card yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QAView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'plans' | 'reports'>('plans');
  const [copied, setCopied] = useState(false);
  const [sprints, setSprints] = useState<api.Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [sprintCards, setSprintCards] = useState<api.Card[]>([]);
  const [troubleReport, setTroubleReport] = useState<api.TroubleReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCardsLoading, setIsCardsLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchSprints();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedSprintId) {
      fetchSprintCards(selectedSprintId);
      if (activeTab === 'reports') fetchTroubleReport();
    }
  }, [selectedSprintId]);

  useEffect(() => {
    if (activeTab === 'reports' && selectedSprintId) {
      fetchTroubleReport();
    }
  }, [activeTab]);

  const fetchSprints = async () => {
    setIsLoading(true);
    try {
      const sprintsData = await getSprints(projectId!);
      setSprints(sprintsData);
      if (sprintsData.length > 0) {
        setSelectedSprintId(sprintsData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSprintCards = async (sprintId: string) => {
    setIsCardsLoading(true);
    try {
      const cards = await getCardsBySprint(sprintId);
      setSprintCards(cards);
    } catch (error) {
      console.error('Failed to fetch sprint cards:', error);
      setSprintCards([]);
    } finally {
      setIsCardsLoading(false);
    }
  };

  const handleUpdateCard = async (cardId: string, updates: Partial<api.Card>) => {
    try {
      const updatedCard = await updateCard(cardId, updates);
      setSprintCards(prev => prev.map(c => c.id === cardId ? updatedCard : c));
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const fetchTroubleReport = async () => {
    if (!projectId || !selectedSprintId) return;
    setIsLoading(true);
    try {
      const report = await getTroubleReport(projectId, selectedSprintId);
      setTroubleReport(report);
    } catch (error) {
      console.error('Failed to fetch trouble report:', error);
      setTroubleReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  // Aggregated stats for plans tab
  const totalCards = sprintCards.length;
  const cardsWithBdd = sprintCards.filter(c => c.bdd_scenarios && c.bdd_scenarios.length > 0).length;
  const validatedCards = sprintCards.filter(c => c.bdd_validated).length;
  const pendingCards = cardsWithBdd - validatedCards;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <NeuralBackground />

      <div className="relative z-10 h-screen flex flex-col max-w-6xl mx-auto p-6">
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
                <ShieldCheck className="w-7 h-7 text-cyan-400" />
                QA Engine & BDD Governance
              </h1>
              <p className="text-gray-400 text-xs">BDD scenarios and quality gates per sprint</p>
            </div>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              BDD Scenarios
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              Trouble Reports
            </button>
          </div>
        </motion.div>

        {/* Sprint selector (shared between tabs) */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Select Sprint</label>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className={SELECT_CLS}
            >
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.tag} — {s.name}</option>
              ))}
            </select>
          </div>
          {selectedSprint && (
            <div className="mt-5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400">
              Status: <span className="font-bold text-white capitalize">{selectedSprint.status}</span>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'plans' ? (
              <motion.div
                key="plans"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Stats row */}
                {!isCardsLoading && (
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                      { label: 'Total Cards', value: totalCards, color: 'text-white' },
                      { label: 'With BDD', value: cardsWithBdd, color: 'text-cyan-400' },
                      { label: 'Validated', value: validatedCards, color: 'text-green-400' },
                      { label: 'Pending', value: pendingCards, color: 'text-amber-400' },
                    ].map(stat => (
                      <div key={stat.label} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-[11px] text-gray-500 mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {isCardsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Spinner size="lg" label="Loading cards..." color="cyan" />
                  </div>
                ) : sprintCards.length === 0 ? (
                  <div className="text-center p-16 text-gray-500 border border-dashed border-white/10 rounded-3xl flex flex-col items-center gap-3">
                    <Layers className="w-10 h-10 text-gray-700" />
                    <p>No cards found in this sprint.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {sprintCards.map(card => (
                      <CardBddRow key={card.id} card={card} onUpdateCard={handleUpdateCard} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="reports"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex justify-end mb-4">
                  <button
                    onClick={fetchTroubleReport}
                    className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm"
                  >
                    Refresh Report
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Spinner size="lg" label="Loading report..." color="cyan" />
                  </div>
                ) : troubleReport ? (
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">
                    {/* Left: Metadata & Failed Cards */}
                    <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white">Sprint Summary</h3>
                          <AlertCircle className={`w-6 h-6 ${troubleReport.failed_bdd_cards.length > 0 ? 'text-red-400' : 'text-green-400'}`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400">Total Cards</div>
                            <div className="text-2xl font-bold text-white">{troubleReport.total_cards}</div>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400">Failed Gates</div>
                            <div className="text-2xl font-bold text-red-400">{troubleReport.failed_bdd_cards.length}</div>
                          </div>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-gray-400 mt-2">Failed BDD Cards</h4>
                      {troubleReport.failed_bdd_cards.map(card => (
                        <div key={card.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 group hover:border-red-500/40 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-mono text-red-400">{card.code}</div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">QA FAILED</span>
                          </div>
                          <h5 className="text-sm font-bold text-white mb-2">{card.title}</h5>
                          <div className="space-y-1">
                            {card.bdd_scenarios?.map((bdd, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px]">
                                <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                <span className="text-gray-200 font-medium">{bdd.title || bdd.scenario || 'Unknown Scenario'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {troubleReport.failed_bdd_cards.length === 0 && (
                        <div className="text-center py-8 text-gray-500 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                          No failures detected for this sprint. 🎉
                        </div>
                      )}
                    </div>

                    {/* Right: Markdown Report */}
                    <div className="bg-black/30 border border-white/10 rounded-3xl overflow-hidden flex flex-col min-h-0">
                       <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <FileText className="w-4 h-4" />
                           Aggregated Trouble Report
                         </span>
                         <button 
                           onClick={() => {
                             if (troubleReport?.markdown_report) {
                               navigator.clipboard.writeText(troubleReport.markdown_report);
                               setCopied(true);
                               setTimeout(() => setCopied(false), 2000);
                             }
                           }}
                           className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                         >
                           {copied ? 'Copied!' : 'Copy Markdown'}
                         </button>
                       </div>
                       <div 
                         className="flex-1 overflow-y-auto p-6 prose prose-invert prose-cyan max-w-none prose-sm custom-scrollbar select-text cursor-text"
                         style={{ userSelect: 'text', cursor: 'text' }}
                       >
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
                           {troubleReport.markdown_report}
                         </ReactMarkdown>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-20 text-gray-500">
                    Select a sprint to view the Trouble Report.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
