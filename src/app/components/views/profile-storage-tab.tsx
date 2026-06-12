import { motion } from 'motion/react';

interface CircularProgressProps {
  value: number;
  max: number;
  label: string;
  size?: number;
}

function CircularProgress({ value, max, label, size = 120 }: CircularProgressProps) {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={45}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
          />
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={45}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.6))'
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{
            background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="text-sm font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
          {label}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--snaps-text-secondary)' }}>
          {value}GB / {max}GB
        </div>
      </div>
    </div>
  );
}

interface StorageTabContentProps {
    ScanLine: React.FC;
}

export const StorageTabContent: React.FC<StorageTabContentProps> = ({ ScanLine }) => {
    return (
        <motion.div
            key="storage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--snaps-text-primary)' }}>
                Storage Usage
            </h3>

            {/* Circular Progress Rings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <CircularProgress value={6.8} max={10} label="Projects" />
                <CircularProgress value={3.2} max={10} label="Media Files" />
                <CircularProgress value={1.5} max={10} label="Documents" />
            </div>

            <ScanLine />

            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                Storage Details
            </h3>
            <div className="space-y-3">
                {[
                    { name: 'Text & Notes', size: '2.1 GB', color: '#00D4FF' },
                    { name: 'Images & Videos', size: '3.2 GB', color: '#A855F7' },
                    { name: 'Audio Files', size: '1.8 GB', color: '#FF6B35' },
                    { name: 'Documents', size: '1.5 GB', color: '#22C55E' },
                    { name: 'Other', size: '2.7 GB', color: '#FF0080' }
                ].map((item, index) => (
                    <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-xl backdrop-blur-xl"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                    background: item.color,
                                    boxShadow: `0 0 10px ${item.color}`
                                }}
                            />
                            <span style={{ color: 'var(--snaps-text-primary)' }}>
                                {item.name}
                            </span>
                        </div>
                        <span className="font-mono text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                            {item.size}
                        </span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};
