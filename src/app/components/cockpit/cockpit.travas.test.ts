/**
 * Travas sobre todo `components/cockpit/**`, para o que vier nos outros TPs:
 *
 *   - nenhuma cor em hex: as cores vêm dos tokens `--snaps-*` (DESIGN_snaps);
 *   - nenhum `refetchInterval`: o frescor é por evento, não por relógio
 *     (ADR-0071, item 5). A única exceção prevista é o indicador "última
 *     chamada ao Snaps" (TP-4), que mora num arquivo com esse nome;
 *   - nenhum barrel `index.ts` (ADR-0063).
 *
 * Varre a pasta em vez de listar arquivos: uma lista só protege o que alguém
 * lembrou de listar.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const RAIZ = dirname(fileURLToPath(import.meta.url));

function arquivos(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
        const caminho = join(dir, nome);
        return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
    });
}

const FONTES = arquivos(RAIZ).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f));
const EXCECAO_DO_RELOGIO = /UltimaChamada/;

describe('travas de components/cockpit', () => {
    it('acha os arquivos que vai conferir', () => {
        expect(FONTES.length).toBeGreaterThan(0);
    });

    it('nenhum hex de cor', () => {
        const comHex = FONTES.filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, 'utf-8')));
        expect(comHex.map((f) => relative(RAIZ, f))).toEqual([]);
    });

    it('nenhum refetchInterval fora do indicador de última chamada', () => {
        const comRelogio = FONTES.filter(
            (f) => !EXCECAO_DO_RELOGIO.test(f) && /refetchInterval/.test(readFileSync(f, 'utf-8')),
        );
        expect(comRelogio.map((f) => relative(RAIZ, f))).toEqual([]);
    });

    it('nenhum barrel index.ts', () => {
        const barris = arquivos(RAIZ).filter((f) => /[\\/]index\.(ts|tsx)$/.test(f));
        expect(barris.map((f) => relative(RAIZ, f))).toEqual([]);
    });
});
