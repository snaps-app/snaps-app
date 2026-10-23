/**
 * A virada para o Cockpit novo (TP-4 da Sprint 24.0; decisão do PO de 20/10:
 * sem flag, para todos de uma vez, e nenhum link salvo pode quebrar).
 *
 * Lê as FONTES, como `App.routes.test.ts`: o que importa é o router apontar
 * para o redirecionamento e ninguém mais montar a URL antiga.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = join(AQUI, '..');
const APP = readFileSync(join(AQUI, 'App.tsx'), 'utf-8');

function fontes(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) return fontes(caminho);
        return /\.(ts|tsx)$/.test(nome) && !/\.test\.(ts|tsx)$/.test(nome) ? [caminho] : [];
    });
}

/** O Cockpit antigo, apagado na virada. */
const APAGADOS = [
    'app/components/execution/execution-cockpit.tsx',
    'app/components/execution/execution-sidebar.tsx',
    'app/components/execution/execution-history-tree.tsx',
    'app/components/execution/useCockpitState.ts',
    'app/components/execution/useExecutionCockpit.ts',
    'app/components/execution/useCockpitActions.ts',
    'app/components/execution/useCockpitSisterExecutions.ts',
    'app/components/execution/execution-requirements-checklist.tsx',
    'app/components/execution/execution-project-sprint-details.tsx',
    'app/components/execution/execution-agent-context.tsx',
    'app/components/execution/useCockpitDocs.ts',
    'app/components/views/scratch-view.tsx',
];

describe('virada para o Cockpit novo', () => {
    it('as rotas antigas continuam respondendo, pelo redirecionamento', () => {
        expect(APP).toContain('path="/project/:projectId/execution/:executionId" element={<RedirecionaParaCockpit />}');
        expect(APP).toContain(
            'path="/project/:projectId/execution/:executionId/scratch" element={<JanelaDoScratch />}',
        );
    });

    it('o Cockpit antigo não existe mais, e ninguém o importa', () => {
        expect(APAGADOS.filter((f) => existsSync(join(SRC, f)))).toEqual([]);
        const nomes = APAGADOS.map((f) => f.replace(/^.*\//, '').replace(/\.tsx?$/, ''));
        const importam = fontes(SRC).flatMap((f) => {
            const texto = readFileSync(f, 'utf-8');
            return nomes.filter((n) => new RegExp(`from\\s+['"][^'"]*/${n}['"]`).test(texto)).map((n) => `${relative(SRC, f)} → ${n}`);
        });
        expect(importam).toEqual([]);
    });

    it('nenhum código monta a URL antiga do Cockpit: toda URL de nó sai de rotaDoNo', () => {
        const antigas = fontes(SRC)
            .filter((f) => readFileSync(f, 'utf-8').includes('/execution/${') && !f.endsWith('AbaScratch.tsx'))
            .map((f) => relative(SRC, f));
        expect(antigas).toEqual([]);
    });
});
