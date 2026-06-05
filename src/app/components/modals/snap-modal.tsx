import { useState } from 'react';
import { X, Sparkles, Hash, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag } from '@/app/components/shared/tag';

interface SnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (snap: { title: string; content: string; tags: string[] }) => void;
  initialData?: {
    title: string;
    content: string;
    tags: string[];
  };
}

export function SnapModal({ isOpen, onClose, onSave, initialData }: SnapModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [flyingNodes, setFlyingNodes] = useState<Array<{ id: number; x: number; y: number; tag: string }>>([]);

  const tagVariants: Array<'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'red' | 'yellow' | 'slate' | 'teal' | 'indigo' | 'lime' | 'rose' | 'sky' | 'fuchsia' | 'emerald' | 'amber'> =
    ['blue', 'orange', 'purple', 'green', 'pink', 'red', 'yellow', 'slate', 'teal', 'indigo', 'lime', 'rose', 'sky', 'fuchsia', 'emerald', 'amber'];

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateTags = () => {
    setIsGeneratingTags(true);

    // Generate flying nodes
    const suggestedTags = ['methodology', 'knowledge-management', 'productivity', 'insight', 'core-concept'];
    const nodes = suggestedTags.map((tag, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
      tag
    }));

    setFlyingNodes(nodes);

    // Simulate AI processing
    setTimeout(() => {
      setTags([...new Set([...tags, ...suggestedTags])]);
      setIsGeneratingTags(false);
      setFlyingNodes([]);
    }, 2000);
  };

  const handleSave = () => {
    if (onSave && title.trim()) {
      onSave({ title, content, tags });
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(20px)'
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl pointer-events-auto relative"
            >
              {/* Modal Container */}
              <div
                className="rounded-2xl backdrop-blur-[40px] p-6 relative overflow-hidden"
                style={{
                  background: 'rgba(10, 10, 10, 0.95)',
                  border: '1px solid transparent',
                  backgroundImage: 'linear-gradient(rgba(10, 10, 10, 0.95), rgba(10, 10, 10, 0.95)), linear-gradient(135deg, #00D4FF, #A855F7)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 80px rgba(0, 212, 255, 0.2)'
                }}
              >
                {/* Glow Effect */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at top, rgba(0, 212, 255, 0.3), transparent 60%)'
                  }}
                />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-6">
                  <h2
                    className="text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    {initialData ? 'Edit Snap' : 'Create New Snap'}
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <X className="w-5 h-5" style={{ color: 'var(--snaps-text-secondary)' }} />
                  </motion.button>
                </div>

                {/* Form */}
                <div className="relative z-10 space-y-4">
                  {/* Title */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-2"
                      style={{ color: 'var(--snaps-text-primary)' }}
                    >
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter snap title..."
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-xl focus:outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--snaps-text-primary)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)';
                        e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.boxShadow = 'none';
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label
                      className="block text-sm font-semibold mb-2"
                      style={{ color: 'var(--snaps-text-primary)' }}
                    >
                      Content
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your snap content..."
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-xl focus:outline-none transition-all resize-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--snaps-text-primary)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)';
                        e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Tags */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className="text-sm font-semibold"
                        style={{ color: 'var(--snaps-text-primary)' }}
                      >
                        Tags
                      </label>

                      {/* AI Sparkle Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerateTags}
                        disabled={isGeneratingTags}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative overflow-hidden"
                        style={{
                          background: isGeneratingTags
                            ? 'rgba(168, 85, 247, 0.2)'
                            : 'rgba(168, 85, 247, 0.1)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          color: 'var(--snaps-accent-purple)'
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isGeneratingTags ? 'Generating...' : 'AI Suggest'}

                        {/* Flying Nodes Animation */}
                        <AnimatePresence>
                          {flyingNodes.map((node) => (
                            <motion.div
                              key={node.id}
                              className="absolute w-2 h-2 rounded-full"
                              style={{
                                background: 'var(--snaps-accent-purple)',
                                left: '50%',
                                top: '50%',
                                boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)'
                              }}
                              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                              animate={{
                                scale: [0, 1.5, 0.5],
                                x: node.x,
                                y: node.y,
                                opacity: [1, 1, 0]
                              }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 1.5, ease: 'easeOut' }}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.button>
                    </div>

                    {/* Tag Input */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add a tag..."
                        className="flex-1 px-4 py-2 rounded-lg backdrop-blur-xl focus:outline-none transition-all text-sm"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--snaps-text-primary)'
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: tagInput.trim()
                            ? 'rgba(0, 212, 255, 0.15)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          color: tagInput.trim()
                            ? 'var(--snaps-accent-blue)'
                            : 'var(--snaps-text-secondary)',
                          opacity: tagInput.trim() ? 1 : 0.5
                        }}
                      >
                        Add
                      </motion.button>
                    </div>

                    {/* Tags Display */}
                    {tags.length > 0 && (
                      <motion.div
                        className="flex flex-wrap gap-2"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <AnimatePresence>
                          {tags.map((tag, index) => (
                            <motion.div
                              key={tag}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Tag variant={tagVariants[index % tagVariants.length]}>
                                <Hash className="w-3 h-3" />
                                {tag}
                                <motion.button
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.8 }}
                                  onClick={() => handleRemoveTag(tag)}
                                  className="ml-1 hover:opacity-100 opacity-70 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </motion.button>
                              </Tag>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-end gap-3 mt-6 pt-6 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl font-medium transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--snaps-text-secondary)'
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
                    style={{
                      background: title.trim()
                        ? 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      color: title.trim() ? 'white' : 'var(--snaps-text-secondary)',
                      boxShadow: title.trim()
                        ? '0 4px 20px rgba(0, 212, 255, 0.4)'
                        : 'none',
                      opacity: title.trim() ? 1 : 0.5,
                      cursor: title.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <Check className="w-4 h-4" />
                    Save Snap
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
