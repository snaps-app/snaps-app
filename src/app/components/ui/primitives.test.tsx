import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import path from 'path';
import { Button } from './button';
import { Input } from './input';
import { Card } from './card';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const PRIMITIVE_FILES = ['button.tsx', 'input.tsx', 'card.tsx', 'dialog.tsx', 'tabs.tsx'];

describe('primitivos de components/ui (B1) — sem hex literal', () => {
  it.each(PRIMITIVE_FILES)('%s nao contem cor hex literal', (file) => {
    const src = readFileSync(path.resolve(__dirname, `./${file}`), 'utf-8');
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

  it('Card renderiza usando classes de token (bg-card)', () => {
    render(<Card data-testid="card">conteudo</Card>);
    expect(screen.getByTestId('card').className).toContain('bg-card');
  });

  it('Tabs expoe papeis ARIA e so o painel ativo (acessibilidade ja paga)', () => {
    render(
      <Tabs defaultValue="um">
        <TabsList>
          <TabsTrigger value="um">Um</TabsTrigger>
          <TabsTrigger value="dois">Dois</TabsTrigger>
        </TabsList>
        <TabsContent value="um">painel um</TabsContent>
        <TabsContent value="dois">painel dois</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Um' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('painel um')).toBeInTheDocument();
    expect(screen.queryByText('painel dois')).not.toBeInTheDocument();
  });

  it('Dialog abre e expoe o titulo via Radix (acessibilidade ja paga)', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Titulo do dialogo</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Titulo do dialogo')).toBeInTheDocument();
  });
});
