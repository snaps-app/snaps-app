/** Chaves de consulta do Cockpit (ADR-0071, item 4). */
import { describe, expect, it } from 'vitest';
import { hashKey } from '@tanstack/react-query';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';

/** Os geradores, com argumentos de exemplo, para as asserções que valem para todos. */
const TODAS: Array<[string, () => readonly unknown[]]> = [
    ['arvore', () => chaves.arvore('r1')],
    ['snapshot', () => chaves.snapshot('e1')],
    ['resumo', () => chaves.resumo('e1')],
    ['aba', () => chaves.aba('e1', 'prompt')],
    ['atividade', () => chaves.atividade('e1', { tipo: 'tool', pagina: 1 })],
    ['prs', () => chaves.prs('e1', 'snaps-app', 'abc123')],
    ['diretivas', () => chaves.diretivas()],
    ['buscaDeRaizes', () => chaves.buscaDeRaizes('SNA-12')],
    ['rotuloDaRaiz', () => chaves.rotuloDaRaiz('r1')],
    ['detalhe', () => chaves.detalhe('e1')],
];

describe('chavesDeConsulta', () => {
    it.each(TODAS)('%s gera a mesma chave para a mesma entrada', (_nome, gerar) => {
        expect(hashKey(gerar())).toBe(hashKey(gerar()));
    });

    it('as chaves são distintas entre si', () => {
        const hashes = TODAS.map(([, gerar]) => hashKey(gerar()));
        expect(new Set(hashes).size).toBe(TODAS.length);
    });

    it('segue a hierarquia da ADR-0071', () => {
        expect(chaves.arvore('r1')).toEqual(['raiz', 'r1', 'arvore']);
        expect(chaves.snapshot('e1')).toEqual(['execucao', 'e1', 'snapshot']);
        expect(chaves.resumo('e1')).toEqual(['execucao', 'e1', 'resumo']);
        expect(chaves.aba('e1', 'prompt')).toEqual(['execucao', 'e1', 'aba', 'prompt']);
        expect(chaves.atividade('e1', { pagina: 1 })).toEqual(['execucao', 'e1', 'atividade', { pagina: 1 }]);
        expect(chaves.prs('e1', 'snaps-app', 'abc')).toEqual(['execucao', 'e1', 'prs', 'snaps-app', 'abc']);
        expect(chaves.diretivas()).toEqual(['diretivas']);
    });

    it('tudo de um nó começa pelo prefixo do nó, para invalidar de uma vez', () => {
        const prefixo = chaves.execucao('e1');
        for (const chave of [
            chaves.snapshot('e1'),
            chaves.resumo('e1'),
            chaves.aba('e1', 'prompt'),
            chaves.atividade('e1', {}),
            chaves.prs('e1', 'snaps-api', 'abc'),
        ]) {
            expect(chave.slice(0, prefixo.length)).toEqual([...prefixo]);
        }
        expect(chaves.arvore('r1').slice(0, 2)).toEqual([...chaves.raiz('r1')]);
    });

    it('a ordem das chaves do filtro não muda a chave de cache', () => {
        expect(hashKey(chaves.atividade('e1', { tipo: 'tool', pagina: 2 }))).toBe(
            hashKey(chaves.atividade('e1', { pagina: 2, tipo: 'tool' })),
        );
    });

    it('nós diferentes não compartilham chave', () => {
        expect(hashKey(chaves.snapshot('e1'))).not.toBe(hashKey(chaves.snapshot('e2')));
        expect(hashKey(chaves.prs('e1', 'snaps-app', 'a'))).not.toBe(hashKey(chaves.prs('e1', 'snaps-app', 'b')));
    });

    it('a busca do seletor ignora espaço nas pontas', () => {
        expect(chaves.buscaDeRaizes('  SNA-12 ')).toEqual(chaves.buscaDeRaizes('SNA-12'));
    });

    it('cada página da busca tem a sua chave, e a primeira é o padrão', () => {
        expect(chaves.buscaDeRaizes('x')).toEqual(chaves.buscaDeRaizes('x', 1));
        expect(hashKey(chaves.buscaDeRaizes('x', 1))).not.toBe(hashKey(chaves.buscaDeRaizes('x', 2)));
    });

    it('o rótulo e o detalhe ficam sob o prefixo da raiz e do nó', () => {
        expect(chaves.rotuloDaRaiz('r1').slice(0, 2)).toEqual([...chaves.raiz('r1')]);
        expect(chaves.detalhe('e1').slice(0, 2)).toEqual([...chaves.execucao('e1')]);
    });
});
