import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/**
 * Abas do design system (B3).
 *
 * Sobre Radix pelo mesmo motivo de `Dialog`: papel ARIA, roving tabindex e
 * navegacao por seta ja vem pagos. O que esta camada acrescenta e SO a
 * aparencia, e ela vem de token -- nenhum hex literal, como os demais
 * primitivos (ver `primitives.test.tsx`).
 *
 * Nasce compartilhado de proposito: o Hub de Settings (B3) e o Skills Center
 * dentro de Governance (B5) usam esta mesma estrutura. Duas barras de aba
 * escritas a mao divergem em foco e em teclado sem ninguem notar.
 */
export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-xl border border-border bg-muted/30 p-1',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2',
        'text-sm font-medium text-muted-foreground transition-all',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-6 outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      {...props}
    />
  );
}
