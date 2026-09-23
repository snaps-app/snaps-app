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
    const schema = vocabulario.directives.find(d => d.name === nome)?.schema as
        | { enum?: string[]; anyOf?: { enum?: string[]; const?: string }[] }
        | undefined;
    if (!schema) return [];
    if (schema.enum) return schema.enum;
    return (schema.anyOf || []).flatMap(a => a.enum || (a.const ? [a.const] : []));
}

export function temDiretiva(vocabulario: PhaseDirectivesVocabulary | null, nome: string): boolean {
    return !!vocabulario?.directives.some(d => d.name === nome);
}
