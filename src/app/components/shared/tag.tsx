import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'red' | 'yellow' | 'slate' | 'teal' | 'indigo' | 'lime' | 'rose' | 'sky' | 'fuchsia' | 'emerald' | 'amber';
  children?: React.ReactNode;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant = 'blue', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs';

    const variants = {
      blue: 'bg-[var(--snaps-accent-blue)]/20 text-[var(--snaps-accent-blue)]',
      orange: 'bg-[var(--snaps-accent-orange)]/20 text-[var(--snaps-accent-orange)]',
      purple: 'bg-[var(--snaps-accent-purple)]/20 text-[var(--snaps-accent-purple)]',
      green: 'bg-[var(--snaps-accent-green)]/20 text-[var(--snaps-accent-green)]',
      pink: 'bg-[var(--snaps-accent-pink)]/20 text-[var(--snaps-accent-pink)]',
      red: 'bg-[var(--snaps-accent-red)]/20 text-[var(--snaps-accent-red)]',
      yellow: 'bg-[var(--snaps-accent-yellow)]/20 text-[var(--snaps-accent-yellow)]',
      slate: 'bg-[var(--snaps-accent-slate)]/20 text-[var(--snaps-accent-slate)]',
      teal: 'bg-[var(--snaps-accent-teal)]/20 text-[var(--snaps-accent-teal)]',
      indigo: 'bg-[var(--snaps-accent-indigo)]/20 text-[var(--snaps-accent-indigo)]',
      lime: 'bg-[var(--snaps-accent-lime)]/20 text-[var(--snaps-accent-lime)]',
      rose: 'bg-[var(--snaps-accent-rose)]/20 text-[var(--snaps-accent-rose)]',
      sky: 'bg-[var(--snaps-accent-sky)]/20 text-[var(--snaps-accent-sky)]',
      fuchsia: 'bg-[var(--snaps-accent-fuchsia)]/20 text-[var(--snaps-accent-fuchsia)]',
      emerald: 'bg-[var(--snaps-accent-emerald)]/20 text-[var(--snaps-accent-emerald)]',
      amber: 'bg-[var(--snaps-accent-amber)]/20 text-[var(--snaps-accent-amber)]'
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Tag.displayName = 'Tag';
