import { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { useParams, useNavigate } from 'react-router-dom';

const formats = [
  { id: 'md', name: 'Markdown', extension: '.md', description: 'Plain text formatting' },
  { id: 'docx', name: 'Word', extension: '.docx', description: 'Microsoft Word document' },
  { id: 'pdf', name: 'PDF', extension: '.pdf', description: 'Portable Document Format' },
  { id: 'txt', name: 'Text', extension: '.txt', description: 'Plain text file' }
];

const mockSnaps = [
  { id: '1', title: 'Zettelkasten Method', content: 'Each note should contain one idea...' },
  { id: '2', title: 'Progressive Summarization', content: 'Layer highlighting to surface key insights...' },
  { id: '3', title: 'Evergreen Notes', content: 'Notes written and organized to evolve...' },
  { id: '4', title: 'PARA Method', content: 'Projects, Areas, Resources, Archives...' },
  { id: '5', title: 'Building a Second Brain', content: 'Offloading information to an external system...' },
  { id: '6', title: 'Linking Notes', content: 'Connections create emergent insights...' }
];

export function GenerateDocument() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('md');
  const [selectedSnaps, setSelectedSnaps] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSnaps([]);
      setSelectAll(false);
    } else {
      setSelectedSnaps(mockSnaps.map(s => s.id));
      setSelectAll(true);
    }
  };

  const handleToggleSnap = (id: string) => {
    if (selectedSnaps.includes(id)) {
      setSelectedSnaps(prev => prev.filter(s => s !== id));
      setSelectAll(false);
    } else {
      setSelectedSnaps(prev => [...prev, id]);
      if (selectedSnaps.length + 1 === mockSnaps.length) {
        setSelectAll(true);
      }
    }
  };

  const handleGenerate = () => {
    if (prompt) {
      console.log('Generating document:', { prompt, format: selectedFormat, selectedSnaps });
      // Simulate generation and navigate to documents view
      setTimeout(() => {
        navigate(`/project/${projectId}/docs`);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <div className="absolute inset-0">
        <NeuralBackground />
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.15), transparent 70%)'
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate(`/project/${projectId}`)}
        className="fixed top-6 left-6 z-20 w-10 h-10 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
        style={{
          background: 'rgba(255, 107, 53, 0.1)',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)'
        }}
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-accent-orange)' }} />
      </motion.button>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-4xl"
        >
          <div
            className="rounded-3xl backdrop-blur-[40px] p-8 relative overflow-hidden"
            style={{
              background: 'rgba(10, 10, 10, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(34, 197, 94, 0.1)'
            }}
          >
            {/* Glow Effect */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at top, rgba(34, 197, 94, 0.2), transparent 60%)'
              }}
            />

            {/* Header */}
            <div className="relative z-10 mb-8">
              <motion.h1
                className="text-4xl font-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #22C55E 0%, #00D4FF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Generate Document
              </motion.h1>
              <motion.p
                className="text-sm"
                style={{ color: 'var(--snaps-text-secondary)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Create a document from your project knowledge base
              </motion.p>
            </div>

            {/* Form Fields */}
            <div className="relative z-10 space-y-6">
              {/* Prompt */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--snaps-text-primary)' }}
                >
                  Document Prompt *
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what document you want to generate... e.g., 'Create a comprehensive guide about the Zettelkasten method using all related notes'"
                  rows={4}
                  className="w-full px-6 py-4 rounded-xl backdrop-blur-xl focus:outline-none transition-all resize-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--snaps-text-primary)',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.3), inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                />
              </motion.div>

              {/* Format Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label
                  className="block text-sm font-semibold mb-3"
                  style={{ color: 'var(--snaps-text-primary)' }}
                >
                  Document Format
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formats.map((format, index) => (
                    <motion.button
                      key={format.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedFormat(format.id)}
                      className="p-4 rounded-xl text-left transition-all relative overflow-hidden"
                      style={{
                        background: selectedFormat === format.id
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: selectedFormat === format.id
                          ? '2px solid rgba(34, 197, 94, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: selectedFormat === format.id
                          ? '0 0 20px rgba(34, 197, 94, 0.3)'
                          : 'none'
                      }}
                    >
                      {selectedFormat === format.id && (
                        <motion.div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            background: 'var(--snaps-accent-green)',
                            boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)'
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                          <Check className="w-4 h-4" style={{ color: 'white' }} />
                        </motion.div>
                      )}
                      <h3
                        className="font-semibold mb-1"
                        style={{
                          color: selectedFormat === format.id
                            ? 'var(--snaps-accent-green)'
                            : 'var(--snaps-text-primary)',
                          fontSize: '14px'
                        }}
                      >
                        {format.name}
                      </h3>
                      <p className="text-xs mb-1" style={{ color: 'var(--snaps-text-secondary)' }}>
                        {format.extension}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Select Snaps */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <label
                    className="text-sm font-semibold"
                    style={{ color: 'var(--snaps-text-primary)' }}
                  >
                    Select Snaps for Context ({selectedSnaps.length} selected)
                  </label>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: selectAll ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: 'var(--snaps-accent-green)'
                    }}
                  >
                    {selectAll ? 'Deselect All' : 'Select All'}
                  </motion.button>
                </div>
                <div
                  className="rounded-xl p-4 max-h-64 overflow-y-auto"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="space-y-2">
                    {mockSnaps.map((snap) => (
                      <motion.button
                        key={snap.id}
                        onClick={() => handleToggleSnap(snap.id)}
                        whileHover={{ scale: 1.01, x: 4 }}
                        className="w-full p-3 rounded-lg text-left transition-all flex items-start gap-3"
                        style={{
                          background: selectedSnaps.includes(snap.id)
                            ? 'rgba(34, 197, 94, 0.1)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: selectedSnaps.includes(snap.id)
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: selectedSnaps.includes(snap.id)
                              ? 'var(--snaps-accent-green)'
                              : 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          {selectedSnaps.includes(snap.id) && (
                            <Check className="w-3 h-3" style={{ color: 'white' }} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4
                            className="text-sm font-semibold mb-1"
                            style={{ color: 'var(--snaps-text-primary)' }}
                          >
                            {snap.title}
                          </h4>
                          <p
                            className="text-xs"
                            style={{ color: 'var(--snaps-text-secondary)' }}
                          >
                            {snap.content}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Generate Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={!prompt}
                  className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: prompt
                      ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: prompt ? 'white' : 'var(--snaps-text-secondary)',
                    boxShadow: prompt
                      ? '0 8px 32px rgba(34, 197, 94, 0.4)'
                      : 'none',
                    opacity: prompt ? 1 : 0.5,
                    cursor: prompt ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                  Generate Document
                  <Download className="w-5 h-5" />
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
