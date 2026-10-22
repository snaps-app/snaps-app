/** Layout dos painéis do Cockpit (P14; TP-4 da Sprint 24.0). */
import { describe, expect, it } from 'vitest';
import {
    LIMITES,
    alternarPainel,
    chaveDoLayout,
    definirLargura,
    definirRecolhido,
    gravarLayout,
    largurasEfetivas,
    layoutPadrao,
    lerLayout,
    limitarLargura,
    moverDivisor,
    painelQueCresce,
    restaurarLargura,
    type LayoutDoCockpit,
} from '@/services/cockpitLayout';

const U = 'user-1';

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

const recolhidos = (workflow: boolean, superficie: boolean, conversa: boolean) => ({ workflow, superficie, conversa });
const com = (parcial: Partial<LayoutDoCockpit>): LayoutDoCockpit => ({ ...layoutPadrao(1440), ...parcial });

describe('limites', () => {
    it('Workflow de 200 a 520 px e Conversa de 300 a 640 px', () => {
        expect(limitarLargura('workflow', 100)).toBe(200);
        expect(limitarLargura('workflow', 900)).toBe(520);
        expect(limitarLargura('conversa', 120)).toBe(300);
        expect(limitarLargura('conversa', 2000)).toBe(640);
        expect(limitarLargura('conversa', 410.6)).toBe(411);
    });

    it('valor que não é número vira o padrão', () => {
        expect(limitarLargura('workflow', 'largo')).toBe(LIMITES.workflow.padrao);
        expect(limitarLargura('conversa', NaN)).toBe(LIMITES.conversa.padrao);
    });

    it('definirLargura respeita os limites e não muda o objeto se nada mudou', () => {
        const l = com({});
        expect(definirLargura(l, 'workflow', 9999).larguraWorkflow).toBe(520);
        expect(definirLargura(l, 'workflow', l.larguraWorkflow)).toBe(l);
    });
});

describe('teclado e duplo clique no divisor', () => {
    it('seta para a esquerda no divisor da Conversa alarga a Conversa 16 px', () => {
        const l = com({ larguraConversa: 400 });
        expect(moverDivisor(l, 'conversa', 'ArrowLeft').larguraConversa).toBe(416);
        expect(moverDivisor(l, 'conversa', 'ArrowRight').larguraConversa).toBe(384);
    });

    it('seta para a direita no divisor do Workflow alarga o Workflow 16 px', () => {
        const l = com({ larguraWorkflow: 300 });
        expect(moverDivisor(l, 'workflow', 'ArrowRight').larguraWorkflow).toBe(316);
        expect(moverDivisor(l, 'workflow', 'ArrowLeft').larguraWorkflow).toBe(284);
    });

    it('a seta para no limite e outra tecla não mexe', () => {
        expect(moverDivisor(com({ larguraWorkflow: 520 }), 'workflow', 'ArrowRight').larguraWorkflow).toBe(520);
        const l = com({});
        expect(moverDivisor(l, 'workflow', 'Enter')).toBe(l);
    });

    it('duplo clique restaura a largura padrão', () => {
        expect(restaurarLargura(com({ larguraWorkflow: 480 }), 'workflow').larguraWorkflow).toBe(300);
        expect(restaurarLargura(com({ larguraConversa: 600 }), 'conversa').larguraConversa).toBe(400);
    });
});

describe('recolher', () => {
    it('qualquer painel recolhe, inclusive o do centro', () => {
        expect(definirRecolhido(com({}), 'superficie', true).recolhidos).toEqual(recolhidos(false, true, false));
    });

    it('o último painel aberto não recolhe', () => {
        const so = com({ recolhidos: recolhidos(false, true, true) });
        expect(definirRecolhido(so, 'workflow', true)).toBe(so);
        expect(alternarPainel(so, 'workflow')).toBe(so);
        expect(alternarPainel(so, 'conversa').recolhidos).toEqual(recolhidos(false, true, false));
    });

    it('quem cresce: o centro, depois a Conversa, depois o Workflow', () => {
        expect(painelQueCresce(com({}))).toBe('superficie');
        expect(painelQueCresce(com({ recolhidos: recolhidos(false, true, false) }))).toBe('conversa');
        expect(painelQueCresce(com({ recolhidos: recolhidos(false, true, true) }))).toBe('workflow');
    });
});

describe('larguras efetivas', () => {
    it('a Superfície fica com o resto', () => {
        expect(largurasEfetivas(com({ larguraWorkflow: 300, larguraConversa: 400 }), 1400))
            .toEqual({ workflow: 300, conversa: 400, superficie: 700 });
    });

    it('com a Superfície recolhida, a Conversa ocupa o espaço que sobrou', () => {
        expect(largurasEfetivas(com({ recolhidos: recolhidos(false, true, false) }), 1400))
            .toEqual({ workflow: 300, conversa: 1100 });
    });

    it('com Superfície e Conversa recolhidas, o Workflow ocupa tudo', () => {
        expect(largurasEfetivas(com({ recolhidos: recolhidos(false, true, true) }), 1400)).toEqual({ workflow: 1400 });
    });

    it('sem espaço, os laterais encolhem até o mínimo para a Superfície ficar com 320 px', () => {
        const l = com({ larguraWorkflow: 500, larguraConversa: 600 });
        expect(largurasEfetivas(l, 1000)).toEqual({ workflow: 380, conversa: 300, superficie: 320 });
    });
});

describe('lerLayout / gravarLayout', () => {
    it('a chave é por usuário e versionada', () => {
        expect(chaveDoLayout('abc')).toBe('snaps.cockpit.layout.v1.abc');
    });

    it('o layout sobrevive a recarregar a página', () => {
        const storage = storageEmMemoria();
        const meu = definirLargura(definirRecolhido(com({}), 'conversa', true), 'workflow', 420);
        expect(gravarLayout(U, meu, storage)).toBe(true);
        expect(lerLayout(U, 1440, storage)).toEqual(meu);
        expect(lerLayout('outro', 1440, storage)).toEqual(layoutPadrao(1440));
    });

    it('abaixo de lg abre com os laterais recolhidos', () => {
        expect(layoutPadrao(900).recolhidos).toEqual(recolhidos(true, false, true));
        const storage = storageEmMemoria();
        gravarLayout(U, com({}), storage);
        expect(lerLayout(U, 900, storage).recolhidos).toEqual(recolhidos(true, false, true));
    });

    it('JSON corrompido, valores fora do limite e campos estranhos', () => {
        const storage = storageEmMemoria();
        storage.setItem(chaveDoLayout(U), '{nao é json');
        expect(lerLayout(U, 1440, storage)).toEqual(layoutPadrao(1440));

        storage.setItem(chaveDoLayout(U), JSON.stringify({
            larguraWorkflow: 9999, larguraConversa: -5, recolhidos: { workflow: 'sim' }, token: 'x',
        }));
        const lido = lerLayout(U, 1440, storage);
        expect(lido).toEqual({ ...layoutPadrao(1440), larguraWorkflow: 520, larguraConversa: 300 });
        expect(lido).not.toHaveProperty('token');
    });

    it('os três recolhidos não volta: a Superfície reabre', () => {
        const storage = storageEmMemoria();
        storage.setItem(chaveDoLayout(U), JSON.stringify({ recolhidos: recolhidos(true, true, true) }));
        expect(lerLayout(U, 1440, storage).recolhidos).toEqual(recolhidos(true, false, true));
    });

    it('storage que lança ou ausente: padrão, sem erro', () => {
        expect(lerLayout(U, 1440, storageQueLanca())).toEqual(layoutPadrao(1440));
        expect(gravarLayout(U, com({}), storageQueLanca())).toBe(false);
        expect(lerLayout(U, 1440, null)).toEqual(layoutPadrao(1440));
        expect(gravarLayout(U, com({}), null)).toBe(false);
    });
});
