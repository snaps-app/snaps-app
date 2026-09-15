import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// theme.css nao e TS/JS -- nao ha como importar o :root computado sem um DOM
// real. Em vez de simular cascata CSS, o teste le o arquivo-fonte e verifica
// os valores declarados em :root diretamente.
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

// Valores que o bloco .dark tinha antes de a inversao torna-lo redundante
// (removido nesta mesma mudanca) -- travados aqui para nao regredir.
const EXPECTED_DARK_VALUES: Record<string, string> = {
  '--background': 'oklch(0.145 0 0)',
  '--foreground': 'oklch(0.985 0 0)',
  '--card': 'oklch(0.145 0 0)',
  '--card-foreground': 'oklch(0.985 0 0)',
  '--popover': 'oklch(0.145 0 0)',
  '--popover-foreground': 'oklch(0.985 0 0)',
  '--primary': 'oklch(0.985 0 0)',
  '--primary-foreground': 'oklch(0.205 0 0)',
  '--secondary': 'oklch(0.269 0 0)',
  '--secondary-foreground': 'oklch(0.985 0 0)',
  '--muted': 'oklch(0.269 0 0)',
  '--muted-foreground': 'oklch(0.708 0 0)',
  '--accent': 'oklch(0.269 0 0)',
  '--accent-foreground': 'oklch(0.985 0 0)',
  '--destructive': 'oklch(0.396 0.141 25.723)',
  '--destructive-foreground': 'oklch(0.637 0.237 25.331)',
  '--border': 'oklch(0.269 0 0)',
  '--input': 'oklch(0.269 0 0)',
  '--ring': 'oklch(0.439 0 0)',
};

describe('theme.css — tokens dark-only (B0)', () => {
  const root = extractBlock(themeCss, ':root');

  it('nao usa mais a paleta clara em :root', () => {
    expect(root['--background']).not.toBe('#ffffff');
    expect(root['--foreground']).not.toBe('oklch(0.145 0 0)');
  });

  it(':root tem os valores que o bloco .dark (removido, agora redundante) tinha', () => {
    for (const [token, value] of Object.entries(EXPECTED_DARK_VALUES)) {
      expect(root[token], `token ${token}`).toBe(value);
    }
  });

  it('o bloco .dark foi removido -- nunca era aplicado em runtime e ficou redundante', () => {
    expect(() => extractBlock(themeCss, '\\.dark')).toThrow();
  });

  it('o custom-variant "dark" morto foi removido (nenhum uso de dark: em src)', () => {
    expect(themeCss).not.toContain('@custom-variant dark');
  });
});
