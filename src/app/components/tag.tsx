import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'orange' | 'purple' | 'green' | 'pink';
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
      pink: 'bg-[var(--snaps-accent-pink)]/20 text-[var(--snaps-accent-pink)]'
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
