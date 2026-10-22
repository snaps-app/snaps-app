/**
 * Aba PRs e CI: por repositório do nó, o estado de CI, o link da PR e os
 * arquivos alterados (status, + e −) buscados sob demanda no GitHub (P18).
 *
 * Os arquivos são guardados pelo commit (`prs(id, repo, sha)`, `useArquivosDaPr`).
 * Quando a API responde `fixado: true` (SHA do `pr_heads_captured`), a resposta
 * não muda mais e a consulta não fica velha nunca.
 */
import { ExternalLink } from 'lucide-react';
import { getAgentExecution } from '@/services/agentExecutions';
import { linkDosArquivos, useArquivosDaPr } from '@/services/arquivosDePr';
import { EstadoDaConsulta, Secao, Vazio, useConteudoDaAba, type PropsDaAba } from './comum';

interface PrDoNo {
    repo: string;
    branch?: string;
    pr_number?: number | null;
    pr_url?: string | null;
    ci_status?: string | null;
    base_branch?: string | null;
}

const SINAL: Record<string, string> = { added: 'A', modified: 'M', removed: 'D', renamed: 'R' };

function ArquivosDoRepo({ executionId, pr, ativa }: { executionId: string; pr: PrDoNo; ativa: boolean }) {
    const consulta = useArquivosDaPr(executionId, pr.repo, ativa && !!pr.pr_number);
    const link = linkDosArquivos(pr.pr_url ?? null);
    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {consulta.data && (
                <div className="space-y-2">
                    <p className="text-[10px] text-[var(--snaps-text-secondary)]">
                        {consulta.data.arquivos.length} arquivo(s) · head {consulta.data.head_sha?.slice(0, 7) ?? '?'}
                        {consulta.data.fixado ? ' (fixado na conclusão do nó)' : ' (head atual)'}
                        {consulta.isFetching && ' · atualizando…'}
                        {consulta.data.truncado && ' · lista truncada pelo GitHub'}
                    </p>
                    <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
                        {consulta.data.arquivos.map((a) => (
                            <li key={a.caminho} className="flex items-center gap-3 px-3 py-1.5 text-[11px]">
                                <span className="w-4 font-mono font-bold text-[var(--snaps-text-secondary)]" title={a.status}>
                                    {SINAL[a.status] ?? '?'}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-mono text-[var(--snaps-text-primary)] select-text">{a.caminho}</span>
                                <span className="tabular-nums text-[var(--snaps-success)]">+{a.adicoes}</span>
                                <span className="tabular-nums text-[var(--snaps-error)]">−{a.remocoes}</span>
                                {link && (
                                    <a href={link} target="_blank" rel="noreferrer"
                                        className="text-[var(--snaps-text-secondary)] hover:text-[var(--snaps-text-primary)]">
                                        Ver no GitHub
                                    </a>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </EstadoDaConsulta>
    );
}

export default function AbaPrs(props: PropsDaAba) {
    const { execucao, ativa } = props;
    // `context_data.prs` fresco: o CI e o número da PR mudam enquanto o nó trabalha.
    const consulta = useConteudoDaAba(props, 'prs', () => getAgentExecution(execucao.id));
    const prs: PrDoNo[] = (consulta.data?.context_data?.prs ?? []).filter((p: PrDoNo) => p?.repo);

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {prs.length === 0 ? (
                <Vazio>Nenhuma PR aberta por este nó.</Vazio>
            ) : (
                <div className="space-y-8">
                    {prs.map((pr) => (
                        <Secao key={`${pr.repo}:${pr.branch}`} titulo={pr.repo}
                            acao={pr.pr_url && (
                                <a href={pr.pr_url} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-bold text-[var(--snaps-text-secondary)] hover:text-[var(--snaps-text-primary)]">
                                    #{pr.pr_number} <ExternalLink className="h-3 w-3" />
                                </a>
                            )}>
                            <p className="text-[11px] text-[var(--snaps-text-secondary)]">
                                {pr.branch} → {pr.base_branch ?? '?'} · CI: {pr.ci_status ?? 'sem resultado'}
                            </p>
                            {pr.pr_number
                                ? <ArquivosDoRepo executionId={execucao.id} pr={pr} ativa={ativa} />
                                : <Vazio>Branch sem PR aberta.</Vazio>}
                        </Secao>
                    ))}
                </div>
            )}
        </EstadoDaConsulta>
    );
}
