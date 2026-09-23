import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Modais de encerramento de execucao (SNA-RD-166, hotfix 22.0).
 *
 * A recusa do "Concluir (entregue)" ia para um banner no topo da pagina, fora
 * de vista: o PO clicou 17 vezes e nao viu nada. Agora ela abre no ponto do
 * clique, com a mensagem da API como veio, e oferece o fechamento forcado.
 *
 * O descarte usava `window.confirm` dizendo "apagara permanentemente" — mas
 * `DELETE /api/agent-executions/{id}` e tombstone: nada e apagado.
 *
 * Superficie nivel 3 do DESIGN_snaps (overlay): bg-white/10 + backdrop-blur-xl
 * + border-white/20 + radius-xl.
 */

export interface OpenCard {
    id: string;
    code?: string | null;
    title: string;
    status: string;
}

export interface CloseRefusal {
    message: string;
    sprintStatus: string | null;
    openCards: OpenCard[];
}

function Overlay({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[var(--radius-xl)]"
            >
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="text-lg font-semibold text-[var(--snaps-text-primary)]">{titulo}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Fechar"
                        className="p-1 rounded-[var(--radius-md)] text-[var(--snaps-text-secondary)] hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

const botaoSecundario =
    'px-4 py-2 rounded-[var(--radius-md)] text-sm border border-white/10 bg-white/5 text-[var(--snaps-text-secondary)] hover:bg-white/10';

export function CloseDeliveredModal({
    refusal,
    submitting,
    error,
    onConfirm,
    onClose,
}: {
    refusal: CloseRefusal;
    submitting: boolean;
    error: string | null;
    onConfirm: (motivo: string) => void;
    onClose: () => void;
}) {
    const [motivo, setMotivo] = useState('');
    const n = refusal.openCards.length;
    const rotulo = n > 0 ? `Concluir e marcar ${n} ${n === 1 ? 'card' : 'cards'} como done` : 'Concluir mesmo assim';
    const podeConfirmar = motivo.trim().length > 0 && !submitting;

    return (
        <Overlay titulo="Concluir execução (entregue)" onClose={onClose}>
            <p data-testid="close-refusal-message" className="text-sm text-[var(--snaps-text-secondary)] mb-3 whitespace-pre-wrap select-text">
                {refusal.message}
            </p>
            {refusal.sprintStatus && (
                <p className="text-xs text-[var(--snaps-text-secondary)] mb-2">
                    Sprint: <span className="font-semibold text-[var(--snaps-accent-yellow)]">{refusal.sprintStatus}</span>
                </p>
            )}
            {n > 0 && (
                <ul className="mb-4 max-h-40 overflow-y-auto space-y-1 p-2 bg-white/5 border border-white/10 rounded-[var(--radius-lg)]">
                    {refusal.openCards.map(c => (
                        <li key={c.id} className="text-xs text-[var(--snaps-text-primary)] flex gap-2">
                            {c.code && <span className="font-mono text-[var(--snaps-text-secondary)]">{c.code}</span>}
                            <span className="flex-1 truncate">{c.title}</span>
                            <span className="text-[var(--snaps-placeholder)]">{c.status}</span>
                        </li>
                    ))}
                </ul>
            )}
            <label className="block text-xs font-semibold text-[var(--snaps-text-secondary)] mb-1" htmlFor="close-motivo">
                Motivo (obrigatório)
            </label>
            <textarea
                id="close-motivo"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={3}
                className="w-full mb-3 p-2 text-sm bg-white/5 border border-white/10 rounded-[var(--radius-md)] text-[var(--snaps-text-primary)] placeholder:text-[var(--snaps-placeholder)] focus:outline-none focus:border-[var(--snaps-accent-purple)]"
                placeholder="Por que concluir sem a evidência no banco?"
            />
            {error && (
                <p role="alert" className="mb-3 p-2 text-sm rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 text-[var(--snaps-error)]">
                    {error}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <button onClick={onClose} className={botaoSecundario}>Cancelar</button>
                <button
                    onClick={() => onConfirm(motivo.trim())}
                    disabled={!podeConfirmar}
                    className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold border border-emerald-500/30 bg-emerald-500/10 text-[var(--snaps-success)] hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {rotulo}
                </button>
            </div>
        </Overlay>
    );
}

export function DiscardExecutionModal({
    submitting,
    onConfirm,
    onClose,
}: {
    submitting: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Overlay titulo="Descartar execução?" onClose={onClose}>
            <p className="text-sm text-[var(--snaps-text-secondary)] mb-5">
                Ela é marcada como descartada e sai das ativas. Nada é apagado.
            </p>
            <div className="flex justify-end gap-2">
                <button onClick={onClose} className={botaoSecundario}>Cancelar</button>
                <button
                    onClick={onConfirm}
                    disabled={submitting}
                    className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold border border-red-500/30 bg-red-500/10 text-[var(--snaps-error)] hover:bg-red-500/20 disabled:opacity-40"
                >
                    Descartar
                </button>
            </div>
        </Overlay>
    );
}
