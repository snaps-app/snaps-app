import React, { useState, useEffect } from 'react';
import { ProjectApiKeyPublic, ProjectApiKeyCreated, getProjectApiKeys, createProjectApiKey, revokeProjectApiKey } from '@/services/api';
import { Key, Copy, Check, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Spinner } from './ui/spinner';

interface ProjectApiKeysPanelProps {
  projectId: string;
}

export function ProjectApiKeysPanel({ projectId }: ProjectApiKeysPanelProps) {
  const [apiKeys, setApiKeys] = useState<ProjectApiKeyPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyOrigins, setNewKeyOrigins] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ProjectApiKeyCreated | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, [projectId]);

  const loadApiKeys = async () => {
    setIsLoading(true);
    try {
      const keys = await getProjectApiKeys(projectId);
      setApiKeys(keys);
    } catch (err) {
      console.error('Failed to load API keys', err);
      setError('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    
    setIsCreating(true);
    setError(null);
    try {
      const origins = newKeyOrigins.split(',').map(s => s.trim()).filter(Boolean);
      const newKey = await createProjectApiKey(projectId, {
        name: newKeyName.trim(),
        allowed_origins: origins
      });
      setNewlyCreatedKey(newKey);
      setApiKeys(prev => [...prev, newKey]);
      setNewKeyName('');
      setNewKeyOrigins('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone and any applications using it will immediately lose access.')) return;
    
    try {
      await revokeProjectApiKey(projectId, keyId);
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, is_active: false } : k));
    } catch (err) {
      console.error('Failed to revoke key', err);
      setError('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Spinner size="md" color="purple" /></div>;
  }

  return (
    <div className="mt-8 p-6 rounded-2xl relative overflow-hidden" style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
          <Key className="w-5 h-5" style={{ color: 'var(--snaps-accent-purple)' }} />
        </div>
        <div>
          <h3 className="font-semibold text-white">API Keys</h3>
          <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
            Manage access keys for public client-admin boards.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* New Key Result */}
      <AnimatePresence>
        {newlyCreatedKey && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 rounded-xl"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white mb-1">New API Key Created!</h4>
                <p className="text-xs text-blue-300 mb-3">
                  Please copy this key and store it somewhere safe. For security reasons, <strong>it will not be shown again</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded bg-black/40 border border-white/10 text-sm font-mono text-white select-all">
                    {newlyCreatedKey.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey.key)}
                    className="p-2 rounded hover:bg-white/10 transition-colors"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
                  </button>
                </div>
                <button
                  onClick={() => setNewlyCreatedKey(null)}
                  className="mt-3 text-xs text-white/50 hover:text-white transition-colors"
                >
                  I have saved this key
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create New Key */}
      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--snaps-text-primary)' }}>Key Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production Client Board"
              className="w-full px-4 py-3 rounded-lg text-sm backdrop-blur-xl focus:outline-none transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--snaps-text-primary)'
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--snaps-text-primary)' }}>Allowed Origins (Optional)</label>
            <input
              type="text"
              value={newKeyOrigins}
              onChange={(e) => setNewKeyOrigins(e.target.value)}
              placeholder="https://client-domain.com"
              className="w-full px-4 py-3 rounded-lg text-sm backdrop-blur-xl focus:outline-none transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--snaps-text-primary)'
              }}
            />
            <p className="text-[10px] text-gray-500 mt-1">Comma-separated list of domains for CORS validation</p>
          </div>
        </div>
        <button
          onClick={handleCreateKey}
          disabled={!newKeyName.trim() || isCreating}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: newKeyName.trim() ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${newKeyName.trim() ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
            color: newKeyName.trim() ? 'var(--snaps-accent-purple)' : 'var(--snaps-text-secondary)',
            cursor: newKeyName.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          {isCreating ? <Spinner size="sm" color="purple" /> : <Plus className="w-4 h-4" />}
          Generate New Key
        </button>
      </div>

      {/* List Existing Keys */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--snaps-text-primary)' }}>Active & Revoked Keys</h4>
        {apiKeys.length === 0 ? (
          <div className="text-xs text-center py-6" style={{ color: 'var(--snaps-text-secondary)' }}>
            No API keys found for this project.
          </div>
        ) : (
          apiKeys.map(key => (
            <div 
              key={key.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${key.is_active ? 'border-white/10 bg-white/5' : 'border-red-500/10 bg-red-500/5'}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className={`font-semibold text-sm ${key.is_active ? 'text-white' : 'text-gray-500 line-through'}`}>{key.name}</h5>
                  {!key.is_active && <span className="text-[10px] uppercase font-bold text-red-400 px-1.5 py-0.5 rounded bg-red-500/20">Revoked</span>}
                </div>
                <div className="text-xs font-mono text-gray-400 mb-1">...{key.id.split('-').pop()}</div>
                <div className="text-[10px] text-gray-500">
                  Created: {new Date(key.created_at).toLocaleDateString()}
                  {key.allowed_origins?.length > 0 && ` • Origins: ${key.allowed_origins.join(', ')}`}
                </div>
              </div>
              
              {key.is_active && (
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                  title="Revoke Key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
