/**
 * A tela mostrava ⚠️ TRAVADA em execução CANCELLED, e 236 ACTIVE de 267.
 *
 * Em 21/09/2026, 43 execuções antigas do projeto Snaps foram descartadas
 * (lápide: `status='cancelled'` + `tombstoned_at`). A lista passou a marcar
 * cada uma delas como travada, e os contadores do topo a contá-las como em voo.
 *
 * A causa não foi o descarte — foi que "status terminal" estava escrito à mão
 * em QUATRO lugares, com quatro listas diferentes, e nenhuma conhecia
 * `cancelled`. Uma lápide nunca mais recebe `updated_at`, então a heurística de
 * "sem atividade há muito tempo" a marcava travada para sempre.
 *
 * Estes testes não verificam "a tela funciona" — verificam que existe UMA
 * definição de encerrada. Se alguém voltar a escrever a lista à mão num dos
 * consumidores, o teste de fonte cai antes de chegar na tela.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { STATUS_ENCERRADOS, estaEmVoo, estaEncerrada, foiDescartada } from './executionStatus';

const RAIZ = join(__dirname, '..');

const exec = (status: string, tombstoned_at: string | null = null) =>
    ({ status, tombstoned_at }) as any;

describe('o que conta como encerrada', () => {
    it('a lápide não está travada — é o caso que quebrou a tela', () => {
        expect(estaEncerrada(exec('cancelled', '2026-09-21T18:31:04Z'))).toBe(true);
        expect(estaEmVoo(exec('cancelled', '2026-09-21T18:31:04Z'))).toBe(false);
    });

    it('`completed` encerra tanto quanto `done`', () => {
        // Duas das quatro cópias não conheciam `completed`, que é justamente o
        // que o motor grava ao concluir uma fase.
        expect(estaEncerrada(exec('completed'))).toBe(true);
        expect(estaEncerrada(exec('done'))).toBe(true);
    });

    it.each(['cancelled', 'rolled_back', 'superseded'])(
        '`%s` encerra, embora nenhuma cópia antiga o conhecesse',
        (status) => {
            expect(estaEncerrada(exec(status))).toBe(true);
        },
    );

    it.each(['pending', 'in_progress', 'awaiting_advance'])(
        '`%s` continua em voo',
        (status) => {
            expect(estaEmVoo(exec(status))).toBe(true);
        },
    );

    it('a lápide vale mesmo se o status não tiver sido trocado', () => {
        // Hoje o descarte faz as duas coisas. Perguntar só pelo status
        // funciona por acidente e deixa de funcionar quando não fizer.
        expect(estaEncerrada(exec('pending', '2026-09-21T18:31:04Z'))).toBe(true);
    });

    it('descartada não é o mesmo que concluída', () => {
        // O contador `Done` não pode absorver as 43 lápides: elas não foram
        // entregues, foram descartadas, e a tela deve dizer a diferença.
        expect(foiDescartada(exec('cancelled'))).toBe(true);
        expect(foiDescartada(exec('completed'))).toBe(false);
        expect(foiDescartada(exec('done'))).toBe(false);
    });

    it('em voo é o complemento exato de encerrada', () => {
        const universo = [...STATUS_ENCERRADOS, 'pending', 'in_progress', 'awaiting_advance'];
        for (const status of universo) {
            expect(estaEmVoo(exec(status))).toBe(!estaEncerrada(exec(status)));
        }
    });
});

describe('a trava contra a quinta cópia', () => {
    // É o teste que as quatro divergências não tinham: cada tela resolveu o
    // próprio caso e deixou a duplicação de pé.
    const fontes = [
        'app/components/views/useAiExecutions.ts',
        'app/components/views/ai-executions.tsx',
    ];

    it.each(fontes)('%s usa a definição compartilhada', (caminho) => {
        const fonte = readFileSync(join(RAIZ, caminho), 'utf-8');
        expect(fonte).toContain('executionStatus');
    });

    it.each(fontes)('%s não reimplementa a lista de status terminal', (caminho) => {
        const fonte = readFileSync(join(RAIZ, caminho), 'utf-8');
        // A marca do defeito: comparar status contra `done`/`failed` à mão para
        // decidir se algo terminou. Em comentário é permitido — é onde a
        // história fica.
        const codigo = fonte
            .split('\n')
            .filter((linha) => !linha.trim().startsWith('//') && !linha.trim().startsWith('*'))
            .join('\n');
        expect(codigo).not.toMatch(/status\s*!==\s*'done'\s*&&\s*[\w.]*status\s*!==\s*'failed'/);
        expect(codigo).not.toMatch(/status\s*===\s*'done'\s*\|\|\s*[\w.]*status\s*===\s*'failed'/);
    });
});
