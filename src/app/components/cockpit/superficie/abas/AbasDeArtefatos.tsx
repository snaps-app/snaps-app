import { TIPOS_DE_REVISAO } from '../tiposDeArtefato';
export { TIPOS_DE_REVISAO } from '../tiposDeArtefato';
/**
 * Abas de artefatos do nó: Revisões (peer review deixa de ser modal),
 * Walkthroughs (deixa de ser modal; continua editável em nó concluído) e Retro.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { getSnaps, updateSnap } from '@/services/snaps';
import { getSprints } from '@/services/sprints';
import type { Snap } from '@/services/types';
import { RelatorioDePeerReview } from '@/app/components/execution/peer-review-modal';
import { NavegadorDeWalkthroughs } from '@/app/components/execution/walkthrough-modal';
import { RetroPanel } from '@/app/components/execution/retro-panel';
import { collectWalkthroughs } from '@/app/components/execution/useCockpitWalkthroughs';
import { EstadoDaConsulta, Vazio, useConteudoDaAba, type PropsDaAba } from './comum';

/** Tipos de snap que a aba Revisões mostra. Os mesmos que `/resumo` conta. */


export function AbaRevisoes(props: PropsDaAba) {
    const { execucao } = props;
    const consulta = useConteudoDaAba(props, 'revisoes', async () => {
        const snaps = await getSnaps(execucao.project_id, 0, 100, undefined, execucao.id, { executionScope: 'tree' });
        return snaps.filter((s) => TIPOS_DE_REVISAO.includes((s.snadds as any)?.type));
    });
    const [escolhida, setEscolhida] = useState<string | null>(null);
    const revisoes = consulta.data ?? [];
    const aberta = revisoes.find((r) => r.id === escolhida) ?? revisoes[0] ?? null;

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {revisoes.length === 0 ? (
                <Vazio>As revisões nascem no plan_review e no ci_gate.</Vazio>
            ) : (
                <div className="flex flex-col gap-4 @[640px]:flex-row">
                    <ul className="space-y-1 @[640px]:w-64 @[640px]:shrink-0">
                        {revisoes.map((r) => (
                            <li key={r.id}>
                                <button type="button" onClick={() => setEscolhida(r.id)}
                                    aria-pressed={aberta?.id === r.id}
                                    className={`w-full truncate rounded-lg border px-3 py-2 text-left text-xs ${aberta?.id === r.id
                                        ? 'border-white/20 bg-white/10 text-[var(--snaps-text-primary)]'
                                        : 'border-transparent text-[var(--snaps-text-secondary)] hover:bg-white/5'}`}>
                                    {r.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="min-w-0 flex-1 select-text">
                        <RelatorioDePeerReview isLoadingPeerReview={false} peerReviewSnap={aberta} />
                    </div>
                </div>
            )}
        </EstadoDaConsulta>
    );
}

export function AbaWalkthroughs(props: PropsDaAba) {
    const { execucao, acoes } = props;
    const cliente = useQueryClient();
    const consulta = useConteudoDaAba(props, 'walkthroughs',
        () => collectWalkthroughs(execucao.project_id, execucao, true));
    const [selecionado, setSelecionado] = useState<Snap | null>(null);
    const [editando, setEditando] = useState(false);
    const [conteudo, setConteudo] = useState('');
    const [salvando, setSalvando] = useState(false);

    // Editável em qualquer nó, inclusive concluído: o selo "editado depois da
    // submissão" (TP-1) é quem conta a história. Só o papel decide.
    const salvar = acoes.podeAgir ? async () => {
        if (!selecionado) return;
        setSalvando(true);
        try {
            await updateSnap(selecionado.id, { content: conteudo });
            setEditando(false);
            await cliente.invalidateQueries({ queryKey: chaves.aba(execucao.id, 'walkthroughs') });
        } finally {
            setSalvando(false);
        }
    } : undefined;

    return (
        <EstadoDaConsulta carregando={false} erro={consulta.error}>
            <div className="flex h-[70vh] min-h-[320px] overflow-hidden rounded-2xl border border-white/10">
                <NavegadorDeWalkthroughs
                    walkthroughs={consulta.data ?? []}
                    isLoadingWalkthroughs={consulta.isLoading}
                    selectedWalkthrough={selecionado}
                    setSelectedWalkthrough={setSelecionado}
                    isEditingWalkthrough={editando}
                    setIsEditingWalkthrough={setEditando}
                    walkthroughContent={conteudo}
                    setWalkthroughContent={setConteudo}
                    isSavingWalkthrough={salvando}
                    handleSaveWalkthrough={salvar}
                />
            </div>
        </EstadoDaConsulta>
    );
}

export function AbaRetro(props: PropsDaAba) {
    const consulta = useConteudoDaAba(props, 'retro', () => getSprints(props.execucao.project_id));
    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            <RetroPanel sprints={consulta.data ?? []} execution={props.execucao} />
        </EstadoDaConsulta>
    );
}
