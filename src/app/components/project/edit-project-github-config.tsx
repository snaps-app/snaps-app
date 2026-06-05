import React, { useState } from 'react';
import { Github, Info, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { upsertGithubConfig, syncGithubProject } from '@/services/projects';

interface EditProjectGithubConfigProps {
    projectId: string;
    repoOwner: string;
    setRepoOwner: (val: string) => void;
    repoNames: string;
    setRepoNames: (val: string) => void;
    githubPat: string;
    setGithubPat: (val: string) => void;
    lastSyncAt: string;
    setLastSyncAt: (val: string) => void;
    syncStatus: string;
    setSyncStatus: (val: string) => void;
}

export const EditProjectGithubConfig: React.FC<EditProjectGithubConfigProps> = ({
    projectId,
    repoOwner,
    setRepoOwner,
    repoNames,
    setRepoNames,
    githubPat,
    setGithubPat,
    lastSyncAt,
    setLastSyncAt,
    syncStatus,
    setSyncStatus,
}) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        if (!projectId || !repoOwner || !repoNames || !githubPat) return;
        
        setIsSyncing(true);
        try {
            await upsertGithubConfig(projectId, {
                repo_owner: repoOwner,
                repo_names: repoNames,
                github_pat: githubPat
            });
            await syncGithubProject(projectId);
            setSyncStatus('success');
            setLastSyncAt(new Date().toLocaleString());
        } catch (error) {
            console.error("Sync trigger failed", error);
            setSyncStatus('failed');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-8 p-6 rounded-2xl relative overflow-hidden"
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                    <Github className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-white">GitHub Integration</h3>
                    <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                        Sync cards and issues bidirectionally.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--snaps-text-primary)' }}>Repository Owner</label>
                        <input
                            type="text"
                            value={repoOwner}
                            onChange={(e) => setRepoOwner(e.target.value)}
                            placeholder="e.g. microsoft"
                            className="w-full px-4 py-3 rounded-lg text-sm backdrop-blur-xl focus:outline-none transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--snaps-text-primary)'
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--snaps-text-primary)' }}>Repository Names</label>
                        <input
                            type="text"
                            value={repoNames}
                            onChange={(e) => setRepoNames(e.target.value)}
                            placeholder="e.g. backend, frontend"
                            className="w-full px-4 py-3 rounded-lg text-sm backdrop-blur-xl focus:outline-none transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--snaps-text-primary)'
                            }}
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Separate multiple repos with commas</p>
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: 'var(--snaps-text-primary)' }}>
                        Personal Access Token (PAT)
                        <div className="relative group cursor-help flex items-center">
                            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-gray-700">
                                <p className="mb-1"><b>Classic PAT:</b> Check <code>repo</code> scope.</p>
                                <p><b>Fine-grained PAT:</b> Under <i>Repository permissions</i>, set <b>Issues</b> to <b>Read and write</b>. Make sure to grant access to the chosen repositories.</p>
                            </div>
                        </div>
                    </label>
                    <input
                        type="password"
                        value={githubPat}
                        onChange={(e) => setGithubPat(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-3 rounded-lg text-sm backdrop-blur-xl focus:outline-none transition-all"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--snaps-text-primary)'
                        }}
                    />
                </div>
                
                {lastSyncAt && (
                    <div className="text-xs mt-2" style={{ color: 'var(--snaps-text-secondary)' }}>
                        Last Sync: {lastSyncAt} <span className={syncStatus === 'success' ? 'text-green-400' : 'text-red-400'}>({syncStatus})</span>
                    </div>
                )}

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSync}
                    disabled={!repoOwner || !repoNames || !githubPat || isSyncing}
                    className="w-full mt-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                    style={{
                        background: (repoOwner && repoNames && githubPat) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        color: (repoOwner && repoNames && githubPat) ? 'white' : 'var(--snaps-text-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: (repoOwner && repoNames && githubPat && !isSyncing) ? 'pointer' : 'not-allowed'
                    }}
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Triggering Sync...' : 'Sync with GitHub Now'}
                </motion.button>
            </div>
        </motion.div>
    );
};
