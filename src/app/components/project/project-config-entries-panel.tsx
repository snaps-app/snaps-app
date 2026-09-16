import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, FileUp, KeyRound, Lock, Plus, Settings2, Trash2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Spinner } from '@/app/components/ui/spinner';
import {
  deleteProjectConfigEntry,
  getProjectConfigEntries,
  importProjectConfigEntries,
  upsertProjectConfigEntry,
} from '@/services/projects';
import type { ProjectConfigEntry, ProjectConfigImportResult } from '@/services/types';

interface ProjectConfigEntriesPanelProps {
  projectId: string;
  /** CSV de `github_configs.repo_names`, para oferecer os escopos possiveis. */
  repoNames: string;
}

/** Escopo global do projeto. `''` no <select>, `null` na API. */
const ESCOPO_GLOBAL = '';

export function ProjectConfigEntriesPanel({ projectId, repoNames }: ProjectConfigEntriesPanelProps) {
  const [entries, setEntries] = useState<ProjectConfigEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<string>(ESCOPO_GLOBAL);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // A pre-visualizacao do import. Enquanto ela existe, nada foi gravado.
  const [preview, setPreview] = useState<ProjectConfigImportResult | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const repos = repoNames.split(',').map((r) => r.trim()).filter(Boolean);

  useEffect(() => {
    loadEntries();
  }, [projectId, scope]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      setEntries(await getProjectConfigEntries(projectId, scope || undefined));
      setError(null);
    } catch {
      setError('Could not load the project configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue) return;
    setIsSaving(true);
    setError(null);
    try {
      await upsertProjectConfigEntry(projectId, {
        key: newKey.trim(),
        value: newValue,
        repo_name: scope || null,
      });
      setNewKey('');
      setNewValue('');
      await loadEntries();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the key.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry: ProjectConfigEntry) => {
    if (!window.confirm(`Remover ${entry.key}? O workspace deixa de recebe-la.`)) return;
    try {
      await deleteProjectConfigEntry(projectId, entry.id);
      await loadEntries();
    } catch {
      setError('Could not remove the key.');
    }
  };

  /**
   * O arquivo e lido no navegador e enviado como TEXTO — o parse acontece no
   * servidor, pelo mesmo `dotenv` que le o `.env` no workspace. Parsear aqui
   * criaria uma segunda gramatica para o mesmo formato.
   *
   * Esta chamada NAO grava: `apply` fica falso e o retorno e a previsao.
   */
  const handleFile = async (file: File) => {
    setIsImporting(true);
    setError(null);
    try {
      const content = await file.text();
      const resultado = await importProjectConfigEntries(projectId, content, scope || null, false);
      setPendingContent(content);
      setPreview(resultado);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not read the file.');
    } finally {
      setIsImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pendingContent) return;
    setIsImporting(true);
    setError(null);
    try {
      await importProjectConfigEntries(projectId, pendingContent, scope || null, true);
      setPreview(null);
      setPendingContent(null);
      await loadEntries();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not import.');
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setPreview(null);
    setPendingContent(null);
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-cyan-400" />
        <h3 className="text-base font-medium text-white">Project Configuration</h3>
      </header>

      <p className="text-sm text-slate-400">
        These keys become the <code className="text-slate-300">.env</code> of every execution
        workspace. They exist so the agent can <strong>run the project</strong>, not just collect the
        test suite. A value is never shown again on this screen.
      </p>

      {/* Escopo. Uma chave de repo vence a global de mesmo nome. */}
      <div className="flex items-center gap-2">
        <label htmlFor="config-scope" className="text-sm text-slate-400">Scope</label>
        <select
          id="config-scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          <option value={ESCOPO_GLOBAL}>All repositories</option>
          {repos.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {scope && (
          <span className="text-xs text-slate-500">
            uma chave daqui vence a global de mesmo nome
          </span>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {/* Upload de .env */}
      <div className="rounded-lg border border-dashed border-white/15 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FileUp className="h-5 w-5 text-slate-400" />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={isImporting || !!preview}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isImporting ? 'Reading...' : 'Upload .env file'}
          </button>
          <span className="text-xs text-slate-500">
            nothing is saved before you confirm
          </span>
          <input
            ref={fileInput}
            type="file"
            accept=".env,text/plain"
            className="hidden"
            aria-label="Arquivo .env"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      </div>

      {/* A pre-visualizacao. Subir um .env por cima da configuracao existente e
          onde a sobrescrita silenciosa custa mais caro — entao ela e mostrada
          antes, com o que vai ser substituido em destaque. */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4"
          >
            <p className="mb-3 text-sm text-white">
              {preview.parsed} key(s) read from the file. <strong>Nothing has been saved yet.</strong>
            </p>

            {preview.will_overwrite.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  {preview.will_overwrite.length} will be OVERWRITTEN
                </p>
                <ul className="space-y-0.5 text-xs text-slate-300">
                  {preview.will_overwrite.map((i) => (
                    <li key={i.key}>
                      <code>{i.key}</code>{' '}
                      <span className="text-slate-500">
                        from {i.current_value_length} to {i.value_length} characters
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.will_create.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-sm font-medium text-emerald-300">
                  {preview.will_create.length} new
                </p>
                <ul className="space-y-0.5 text-xs text-slate-300">
                  {preview.will_create.map((i) => (
                    <li key={i.key}>
                      <code>{i.key}</code>{' '}
                      <span className="text-slate-500">{i.value_length} characters</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.unchanged.length > 0 && (
              <p className="mb-3 text-xs text-slate-500">
                {preview.unchanged.length} already identical — unchanged.
              </p>
            )}

            {preview.warnings.length > 0 && (
              <ul className="mb-3 space-y-0.5 text-xs text-amber-300">
                {preview.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmImport}
                disabled={isImporting}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importing...' : 'Confirm import'}
              </button>
              <button
                type="button"
                onClick={cancelImport}
                disabled={isImporting}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uma chave por vez */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[10rem]">
          <label htmlFor="config-key" className="mb-1 block text-xs text-slate-400">Key</label>
          <input
            id="config-key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="DATABASE_URL"
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white"
          />
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label htmlFor="config-value" className="mb-1 block text-xs text-slate-400">Value</label>
          <input
            id="config-value"
            type="password"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSaving || !newKey.trim() || !newValue}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* A lista. Nunca ha valor aqui — so nome, tipo e comprimento. */}
      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">
          No keys in this scope. Upload a <code>.env</code> or add one above.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2">
              {e.kind === 'secret'
                ? <Lock className="h-4 w-4 shrink-0 text-amber-400" aria-label="secret" />
                : <KeyRound className="h-4 w-4 shrink-0 text-slate-400" aria-label="config" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">
                  <code>{e.key}</code>
                  {e.repo_name && (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem] text-slate-300">
                      {e.repo_name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {e.value_length} characters · set by {e.created_by_actor_kind === 'agent' ? 'an agent' : 'a human'}
                  {e.description ? ` · ${e.description}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(e)}
                aria-label={`Remove ${e.key}`}
                className="shrink-0 rounded p-1.5 text-slate-500 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
