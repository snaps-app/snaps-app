/**
 * Trava sobre `App.tsx`: o cache é montado uma vez e os devtools não entram no
 * build de produção (ADR-0071, item 2).
 *
 * Lê a FONTE, como `App.routes.test.ts`: o que importa aqui é a forma do
 * import, e um render do App não distingue import estático de dinâmico.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FONTE = readFileSync(join(AQUI, 'App.tsx'), 'utf-8');

describe('App e o cache de consulta', () => {
    it('monta o QueryClientProvider com o cliente único', () => {
        expect(FONTE).toMatch(/<QueryClientProvider\s+client=\{consultaCliente\}>/);
        expect(FONTE).toMatch(/import\s*\{[^}]*\bconsultaCliente\b[^}]*\}\s*from\s*'@\/services\/consultaCliente'/);
    });

    it('nenhum `new QueryClient` fora de consultaCliente.ts', () => {
        expect(FONTE).not.toMatch(/new\s+QueryClient\b/);
    });

    it('os devtools não têm import estático', () => {
        expect(FONTE).not.toMatch(/^\s*import\s[^;]*['"]@tanstack\/react-query-devtools['"]/m);
    });

    it('os devtools só são importados sob import.meta.env.DEV', () => {
        const posDev = FONTE.indexOf('import.meta.env.DEV');
        const posImport = FONTE.indexOf("import('@tanstack/react-query-devtools')");
        expect(posImport, 'import dinâmico dos devtools sumiu').toBeGreaterThan(-1);
        expect(posDev, 'guarda de DEV sumiu').toBeGreaterThan(-1);
        expect(posDev).toBeLessThan(posImport);
    });
});
