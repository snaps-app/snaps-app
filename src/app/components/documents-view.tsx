import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Trash2, Eye, File, FileSpreadsheet, Image as ImageIcon, Clock, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from './neural-background';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';

interface Document {
  id: string;
  name: string;
  type: 'generated' | 'imported';
  format: 'md' | 'docx' | 'pdf' | 'txt' | 'xlsx' | 'png' | 'jpg';
  size: string;
  date: string;
  thumbnail?: string;
}

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Zettelkasten Method Guide',
    type: 'generated',
    format: 'md',
    size: '24 KB',
    date: '2h ago'
  },
  {
    id: '2',
    name: 'Second Brain Framework Overview',
    type: 'generated',
    format: 'pdf',
    size: '156 KB',
    date: '5h ago'
  },
  {
    id: '3',
    name: 'PARA Method Explained',
    type: 'generated',
    format: 'docx',
    size: '48 KB',
    date: '1d ago'
  },
  {
    id: '4',
    name: 'Research Paper - Knowledge Management',
    type: 'imported',
    format: 'pdf',
    size: '2.4 MB',
    date: '2d ago'
  },
  {
    id: '5',
    name: 'Meeting Notes 2024',
    type: 'imported',
    format: 'txt',
    size: '12 KB',
    date: '3d ago'
  },
  {
    id: '6',
    name: 'Project Roadmap',
    type: 'imported',
    format: 'xlsx',
    size: '86 KB',
    date: '4d ago'
  }
];

const formatIcons = {
  md: FileText,
  docx: FileText,
  pdf: FileText,
  txt: FileText,
  xlsx: FileSpreadsheet,
  png: ImageIcon,
  jpg: ImageIcon
};

const formatColors = {
  md: { bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)', color: '#00D4FF' },
  docx: { bg: 'rgba(0, 112, 192, 0.1)', border: 'rgba(0, 112, 192, 0.3)', color: '#0070C0' },
  pdf: { bg: 'rgba(255, 59, 48, 0.1)', border: 'rgba(255, 59, 48, 0.3)', color: '#FF3B30' },
  txt: { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' },
  xlsx: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', color: '#22C55E' },
  png: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', color: '#A855F7' },
  jpg: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', color: '#A855F7' }
};

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'generated' | 'imported'>('generated');
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      api.getProject(projectId).then(setProject);
    }
  }, [projectId]);

  const filteredDocuments = mockDocuments.filter(doc => doc.type === activeTab);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

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
      <div className="relative z-10 min-h-screen p-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <motion.h1
              className="text-4xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Documents
            </motion.h1>
            <motion.p
              className="text-sm"
              style={{ color: 'var(--snaps-text-secondary)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Browse and manage documents for {project?.name || 'your project'}
            </motion.p>
          </div>

          {/* Tabs */}
          <motion.div
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              onClick={() => setActiveTab('generated')}
              className="relative px-6 py-3 rounded-lg font-medium text-sm transition-all"
              style={{
                background: activeTab === 'generated'
                  ? 'rgba(0, 212, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: activeTab === 'generated'
                  ? '1px solid rgba(0, 212, 255, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                color: activeTab === 'generated'
                  ? 'var(--snaps-accent-blue)'
                  : 'var(--snaps-text-secondary)',
                boxShadow: activeTab === 'generated'
                  ? '0 0 20px rgba(0, 212, 255, 0.3)'
                  : 'none'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Generated Documents
              <span
                className="ml-2 px-2 py-0.5 rounded text-xs"
                style={{
                  background: activeTab === 'generated'
                    ? 'rgba(0, 212, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {mockDocuments.filter(d => d.type === 'generated').length}
              </span>
            </motion.button>

            <motion.button
              onClick={() => setActiveTab('imported')}
              className="relative px-6 py-3 rounded-lg font-medium text-sm transition-all"
              style={{
                background: activeTab === 'imported'
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: activeTab === 'imported'
                  ? '1px solid rgba(168, 85, 247, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                color: activeTab === 'imported'
                  ? 'var(--snaps-accent-purple)'
                  : 'var(--snaps-text-secondary)',
                boxShadow: activeTab === 'imported'
                  ? '0 0 20px rgba(168, 85, 247, 0.3)'
                  : 'none'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Imported Documents
              <span
                className="ml-2 px-2 py-0.5 rounded text-xs"
                style={{
                  background: activeTab === 'imported'
                    ? 'rgba(168, 85, 247, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {mockDocuments.filter(d => d.type === 'imported').length}
              </span>
            </motion.button>
          </motion.div>

          {/* Documents Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {filteredDocuments.map((doc, index) => {
                const Icon = formatIcons[doc.format];
                const colors = formatColors[doc.format];

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="relative rounded-xl backdrop-blur-xl overflow-hidden cursor-pointer group"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* File Icon Area */}
                    <div
                      className="flex items-center justify-center h-32 relative"
                      style={{
                        background: colors.bg,
                        borderBottom: `1px solid ${colors.border}`
                      }}
                    >
                      <Icon className="w-16 h-16" style={{ color: colors.color }} />

                      {/* Format Badge */}
                      <div
                        className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold uppercase"
                        style={{
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.color
                        }}
                      >
                        .{doc.format}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-4">
                      <h3
                        className="font-semibold mb-2 truncate"
                        style={{ color: 'var(--snaps-text-primary)' }}
                      >
                        {doc.name}
                      </h3>

                      <div className="flex items-center justify-between text-xs mb-3">
                        <span
                          className="flex items-center gap-1"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          <HardDrive className="w-3 h-3" />
                          {doc.size}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          style={{ color: 'var(--snaps-text-secondary)' }}
                        >
                          <Clock className="w-3 h-3" />
                          {doc.date}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                          style={{
                            background: 'rgba(0, 212, 255, 0.1)',
                            border: '1px solid rgba(0, 212, 255, 0.3)',
                            color: 'var(--snaps-accent-blue)'
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: 'var(--snaps-accent-green)'
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: 'rgba(255, 59, 48, 0.1)',
                            border: '1px solid rgba(255, 59, 48, 0.3)',
                            color: '#FF3B30'
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at center, ${colors.color}10, transparent 70%)`,
                        boxShadow: `inset 0 0 20px ${colors.color}20`
                      }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Empty State */}
          {filteredDocuments.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <File className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--snaps-text-secondary)', opacity: 0.5 }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--snaps-text-primary)' }}>
                No documents yet
              </h3>
              <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                {activeTab === 'generated'
                  ? 'Generate your first document to get started'
                  : 'Import documents to see them here'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
