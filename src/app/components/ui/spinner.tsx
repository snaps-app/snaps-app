interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-3 h-3 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export function Spinner({ size = 'md', color = 'border-blue-500', className = '' }: SpinnerProps) {
  const sizeClass = sizeMap[size];
  const borderColor = color.startsWith('border-') ? color : `border-[${color}]`;
  return (
    <div
      className={`${sizeClass} ${borderColor} border-t-transparent rounded-full animate-spin ${className}`}
      style={!color.startsWith('border-') ? { borderColor: `${color}30`, borderTopColor: color } : undefined}
    />
  );
}
