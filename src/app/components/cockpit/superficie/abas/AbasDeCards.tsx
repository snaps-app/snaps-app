/**
 * Abas que leem os cards do escopo (P8, `cardsDoEscopo`): Cards, Tasks e
 * Cenários. Cada uma tem a sua chave de consulta; os painéis são os do
 * Cockpit atual, e as tasks deixam de ser modal.
 */
import { cardsDoEscopo } from '@/services/executionScope';
import { CardsPanel } from '@/app/components/execution/cards-panel';
import { BDDPanel } from '@/app/components/execution/bdd-panel';
import { ListaDeTasks } from '@/app/components/execution/tasks-modal';
import { EstadoDaConsulta, podeEscrever, useConteudoDaAba, type PropsDaAba } from './comum';

export function AbaCards(props: PropsDaAba) {
    const consulta = useConteudoDaAba(props, 'cards', () => cardsDoEscopo(props.execucao));
    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            <CardsPanel cards={consulta.data ?? []} epics={[]} sprints={[]} setSelectedCard={() => undefined} />
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
