import { limparLeituras } from './cockpitAbas';
/**
 * O `QueryClient` único do app (ADR-0071, item 2).
 *
 * Um só, criado aqui e montado em `App.tsx`. Dois clientes seriam dois caches:
 * a mesma árvore buscada duas vezes, e uma invalidação feita num que nunca
 * chega ao outro — a tela mostraria dado velho sem erro nenhum.
 *
 * Os padrões são a política, não um detalhe:
 *   - `refetchOnWindowFocus: false`: o frescor vem por evento SSE (item 5), e
 *     voltar à aba do navegador não pode disparar uma rajada de chamadas;
 *   - `retry: 1`: uma segunda chance para a rede, não três para um 404;
 *   - `staleTime: 30 s` e `gcTime: 10 min`: voltar a uma aba de raiz fechada
 *     há pouco usa o cache em vez de buscar tudo de novo.
 *
 * Sem persistência em disco (item 8): o cache vive só em memória.
 */
import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

type PadroesDeConsulta = NonNullable<DefaultOptions['queries']>;

export const PADROES_DE_CONSULTA = {
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 30_000,
    gcTime: 600_000,
} as const satisfies PadroesDeConsulta;

/**
 * Cria um cliente com os padrões do app. `sobrescrever` existe para o teste
 * (`retry: false`), que assim roda sob a MESMA política da produção, e não sob
 * uma cópia dela que pode divergir.
 */
export function criarConsultaCliente(sobrescrever: PadroesDeConsulta = {}): QueryClient {
    return new QueryClient({
        defaultOptions: { queries: { ...PADROES_DE_CONSULTA, ...sobrescrever } },
    });
}

export const consultaCliente = criarConsultaCliente();

/** Formato de `onAuthStateChange` de `auth.service`: recebe o usuário ou `null`. */
type AssinarSessao = (
    callback: (usuario: { id: string } | null) => void,
) => { data: { subscription: { unsubscribe: () => void } } };

/**
 * Limpa o cache quando a identidade da sessão muda (item 9; ADR-0020 e 0033).
 *
 * O cache é por usuário. Sair, ou entrar com outra conta no mesmo navegador sem
 * recarregar, não pode deixar dado de projeto do usuário anterior à vista do
 * próximo. Por isso a regra é a identidade, e não o evento: renovar o token
 * dispara o mesmo callback com o mesmo usuário e não deve apagar nada.
 *
 * A função de inscrição chega por parâmetro porque `auth.service` importa este
 * módulo (o `signOut` limpa o cache); importar de volta seria circular.
 */
export function vincularCacheASessao(cliente: QueryClient, assinar: AssinarSessao): () => void {
    let ultimo: string | null | undefined; // undefined: ainda não sabemos quem é
    const { data } = assinar((usuario) => {
        const atual = usuario?.id ?? null;
        if (ultimo !== undefined && atual !== ultimo) {
            if (ultimo) limparLeituras(ultimo);
            cliente.clear();
        }
        ultimo = atual;
    });
    return () => data.subscription.unsubscribe();
}
