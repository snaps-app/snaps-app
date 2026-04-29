import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FilterMultiSelectProps {
  label: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  icon: any;
  onManage?: () => void;
  manageTitle?: string;
}

export function FilterMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  icon: Icon,
  onManage,
  manageTitle,
}: FilterMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const displayText =
    selectedIds.length === 0
      ? `ALL ${label}`
      : selectedIds.length === 1
      ? options.find((o) => o.id === selectedIds[0])?.name.toUpperCase() || label
      : `${selectedIds.length} SELECTED`;

  return (
    <div className="relative">
      <div className="flex items-center gap-1 px-3 py-1.5 border-r border-white/5 last:border-r-0">
        {onManage && (
          <button
            onClick={onManage}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/20 hover:text-white"
            title={manageTitle}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-[10px] font-black text-white/50 hover:text-white transition-colors uppercase tracking-tight"
        >
          {displayText}
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <ChevronDown className="w-3 h-3 opacity-30" />
          </motion.div>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 p-2 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-[70] min-w-[200px] max-h-[300px] overflow-y-auto"
            >
              <button
                onClick={() => {
                  onChange([]);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black hover:bg-white/5 transition-colors flex items-center justify-between"
              >
                ALL {label}
                {selectedIds.length === 0 && <Check className="w-3 h-3 text-green-500" />}
              </button>
              <div className="h-px bg-white/5 my-1" />
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black hover:bg-white/5 transition-colors flex items-center justify-between group"
                >
                  <span
                    className={
                      selectedIds.includes(opt.id)
                        ? 'text-white'
                        : 'text-white/40 group-hover:text-white/70'
                    }
                  >
                    {opt.name.toUpperCase()}
                  </span>
                  {selectedIds.includes(opt.id) && <Check className="w-3 h-3 text-purple-500" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
