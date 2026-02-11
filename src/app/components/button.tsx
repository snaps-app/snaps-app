import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'fab';
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    const baseStyles = 'px-6 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed outline-none';
    
    const variants = {
      primary: `bg-[var(--snaps-accent-blue)] text-white hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-95`,
      secondary: `bg-transparent border border-white text-white hover:bg-white/10 active:scale-95`,
      ghost: `bg-transparent text-white hover:underline`,
      fab: `w-12 h-12 rounded-full bg-[var(--snaps-accent-blue)] text-white flex items-center justify-center hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] active:scale-95`
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
