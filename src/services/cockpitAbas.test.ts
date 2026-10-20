/** Abas de raízes no navegador (P2; TP-3 da Sprint 24.0). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    ABAS_VAZIAS,
    abrirAba,
    atualizarAba,
    chaveDasAbas,
    fecharAba,
    gravarAbas,
    lerAbas,
    type AbasDoCockpit,
} from '@/services/cockpitAbas';

const U = 'user-1';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

function storageEmMemoria(): Storage {
    const dados = new Map<string, string>();
    return {
        get length() { return dados.size; },
        clear: () => dados.clear(),
        getItem: (k) => dados.get(k) ?? null,
        key: (i) => [...dados.keys()][i] ?? null,
        removeItem: (k) => { dados.delete(k); },
        setItem: (k, v) => { dados.set(k, v); },
    };
}

function storageQueLanca(): Storage {
    const falha = () => { throw new DOMException('negado', 'SecurityError'); };
    return { length: 0, clear: falha, getItem: falha, key: falha, removeItem: falha, setItem: falha };
}

afterEach(() => vi.restoreAllMocks());

describe('lerAbas / gravarAbas', () => {
    it('a chave é por usuário e versionada', () => {
        expect(chaveDasAbas('abc')).toBe('snaps.cockpit.abas.v1.abc');
    });

    it('grava e lê de volta o estado de tela', () => {
        const storage = storageEmMemoria();
        const estado = abrirAba(abrirAba(ABAS_VAZIAS, A, { aba: 'plano', no: B }), C);
        expect(gravarAbas(U, estado, storage)).toBe(true);
        expect(lerAbas(U, storage)).toEqual(estado);
    });

    it('as abas de um usuário não aparecem para outro', () => {
        const storage = storageEmMemoria();
        gravarAbas(U, abrirAba(ABAS_VAZIAS, A), storage);
        expect(lerAbas('user-2', storage)).toEqual(ABAS_VAZIAS);
    });

    it('JSON corrompido abre sem abas, sem lançar', () => {
        const storage = storageEmMemoria();
        storage.setItem(chaveDasAbas(U), '{"abas": [ {');
        expect(lerAbas(U, storage)).toEqual(ABAS_VAZIAS);
        storage.setItem(chaveDasAbas(U), '"um texto"');
        expect(lerAbas(U, storage)).toEqual(ABAS_VAZIAS);
        storage.setItem(chaveDasAbas(U), '{"abas": 3}');
        expect(lerAbas(U, storage)).toEqual(ABAS_VAZIAS);
    });

    it('entrada inválida cai, as válidas ficam, e raiz repetida não duplica', () => {
        const storage = storageEmMemoria();
        storage.setItem(chaveDasAbas(U), JSON.stringify({
            abas: [{ rootId: A }, { rootId: 'nao-e-uuid' }, null, { rootId: A }, { rootId: B, scrollDaConversa: -5, no: 'x' }],
            ativa: 'sumiu',
        }));
        const lido = lerAbas(U, storage);
        expect(lido.abas.map((a) => a.rootId)).toEqual([A, B]);
        expect(lido.abas[1]).toMatchObject({ scrollDaConversa: 0, no: null });
        expect(lido.ativa).toBe(A); // ativa inexistente cai na primeira
    });

    it('storage indisponível: lê vazio e grava false, sem lançar', () => {
        expect(lerAbas(U, null)).toEqual(ABAS_VAZIAS);
        expect(gravarAbas(U, abrirAba(ABAS_VAZIAS, A), null)).toBe(false);
        expect(lerAbas(U, storageQueLanca())).toEqual(ABAS_VAZIAS);
        expect(gravarAbas(U, abrirAba(ABAS_VAZIAS, A), storageQueLanca())).toBe(false);
    });

    it('localStorage que lança no acesso (modo privado) também não derruba', () => {
        vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
            throw new DOMException('negado', 'SecurityError');
        });
        expect(lerAbas(U)).toEqual(ABAS_VAZIAS);
        expect(gravarAbas(U, abrirAba(ABAS_VAZIAS, A))).toBe(false);
    });

    it('nunca grava dado do servidor (ADR-0071, item 8)', () => {
        const storage = storageEmMemoria();
        const comDadoDoServidor = {
            abas: [{ ...abrirAba(ABAS_VAZIAS, A).abas[0], rotulo: 'Snaps · Sprint 24.0', status: 'in_progress', projectName: 'Snaps' }],
            ativa: A,
        } as unknown as AbasDoCockpit;
        gravarAbas(U, comDadoDoServidor, storage);
        const texto = storage.getItem(chaveDasAbas(U))!;
        expect(texto).not.toContain('Snaps');
        expect(texto).not.toContain('in_progress');
        expect(Object.keys(JSON.parse(texto).abas[0]).sort()).toEqual(
            ['aba', 'filtroDeCard', 'no', 'rootId', 'scrollDaConversa'],
        );
    });
});

describe('abrirAba / fecharAba', () => {
    it('abrir uma raiz já aberta foca a aba, sem duplicar', () => {
        const duas = abrirAba(abrirAba(ABAS_VAZIAS, A), B);
        const focada = abrirAba(duas, A, { aba: 'scratch' });
        expect(focada.abas.map((a) => a.rootId)).toEqual([A, B]);
        expect(focada.ativa).toBe(A);
        expect(focada.abas[0].aba).toBe('scratch');
    });

    it('raiz 404 sai da barra; as outras ficam', () => {
        const tres = abrirAba(abrirAba(abrirAba(ABAS_VAZIAS, A), B), C);
        const semB = fecharAba({ ...tres, ativa: A }, B);
        expect(semB.abas.map((a) => a.rootId)).toEqual([A, C]);
        expect(semB.ativa).toBe(A);
    });

    it('fechar a ativa foca a vizinha da direita; na última, a da esquerda', () => {
        const tres = abrirAba(abrirAba(abrirAba(ABAS_VAZIAS, A), B), C);
        expect(fecharAba({ ...tres, ativa: B }, B).ativa).toBe(C);
        expect(fecharAba({ ...tres, ativa: C }, C).ativa).toBe(B);
        expect(fecharAba(abrirAba(ABAS_VAZIAS, A), A)).toEqual(ABAS_VAZIAS);
    });

    it('atualizarAba grava estado de tela só na aba pedida', () => {
        const duas = abrirAba(abrirAba(ABAS_VAZIAS, A), B);
        const nova = atualizarAba(duas, A, { scrollDaConversa: 320, filtroDeCard: 'SNA-1' });
        expect(nova.abas[0]).toMatchObject({ scrollDaConversa: 320, filtroDeCard: 'SNA-1' });
        expect(nova.abas[1]).toEqual(duas.abas[1]);
        expect(atualizarAba(duas, C, { scrollDaConversa: 1 })).toBe(duas);
    });
});
