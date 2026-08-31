import { api } from './client';

/**
 * Escrita recusada porque a tela estava sobre uma versão antiga (API 409).
 *
 * Existe como erro tipado, e não como um `Error` genérico, porque a tela precisa
 * reagir de forma diferente: um 500 é "tente de novo", enquanto isto é
 * "recarregue e reaplique". Tratar os dois igual devolveria o usuário ao mesmo
 * botão, sobre a mesma base velha, para falhar de novo.
 */
export class VersionConflictError extends Error {
    readonly expectedLockVersion?: number;
    readonly currentLockVersion?: number;
    readonly lastModifiedBy?: string;
    readonly lastModifiedAt?: string;

    constructor(corpo: any) {
        super(
            corpo?.detail ??
            'Este item foi alterado por outra pessoa depois que você o abriu.'
        );
        this.name = 'VersionConflictError';
        this.expectedLockVersion = corpo?.expected_lock_version ?? undefined;
        this.currentLockVersion = corpo?.current_lock_version ?? undefined;
        this.lastModifiedBy = corpo?.last_modified_by ?? undefined;
        this.lastModifiedAt = corpo?.last_modified_at ?? undefined;
    }
}

/**
 * PATCH carregando a versão que a tela leu (migration 058 da API).
 *
 * `expectedLockVersion` é opcional de propósito enquanto o rollout está em
 * expansão: uma tela que ainda não a conhece continua salvando. Sem ela, porém,
 * não há compare-and-swap nenhum — a garantia vale só para quem a envia.
 *
 * Este helper vive num módulo próprio, e não dentro de `governance.ts`, porque
 * o editor de workflows precisa exatamente do mesmo contrato. Enquanto ele era
 * privado de um arquivo só, a tela de workflow_templates continuou escrevendo
 * cega — a coluna, o trigger e o tipo existiam, e a única tela que grava naquela
 * tabela não mandava a versão.
 */
export async function escritaVersionada<T>(
    caminho: string,
    data: Record<string, unknown>,
    expectedLockVersion?: number,
): Promise<T> {
    const corpo = expectedLockVersion === undefined
        ? data
        : { ...data, expected_lock_version: expectedLockVersion };
    try {
        const response = await api.patch(caminho, corpo);
        return response.data;
    } catch (err: any) {
        if (err?.response?.status === 409) {
            throw new VersionConflictError(err.response.data);
        }
        throw err;
    }
}
