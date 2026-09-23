/**
 * Vocabulário de fase — o que o motor LÊ, vindo da API, nunca uma cópia local.
 *
 * O editor oferecia `join_strategy` e `on_success` depois de o motor deixar de
 * lê-las (ADR-0045, SNA-RD-167): uma lista escrita à mão aqui diverge na
 * primeira diretiva nova. A fonte é `GET /workflow-templates/phase-directives`.
 *
 * O filtro na gravação é o que impede o editor de devolver o que a API recusa:
 * um template antigo ainda chega com `join_strategy: "wait_all"`, e salvá-lo sem
 * mexer mandaria a diretiva aposentada de volta (422).
 */
import type { PhaseConfigItem } from '@/services/types';
import type { PhaseDirectivesVocabulary } from '@/services/workflowTemplates';

/** Só as diretivas que o motor lê. Todo o resto sai antes de gravar. */
export function somenteDiretivasLidas(
    phase: PhaseConfigItem,
    vocabulario: PhaseDirectivesVocabulary,
): PhaseConfigItem {
    const lidas = new Set(vocabulario.directives.map(d => d.name));
    return Object.fromEntries(
        Object.entries(phase).filter(([chave]) => lidas.has(chave)),
    ) as PhaseConfigItem;
}

/** Diretivas aposentadas que a fase ainda declara com valor — para avisar. */
export function aposentadasDeclaradas(
    phase: PhaseConfigItem,
    vocabulario: PhaseDirectivesVocabulary,
): PhaseDirectivesVocabulary['retired'] {
    const valores = phase as unknown as Record<string, unknown>;
    return vocabulario.retired.filter(r => valores[r.name] != null);
}

/** Valores aceitos por uma diretiva de enum, lidos do schema da API. */
export function opcoesDaDiretiva(
    vocabulario: PhaseDirectivesVocabulary,
    nome: string,
): string[] {
    const schema = vocabulario.directives.find(d => d.name === nome)?.schema;
    if (!schema) return [];
    return literais(schemaDoCampo(schema, vocabulario.defs));
}

export function temDiretiva(vocabulario: PhaseDirectivesVocabulary | null, nome: string): boolean {
    return !!vocabulario?.directives.some(d => d.name === nome);
}

// --- Montagem de campo a partir do schema (SNA-RD-176) ---------------------
//
// O editor nao sabe de antemao a forma de `session_policy` ou `context_budget`:
// ele le o JSON schema que a API serve e escolhe o controle pelo tipo. Diretiva
// nova com tipo conhecido aparece sem mudar o app.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Schema = Record<string, any>;
type Defs = PhaseDirectivesVocabulary['defs'];

function resolverRef(schema: Schema | undefined, defs: Defs): Schema {
    if (schema && typeof schema.$ref === 'string') {
        const nome = schema.$ref.split('/').pop() as string;
        return resolverRef(defs?.[nome] as Schema | undefined, defs);
    }
    return schema || {};
}

/** Resolve `$ref` e tira o ramo `null` de `anyOf`: `Optional[X]` vira `X`. */
export function schemaDoCampo(schema: Schema | undefined, defs: Defs): Schema {
    const s = resolverRef(schema, defs);
    if (!Array.isArray(s.anyOf)) return s;
    const ramos = s.anyOf.map((r: Schema) => resolverRef(r, defs)).filter((r: Schema) => r.type !== 'null');
    const meta = { title: s.title, description: s.description };
    if (ramos.length === 1) return { ...ramos[0], ...stripUndefined(meta) };
    return { ...s, anyOf: ramos };
}

function stripUndefined(o: Schema): Schema {
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

function literais(s: Schema): string[] {
    if (Array.isArray(s.enum)) return s.enum;
    if (s.const !== undefined) return [s.const];
    if (Array.isArray(s.anyOf) && s.anyOf.every((r: Schema) => r.enum || r.const !== undefined)) {
        return s.anyOf.flatMap((r: Schema) => literais(r));
    }
    return [];
}

export type TipoDeCampo =
    | { tipo: 'enum'; opcoes: string[] }
    | { tipo: 'boolean' }
    | { tipo: 'inteiro'; minimo?: number }
    | { tipo: 'lista_enum'; opcoes: string[] }
    | { tipo: 'lista_texto' }
    | { tipo: 'objeto'; propriedades: Record<string, Schema>; obrigatorias: string[] }
    | { tipo: 'texto' }
    // `safety_margin`: literal OU inteiro positivo.
    | { tipo: 'misto' }
    | { tipo: 'json' };

/** Controle que o schema pede. `schema` ja passou por `schemaDoCampo`. */
export function tipoDoCampo(schema: Schema, defs: Defs): TipoDeCampo {
    const opcoes = literais(schema);
    if (opcoes.length) return { tipo: 'enum', opcoes };
    if (schema.type === 'boolean') return { tipo: 'boolean' };
    if (schema.type === 'integer' || schema.type === 'number') {
        const minimo = schema.minimum ?? (schema.exclusiveMinimum != null ? schema.exclusiveMinimum + 1 : undefined);
        return { tipo: 'inteiro', minimo };
    }
    if (schema.type === 'array') {
        const itens = schemaDoCampo(schema.items, defs);
        const opcoesItem = literais(itens);
        if (opcoesItem.length) return { tipo: 'lista_enum', opcoes: opcoesItem };
        if (itens.type === 'string') return { tipo: 'lista_texto' };
        return { tipo: 'json' };
    }
    if (schema.type === 'object' && schema.properties) {
        return { tipo: 'objeto', propriedades: schema.properties, obrigatorias: schema.required || [] };
    }
    if (schema.type === 'string') return { tipo: 'texto' };
    if (Array.isArray(schema.anyOf) && schema.anyOf.some((r: Schema) => r.type === 'integer')) {
        return { tipo: 'misto' };
    }
    return { tipo: 'json' };
}

// --- Condicoes de avanco (SNA-RD-176) --------------------------------------

export type CondicaoEditavel = {
    name: string;
    kind: 'implemented' | 'human_judgment' | 'unknown';
    label?: string;
};

/**
 * Catalogo do motor, mais o que a fase declara e o motor nao conhece: esconder
 * essa condicao faria o humano nao ver por que o gate recusa.
 */
export function condicoesParaEditar(
    vocabulario: PhaseDirectivesVocabulary | null,
    declaradas: Record<string, unknown> | null | undefined,
): CondicaoEditavel[] {
    const catalogo: CondicaoEditavel[] = vocabulario?.conditions ?? [];
    const conhecidas = new Set(catalogo.map(c => c.name));
    const extras = Object.keys(declaradas || {})
        .filter(n => !conhecidas.has(n))
        .map(name => ({ name, kind: 'unknown' as const }));
    return [...catalogo, ...extras];
}

/** Rotulo neutro: o nome da condicao, nunca uma fase de algum template. */
export function rotuloDaCondicao(c: CondicaoEditavel): string {
    if (c.label) return c.label;
    const texto = c.name.replace(/_/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}
