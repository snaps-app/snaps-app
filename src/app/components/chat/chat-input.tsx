import { motion } from 'motion/react';
import { Mic, Send } from 'lucide-react';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSend: () => void;
}

export function ChatInput({ inputValue, setInputValue, handleSend }: ChatInputProps) {
  return (
    <div className="p-6 border-t border-white/10">
      <div
        className="relative rounded-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask your second brain..."
          className="w-full px-6 py-4 pr-28 bg-transparent text-sm focus:outline-none"
          style={{ color: 'var(--snaps-text-primary)' }}
        />

        {/* Mic Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute right-16 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <Mic className="w-5 h-5" style={{ color: '#EF4444' }} />
        </motion.button>

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: inputValue.trim()
              ? 'rgba(34, 197, 94, 0.2)'
              : 'rgba(255, 255, 255, 0.05)',
            border: inputValue.trim()
              ? '1px solid rgba(34, 197, 94, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: inputValue.trim()
              ? '0 0 20px rgba(34, 197, 94, 0.6), inset 0 0 10px rgba(34, 197, 94, 0.2)'
              : 'none',
            opacity: inputValue.trim() ? 1 : 0.5
          }}
        >
          <Send className="w-5 h-5" style={{ color: inputValue.trim() ? 'var(--snaps-accent-green)' : '#888' }} />
        </motion.button>
      </div>
    </div>
  );
}
