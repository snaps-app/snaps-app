import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// theme.css nao e TS/JS -- nao ha como importar o :root computado sem um DOM
// real. Em vez de simular cascata CSS, o teste le o arquivo-fonte e compara os
// blocos :root e .dark diretamente: e a unica forma de travar a inversao sem
// reintroduzir um runtime de navegador no vitest.
const themeCssPath = path.resolve(__dirname, './theme.css');
const themeCss = readFileSync(themeCssPath, 'utf-8');

function extractBlock(css: string, selector: string): Record<string, string> {
  const blockMatch = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
  if (!blockMatch) throw new Error(`bloco ${selector} nao encontrado em theme.css`);
  const vars: Record<string, string> = {};
  for (const line of blockMatch[1].split('\n')) {
    const decl = line.match(/--([a-z0-9-]+):\s*([^;]+);/i);
    if (decl) vars[`--${decl[1]}`] = decl[2].trim();
  }
  return vars;
}

describe('theme.css — tokens dark-only (B0)', () => {
  const root = extractBlock(themeCss, ':root');
  const dark = extractBlock(themeCss, '\\.dark');

  it('nao usa mais a paleta clara em :root', () => {
    expect(root['--background']).not.toBe('#ffffff');
    expect(root['--foreground']).not.toBe('oklch(0.145 0 0)');
  });

  it(':root espelha os valores do bloco .dark para todo token que .dark define', () => {
    for (const [token, value] of Object.entries(dark)) {
      expect(root[token], `token ${token} deveria ser igual ao valor de .dark`).toBe(value);
    }
  });
});
