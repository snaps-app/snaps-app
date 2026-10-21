/**
 * Override do gate (P5; SNA-SUP-81): condições, escopo e motivo obrigatório.
 *
 * O override humano sempre prevalece (requisito do PO): o diálogo abre em
 * qualquer nó atual, com ou sem gate pendente, e oferece TODA condição da fase
 * mais as que a última recusa do motor nomeou. Vêm marcadas as que a tela sabe
 * que faltam e as recusadas. Quem pode abrir é só admin (`useAcoesDoNo`); a API
 * confere de novo.
 */
import { useId, useState } from 'react';
import { rotuloDoGate, type GateDoNo } from './gatesDoNo';

export interface DialogoDeOverrideProps {
    fase: string;
    gates: readonly GateDoNo[];
    /** Condições que a última recusa do motor disse que o humano pode dispensar. */
    recusadas: readonly string[];
    aplicando: boolean;
    erro: string | null;
    onAplicar: (condicoes: string[], motivo: string) => void;
    onCancelar: () => void;
}

export function DialogoDeOverride({ fase, gates, recusadas, aplicando, erro, onAplicar, onCancelar }: DialogoDeOverrideProps) {
    const titulo = useId();
    const todas = [...new Set([...gates.map((g) => g.chave), ...recusadas])];
    const [marcadas, setMarcadas] = useState<Set<string>>(
        () => new Set([...gates.filter((g) => g.estado === 'falta').map((g) => g.chave), ...recusadas]),
    );
    const [motivo, setMotivo] = useState('');
    const alternar = (chave: string) => setMarcadas((atual) => {
        const nova = new Set(atual);
        if (nova.has(chave)) nova.delete(chave);
        else nova.add(chave);
        return nova;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--snaps-bg)]/70 px-4 pt-16">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titulo}
                className="flex w-full max-w-lg flex-col gap-3.5 rounded-2xl border border-white/20 bg-[var(--snaps-bg)] p-5 shadow-2xl"
            >
                <h2 id={titulo} className="text-lg font-bold text-[var(--snaps-text-primary)]">Override do gate · {fase}</h2>

                <p className="text-xs font-bold uppercase tracking-wider text-[var(--snaps-text-secondary)]">Condições ignoradas</p>
                {todas.length === 0 ? (
                    <p className="text-sm text-[var(--snaps-text-secondary)]">
                        Esta fase não declara condição. O override avança sem dispensar nenhuma.
                    </p>
                ) : (
                    <ul className="space-y-1.5">
                        {todas.map((chave) => (
                            <li key={chave}>
                                <label className="flex items-center gap-2.5 text-sm text-[var(--snaps-text-primary)]">
                                    <input type="checkbox" checked={marcadas.has(chave)} onChange={() => alternar(chave)} />
                                    <span>{rotuloDoGate(chave)}</span>
                                    <span className="font-mono text-xs text-[var(--snaps-text-secondary)]">{chave}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="text-xs font-bold uppercase tracking-wider text-[var(--snaps-text-secondary)]">Escopo</p>
                <p className="text-sm text-[var(--snaps-text-primary)]">
                    Só esta transição, e só as condições marcadas. O nó seguinte volta a ser conferido por inteiro.
                </p>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--snaps-text-secondary)]">Motivo (obrigatório)</span>
                    <textarea
                        aria-label="Motivo do override"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Por que avançar sem essas condições?"
                        rows={3}
                        className="resize-none rounded-xl border border-white/15 bg-white/[0.03] p-3 text-sm text-[var(--snaps-text-primary)] focus:outline-none"
                    />
                </label>
                <p className="text-xs leading-relaxed text-[var(--snaps-text-secondary)]">
                    Impacto: o avanço acontece sem as condições marcadas. Fica registrado no History com você, o motivo e as
                    condições. Exige papel admin.
                </p>
                {erro && <p role="alert" className="text-xs text-[var(--snaps-error)] whitespace-pre-wrap">{erro}</p>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCancelar}
                        className="h-8 rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm text-[var(--snaps-text-primary)] hover:bg-white/10">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!motivo.trim() || aplicando}
                        onClick={() => onAplicar(todas.filter((c) => marcadas.has(c)), motivo.trim())}
                        className="h-8 rounded-lg border border-[var(--snaps-accent-purple)] bg-[var(--snaps-accent-purple)]/30 px-3.5 text-sm font-bold text-[var(--snaps-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {aplicando ? 'Aplicando…' : 'Aplicar override'}
                    </button>
                </div>
            </div>
        </div>
    );
}
