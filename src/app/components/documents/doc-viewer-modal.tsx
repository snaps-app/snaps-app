import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Edit2, Download, Copy, ClipboardCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GovernanceDoc } from '@/services/types';

interface DocViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewDoc: GovernanceDoc | null;
  onEdit: () => void;
}

export function DocViewerModal({ isOpen, onClose, viewDoc, onEdit }: DocViewerModalProps) {
  if (!isOpen || !viewDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-green-500/10"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div>
            <h2 className="text-2xl font-bold text-white">{viewDoc.name}</h2>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider font-bold bg-green-500/10 border-green-500/20 text-green-400">
                {viewDoc.type}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider bg-white/5 border-white/10 text-gray-400">
                project
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 bg-black/40">
          <div className="sticky top-6 float-right z-10 flex flex-col gap-2 ml-4">
            <motion.button
              onClick={onEdit}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-full transition-all"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: 'var(--snaps-accent-green)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
              }}
              title="Editar"
            >
              <Edit2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={() => {
                const blob = new Blob([viewDoc.content], { type: 'text/markdown;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${viewDoc.name}.md`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-full transition-all"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: 'var(--snaps-accent-green)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
              }}
              title="Download"
            >
              <Download className="w-5 h-5" />
            </motion.button>
          </div>
          <div className="prose prose-invert prose-green max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                blockquote: ({ children }) => {
                  const textContent = React.Children.toArray(children)
                    .map((child: any) => {
                      if (typeof child === 'string') return child;
                      if (child?.props?.children) {
                        const nested = React.Children.toArray(child.props.children);
                        return nested.map((n: any) => (typeof n === 'string' ? n : n?.props?.children || '')).join('');
                      }
                      return '';
                    })
                    .join('')
                    .trim();
                  const [copied, setCopied] = useState(false);
                  return (
                    <blockquote className="relative group">
                      {children}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(textContent);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/15 hover:border-white/20"
                        title="Copiar texto"
                      >
                        {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                    </blockquote>
                  );
                },
                code: ({ className, children, ...props }) => {
                  const isBlock = className?.includes('language-');
                  if (!isBlock) return <code className={className} {...props}>{children}</code>;
                  const textContent = String(children).replace(/\n$/, '');
                  const [copied, setCopied] = useState(false);
                  return (
                    <div className="relative group">
                      <code className={className} {...props}>{children}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(textContent);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
                        title="Copiar código"
                      >
                        {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                    </div>
                  );
                }
              }}
            >
              {viewDoc.content}
            </ReactMarkdown>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
