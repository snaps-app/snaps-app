import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Edit2, Download, Copy, ClipboardCheck, Loader2, Check } from 'lucide-react';
import { GovernanceDoc } from '@/services/api';

export interface DocumentViewModalProps {
    isOpen: boolean;
    doc: GovernanceDoc | null;
    onClose: () => void;
    onSave?: (newContent: string) => Promise<void>;
    onCustomEdit?: () => void;
}

export function DocumentViewModal({ isOpen, doc, onClose, onSave, onCustomEdit }: DocumentViewModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (doc) {
            setEditedContent(doc.content);
        }
    }, [doc]);

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
            setCopiedId(null);
        }
    }, [isOpen]);

    if (!isOpen || !doc) return null;

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${doc.name}.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveClick = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            await onSave(editedContent);
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save doc content", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditClick = () => {
        if (onCustomEdit) {
            onCustomEdit();
        } else if (onSave) {
            setIsEditing(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-blue-500/10">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{doc.name}</h2>
                        <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider font-bold bg-blue-500/10 border-blue-500/20 text-blue-400">{doc.type}</span>
                            <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider bg-white/5 border-white/10 text-gray-400">{doc.scope || 'global'}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1 bg-black/40">
                    {isEditing ? (
                        <div className="space-y-4 h-full flex flex-col">
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full flex-1 bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/80 font-mono focus:outline-none focus:border-blue-500/50 transition-all resize-none min-h-[400px]"
                                placeholder="Enter document content (Markdown supported)..."
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors text-sm font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveClick}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="sticky top-0 float-right z-10 flex flex-col gap-2 ml-4">
                                {(onSave || onCustomEdit) && (
                                    <button
                                        onClick={handleEditClick}
                                        className="p-3 rounded-full transition-all bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/20 shadow-lg shadow-black/40"
                                        title="Editar Documento"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleDownload}
                                    className="p-3 rounded-full transition-all bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/20 shadow-lg shadow-black/40"
                                    title="Download"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="prose prose-invert prose-blue max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
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
                                        return (
                                            <blockquote className="relative group">
                                                {children}
                                                <button
                                                    onClick={() => handleCopy('doc-quote-' + Date.now(), textContent)}
                                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/15 hover:border-white/20"
                                                    title="Copiar texto"
                                                >
                                                    {copiedId ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                                </button>
                                            </blockquote>
                                        );
                                    },
                                    code: ({ className, children, ...props }) => {
                                        const isBlock = className?.includes('language-');
                                        if (!isBlock) return <code className={className} {...props}>{children}</code>;
                                        const textContent = String(children).replace(/\n$/, '');
                                        return (
                                            <div className="relative group">
                                                <code className={className} {...props}>{children}</code>
                                                <button
                                                    onClick={() => handleCopy('doc-code-' + Date.now(), textContent)}
                                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
                                                    title="Copiar código"
                                                >
                                                    {copiedId ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                                </button>
                                            </div>
                                        );
                                    }
                                }}>
                                    {doc.content}
                                </ReactMarkdown>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
