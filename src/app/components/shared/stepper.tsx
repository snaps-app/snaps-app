import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepProps {
  label: string;
  status: 'pending' | 'active' | 'complete';
}

export interface StepperProps {
  steps: StepProps[];
  className?: string;
}

export const Stepper = ({ steps, className }: StepperProps) => {
  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3 relative">
          {/* Connecting line */}
          {index < steps.length - 1 && (
            <div className="absolute left-2 top-8 w-0.5 h-full bg-white/10" />
          )}
          
          {/* Step icon */}
          <div className={cn(
            'relative z-10 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 transition-all duration-300',
            step.status === 'pending' && 'bg-gray-600 border border-gray-500',
            step.status === 'active' && 'bg-[var(--snaps-accent-blue)] border-2 border-[var(--snaps-accent-blue)] animate-pulse shadow-[0_0_15px_rgba(0,212,255,0.5)]',
            step.status === 'complete' && 'bg-[var(--snaps-success)] border border-[var(--snaps-success)]'
          )}>
            {step.status === 'active' && (
              <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
            )}
            {step.status === 'complete' && (
              <Check className="w-2.5 h-2.5 text-white" />
            )}
          </div>
          
          {/* Step text */}
          <div className="flex-1 pb-6">
            <p className={cn(
              'text-xs transition-colors duration-300',
              step.status === 'pending' && 'text-[var(--snaps-text-secondary)]',
              step.status === 'active' && 'text-[var(--snaps-accent-blue)]',
              step.status === 'complete' && 'text-[var(--snaps-text-primary)]'
            )}>
              {step.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
