/**
 * Contexto e Prompt, que no Cockpit atual moram na sidebar (11b).
 *
 * - Contexto: a seleção revisável (`context-selection-review.tsx`) e o mission
 *   context. O mission context só é gravado por humano (D84): o agente não
 *   escreve aqui.
 * - Prompt: `execution-prompt-snapshot.tsx`. "Marcar a entrada como executada"
 *   deixa de ser estado local e vira a transição `pending → in_progress` (F24).
 * - Acrescentar docs e ADRs e abrir um doc: o `DocsModal` e o
 *   `DocumentViewModal` do Cockpit antigo (TP-4, paridade). O catálogo só é
 *   buscado ao abrir o seletor; salvar passa por `salvarContexto`.
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAgentExecution } from '@/services/agentExecutions';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { getDecisions } from '@/services/decisions';
import { getGovernanceDocs, updateGovernanceDoc } from '@/services/governance';
import type { AgentTaskExecution, Decision, GovernanceDoc } from '@/services/types';
import { ContextSelectionReview } from '@/app/components/execution/context-selection-review';
import { ExecutionPromptSnapshot } from '@/app/components/execution/execution-prompt-snapshot';
import { DocsModal } from '@/app/components/execution/docs-modal';
import { DocumentViewModal } from '@/app/components/modals/document-view-modal';
import { EstadoDaConsulta, Secao, podeEscrever, useConteudoDaAba, type PropsDaAba } from './comum';
import { textoDaRecusa } from '../useAcoesDoNo';

interface CatalogoDeContexto {
    docs: GovernanceDoc[];
    decisoes: Decision[];
    erroDosDocs: string | null;
}

const textoDoErro = (motivo: any): string => {
    const detail = motivo?.response?.data?.detail;
    return (motivo?.response?.status ? `HTTP ${motivo.response.status}: ` : '')
        + (typeof detail === 'string' ? detail : motivo?.message || 'erro desconhecido');
};

/** Seletor de docs e ADRs do contexto, com o doc aberto para ler ou editar. */
function AcrescentarDocs({ no, onSalvar }: {
    no: AgentTaskExecution;
    onSalvar: (docIds: string[], decisionIds: string[]) => Promise<unknown>;
}) {
    const cliente = useQueryClient();
    const [aberto, setAberto] = useState(false);
    const [aba, setAba] = useState<'governance' | 'adrs'>('governance');
    const [docIds, setDocIds] = useState<string[]>([]);
    const [decisionIds, setDecisionIds] = useState<string[]>([]);
    const [doc, setDoc] = useState<GovernanceDoc | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const chave = chaves.catalogoDeContexto(no.project_id);
    const catalogo = useQuery({
        queryKey: chave,
        enabled: aberto,
        queryFn: async (): Promise<CatalogoDeContexto> => {
            const [docs, decisoes] = await Promise.allSettled([getGovernanceDocs(no.project_id), getDecisions(no.project_id)]);
            return {
                docs: docs.status === 'fulfilled' ? docs.value : [],
                decisoes: decisoes.status === 'fulfilled' ? decisoes.value : [],
                // Falha aparece no modal, e não como "nenhum documento" (SNA-RD-170).
                erroDosDocs: docs.status === 'rejected' ? textoDoErro(docs.reason) : null,
            };
        },
    });

    const abrir = () => {
        setDocIds(no.context_data?.doc_ids ?? []);
        setDecisionIds(no.context_data?.decision_ids ?? []);
        setAba('governance');
        setErro(null);
        setAberto(true);
    };
    const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

    return (
        <Secao titulo="Docs e ADRs" acao={(
            <button type="button" onClick={abrir}
                className="text-[10px] font-bold text-[var(--snaps-text-secondary)] hover:text-[var(--snaps-text-primary)]">
                Acrescentar docs e ADRs
            </button>
        )}>
            {erro && <p role="alert" className="text-[10px] text-[var(--snaps-error)]">{erro}</p>}
            <DocsModal
                isOpen={aberto}
                onClose={() => setAberto(false)}
                docsModalTab={aba}
                setDocsModalTab={setAba}
                isLoadingDocs={catalogo.isLoading}
                docsError={catalogo.data?.erroDosDocs ?? (catalogo.error ? textoDoErro(catalogo.error) : null)}
                governanceDocs={catalogo.data?.docs ?? []}
                selectedDocIds={docIds}
                toggleDocSelection={(id) => setDocIds((atual) => alternar(atual, id))}
                setViewDoc={setDoc}
                decisions={catalogo.data?.decisoes ?? []}
                selectedDecisionIds={decisionIds}
                toggleDecisionSelection={(id) => setDecisionIds((atual) => alternar(atual, id))}
                handleRefresh={async () => {
                    try {
                        await onSalvar(docIds, decisionIds);
                    } catch (e: unknown) {
                        setErro(textoDaRecusa(e));
                    }
                }}
            />
            <DocumentViewModal
                isOpen={doc !== null}
                doc={doc}
                onClose={() => setDoc(null)}
                onSave={async (conteudo) => {
                    if (!doc) return;
                    // A versão que esta tela leu: se um agente reescreveu o doc, a API responde 409.
                    const salvo = await updateGovernanceDoc(doc.id, { content: conteudo }, doc.lock_version);
                    cliente.setQueryData<CatalogoDeContexto>(chave, (atual) => atual && {
                        ...atual, docs: atual.docs.map((d) => (d.id === salvo.id ? salvo : d)),
                    });
                    setDoc(salvo);
                }}
            />
        </Secao>
    );
}

export function AbaContexto(props: PropsDaAba) {
    const { execucao, acoes } = props;
    const cliente = useQueryClient();
    const consulta = useConteudoDaAba(props, 'contexto', () => getAgentExecution(execucao.id));
    const escreve = podeEscrever(props);
    // `mission_context` é `{texto, origem, autor_id, …}`; texto legado vem como string.
    const mc = consulta.data?.context_data?.mission_context;
    const gravado: string = (typeof mc === 'string' ? mc : mc?.texto) ?? '';
    const [rascunho, setRascunho] = useState(gravado);
    const [erro, setErro] = useState<string | null>(null);
    useEffect(() => setRascunho(gravado), [gravado]);

    const salvar = async () => {
        setErro(null);
        try {
            await acoes.acoes.salvarContexto({ missionContext: rascunho });
        } catch (e: unknown) {
            setErro(textoDaRecusa(e));
        }
    };

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {consulta.data && (
                <div className="space-y-8">
                    <Secao titulo="Mission context">
                        {escreve ? (
                            <div className="space-y-2">
                                <textarea
                                    aria-label="Mission context"
                                    value={rascunho}
                                    onChange={(e) => setRascunho(e.target.value)}
                                    rows={5}
                                    className="w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[var(--snaps-text-primary)] focus:outline-none"
                                />
                                <div className="flex items-center justify-end gap-3">
                                    {erro && <span role="alert" className="text-[10px] text-[var(--snaps-error)]">{erro}</span>}
                                    <button type="button" onClick={salvar}
                                        disabled={rascunho === gravado || acoes.emAndamento === 'salvarContexto'}
                                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[var(--snaps-text-primary)] disabled:opacity-40">
                                        Salvar mission context
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="select-text whitespace-pre-wrap text-xs text-[var(--snaps-text-secondary)]">
                                {gravado || 'Sem mission context.'}
                            </p>
                        )}
                    </Secao>
                    <ContextSelectionReview
                        execution={consulta.data}
                        somenteLeitura={!escreve}
                        onExecutionUpdated={(atualizada) => {
                            cliente.setQueryData(chaves.aba(execucao.id, 'contexto'), atualizada);
                            cliente.invalidateQueries({ queryKey: chaves.resumo(execucao.id) });
                            cliente.invalidateQueries({ queryKey: chaves.aba(execucao.id, 'prompt') });
                            // O sync sobe a revisão, e as ações a leem da árvore.
                            cliente.invalidateQueries({ queryKey: chaves.raiz(execucao.root_id || execucao.id) });
                            cliente.invalidateQueries({ queryKey: chaves.snapshot(execucao.id) });
                        }}
                    />
                    {escreve && (
                        <AcrescentarDocs
                            no={consulta.data}
                            onSalvar={(docIds, decisionIds) => acoes.acoes.salvarContexto({ docIds, decisionIds })}
                        />
                    )}
                </div>
            )}
        </EstadoDaConsulta>
    );
}

export function AbaPrompt(props: PropsDaAba) {
    const { execucao, acoes } = props;
    const consulta = useConteudoDaAba(props, 'prompt', () => getAgentExecution(execucao.id));
    const escreve = podeEscrever(props);
    const no = consulta.data;

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {no && (
                <ExecutionPromptSnapshot
                    execution={no}
                    entryReviewed={!escreve || no.status !== 'pending'}
                    setEntryReviewed={(valor) => {
                        if (valor && acoes.pode('marcarEntradaExecutada')) void acoes.acoes.marcarEntradaExecutada();
                    }}
                    handleRefresh={escreve ? () => acoes.acoes.salvarContexto({}).then(() => undefined) : undefined}
                    isRefreshing={acoes.emAndamento === 'salvarContexto'}
                />
            )}
        </EstadoDaConsulta>
    );
}
