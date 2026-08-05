import { bindSkillToAgent, deleteAgent, deleteGovernanceDoc, deleteResource, deleteSkill, getAgents, getGovernanceDocs, getResources, getSkills, unbindSkillFromAgent } from '@/services/governance';
import { getProjects } from '@/services/projects';
import { getWorkflowTemplates } from '@/services/workflowTemplates';
import type { AgentInstruction, GovernanceDoc, Resource, Skill } from '@/services/types';
import { useState, useEffect } from 'react';
import { Bot, FileText, Wrench, Database, Plus, Edit2, Trash2, X, Shield, Link, Eye, Upload, GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrdImportModal } from '@/app/components/modals/prd-import-modal';
import { WorkflowEditorCanvas } from '@/app/components/workflow/workflow-editor';
import { DocumentViewModal } from '@/app/components/modals/document-view-modal';
import { GovernanceFormModal } from '@/app/components/modals/governance-form-modal';

type Tab = 'agents' | 'docs' | 'skills' | 'resources' | 'workflows';

// project_id e a fonte de verdade do escopo; scope no backend e so a projecao dele.
// Antes esta tela lia item.scope enquanto a API filtrava por project_id, entao um
// registro incoerente aparecia aqui e sumia na tela do projeto (card C12). Derivar
// de project_id torna impossivel a UI discordar da API.
const deriveScope = (item: { project_id?: string | null }) => (item.project_id ? 'project' : 'global');

const TAB_CONFIG = {
  agents:    { label: 'Agents',    icon: Bot,      accent: 'purple' },
  docs:      { label: 'Docs',      icon: FileText,  accent: 'blue' },
  skills:    { label: 'Skills',    icon: Wrench,    accent: 'green' },
  resources: { label: 'Resources', icon: Database,   accent: 'amber' },
  workflows: { label: 'Workflows', icon: GitBranch,  accent: 'purple' },
} as const;

export function GovernanceView() {
  const [tab, setTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as Tab;
    return (tabParam && ['agents', 'docs', 'skills', 'resources', 'workflows'].includes(tabParam)) ? tabParam : 'agents';
  });
  const [agents, setAgents] = useState<AgentInstruction[]>([]);
  const [docs, setDocs] = useState<GovernanceDoc[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'project'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<GovernanceDoc | null>(null);

  // Bind modal
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindAgentId, setBindAgentId] = useState<string | null>(null);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [templatesCount, setTemplatesCount] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [a, d, s, r, p, w] = await Promise.all([
        getAgents(), getGovernanceDocs(), getSkills(), getResources(), getProjects(), getWorkflowTemplates()
      ]);
      setAgents(a); setDocs(d); setSkills(s); setResources(r); setProjects(p); setTemplatesCount(w.length);
    } catch (e) { console.error('Fetch error:', e); }
  };

  const openCreate = () => { setEditingId(null); setModalOpen(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      if (tab === 'agents') await deleteAgent(id);
      else if (tab === 'docs') await deleteGovernanceDoc(id);
      else if (tab === 'skills') await deleteSkill(id);
      else await deleteResource(id);
      fetchAll();
    } catch (e) { console.error('Delete error:', e); }
  };

  const handleBind = async (skillId: string) => {
    if (!bindAgentId) return;
    try { await bindSkillToAgent(bindAgentId, skillId); fetchAll(); } catch (e) { console.error(e); }
  };

  const handleUnbind = async (agentId: string, skillId: string) => {
    try { await unbindSkillFromAgent(agentId, skillId); fetchAll(); } catch (e) { console.error(e); }
  };

  const currentItems = (
    tab === 'agents' ? agents :
    tab === 'docs' ? docs :
    tab === 'skills' ? skills :
    tab === 'workflows' ? [] :
    resources
  ).filter((item: any) => {
      const scope = deriveScope(item);
      if (scopeFilter === 'global') return scope === 'global';
      if (scopeFilter === 'project') {
        if (selectedProjectId) return item.project_id === selectedProjectId;
        return scope === 'project';
      }
      return true; // 'all'
    });
    
  const cfg = TAB_CONFIG[tab];

  const renderCard = (item: any) => {
    const itemProject = projects.find(p => p.id === item.project_id);
    const scope = deriveScope(item);
    
    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-bold text-white truncate">{item.name || item.title}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${
                scope === 'global' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {scope}
              </span>
              {item.type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider bg-white/5 border-white/10 text-gray-500">
                  {item.type}
                </span>
              )}
              {itemProject && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider bg-white/5 border-white/10 text-emerald-400">
                  {itemProject.name}
                </span>
              )}
              {item.version && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-gray-500 bg-white/5 border border-white/10">
                  v{item.version}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 line-clamp-2">{item.instructions || item.content || ''}</p>

            {tab === 'agents' && item.skills && item.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.skills.map((s: Skill) => (
                  <span key={s.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    <Wrench className="w-3 h-3" /> {s.name}
                    <button onClick={() => handleUnbind(item.id, s.id)} className="ml-1 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {tab === 'agents' && (
              <button onClick={() => { setBindAgentId(item.id); setBindModalOpen(true); }} className="p-2 rounded-lg hover:bg-green-500/10 text-green-500 hover:text-green-400" title="Bind Skill">
                <Link className="w-4 h-4" />
              </button>
            )}
            {tab === 'docs' && (
              <button onClick={() => { setViewDoc(item); setViewModalOpen(true); }} className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 hover:text-blue-400" title="View Document">
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
              <Shield className="w-7 h-7 text-purple-400" />
            </div>
            Governance Center
          </h1>
          {tab !== 'workflows' && (
            <div className="flex items-center gap-3">
              {/* Scope Filters */}
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                {(['all', 'global', 'project'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setScopeFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      scopeFilter === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {scopeFilter === 'project' && (
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}

              <div className="h-8 w-[1px] bg-white/10 mx-1" />

              {tab === 'docs' && (
                <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 font-bold hover:bg-violet-500/20 transition-all text-sm">
                  <Upload className="w-4 h-4" />
                  Importar
                </button>
              )}
              <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 font-bold hover:from-purple-500/30 hover:to-blue-500/30 transition-all text-sm">
                <Plus className="w-5 h-5" />
                New {cfg.label.slice(0, -1)}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          {(Object.keys(TAB_CONFIG) as Tab[]).map(t => {
            const c = TAB_CONFIG[t];
            const Icon = c.icon;
            const isActive = tab === t;
            const count = (
              t === 'agents' ? agents.length :
              t === 'docs' ? docs.length :
              t === 'skills' ? skills.length :
              t === 'workflows' ? templatesCount :
              resources.length
            );
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all text-sm ${
                  isActive
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
        <AnimatePresence mode="wait">
          {tab === 'workflows' ? (
            <motion.div
              key="workflows"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <WorkflowEditorCanvas />
            </motion.div>
          ) : (
            <motion.div key={tab + scopeFilter + selectedProjectId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              {currentItems.length === 0 ? (
                <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                  <cfg.icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No items found with current filters</p>
                  <p className="text-sm mt-1">Try changing the scope or project filter</p>
                </div>
              ) : currentItems.map(renderCard)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GovernanceFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        tab={tab}
        editingId={editingId}
        projects={projects}
        agents={agents}
        docs={docs}
        skills={skills}
        resources={resources}
        onSaveSuccess={() => { setModalOpen(false); setEditingId(null); fetchAll(); }}
      />

      <AnimatePresence>
        {bindModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Link className="w-5 h-5 text-green-400" /> Bind Skill</h2>
                <button onClick={() => setBindModalOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
                {skills.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">No skills available. Create one first.</p>
                ) : skills.map(s => {
                  const agent = agents.find(a => a.id === bindAgentId);
                  const alreadyBound = agent?.skills?.some(bs => bs.id === s.id);
                  return (
                    <button key={s.id} onClick={() => { if (!alreadyBound) { handleBind(s.id); setBindModalOpen(false); } }}
                      disabled={alreadyBound}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        alreadyBound ? 'bg-green-500/5 border-green-500/20 opacity-50 cursor-not-allowed' : 'bg-white/5 border-white/10 hover:border-green-500/30 hover:bg-green-500/5 cursor-pointer'
                      }`}>
                      <div>
                        <div className="font-medium text-white">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.language} · v{s.version}</div>
                      </div>
                      {alreadyBound ? <span className="text-[10px] text-green-500">Bound</span> : <Plus className="w-4 h-4 text-gray-500" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      <AnimatePresence>
        {importModalOpen && (
          <PrdImportModal
            projectId={selectedProjectId || ''}
            onClose={() => { setImportModalOpen(false); fetchAll(); }}
            onImported={() => { setImportModalOpen(false); fetchAll(); }}
          />
        )}
      </AnimatePresence>

      <DocumentViewModal
        isOpen={viewModalOpen}
        doc={viewDoc}
        onClose={() => setViewModalOpen(false)}
        onCustomEdit={() => {
            setViewModalOpen(false);
            openEdit(viewDoc);
        }}
      />
    </div>
  );
}
