import { describe, expect, it } from 'vitest';
import {
    ROTULO_USO_NAO_MEDIDO, agruparPorTool, chamadaFalhou, formatarUso, type ChamadaDoNo,
} from './atividadeDoNo';

describe('formatarUso', () => {
    it('custo NULL vira "desconhecido", nunca zero, e a estimativa vem separada com a cobertura', () => {
        expect(formatarUso({ custo_usd: null, estimativa_usd: '0.0123', cobertura: 'partial' })).toEqual({
            custo: 'desconhecido',
            estimativa: '≈ US$ 0,0123 · cobertura parcial',
        });
    });

    it('zero só quando conhecido', () => {
        expect(formatarUso({ custo_usd: '0', estimativa_usd: null, cobertura: 'full' })).toEqual({
            custo: 'US$ 0,00', estimativa: null,
        });
    });

    it('CLI externo: uso não medido, sem nenhum "US$ 0,00"', () => {
        const uso = formatarUso(null);
        expect(uso.custo).toBe(ROTULO_USO_NAO_MEDIDO);
        expect(JSON.stringify(uso)).not.toContain('US$ 0,00');
    });
});

const chamada = (tool: string, desfecho: ChamadaDoNo['desfecho'], duracao = 10,
    desfecho_cliente: string | null = null): ChamadaDoNo => ({
    id: `${tool}-${Math.random()}`, em: '2026-10-20T10:00:00Z', tool, operacao: null, recurso: null,
    desfecho, desfecho_cliente, codigo_recusa: null, codigo_erro: null, codigo_erro_cliente: null,
    duracao_ms: duracao, turn_id: null, detalhe_expirado: false,
});

describe('agrupamento por tool', () => {
    it('conta chamadas, falhas e tempo total', () => {
        const grupos = agruparPorTool([
            chamada('a', 'ok', 5), chamada('a', 'error', 7), chamada('b', 'refused', 1),
        ]);
        expect(grupos).toEqual([
            { tool: 'a', chamadas: 2, falhas: 1, tempoTotalMs: 12 },
            { tool: 'b', chamadas: 1, falhas: 1, tempoTotalMs: 1 },
        ]);
    });

    it('sem desfecho do servidor, vale o do cliente', () => {
        expect(chamadaFalhou(chamada('a', null, 1, 'timeout'))).toBe(true);
        expect(chamadaFalhou(chamada('a', null, 1, 'ok'))).toBe(false);
    });
});
