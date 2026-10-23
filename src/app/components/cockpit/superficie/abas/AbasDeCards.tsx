import { useSessaoDoNo } from '../../sessao/useSessaoDoNo';
/**
 * Abas que leem os cards do escopo (P8, `cardsDoEscopo`): Cards, Tasks e
 * Cenários. Cada uma tem a sua chave de consulta; os painéis são os do
 * Cockpit atual, e as tasks deixam de ser modal.
 *
 * Clicar num card abre o `CardModal`, como no Cockpit antigo (TP-4, paridade).
 * O que o modal precisa (épicos, sprints, colunas e repos) só é buscado ao
 * abrir o card. Em nó concluído, ou para viewer, o modal é só leitura.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import { cardsDoEscopo } from '@/services/executionScope';
import { updateCard } from '@/services/cards';
import { getEpics } from '@/services/epics';
import { getSprints } from '@/services/sprints';
import { getProjectBoards } from '@/services/boards';
import { getGithubConfig } from '@/services/projects';
import type { Card } from '@/services/types';
import { CardsPanel } from '@/app/components/execution/cards-panel';
import { BDDPanel } from '@/app/components/execution/bdd-panel';
import { ListaDeTasks } from '@/app/components/execution/tasks-modal';
import { CardModal } from '@/app/components/modals/card-modal';
import { EstadoDaConsulta, podeEscrever, useConteudoDaAba, type PropsDaAba } from './comum';

/** As colunas do quadro quando o projeto não tem quadro (o mesmo padrão do Cockpit antigo). */
const COLUNAS_PADRAO = [
    { id: 'todo', title: 'To Do' },
    { id: 'inprogress', title: 'In Progress' },
    { id: 'review', title: 'Review' },
    { id: 'done', title: 'Done' },
];

function useApoioDoCard(projectId: string, ativo: boolean) {
    return useQuery({
        queryKey: chaves.apoioDoCard(projectId),
        enabled: ativo,
        queryFn: async () => {
            const [epics, sprints, quadros, github] = await Promise.all([
                getEpics(projectId),
                getSprints(projectId),
                getProjectBoards(projectId).catch(() => []),
                getGithubConfig(projectId).catch(() => null),
            ]);
            const quadro = quadros.find((q) => q.board_type === 'roadmap') ?? quadros[0];
            const repos = (github?.repo_names ?? '').split(',').map((r) => r.trim()).filter(Boolean);
            return { epics, sprints, colunas: quadro?.columns?.length ? quadro.columns : COLUNAS_PADRAO, repos };
        },
    });
}

export function AbaCards(props: PropsDaAba) {
    const sessao=useSessaoDoNo();
    const { execucao } = props;
    const cliente = useQueryClient();
    const consulta = useConteudoDaAba(props, 'cards', () => cardsDoEscopo(props.execucao));
    const [aberto, setAberto] = useState<Card | null>(null);
    const apoio = useApoioDoCard(execucao.project_id, aberto !== null);
    const escreve = podeEscrever(props);

    // O card mudou: as três abas de cards e a faixa do cabeçalho (cards da raiz).
    const atualizarCards = () => Promise.all([
        ...(['cards', 'tasks', 'cenarios'] as const).map((aba) => cliente.invalidateQueries({ queryKey: chaves.aba(execucao.id, aba) })),
        cliente.invalidateQueries({ queryKey: chaves.cardsDaRaiz(execucao.root_id || execucao.id, []).slice(0, 3) }),
    ]);

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            <CardsPanel cards={consulta.data ?? []} epics={apoio.data?.epics ?? []} sprints={apoio.data?.sprints ?? []} setSelectedCard={setAberto} />
            <CardModal
                isOpen={aberto !== null}
                onClose={() => setAberto(null)}
                initialData={aberto}
                epics={apoio.data?.epics ?? []}
                sprints={apoio.data?.sprints ?? []}
                columns={apoio.data?.colunas ?? COLUNAS_PADRAO}
                repoNames={apoio.data?.repos ?? []}
                readOnly={!escreve}
                canDelete={escreve}
                onSave={async (dados) => {
                    if (!aberto || !escreve) return;
                    const abrirSessao=sessao.capturarEscrita(execucao.id);
                    await updateCard(aberto.id, dados);
                    await abrirSessao();
                    await atualizarCards();
                }}
                onDelete={async () => {
                    setAberto(null);
                    await atualizarCards();
                }}
            />
        </EstadoDaConsulta>
    );
}

export function AbaTasks(props: PropsDaAba) {
    const consulta = useConteudoDaAba(props, 'tasks', () => cardsDoEscopo(props.execucao));
    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            <div className="flex flex-col">
                <ListaDeTasks cards={consulta.data ?? []} />
            </div>
        </EstadoDaConsulta>
    );
}

export function AbaCenarios(props: PropsDaAba) {
    const consulta = useConteudoDaAba(props, 'cenarios', () => cardsDoEscopo(props.execucao));
    const { acoes } = props.acoes;
    const escreve = podeEscrever(props);
    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            <BDDPanel
                cards={consulta.data ?? []}
                onApproveBDD={escreve ? (card) => acoes.validarBdd(card).then(() => undefined) : undefined}
                onToggleScenario={escreve
                    ? (card, i, cenario) => acoes.aprovarCenario(card, i, cenario).then(() => undefined)
                    : undefined}
            />
        </EstadoDaConsulta>
    );
}
