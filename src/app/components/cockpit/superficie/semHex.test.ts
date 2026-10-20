/** Teste-trava: nenhuma cor hexadecimal literal no Cockpit novo (tokens `--snaps-*`). */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const COCKPIT = resolve(__dirname, '..');
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/;

const arquivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((nome) => {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) return arquivos(caminho);
        return /\.(ts|tsx|css)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : [];
    });

describe('Cockpit novo sem hex', () => {
    it('nenhum arquivo em src/app/components/cockpit/ tem cor hexadecimal literal', () => {
        const comHex = arquivos(COCKPIT).filter((f) => HEX.test(readFileSync(f, 'utf-8')));
        expect(comHex).toEqual([]);
    });
});
