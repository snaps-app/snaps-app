import { Bot, Hash, Plus, X } from 'lucide-react';
import { Tag } from '@/app/components/shared/tag';
import type { Card, Epic, Sprint } from '@/services/types';

interface CardModalSidebarProps {
    initialData?: Card | null;
    onAiExecute?: () => void;
    setIsWizardOpen: (open: boolean) => void;
    tags: string[];
    tagInput: string;
    setTagInput: (val: string) => void;
    handleAddTag: () => void;
    removeTag: (tag: string) => void;
    epicId: string;
    setEpicId: (id: string) => void;
    sprintId: string;
    setSprintId: (id: string) => void;
    repoName: string;
    setRepoName: (name: string) => void;
    dueDate: string;
    setDueDate: (date: string) => void;
    epics?: Epic[];
    sprints?: Sprint[];
    repoNames?: string[];
}

export function CardModalSidebar({
    initialData,
    onAiExecute,
    setIsWizardOpen,
    tags,
    tagInput,
    setTagInput,
    handleAddTag,
    removeTag,
    epicId,
    setEpicId,
    sprintId,
    setSprintId,
    repoName,
    setRepoName,
    dueDate,
    setDueDate,
    epics = [],
    sprints = [],
    repoNames = [],
}: CardModalSidebarProps) {
    const tagVariants: Array<'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'red' | 'yellow' | 'slate' | 'teal' | 'indigo' | 'lime' | 'rose' | 'sky' | 'fuchsia' | 'emerald' | 'amber'> =
        ['blue', 'orange', 'purple', 'green', 'pink', 'red', 'yellow', 'slate', 'teal', 'indigo', 'lime', 'rose', 'sky', 'fuchsia', 'emerald', 'amber'];

    return (
        <div className="w-64 space-y-6">
            {/* AI Actions */}
            <div>
                <label className="block text-sm font-medium mb-2 text-white/50">AI Actions</label>
                <button
                    onClick={() => {
                        if (!initialData?.id) return;
                        if (onAiExecute) onAiExecute();
                        else setIsWizardOpen(true);
                    }}
                    disabled={!initialData?.id}
                    className="w-full py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all group overflow-hidden relative disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                        boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)'
                    }}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Bot className="w-4 h-4" />
                    <span>AI Execute Task</span>
                </button>
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-medium mb-2 text-white/50">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                        <Tag key={tag} variant={tagVariants[index % tagVariants.length]}>
                            <Hash className="w-3 h-3" />
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                        </Tag>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Add tag"
                        className="flex-1 bg-white/5 rounded-lg px-2 py-1 text-sm focus:outline-none"
                        style={{ color: 'var(--snaps-text-primary)' }}
                    />
                    <button onClick={handleAddTag} className="p-1 bg-white/10 rounded hover:bg-white/20"><Plus className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Properties */}
            <div className="space-y-4 pt-4 border-t border-white/10">
                <div>
                    <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Epic</label>
                    <select
                        value={epicId}
                        onChange={(e) => setEpicId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        style={{ color: 'var(--snaps-text-primary)' }}
                    >
                        <option value="">No Epic</option>
                        {epics.map(epic => (
                            <option key={epic.id} value={epic.id}>{epic.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Sprint</label>
                    <select
                        value={sprintId}
                        onChange={(e) => setSprintId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        style={{ color: 'var(--snaps-text-primary)' }}
                    >
                        <option value="">No Sprint</option>
                        {sprints.map(sprint => (
                            <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Repository</label>
                    <select
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        style={{ color: 'var(--snaps-text-primary)' }}
                    >
                        <option value="">Default (First Repo)</option>
                        {repoNames?.map(repo => (
                            <option key={repo} value={repo}>{repo}</option>
                        ))}
                    </select>
                    {repoNames?.length === 0 && (
                        <div className="text-[10px] text-yellow-500/70 mt-1">Configure GitHub integration in project settings.</div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1 text-white/40 uppercase tracking-wider">Due Date</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        style={{ color: 'var(--snaps-text-secondary)', colorScheme: 'dark' }}
                    />
                </div>
            </div>
        </div>
    );
}
