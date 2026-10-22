/**
 * Limite de erro do Cockpit (aceite DEV da Sprint 24.0, 22/10/2026).
 *
 * Um erro de render derrubava a árvore inteira do React e deixava a página
 * preta, sem texto nenhum: nem quem testava sabia o que tinha acontecido, nem
 * havia como sair dali. Aqui o erro aparece escrito, com como sair.
 *
 * `key` de quem monta reinicia o limite: trocar de raiz tenta de novo.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Onde o erro aconteceu, para quem lê ("esta raiz", "o Cockpit"). */
    onde: string;
}

interface Estado {
    erro: Error | null;
}

export class LimiteDeErroDoCockpit extends Component<Props, Estado> {
    state: Estado = { erro: null };

    static getDerivedStateFromError(erro: Error): Estado {
        return { erro };
    }

    componentDidCatch(erro: Error, info: ErrorInfo) {
        console.error(`Cockpit: erro ao mostrar ${this.props.onde}`, erro, info.componentStack);
    }

    render() {
        const { erro } = this.state;
        if (!erro) return this.props.children;
        return (
            <div role="alert" className="m-6 max-w-2xl space-y-3 rounded-xl border border-white/15 p-5"
                style={{ backgroundColor: 'var(--snaps-bg)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--snaps-error)' }}>
                    Não foi possível mostrar {this.props.onde}.
                </p>
                <p className="select-text break-words font-mono text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                    {erro.message || String(erro)}
                </p>
                <div className="flex gap-2">
                    <button type="button" onClick={() => window.location.reload()}
                        className="h-8 rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm text-[var(--snaps-text-primary)] hover:bg-white/10">
                        Recarregar
                    </button>
                    <a href="/ai-executions"
                        className="flex h-8 items-center rounded-lg border border-white/15 px-3.5 text-sm text-[var(--snaps-text-secondary)] hover:bg-white/10">
                        Ir para Execuções
                    </a>
                </div>
            </div>
        );
    }
}
