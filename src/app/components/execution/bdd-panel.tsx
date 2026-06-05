import React from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import type { Card } from '@/services/types';

interface BDDPanelProps {
    cards: Card[];
    onApproveBDD: (card: Card) => Promise<void>;
    onToggleScenario: (card: Card, idx: number, scenario: any) => Promise<void>;
}

export const BDDPanel: React.FC<BDDPanelProps> = ({
    cards,
    onApproveBDD,
    onToggleScenario
}) => {
    const cardsWithBDD = cards.filter(c => c.bdd_scenarios && c.bdd_scenarios.filter((s: any) => s && typeof s === 'object').length > 0);

    return (
        <div className="space-y-4">
            {cardsWithBDD.length > 0 ? (
                cardsWithBDD.map(card => (
                    <div key={card.id} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest">{card.title}</h2>
                            {!card.bdd_validated ? (
                                <button
                                    onClick={() => onApproveBDD(card)}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-purple-900/20"
                                >
                                    <ShieldCheck className="w-3 h-3" />
                                    Approve BDD
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <ShieldCheck className="w-3 h-3 text-green-400" />
                                    <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">BDD Approved</span>
                                </div>
                            )}
                        </div>
                        {card.bdd_scenarios && card.bdd_scenarios.filter((s: any) => s && typeof s === 'object').map((scenario: any, idx: number) => (
                            <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative group/scenario">
                                <div className="absolute inset-0 bg-purple-500/[0.01] opacity-0 group-hover/scenario:opacity-100 transition-opacity" />

                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <ChevronRight className="w-4 h-4 text-purple-500" />
                                        {scenario.title}
                                    </h3>
                                    <button
                                        onClick={() => onToggleScenario(card, idx, scenario)}
                                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${scenario.validated
                                            ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                            : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'
                                            }`}
                                    >
                                        {scenario.validated ? 'Validated' : 'Approve'}
                                    </button>
                                </div>

                                <div className="space-y-2 pl-6 relative z-10">
                                    {scenario.steps && scenario.steps.map((step: any, sIdx: number) => (
                                        <div key={sIdx} className="flex items-start gap-3">
                                            <span className="text-[10px] font-bold text-purple-500 uppercase mt-0.5 w-10 shrink-0">{step.type}</span>
                                            <p className="text-xs text-white/50">{step.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            ) : (
                <div className="py-20 text-center text-white/20 italic">No BDD scenarios found.</div>
            )}
        </div>
    );
};
