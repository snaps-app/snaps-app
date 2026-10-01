import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Texto a esquerda, ex.: "Mostrando 1–20 de 58 branches". */
    summary?: string;
    disabled?: boolean;
}

/** Numeros visiveis: primeira, ultima e vizinhas da atual; `null` vira reticencias. */
export function paginasVisiveis(page: number, totalPages: number): (number | null)[] {
    const paginas = new Set([1, totalPages, page - 1, page, page + 1]);
    const ordenadas = [...paginas].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const resultado: (number | null)[] = [];
    ordenadas.forEach((p, i) => {
        if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push(null);
        resultado.push(p);
    });
    return resultado;
}

export const Pagination = ({ page, totalPages, onPageChange, summary, disabled }: PaginationProps) => {
    const botao = 'min-w-8 h-8 px-2 rounded-lg text-xs font-bold border transition-all disabled:opacity-30 disabled:cursor-not-allowed';
    const inativo = `${botao} text-white/40 border-white/10 bg-white/[0.02] hover:text-white hover:border-purple-500/40`;
    const ativo = `${botao} text-white border-purple-500/50 bg-purple-500/20`;

    return (
        <nav aria-label="Paginação" className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
            <p className="text-xs text-white/30">{summary}</p>
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className={inativo}
                        onClick={() => onPageChange(page - 1)}
                        disabled={disabled || page <= 1}
                        aria-label="Página anterior"
                    >
                        <ChevronLeft className="w-4 h-4 mx-auto" />
                    </button>
                    {paginasVisiveis(page, totalPages).map((p, i) =>
                        p === null ? (
                            <span key={`gap-${i}`} className="px-1 text-xs text-white/20">…</span>
                        ) : (
                            <button
                                key={p}
                                type="button"
                                className={p === page ? ativo : inativo}
                                onClick={() => onPageChange(p)}
                                disabled={disabled}
                                aria-current={p === page ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        type="button"
                        className={inativo}
                        onClick={() => onPageChange(page + 1)}
                        disabled={disabled || page >= totalPages}
                        aria-label="Próxima página"
                    >
                        <ChevronRight className="w-4 h-4 mx-auto" />
                    </button>
                </div>
            )}
        </nav>
    );
};
