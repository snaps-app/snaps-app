import { motion } from 'motion/react';
import type { Message } from '@/services/types';

interface ChatMessageProps {
  message: Message;
  index: number;
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`max-w-[80%] ${isAssistant ? 'mr-auto' : 'ml-auto'}`}>
        {isAssistant ? (
          // Agent Bubble
          <div
            className="p-4 rounded-2xl backdrop-blur-xl relative"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid transparent',
              backgroundImage: 'linear-gradient(rgba(10, 10, 10, 0.8), rgba(10, 10, 10, 0.8)), linear-gradient(135deg, #00D4FF, #A855F7)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.15), inset 0 0 20px rgba(0, 212, 255, 0.05)'
            }}
          >
            {/* Left Neon Border */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
              style={{
                background: 'linear-gradient(180deg, #00D4FF 0%, #A855F7 100%)',
                boxShadow: '0 0 10px rgba(0, 212, 255, 0.6)'
              }}
            />
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--snaps-text-primary)' }}
            >
              {message.content}
            </p>
            <span
              className="text-xs mt-2 block"
              style={{ color: 'var(--snaps-text-secondary)' }}
            >
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        ) : (
          // User Bubble
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--snaps-text-primary)' }}
            >
              {message.content}
            </p>
            <span
              className="text-xs mt-2 block text-right"
              style={{ color: 'var(--snaps-text-secondary)' }}
            >
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
