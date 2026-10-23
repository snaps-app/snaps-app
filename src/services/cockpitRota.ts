/**
 * O único jeito de chegar a um nó do Cockpit (TP-3 da Sprint 24.0).
 *
 * Ninguém monta a URL do Cockpit à mão. A rota antiga estava escrita em nove
 * lugares, e trocá-la é o trabalho da integração do TP-4: com uma função só,
 * a próxima troca é uma linha.
 *
 * A raiz vai no caminho e o nó na query: abas de raízes são por raiz, e trocar
 * de nó dentro dela não é trocar de aba.
 */

/** O que basta para chegar a um nó: o próprio id e o da raiz dele. */
export interface NoDoCockpit {
    id: string;
    /** A raiz grava `root_id = id`; linha antiga sem `root_id` é a própria raiz. */
    root_id?: string | null;
}

export function raizDoNo(no: NoDoCockpit): string {
    return no.root_id || no.id;
}

/** `/cockpit/<raiz>?no=<nó>`, mais `&aba=` quando houver. */
export function rotaDoNo(no: NoDoCockpit, aba?: string | null): string {
    const params = new URLSearchParams({ no: no.id });
    if (typeof window !== 'undefined') {
        const atuais = new URLSearchParams(window.location.search);
        for (const chave of ['card','plan','adr','decision','doc','sprint','snap','project']) {
            const valor = atuais.get(chave);
            if (valor) params.set(chave, valor);
        }
    }
    if (aba) params.set('aba', aba);
    return `/cockpit/${encodeURIComponent(raizDoNo(no))}?${params.toString()}`;
}

/** Lê `no` e `aba` da query da rota do Cockpit. */
export function lerRotaDoCockpit(busca: URLSearchParams): { no: string | null; aba: string | null } {
    return { no: busca.get('no') || null, aba: busca.get('aba') || null };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A raiz só é buscada se o parâmetro for um UUID inteiro. A busca do servidor
 * casa ID por prefixo: `/cockpit/ab` acharia qualquer raiz que começa com "ab"
 * e abriria uma aba que ninguém pediu.
 */
export function eIdDeExecucao(valor: string | null | undefined): valor is string {
    return !!valor && UUID.test(valor);
}
