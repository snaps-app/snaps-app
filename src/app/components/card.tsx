import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'compact' | 'expanded';
  children?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, size = 'expanded', children, ...props }, ref) => {
    const baseStyles = `
      bg-white/5 
      backdrop-blur-[12px] 
      border border-white/10 
      rounded-xl 
      transition-all 
      duration-300
      hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]
      hover:border-[var(--snaps-accent-blue)]/50
      hover:shadow-[0_0_20px_rgba(0,212,255,0.15)]
      hover:-translate-y-1
    `;
    
    const sizeStyles = {
      compact: 'p-4',
      expanded: 'p-6'
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
