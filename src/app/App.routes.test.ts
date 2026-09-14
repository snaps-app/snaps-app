/**
 * Toda rota não-pública vive sob um guard (SNA-SUP-47).
 *
 * O Cockpit e o Scratchpad renderizavam sem autenticação nenhuma: eram irmãos
 * do bloco protegido, não filhos. A causa foi acoplamento — a guarda estava
 * presa ao `MainLayout`, então quando essas telas viraram fullscreen sem
 * sidebar, saíram do layout e saíram da autenticação junto, sem que nada
 * acusasse.
 *
 * Por isso este teste varre a ÁRVORE em vez de conferir rotas conhecidas: uma
 * lista de rotas para checar só protege as que alguém lembrou de listar, e o
 * defeito aqui foi exatamente uma rota que ninguém lembrou.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FONTE = readFileSync(join(AQUI, 'App.tsx'), 'utf-8');

/** Rotas que DEVEM ser alcançáveis sem sessão. Qualquer outra é regressão. */
const PUBLICAS = new Set(['/login', '/update-password', '*']);

/**
 * Intervalos `[início, fim)` de cada `<Route>` cujo `element` é um
 * `ProtectedRoute`. O fim é achado contando abertura e fechamento de `<Route`,
 * porque blocos protegidos contêm rotas aninhadas.
 */
function regioesProtegidas(fonte: string): Array<[number, number]> {
    const regioes: Array<[number, number]> = [];
    const marcador = /<ProtectedRoute>/g;
    let achado: RegExpExecArray | null;

    while ((achado = marcador.exec(fonte)) !== null) {
        const aberturaDoRoute = fonte.lastIndexOf('<Route', achado.index);
        if (aberturaDoRoute === -1) continue;
        if (regioes.some(([ini, fim]) => aberturaDoRoute > ini && aberturaDoRoute < fim)) {
            continue; // já coberto por um bloco externo
        }

        let profundidade = 0;
        let i = aberturaDoRoute;
        let fim = -1;
        while (i < fonte.length) {
            const proximoAbre = fonte.indexOf('<Route', i + 1);
            const proximoFecha = fonte.indexOf('</Route>', i + 1);
            const autoFecha = fonte.indexOf('/>', i + 1);

            if (proximoFecha === -1) break;
            if (proximoAbre !== -1 && proximoAbre < proximoFecha) {
                // Rota auto-fechada não abre bloco.
                const fimDaTag = autoFecha !== -1 && autoFecha < proximoFecha ? autoFecha : -1;
                if (fimDaTag === -1) profundidade += 1;
                i = proximoAbre;
                continue;
            }
            if (profundidade === 0) { fim = proximoFecha; break; }
            profundidade -= 1;
            i = proximoFecha;
        }
        if (fim !== -1) regioes.push([aberturaDoRoute, fim]);
    }
    return regioes;
}

describe('árvore de rotas', () => {
    it('encontra os blocos protegidos', () => {
        // Se o parser parar de achar região nenhuma, os testes abaixo passariam
        // vazios e não afirmariam nada.
        expect(regioesProtegidas(FONTE).length).toBeGreaterThan(0);
    });

    it('nenhuma rota fora do guard além das públicas declaradas', () => {
        const regioes = regioesProtegidas(FONTE);
        const desprotegidas: string[] = [];

        const rota = /<Route\s+path="([^"]+)"/g;
        let achado: RegExpExecArray | null;
        while ((achado = rota.exec(FONTE)) !== null) {
            const caminho = achado[1];
            if (PUBLICAS.has(caminho)) continue;
            const dentro = regioes.some(([ini, fim]) => achado!.index > ini && achado!.index < fim);
            if (!dentro) desprotegidas.push(caminho);
        }

        expect(desprotegidas).toEqual([]);
    });

    it('o Cockpit e o Scratchpad estão entre as protegidas', () => {
        // Regressão nomeada: foram estas duas que vazaram.
        const regioes = regioesProtegidas(FONTE);
        for (const alvo of [
            '/project/:projectId/execution/:executionId',
            '/project/:projectId/execution/:executionId/scratch',
        ]) {
            const posicao = FONTE.indexOf(`path="${alvo}"`);
            expect(posicao, `rota ${alvo} sumiu do router`).toBeGreaterThan(-1);
            const dentro = regioes.some(([ini, fim]) => posicao > ini && posicao < fim);
            expect(dentro, `${alvo} está fora do guard`).toBe(true);
        }
    });
});
