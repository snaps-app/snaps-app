import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
/**
 * Aba Scratch (P21): as notas do time na árvore inteira, editáveis em qualquer
 * nó, inclusive concluído. Abrir a aba não cria nada: a nota só nasce quando há
 * texto (`salvarScratch`). O agente não lê o scratch. Excluir uma nota, como
 * na janela `/scratch` do Cockpit antigo, pede confirmação (TP-4, paridade).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { deleteSnap, getSnaps } from '@/services/snaps';
import type { Snap } from '@/services/types';
import { salvarScratch, temTexto } from '../salvarScratch';
import { EstadoDaConsulta, Secao, Vazio, useConteudoDaAba, type PropsDaAba } from './comum';

export default function AbaScratch(props: PropsDaAba) {
    const { execucao, acoes } = props;
    const cliente = useQueryClient();
    const consulta = useConteudoDaAba(props, 'scratch', async () => {
        const snaps = await getSnaps(execucao.project_id, 0, 100, undefined, execucao.id,
            { executionScope: 'tree', bypassCache: true });
        return snaps.filter((s) => (s.snadds as any)?.type === 'scratch');
    });
    const [editando, setEditando] = useState(false);
    const [nota, setNota] = useState<Snap | null>(null);
    const [nome, setNome] = useState('');
    const [conteudo, setConteudo] = useState('');
    const [salvando, setSalvando] = useState(false);
    const escreve = acoes.podeAgir;

    const abrir = (s: Snap | null) => {
        setNota(s);
        setEditando(s === null);
        setNome(s?.name ?? '');
        setConteudo(s?.content ?? '');
    };

    const salvar = async () => {
        setSalvando(true);
        try {
            const salva = await salvarScratch({
                projectId: execucao.project_id, executionId: execucao.id, notaId: nota?.id, nome, conteudo,
            });
            if (salva) abrir(salva);
            setEditando(false);
            await cliente.invalidateQueries({ queryKey: chaves.aba(execucao.id, 'scratch') });
        } finally {
            setSalvando(false);
        }
    };

    const excluir = async () => {
        if (!nota || !window.confirm(`Excluir a nota "${nota.name}"?`)) return;
        setSalvando(true);
        try {
            await deleteSnap(nota.id, execucao.project_id);
            abrir(null);
            await cliente.invalidateQueries({ queryKey: chaves.aba(execucao.id, 'scratch') });
        } finally {
            setSalvando(false);
        }
    };

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            <button type="button" onClick={() => window.open(`/project/${execucao.project_id}/execution/${execucao.root_id || execucao.id}/scratch`, '_blank', 'noopener')}
                className="text-xs text-[var(--snaps-text-secondary)]">Abrir em nova janela</button>
            <div className="flex h-full min-h-0 flex-col gap-6 @[640px]:flex-row">
                <Secao titulo="Notas do time"
                    acao={escreve && <button type="button" onClick={() => abrir(null)}
                        className="text-[10px] font-bold text-[var(--snaps-text-secondary)] hover:text-[var(--snaps-text-primary)]">
                        Nova nota
                    </button>}>
                    {(consulta.data ?? []).length === 0 ? (
                        <Vazio>Nenhuma nota do time nesta árvore.</Vazio>
                    ) : (
                        <ul className="space-y-1 @[640px]:w-64">
                            {consulta.data!.map((s) => (
                                <li key={s.id}>
                                    <button type="button" onClick={() => abrir(s)} aria-pressed={nota?.id === s.id}
                                        className="w-full truncate rounded-lg px-3 py-2 text-left text-xs text-[var(--snaps-text-secondary)] hover:bg-white/5">
                                        {s.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Secao>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                    {escreve && editando ? (
                        <>
                            <input aria-label="Título da nota" value={nome} onChange={(e) => setNome(e.target.value)}
                                placeholder="Título"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--snaps-text-primary)] focus:outline-none" />
                            <textarea aria-label="Texto da nota" value={conteudo} onChange={(e) => setConteudo(e.target.value)}
                                placeholder="Escreva uma nota para o time…"
                                className="min-h-40 flex-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[var(--snaps-text-primary)] focus:outline-none" />
                            <div className="flex justify-end gap-2">
                                {nota && (
                                    <button type="button" onClick={excluir} disabled={salvando}
                                        className="rounded-lg border border-[var(--snaps-error)]/30 px-3 py-1.5 text-[10px] font-bold text-[var(--snaps-error)] hover:bg-[var(--snaps-error)]/10 disabled:opacity-40">
                                        Excluir nota
                                    </button>
                                )}
                                <button type="button" onClick={salvar}
                                    disabled={salvando || (!nota && !temTexto({ nome, conteudo }))}
                                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[var(--snaps-text-primary)] disabled:opacity-40">
                                    Salvar nota
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {nota && escreve && <button type="button" onClick={() => setEditando(true)} className="self-end text-xs text-[var(--snaps-text-secondary)]">Editar</button>}
                            <div className="prose prose-invert max-w-none select-text"><ReactMarkdown remarkPlugins={[remarkGfm]}>{nota?.content ?? 'Escolha uma nota.'}</ReactMarkdown></div>
                        </>
                    )}
                </div>
            </div>
        </EstadoDaConsulta>
    );
}
