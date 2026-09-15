import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import path from 'path';
import { Button } from './button';
import { Input } from './input';

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

describe('primitivos de components/ui (B1) — sem hex literal', () => {
  it('button.tsx nao contem cor hex literal', () => {
    const src = readFileSync(path.resolve(__dirname, './button.tsx'), 'utf-8');
    expect(src).not.toMatch(HEX_COLOR);
  });

  it('input.tsx nao contem cor hex literal', () => {
    const src = readFileSync(path.resolve(__dirname, './input.tsx'), 'utf-8');
    expect(src).not.toMatch(HEX_COLOR);
  });

  it('Button renderiza usando classes de token (bg-primary)', () => {
    render(<Button>Salvar</Button>);
    const el = screen.getByRole('button', { name: 'Salvar' });
    expect(el.className).toContain('bg-primary');
  });

  it('Input renderiza usando classes de token (bg-input-background)', () => {
    render(<Input placeholder="nome" />);
    const el = screen.getByPlaceholderText('nome');
    expect(el.className).toContain('bg-input-background');
  });
});
