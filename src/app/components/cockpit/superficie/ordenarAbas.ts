/**
 * A regra de ordem das abas (P6), numa função só. A barra da Superfície e o
 * trilho recolhido (TP-4) leem daqui.
 *
 *  1. A aba aberta fica em primeiro e nunca muda de lugar sozinha.
 *  2. Abas com ação sua pendente vêm logo depois (luz). A mais recente fica mais perto.
 *  3. Abas com novidade sem ação vêm em seguida (ponto azul).
 *  4. As demais seguem a relevância da fase; depois, a ordem do catálogo.
 *     Scratch vem sempre por último.
 *  5. Abas vazias vão para o fim, dentro de "Mais", com o motivo.
 *  6. Aba com luz nunca cai em "Mais", nem com o painel estreito.
 *  7. Ao abrir um nó, a aba com ação pendente vira a aberta (`abaAoAbrirNo`).
 *
 * `vazias` sai de `resumo.abas` (`abasVazias`), nunca do conteúdo das abas.
 */
import type { PendenciaDoNo } from '@/services/resumoDoNo';
import { CHAVES_DE_ABA, abaEmFocoDaFase, eChaveDeAba, relevanciaDaFase, type ChaveDeAba } from './catalogo';

export interface AbaOrdenada {
    chave: ChaveDeAba;
    aberta: boolean;
    luz: boolean;
    novidade: number;
    vazia: boolean;
    motivoVazio: string | null;
}

export interface OrdemDasAbas {
    visiveis: AbaOrdenada[];
    mais: AbaOrdenada[];
}

export type Novidades = Partial<Record<ChaveDeAba, number>>;

function instante(pendencia: PendenciaDoNo): number {
    const t = pendencia.desde ? Date.parse(pendencia.desde) : NaN;
    return Number.isNaN(t) ? 0 : t;
}

/** Abas com luz, da pendência mais recente para a mais antiga. */
export function abasComLuz(pendencias: readonly PendenciaDoNo[]): ChaveDeAba[] {
    const maisRecente = new Map<ChaveDeAba, number>();
    for (const p of pendencias) {
        if (!eChaveDeAba(p.aba)) continue;
        maisRecente.set(p.aba, Math.max(maisRecente.get(p.aba) ?? -Infinity, instante(p)));
    }
    return [...maisRecente.entries()].sort((a, b) => b[1] - a[1]).map(([aba]) => aba);
}

export function ordenarAbas(
    ativa: ChaveDeAba,
    pendencias: readonly PendenciaDoNo[],
    novidades: Novidades,
    faseKey: string | null | undefined,
    vazias: Readonly<Record<string, string>>,
    capacidade: number = CHAVES_DE_ABA.length,
): OrdemDasAbas {
    const luzes = abasComLuz(pendencias);
    const comLuz = new Set(luzes);
    const relevancia = relevanciaDaFase(faseKey);

    const descrever = (chave: ChaveDeAba): AbaOrdenada => ({
        chave,
        aberta: chave === ativa,
        luz: comLuz.has(chave),
        novidade: chave === ativa ? 0 : novidades[chave] ?? 0,
        vazia: chave in vazias,
        motivoVazio: vazias[chave] ?? null,
    });

    const ordem: ChaveDeAba[] = [ativa];
    const incluir = (chave: ChaveDeAba) => { if (!ordem.includes(chave)) ordem.push(chave); };

    luzes.forEach(incluir);
    const porRelevancia = [
        ...relevancia,
        ...CHAVES_DE_ABA.filter((c) => !relevancia.includes(c) && c !== 'scratch'),
        'scratch' as const,
    ];
    porRelevancia.filter((c) => (novidades[c] ?? 0) > 0 && !(c in vazias)).forEach(incluir);
    porRelevancia.filter((c) => !(c in vazias)).forEach(incluir);
    porRelevancia.forEach(incluir);

    const abas = ordem.map(descrever);
    // A aberta e as com luz sempre ficam visíveis; vazias sem luz vão para "Mais".
    const fixas = abas.filter((a) => a.aberta || a.luz);
    const livres = abas.filter((a) => !a.aberta && !a.luz && !a.vazia);
    const espaco = Math.max(0, capacidade - fixas.length);
    const visiveis = new Set([...fixas, ...livres.slice(0, espaco)].map((a) => a.chave));

    return {
        visiveis: abas.filter((a) => visiveis.has(a.chave)),
        mais: abas.filter((a) => !visiveis.has(a.chave)),
    };
}

/**
 * Regra 7: ao abrir um nó, a aba com ação pendente mais recente vira a aberta;
 * sem pendência, a aba em foco da fase (§3.2). Viewer recebe `pendencias: []`
 * do servidor, então para ele a regra cai sempre na fase.
 */
export function abaAoAbrirNo(
    pendencias: readonly PendenciaDoNo[],
    faseKey: string | null | undefined,
): ChaveDeAba {
    return abasComLuz(pendencias)[0] ?? abaEmFocoDaFase(faseKey);
}
