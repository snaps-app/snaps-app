/**
 * Travas sobre todo `components/cockpit/**`, para o que vier nos outros TPs:
 *
 *   - nenhuma cor em hex: as cores vêm dos tokens `--snaps-*` (DESIGN_snaps);
 *   - nenhum `refetchInterval`: o frescor é por evento, não por relógio
 *     (ADR-0071, item 5). Exatamente duas exceções, as que a ADR nomeia, cada
 *     uma por caminho exato: (a) o indicador "última chamada ao Snaps" e (b) a
 *     checagem de novidades da árvore (emenda 5b de 21/10/2026, decisão do
 *     PO). Um arquivo novo, mesmo com nome parecido, continua falhando;
 *   - nenhum barrel `index.ts` (ADR-0063).
 *
 * Varre a pasta em vez de listar arquivos: uma lista só protege o que alguém
 * lembrou de listar.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const RAIZ = dirname(fileURLToPath(import.meta.url));

function arquivos(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
        const caminho = join(dir, nome);
        return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
    });
}

const FONTES = arquivos(RAIZ).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f));
/** As exceções da ADR-0071, item 5, e só elas. Caminho relativo a `cockpit/`. */
const EXCECOES_DO_RELOGIO: Readonly<Record<string, string>> = {
    'cabecalho/UltimaChamadaAoSnaps.tsx': 'ADR-0071 5a: indicador "última chamada ao Snaps"',
    'novidades/useNovidadesDasRaizes.ts': 'ADR-0071 5b: checagem de novidades da árvore',
};
const caminho = (f: string) => relative(RAIZ, f).split(sep).join('/');

describe('travas de components/cockpit', () => {
    it('acha os arquivos que vai conferir', () => {
        expect(FONTES.length).toBeGreaterThan(0);
    });

    it('nenhum hex de cor', () => {
        const comHex = FONTES.filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, 'utf-8')));
        expect(comHex.map((f) => relative(RAIZ, f))).toEqual([]);
    });

    it('nenhum refetchInterval fora das duas exceções nomeadas da ADR-0071 (5a e 5b)', () => {
        const comRelogio = FONTES.filter(
            (f) => !(caminho(f) in EXCECOES_DO_RELOGIO) && /refetchInterval/.test(readFileSync(f, 'utf-8')),
        );
        expect(comRelogio.map(caminho)).toEqual([]);
    });

    it('as exceções são exatamente duas, existem e são as que usam refetchInterval', () => {
        expect(Object.keys(EXCECOES_DO_RELOGIO)).toHaveLength(2);
        const comRelogio = FONTES.filter((f) => /refetchInterval/.test(readFileSync(f, 'utf-8'))).map(caminho);
        expect(comRelogio.sort()).toEqual(Object.keys(EXCECOES_DO_RELOGIO).sort());
    });

    it('nenhum barrel index.ts', () => {
        const barris = arquivos(RAIZ).filter((f) => /[\\/]index\.(ts|tsx)$/.test(f));
        expect(barris.map((f) => relative(RAIZ, f))).toEqual([]);
    });
});
