import { Bot, Check, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CardBddPanelProps {
    cardType: 'feature' | 'bug' | 'support' | 'tech-debt';
    bddValidated: boolean;
    setBddValidated: (validated: boolean) => void;
    bddScenarios: any[];
    setBddScenarios: React.Dispatch<React.SetStateAction<any[]>>;
}

export const CardBddPanel: React.FC<CardBddPanelProps> = ({
    cardType,
    bddValidated,
    setBddValidated,
    bddScenarios,
    setBddScenarios,
}) => {
    if (cardType !== 'feature') return null;

    const handleAddScenario = () => {
        setBddScenarios([...bddScenarios, { 
            id: crypto.randomUUID(), 
            title: 'New Scenario', 
            steps: [{ type: 'Given', content: '' }] 
        }]);
    };

    const updateScenario = (id: string, updates: any) => {
        setBddScenarios(bddScenarios.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeScenario = (id: string) => {
        setBddScenarios(bddScenarios.filter(s => s.id !== id));
    };

    const addStep = (scenarioId: string) => {
        setBddScenarios(bddScenarios.map(s => {
            if (s.id === scenarioId) {
                return { ...s, steps: [...s.steps, { type: 'And', content: '' }] };
            }
            return s;
        }));
    };

    const updateStep = (scenarioId: string, stepIndex: number, updates: any) => {
        setBddScenarios(bddScenarios.map(s => {
            if (s.id === scenarioId) {
                const newSteps = [...s.steps];
                newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };
                return { ...s, steps: newSteps };
            }
            return s;
        }));
    };

    const removeStep = (scenarioId: string, stepIndex: number) => {
        setBddScenarios(bddScenarios.map(s => {
            if (s.id === scenarioId) {
                const newSteps = s.steps.filter((_: any, i: number) => i !== stepIndex);
                return { ...s, steps: newSteps };
            }
            return s;
        }));
    };

    return (
        <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <label className="text-sm font-semibold text-white/70 uppercase tracking-wider">BDD Specifications</label>
                    {bddValidated && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-black uppercase border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                        >
                            Validated
                        </motion.span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {bddScenarios.length > 0 && (
                        <button
                            onClick={() => setBddValidated(!bddValidated)}
                            className={`flex items-center gap-1 text-xs font-bold transition-all px-3 py-1 rounded-lg border ${
                                bddValidated 
                                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                            }`}
                        >
                            <Check className={`w-3.5 h-3.5 ${bddValidated ? 'text-green-400' : 'text-white/20'}`} />
                            {bddValidated ? 'Validated' : 'Validate BDDs'}
                        </button>
                    )}
                    <button
                        onClick={handleAddScenario}
                        className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded bg-blue-400/10"
                    >
                        <Plus className="w-3 h-3" />
                        Add Scenario
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <AnimatePresence>
                    {bddScenarios.filter(scenario => scenario !== null && typeof scenario === 'object').map((scenario) => (
                        <motion.div
                            key={scenario.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 relative group/scenario"
                        >
                            <button
                                onClick={() => removeScenario(scenario.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover/scenario:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <input
                                type="text"
                                value={scenario.title || ''}
                                onChange={(e) => updateScenario(scenario.id, { title: e.target.value })}
                                placeholder="Scenario Title"
                                className="bg-transparent border-none text-md font-bold focus:outline-none mb-4 w-full text-white/90"
                            />

                            <div className="space-y-3">
                                {scenario.steps?.filter((step: any) => step !== null && typeof step === 'object').map((step: any, sIdx: number) => (
                                    <div key={sIdx} className="flex gap-2 group/step">
                                        <select
                                            value={step.type || 'Given'}
                                            onChange={(e) => updateStep(scenario.id, sIdx, { type: e.target.value })}
                                            className="bg-transparent border border-white/10 rounded px-1.5 py-1 text-xs font-bold focus:outline-none shrink-0 text-purple-400 appearance-none text-center min-w-[70px]"
                                        >
                                            <option value="Given">GIVEN</option>
                                            <option value="When">WHEN</option>
                                            <option value="Then">THEN</option>
                                            <option value="And">AND</option>
                                            <option value="But">BUT</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={step.content}
                                            onChange={(e) => updateStep(scenario.id, sIdx, { content: e.target.value })}
                                            placeholder="..."
                                            className="flex-1 bg-white/5 border border-white/5 rounded px-3 py-1 text-sm text-white/80 focus:outline-none focus:border-white/20 transition-all"
                                        />
                                        <button
                                            onClick={() => removeStep(scenario.id, sIdx)}
                                            className="opacity-0 group-hover/step:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => addStep(scenario.id)}
                                    className="w-full py-1 border border-dashed border-white/10 rounded-lg text-[10px] text-white/30 hover:border-white/20 hover:text-white/50 transition-all uppercase font-bold tracking-widest"
                                >
                                    + Add Step
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {bddScenarios.length === 0 && (
                    <div className="text-center py-6 px-4 border border-dashed border-white/10 rounded-xl text-white/20 text-xs">
                        No BDD scenarios defined yet. Use BDD to guide the agent's work.
                    </div>
                )}
            </div>
        </div>
    );
};
