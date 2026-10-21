import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/app/components/ui/dialog';
import { getExecutionBranchesPage } from '@/services/agentExecutions';
import { chavesDeConsulta } from '@/services/chavesDeConsulta';
import { idCurto, resumirBranches, rotuloDaRaiz, type ResumoDaRaiz } from '@/services/raizesDoCockpit';

/** Raízes por página do seletor. */
export const RAIZES_POR_PAGINA = 10;
/** Espera depois da última tecla antes de perguntar ao servidor. */
export const ATRASO_DA_BUSCA_MS = 250;

function useAtrasado<T>(valor: T, ms: number): T {
    const [atrasado, setAtrasado] = useState(valor);
    useEffect(() => {
        const t = window.setTimeout(() => setAtrasado(valor), ms);
        return () => window.clearTimeout(t);
    }, [valor, ms]);
    return atrasado;
}

/**
 * Seletor `+`: acha uma raiz pelo servidor e a abre numa aba.
 *
 * A busca é do servidor (`/agent-executions/branches`), paginada: acha por
 * agente, projeto, ID curto, sprint e código de card, dentro dos projetos que o
 * usuário enxerga. A lista antiga (`getAllAgentExecutions`) trazia só as 100
 * primeiras de quase mil execuções e não buscava.
 *
 * Escolher uma raiz que já tem aba foca essa aba; quem decide é `onEscolher`,
 * via `abrirAba`, que nunca duplica.
 */
export function SeletorDeRaiz({
    abertas,
    onEscolher,
}: {
    abertas: ReadonlySet<string>;
    onEscolher: (raiz: ResumoDaRaiz) => void;
}) {
    const [aberto, setAberto] = useState(false);
    const [texto, setTexto] = useState('');
    const termo = useAtrasado(texto.trim(), ATRASO_DA_BUSCA_MS);
    // A página pertence ao termo: termo novo começa na 1 já no mesmo render. Um
    // efeito que voltasse à 1 deixaria passar um render com o termo novo e a
    // página antiga, e essa chave também seria buscada.
    const [paginacao, setPaginacao] = useState({ termo, pagina: 1 });
    const pagina = paginacao.termo === termo ? paginacao.pagina : 1;
    const irPara = (p: number) => setPaginacao({ termo, pagina: p });

    const { data, isFetching, isError } = useQuery({
        queryKey: chavesDeConsulta.buscaDeRaizes(termo, pagina),
        queryFn: () => getExecutionBranchesPage({ search: termo, page: pagina, pageSize: RAIZES_POR_PAGINA }),
        enabled: aberto,
        placeholderData: keepPreviousData,
    });
    const raizes = data ? resumirBranches(data.items) : [];
    const totalDePaginas = data ? Math.max(1, Math.ceil(data.total_branches / RAIZES_POR_PAGINA)) : 1;

    const escolher = (raiz: ResumoDaRaiz) => {
        onEscolher(raiz);
        setAberto(false);
        setTexto('');
    };

    return (
        <>
            <button
                type="button"
                aria-label="Abrir raiz"
                title="Abrir raiz"
                onClick={() => setAberto(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                style={{ color: 'var(--snaps-text-secondary)' }}
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
            <Dialog open={aberto} onOpenChange={setAberto}>
                <DialogContent className="max-w-2xl gap-3">
                    <DialogTitle>Abrir raiz</DialogTitle>
                    <DialogDescription>
                        Busque por ID, sprint, código de card, agente ou projeto.
                    </DialogDescription>
                    <input
                        autoFocus
                        type="search"
                        aria-label="Buscar raiz"
                        placeholder="ex.: acc98642, Sprint 24.0, SNA-RD-210"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-white/25"
                        style={{ color: 'var(--snaps-text-primary)' }}
                    />
                    <ul aria-label="Raízes encontradas" aria-busy={isFetching} className="flex min-h-0 flex-col gap-1 overflow-y-auto">
                        {raizes.map((raiz) => (
                            <li key={raiz.rootId}>
                                <button
                                    type="button"
                                    onClick={() => escolher(raiz)}
                                    className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-white/5"
                                >
                                    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--snaps-text-primary)' }}>
                                        {rotuloDaRaiz(raiz)}
                                        {raiz.alvo.length > 0 && (
                                            <span style={{ color: 'var(--snaps-text-secondary)' }}>· {raiz.alvo.join(', ')}</span>
                                        )}
                                        {abertas.has(raiz.rootId) && (
                                            <span className="text-xs" style={{ color: 'var(--snaps-accent-blue)' }}>aberta</span>
                                        )}
                                    </span>
                                    <span className="text-xs font-mono" style={{ color: 'var(--snaps-text-secondary)' }}>
                                        {[raiz.workflowName, raiz.fase, raiz.status, `raiz ${idCurto(raiz.rootId)}`]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {isError && (
                        <p role="alert" className="text-sm" style={{ color: 'var(--snaps-error)' }}>
                            Não foi possível buscar agora.
                        </p>
                    )}
                    {data && raizes.length === 0 && !isFetching && (
                        <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                            Nenhuma raiz encontrada.
                        </p>
                    )}
                    {totalDePaginas > 1 && (
                        <div className="flex items-center justify-end gap-2 text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                            <button type="button" disabled={pagina <= 1} onClick={() => irPara(pagina - 1)}>
                                Anterior
                            </button>
                            <span>
                                {pagina} de {totalDePaginas}
                            </span>
                            <button type="button" disabled={pagina >= totalDePaginas} onClick={() => irPara(pagina + 1)}>
                                Próxima
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
