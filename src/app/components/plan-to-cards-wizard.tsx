import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers, Plus, Trash2, CheckCircle, ArrowRight } from 'lucide-react';
import api, { Plan, Board } from '@/services/api';

interface PreviewCard {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  selected: boolean;
}

interface PlanToCardsWizardProps {
  plan: Plan;
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}

function parsePlanToCards(content: string): PreviewCard[] {
  const cards: PreviewCard[] = [];
  const lines = content.split('\n');

  let currentCard: PreviewCard | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect card-level headings: ### Card:, ### Card Title, or - Task:
    const cardMatch = trimmed.match(/^###\s+(?:Card:\s*)?(.+)/);
    if (cardMatch) {
      if (currentCard) cards.push(currentCard);
      currentCard = {
        title: cardMatch[1].replace(/^Card:\s*/i, '').trim(),
        description: '',
        priority: 'Medium',
        selected: true,
      };
      continue;
    }

    // Also pick up bullet task items at top level as cards if no ### found
    const taskMatch = trimmed.match(/^[-*]\s+(?:Task:\s*)?(.+)/);
    if (taskMatch && !currentCard) {
      cards.push({
        title: taskMatch[1].trim(),
        description: '',
        priority: 'Medium',
        selected: true,
      });
      continue;
    }

    // Append description lines to current card
    if (currentCard && trimmed && !trimmed.startsWith('#')) {
      currentCard.description += (currentCard.description ? '\n' : '') + trimmed;
    }
  }

  if (currentCard) cards.push(currentCard);

  // Fallback: if nothing was parsed, treat each non-empty line as a card
  if (cards.length === 0) {
    for (const line of lines) {
      const t = line.trim();
      if (t && !t.startsWith('#')) {
        cards.push({ title: t, description: '', priority: 'Medium', selected: true });
      }
    }
  }

  return cards;
}

export function PlanToCardsWizard({ plan, projectId, onClose, onDone }: PlanToCardsWizardProps) {
  const [step, setStep] = useState<'preview' | 'select-board' | 'done'>('preview');
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    setPreviewCards(parsePlanToCards(plan.content ?? ''));
    fetchBoards();
  }, [plan]);

  const fetchBoards = async () => {
    try {
      const data = await api.getProjectBoards(projectId);
      setBoards(data);
      if (data.length > 0) setSelectedBoardId(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCard = (idx: number) => {
    setPreviewCards(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  };

  const updateCardTitle = (idx: number, title: string) => {
    setPreviewCards(prev => prev.map((c, i) => i === idx ? { ...c, title } : c));
  };

  const removeCard = (idx: number) => {
    setPreviewCards(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!selectedBoardId || isCreating) return;
    setIsCreating(true);
    const toCreate = previewCards.filter(c => c.selected && c.title.trim());
    let count = 0;
    for (const card of toCreate) {
      try {
        await api.createCard(selectedBoardId, {
          title: card.title,
          description: card.description,
          priority: card.priority,
          status: 'todo',
        });
        count++;
      } catch (e) {
        console.error('Failed to create card:', card.title, e);
      }
    }
    setCreatedCount(count);
    setStep('done');
    setIsCreating(false);
  };

  const selectedCount = previewCards.filter(c => c.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0e0e0e] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-green-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Convert Plan to Cards</h2>
              <p className="text-xs text-gray-500 mt-0.5">{plan.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Preview */}
        {step === 'preview' && (
          <>
            <div className="p-4 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                <span className="text-white font-medium">{selectedCount}</span> of {previewCards.length} cards selected
              </p>
              <button
                onClick={() => setPreviewCards(prev => prev.map(c => ({ ...c, selected: !prev.every(x => x.selected) })))}
                className="text-xs text-green-400 hover:text-green-300"
              >
                {previewCards.every(c => c.selected) ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <AnimatePresence>
                {previewCards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      card.selected
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-white/3 border-white/5 opacity-50'
                    }`}
                  >
                    <button
                      onClick={() => toggleCard(idx)}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-all ${
                        card.selected
                          ? 'bg-green-500 border-green-500 text-black'
                          : 'border-white/20 bg-transparent'
                      } flex items-center justify-center`}
                    >
                      {card.selected && <CheckCircle className="w-3 h-3" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={card.title}
                        onChange={e => updateCardTitle(idx, e.target.value)}
                        className="w-full bg-transparent text-white text-sm font-medium focus:outline-none focus:border-b focus:border-green-500/50"
                      />
                      {card.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{card.description}</p>
                      )}
                    </div>

                    <select
                      value={card.priority}
                      onChange={e => setPreviewCards(prev => prev.map((c, i) => i === idx ? { ...c, priority: e.target.value as any } : c))}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>

                    <button onClick={() => removeCard(idx)} className="text-red-500/60 hover:text-red-400 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {previewCards.length === 0 && (
                <div className="text-center p-8 text-gray-600 text-sm">
                  No cards could be parsed from this plan's content.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex justify-between flex-shrink-0 bg-black/20">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setStep('select-board')}
                disabled={selectedCount === 0}
                className="px-6 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                Next: Choose Board
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step: Select Board */}
        {step === 'select-board' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Creating <span className="text-white font-medium">{selectedCount} cards</span> on board:
              </p>
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    selectedBoardId === board.id
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: board.color ?? '#00D4FF' }}
                  />
                  <span className={`font-medium ${selectedBoardId === board.id ? 'text-green-300' : 'text-white'}`}>
                    {board.name}
                  </span>
                  {selectedBoardId === board.id && (
                    <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                  )}
                </button>
              ))}
              {boards.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-8">No boards found for this project.</p>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex justify-between flex-shrink-0 bg-black/20">
              <button onClick={() => setStep('preview')} className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedBoardId || isCreating || boards.length === 0}
                className="px-6 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create {selectedCount} Cards
              </button>
            </div>
          </>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="w-16 h-16 text-green-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white">{createdCount} Cards Created!</h3>
            <p className="text-gray-500 text-sm text-center">
              All selected cards have been added to the board.
            </p>
            <button
              onClick={onDone}
              className="mt-4 px-6 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 transition-all"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
