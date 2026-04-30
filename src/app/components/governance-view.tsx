import React, { useState, useEffect } from 'react';
import { Bot, FileText, Wrench, Database, Plus, Edit2, Trash2, X, Shield, Link, Unlink, Eye, Upload, Copy, ClipboardCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import api, { AgentInstruction, GovernanceDoc, Skill, Resource } from '@/services/api';
import { PrdImportModal } from './prd-import-modal';

type Tab = 'agents' | 'docs' | 'skills' | 'resources';

const TAB_CONFIG = {
  agents:    { label: 'Agents',    icon: Bot,      accent: 'purple' },
  docs:      { label: 'Docs',      icon: FileText,  accent: 'blue' },
  skills:    { label: 'Skills',    icon: Wrench,    accent: 'green' },
  resources: { label: 'Resources', icon: Database,   accent: 'amber' },
} as const;

const INPUT = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none';
const SELECT = `${INPUT}`;

export function GovernanceView() {
  const [tab, setTab] = useState<Tab>('agents');
  const [agents, setAgents] = useState<AgentInstruction[]>([]);
  const [docs, setDocs] = useState<GovernanceDoc[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'project'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Agent form
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState<string>('ide_persona');
  const [agentInstructions, setAgentInstructions] = useState('');
  const [agentScope, setAgentScope] = useState<string>('global');
  const [agentProjectId, setAgentProjectId] = useState<string>('');

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<GovernanceDoc | null>(null);

  // Doc form
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<string>('playbook');
  const [docScope, setDocScope] = useState<string>('global');
  const [docProjectId, setDocProjectId] = useState<string>('');
  const [docContent, setDocContent] = useState('');

  // Skill form
  const [skillName, setSkillName] = useState('');
  const [skillContent, setSkillContent] = useState('');
  const [skillLang, setSkillLang] = useState('python');
  const [skillVersion, setSkillVersion] = useState('1.0.0');
  const [skillScope, setSkillScope] = useState<string>('global');
  const [skillProjectId, setSkillProjectId] = useState<string>('');

  // Resource form
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState<string>('documentation');
  const [resProjectId, setResProjectId] = useState<string>('');
  const [resContent, setResContent] = useState('');

  // Bind modal
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindAgentId, setBindAgentId] = useState<string | null>(null);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [a, d, s, r, p] = await Promise.all([
        api.getAgents(), api.getGovernanceDocs(), api.getSkills(), api.getResources(), api.getProjects()
      ]);
      setAgents(a); setDocs(d); setSkills(s); setResources(r); setProjects(p);
    } catch (e) { console.error('Fetch error:', e); }
  };

  const resetForm = () => {
    setEditingId(null);
    setAgentName(''); setAgentType('ide_persona'); setAgentInstructions(''); setAgentScope('global'); setAgentProjectId('');
    setDocName(''); setDocType('playbook'); setDocScope('global'); setDocProjectId(''); setDocContent('');
    setSkillName(''); setSkillContent(''); setSkillLang('python'); setSkillVersion('1.0.0'); setSkillScope('global'); setSkillProjectId('');
    setResName(''); setResType('documentation'); setResProjectId(''); setResContent('');
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    if (tab === 'agents') {
      setAgentName(item.name); setAgentType(item.type); setAgentInstructions(item.instructions); setAgentScope(item.scope || 'global'); setAgentProjectId(item.project_id || '');
    } else if (tab === 'docs') {
      setDocName(item.name); setDocType(item.type); setDocScope(item.scope || 'global'); setDocProjectId(item.project_id || ''); setDocContent(item.content);
    } else if (tab === 'skills') {
      setSkillName(item.name); setSkillContent(item.content); setSkillLang(item.language); setSkillVersion(item.version || '1.0.0'); setSkillScope(item.scope || 'global'); setSkillProjectId(item.project_id || '');
    } else {
      setResName(item.name); setResType(item.type); setResProjectId(item.project_id || ''); setResContent(item.content);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (tab === 'agents') {
        const data = { 
          name: agentName, 
          type: agentType as any, 
          instructions: agentInstructions, 
          scope: agentScope as any,
          project_id: agentScope === 'project' ? agentProjectId : null
        };
        editingId ? await api.updateAgent(editingId, data) : await api.createAgent(data);
      } else if (tab === 'docs') {
        const data = { 
          name: docName, 
          type: docType as any, 
          scope: docScope as any, 
          project_id: docScope === 'project' ? docProjectId : null,
          content: docContent 
        };
        editingId ? await api.updateGovernanceDoc(editingId, data) : await api.createGovernanceDoc(data);
      } else if (tab === 'skills') {
        const data = { 
          name: skillName, 
          content: skillContent, 
          language: skillLang, 
          version: skillVersion, 
          scope: skillScope as any,
          project_id: skillScope === 'project' ? skillProjectId : null
        };
        editingId ? await api.updateSkill(editingId, data) : await api.createSkill(data);
      } else {
        const data = { 
          name: resName, 
          type: resType as any, 
          project_id: resProjectId || null,
          content: resContent 
        };
        editingId ? await api.updateResource(editingId, data) : await api.createResource(data);
      }
      setModalOpen(false); resetForm(); fetchAll();
    } catch (e) { console.error('Save error:', e); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      if (tab === 'agents') await api.deleteAgent(id);
      else if (tab === 'docs') await api.deleteGovernanceDoc(id);
      else if (tab === 'skills') await api.deleteSkill(id);
      else await api.deleteResource(id);
      fetchAll();
    } catch (e) { console.error('Delete error:', e); }
  };

  const handleBind = async (skillId: string) => {
    if (!bindAgentId) return;
    try { await api.bindSkillToAgent(bindAgentId, skillId); fetchAll(); } catch (e) { console.error(e); }
  };

  const handleUnbind = async (agentId: string, skillId: string) => {
    try { await api.unbindSkillFromAgent(agentId, skillId); fetchAll(); } catch (e) { console.error(e); }
  };

  const currentItems = (tab === 'agents' ? agents : tab === 'docs' ? docs : tab === 'skills' ? skills : resources)
    .filter((item: any) => {
      const scope = item.scope || (item.project_id ? 'project' : 'global');
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
    const scope = item.scope || (item.project_id ? 'project' : 'global');
    
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

  const renderForm = () => {
    if (tab === 'agents') return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input value={agentName} onChange={e => setAgentName(e.target.value)} className={`${INPUT} focus:border-purple-500`} placeholder="e.g. Antigravity" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select value={agentType} onChange={e => setAgentType(e.target.value)} className={`${SELECT} focus:border-purple-500`}>
              <option value="ide_persona">IDE Persona</option>
              <option value="fleet_agent">Fleet Agent</option>
              <option value="security">Security</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Scope</label>
            <select value={agentScope} onChange={e => setAgentScope(e.target.value)} className={`${SELECT} focus:border-purple-500`}>
              <option value="global">Global</option>
              <option value="project">Project</option>
            </select>
          </div>
        </div>
        {agentScope === 'project' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Project</label>
            <select value={agentProjectId} onChange={e => setAgentProjectId(e.target.value)} className={`${SELECT} focus:border-purple-500`}>
              <option value="">Select Project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Instructions</label>
          <textarea value={agentInstructions} onChange={e => setAgentInstructions(e.target.value)} className={`${INPUT} h-40 resize-none focus:border-purple-500`} placeholder="System prompt / instructions..." />
        </div>
      </>
    );
    if (tab === 'docs') return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input value={docName} onChange={e => setDocName(e.target.value)} className={`${INPUT} focus:border-blue-500`} placeholder="Document name" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className={`${SELECT} focus:border-blue-500`}>
              <option value="playbook">Playbook</option>
              <option value="strategy">Strategy</option>
              <option value="prd">PRD</option>
              <option value="context">Context</option>
              <option value="roadmap">Roadmap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Scope</label>
            <select value={docScope} onChange={e => setDocScope(e.target.value)} className={`${SELECT} focus:border-blue-500`}>
              <option value="global">Global</option>
              <option value="project">Project</option>
            </select>
          </div>
        </div>
        {docScope === 'project' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Project</label>
            <select value={docProjectId} onChange={e => setDocProjectId(e.target.value)} className={`${SELECT} focus:border-blue-500`}>
              <option value="">Select Project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
          <textarea value={docContent} onChange={e => setDocContent(e.target.value)} className={`${INPUT} h-48 resize-none focus:border-blue-500`} placeholder="Document content..." />
        </div>
      </>
    );
    if (tab === 'skills') return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input value={skillName} onChange={e => setSkillName(e.target.value)} className={`${INPUT} focus:border-green-500`} placeholder="Skill name" autoFocus />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
            <input value={skillLang} onChange={e => setSkillLang(e.target.value)} className={`${INPUT} font-mono focus:border-green-500`} placeholder="python" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Version</label>
            <input value={skillVersion} onChange={e => setSkillVersion(e.target.value)} className={`${INPUT} font-mono focus:border-green-500`} placeholder="1.0.0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Scope</label>
            <select value={skillScope} onChange={e => setSkillScope(e.target.value)} className={`${SELECT} focus:border-green-500`}>
              <option value="global">Global</option>
              <option value="project">Project</option>
            </select>
          </div>
        </div>
        {skillScope === 'project' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Project</label>
            <select value={skillProjectId} onChange={e => setSkillProjectId(e.target.value)} className={`${SELECT} focus:border-green-500`}>
              <option value="">Select Project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Content (Code)</label>
          <textarea value={skillContent} onChange={e => setSkillContent(e.target.value)} className={`${INPUT} h-48 resize-none font-mono text-sm focus:border-green-500`} placeholder="def execute(params):&#10;    ..." />
        </div>
      </>
    );
    return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input value={resName} onChange={e => setResName(e.target.value)} className={`${INPUT} focus:border-amber-500`} placeholder="Resource name" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select value={resType} onChange={e => setResType(e.target.value)} className={`${SELECT} focus:border-amber-500`}>
              <option value="documentation">Documentation</option>
              <option value="api_proxy">API Proxy</option>
              <option value="ui_component">UI Component</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Project</label>
            <select value={resProjectId} onChange={e => setResProjectId(e.target.value)} className={`${SELECT} focus:border-amber-500`}>
              <option value="">Global (None)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
          <textarea value={resContent} onChange={e => setResContent(e.target.value)} className={`${INPUT} h-40 resize-none focus:border-amber-500`} placeholder="Resource content..." />
        </div>
      </>
    );
  };

  const isFormValid = () => {
    if (tab === 'agents') return agentName.trim() && agentInstructions.trim() && (agentScope !== 'project' || agentProjectId);
    if (tab === 'docs') return docName.trim() && docContent.trim() && (docScope !== 'project' || docProjectId);
    if (tab === 'skills') return skillName.trim() && skillContent.trim() && (skillScope !== 'project' || skillProjectId);
    return resName.trim() && resContent.trim();
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
        </div>

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          {(Object.keys(TAB_CONFIG) as Tab[]).map(t => {
            const c = TAB_CONFIG[t];
            const Icon = c.icon;
            const isActive = tab === t;
            const count = (t === 'agents' ? agents : t === 'docs' ? docs : t === 'skills' ? skills : resources).length;
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
          <motion.div key={tab + scopeFilter + selectedProjectId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
            {currentItems.length === 0 ? (
              <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                <cfg.icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No items found with current filters</p>
                <p className="text-sm mt-1">Try changing the scope or project filter</p>
              </div>
            ) : currentItems.map(renderCard)}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{editingId ? 'Edit' : 'New'} {cfg.label.slice(0, -1)}</h2>
                <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-hide">{renderForm()}</div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                <button onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!isFormValid() || isSaving}
                  className="px-6 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all">
                  {isSaving && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {viewModalOpen && viewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-blue-500/10">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/50">
                <div>
                  <h2 className="text-2xl font-bold text-white">{viewDoc.name}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider font-bold bg-blue-500/10 border-blue-500/20 text-blue-400">{viewDoc.type}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full border uppercase tracking-wider bg-white/5 border-white/10 text-gray-400">{viewDoc.scope || 'global'}</span>
                  </div>
                </div>
                <button onClick={() => setViewModalOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-black/40">
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
                      const [copied, setCopied] = React.useState(false);
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
                      const [copied, setCopied] = React.useState(false);
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
                  }}>
                    {viewDoc.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
