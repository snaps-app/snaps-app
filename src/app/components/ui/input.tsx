import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full min-w-0 rounded-lg border border-input bg-input-background px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
