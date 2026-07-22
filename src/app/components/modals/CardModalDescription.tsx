import React from 'react';
import { Pencil, Eye, Paperclip, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CardModalDescriptionProps {
    description: string;
    setDescription: React.Dispatch<React.SetStateAction<string>>;
    descMode: 'edit' | 'preview';
    setDescMode: (mode: 'edit' | 'preview') => void;
    isUploading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleUploadFiles: (files: FileList | null) => void;
}

export function CardModalDescription({
    description,
    setDescription,
    descMode,
    setDescMode,
    isUploading,
    fileInputRef,
    handleUploadFiles,
}: CardModalDescriptionProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-white/50">Description</label>
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => { handleUploadFiles(e.target.files); e.target.value = ''; }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Anexar arquivo (imagem, PDF, etc.) — embute como Markdown"
                    >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                        Anexar
                    </button>
                    <div className="flex rounded-lg border border-white/10 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setDescMode('edit')}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 transition-colors ${descMode === 'edit' ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                        >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                            type="button"
                            onClick={() => setDescMode('preview')}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 transition-colors ${descMode === 'preview' ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                        >
                            <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                    </div>
                </div>
            </div>
            {descMode === 'edit' ? (
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a more detailed description... (Markdown suportado)"
                    className="w-full h-48 bg-white/5 rounded-xl p-4 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono text-sm"
                    style={{ color: 'var(--snaps-text-primary)' }}
                />
            ) : (
                <div className="w-full min-h-[8rem] bg-white/5 rounded-xl p-4 prose prose-invert prose-sm max-w-none prose-img:rounded-lg prose-img:border prose-img:border-white/10 prose-img:max-h-80 prose-img:w-auto prose-img:object-contain prose-a:text-blue-400">
                    {description?.trim() ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                    ) : (
                        <p className="text-white/30 italic !mt-0">Sem descrição.</p>
                    )}
                </div>
            )}
        </div>
    );
}
