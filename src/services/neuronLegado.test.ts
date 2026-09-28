/** 478f0352: o app deixa de chamar o import do Neuron v1. */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });

describe('import do v1', () => {
  it('o serviço antigo não existe e ninguém chama /import do Neuron', () => {
    expect(existsSync(join(SRC, 'services', 'import.ts'))).toBe(false);
    const chamadas = arquivos(SRC)
      .filter((f) => !f.endsWith('.test.ts'))
      .filter((f) => /AGENT_URL\}\/import|importDocument/.test(readFileSync(f, 'utf-8')));
    expect(chamadas).toEqual([]);
  });

  it('o upload do workspace vai para a fila de documentos de origem da API', () => {
    const fonte = readFileSync(join(SRC, 'app', 'components', 'project', 'project-workspace.tsx'), 'utf-8');
    expect(fonte).toContain("from '@/app/ingest/ingestQueue'");
    expect(fonte).toMatch(/enfileirar\(projectId, \[file\]\)/);
  });
});
