import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import {
    createAgent, updateAgent,
    createGovernanceDoc, updateGovernanceDoc,
    createSkill, updateSkill,
    createResource, updateResource
} from '@/services/governance';
import type { AgentInstruction, GovernanceDoc, Resource, Skill } from '@/services/types';

type Tab = 'agents' | 'docs' | 'skills' | 'resources' | 'workflows';

interface GovernanceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    tab: Tab;
    editingId: string | null;
    projects: any[];
    agents: AgentInstruction[];
    docs: GovernanceDoc[];
    skills: Skill[];
    resources: Resource[];
    onSaveSuccess: () => void;
}

const INPUT = 'w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none';
const SELECT = `${INPUT}`;

export const GovernanceFormModal: React.FC<GovernanceFormModalProps> = ({
    isOpen,
    onClose,
    tab,
    editingId,
    projects,
    agents,
    docs,
    skills,
    resources,
    onSaveSuccess,
}) => {
    const [isSaving, setIsSaving] = useState(false);

    // Agent form
    const [agentName, setAgentName] = useState('');
    const [agentType, setAgentType] = useState<string>('ide_persona');
    const [agentInstructions, setAgentInstructions] = useState('');
    const [agentScope, setAgentScope] = useState<string>('global');
    const [agentProjectId, setAgentProjectId] = useState<string>('');

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

    useEffect(() => {
        if (isOpen) {
            if (editingId) {
                if (tab === 'agents') {
                    const item = agents.find(a => a.id === editingId);
                    if (item) {
                        setAgentName(item.name); setAgentType(item.type); setAgentInstructions(item.instructions); setAgentScope(item.scope || 'global'); setAgentProjectId(item.project_id || '');
                    }
                } else if (tab === 'docs') {
                    const item = docs.find(d => d.id === editingId);
                    if (item) {
                        setDocName(item.name); setDocType(item.type); setDocScope(item.scope || 'global'); setDocProjectId(item.project_id || ''); setDocContent(item.content);
                    }
                } else if (tab === 'skills') {
                    const item = skills.find(s => s.id === editingId);
                    if (item) {
                        setSkillName(item.name); setSkillContent(item.content); setSkillLang(item.language); setSkillVersion(item.version || '1.0.0'); setSkillScope(item.scope || 'global'); setSkillProjectId(item.project_id || '');
                    }
                } else {
                    const item = resources.find(r => r.id === editingId);
                    if (item) {
                        setResName(item.name); setResType(item.type); setResProjectId(item.project_id || ''); setResContent(item.content);
                    }
                }
            } else {
                setAgentName(''); setAgentType('ide_persona'); setAgentInstructions(''); setAgentScope('global'); setAgentProjectId('');
                setDocName(''); setDocType('playbook'); setDocScope('global'); setDocProjectId(''); setDocContent('');
                setSkillName(''); setSkillContent(''); setSkillLang('python'); setSkillVersion('1.0.0'); setSkillScope('global'); setSkillProjectId('');
                setResName(''); setResType('documentation'); setResProjectId(''); setResContent('');
            }
        }
    }, [isOpen, editingId, tab, agents, docs, skills, resources]);

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
                    project_id: agentScope === 'project' ? agentProjectId : undefined
                };
                editingId ? await updateAgent(editingId, data) : await createAgent(data);
            } else if (tab === 'docs') {
                const data = { 
                    name: docName, 
                    type: docType as any, 
                    scope: docScope as any, 
                    project_id: docScope === 'project' ? docProjectId : undefined,
                    content: docContent 
                };
                editingId ? await updateGovernanceDoc(editingId, data) : await createGovernanceDoc(data);
            } else if (tab === 'skills') {
                const data = { 
                    name: skillName, 
                    content: skillContent, 
                    language: skillLang, 
                    version: skillVersion, 
                    scope: skillScope as any,
                    project_id: skillScope === 'project' ? skillProjectId : undefined
                };
                editingId ? await updateSkill(editingId, data) : await createSkill(data);
            } else {
                const data = { 
                    name: resName, 
                    type: resType as any, 
                    project_id: resProjectId || undefined,
                    content: resContent 
                };
                editingId ? await updateResource(editingId, data) : await createResource(data);
            }
            onSaveSuccess();
        } catch (e) {
            console.error('Save error:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = () => {
        if (tab === 'agents') return agentName.trim() && agentInstructions.trim() && (agentScope !== 'project' || agentProjectId);
        if (tab === 'docs') return docName.trim() && docContent.trim() && (docScope !== 'project' || docProjectId);
        if (tab === 'skills') return skillName.trim() && skillContent.trim() && (skillScope !== 'project' || skillProjectId);
        return resName.trim() && resContent.trim();
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

    if (!isOpen) return null;

    const accentColor = tab === 'agents' ? 'purple' : tab === 'docs' ? 'blue' : tab === 'skills' ? 'green' : 'amber';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">{editingId ? 'Edit' : 'New'} {tab === 'workflows' ? 'Workflow' : tab.slice(0, -1).toUpperCase()}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-hide">{renderForm()}</div>
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={!isFormValid() || isSaving}
                        className={`px-6 py-2 rounded-lg bg-${accentColor}-500/20 border border-${accentColor}-500/30 text-${accentColor}-400 font-bold hover:bg-${accentColor}-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all`}>
                        {isSaving && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Save
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
