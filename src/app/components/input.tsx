import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[var(--snaps-text-primary)] text-sm">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'bg-[var(--snaps-surface)] text-white border border-white/10 rounded-lg px-4 py-2.5 outline-none transition-all duration-200',
            'placeholder:text-[var(--snaps-placeholder)]',
            'focus:border-[var(--snaps-accent-blue)] focus:shadow-[0_0_15px_rgba(0,212,255,0.3)]',
            error && 'border-[var(--snaps-error)] focus:border-[var(--snaps-error)]',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-[var(--snaps-error)] text-xs">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
