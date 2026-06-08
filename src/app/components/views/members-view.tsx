import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, X, Trash2, Shield, Check, RefreshCw } from 'lucide-react';
import { getProjectMembers, addProjectMember, updateMemberRole, removeMember } from '@/services/members';
import { getProject } from '@/services/projects';
import { useProjectRole } from '@/contexts/project-role-context';
import { supabase } from '@/lib/supabaseClient';
import type { ProjectMember } from '@/services/members';

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  owner:      { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', text: '#A855F7' },
  admin:      { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3B82F6' },
  member:     { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981' },
  visualizer: { bg: 'rgba(113, 113, 122, 0.1)', border: 'rgba(113, 113, 122, 0.3)', text: '#71717A' },
};

export function MembersView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { can, loading: roleLoading, role: myRole } = useProjectRole();
  
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projectOwnerId, setProjectOwnerId] = useState<string | null>(null);

  // Redirect if user doesn't have permission to view members (Admin or Owner only)
  useEffect(() => {
    if (!roleLoading && !can('manage_members')) {
      navigate(`/project/${projectId}`);
    }
  }, [roleLoading, can, navigate, projectId]);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Get current logged-in user email and id
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Fetch project details to identify the owner
      const project = await getProject(projectId);
      setProjectOwnerId(project.user_id);

      // 3. Fetch project members list
      const membersData = await getProjectMembers(projectId);

      // 4. Check if owner is already included (fallback logic)
      const hasOwner = membersData.some(m => m.role === 'owner' || m.user_id === project.user_id);
      
      let finalMembers = [...membersData];
      if (!hasOwner && project.user_id) {
        // Find owner email if the owner is the current user
        const ownerEmail = project.user_id === user?.id ? (user.email || 'owner@project.com') : 'Criador do Projeto';
        const ownerMember: ProjectMember = {
          user_id: project.user_id,
          email: ownerEmail,
          role: 'owner',
        };
        finalMembers.unshift(ownerMember);
      }

      setMembers(finalMembers);
    } catch (err: any) {
      console.error('Failed to load members:', err);
      setError(err?.response?.data?.detail || 'Erro ao carregar membros do projeto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!projectId) return;
    try {
      await updateMemberRole(projectId, userId, newRole);
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole as any } : m));
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao atualizar papel do membro.');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!projectId || !window.confirm('Tem certeza que deseja remover este membro do projeto?')) return;
    try {
      await removeMember(projectId, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao remover membro do projeto.');
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[500px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'rgba(0, 212, 255, 0.2)', borderTopColor: '#00D4FF' }}
        />
      </div>
    );
  }

  if (!can('manage_members')) {
    return null;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(0, 212, 255, 0.25)',
            }}
          >
            <Users size={24} style={{ color: '#00D4FF' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Membros do Projeto
            </h1>
            <p className="text-sm text-zinc-400">
              Gerencie quem tem acesso a este projeto e defina seus papéis de segurança.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={loadData}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--snaps-text-secondary)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </motion.button>

          {can('manage_members') && (
            <motion.button
              onClick={() => setIsInviteModalOpen(true)}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                boxShadow: '0 4px 20px rgba(0, 212, 255, 0.15)',
              }}
            >
              <Plus size={16} />
              Convidar Membro
            </motion.button>
          )}
        </div>
      </div>

      {error && (
        <div
          className="p-4 rounded-2xl text-sm border"
          style={{
            background: 'rgba(239, 68, 68, 0.05)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
            color: '#EF4444',
          }}
        >
          {error}
        </div>
      )}

      {/* Members List */}
      <div className="grid gap-4">
        {members.map((member, i) => {
          const colors = ROLE_COLORS[member.role] || ROLE_COLORS['member'];
          const isMe = member.user_id === currentUser?.id;
          const isOwner = member.role === 'owner';
          
          return (
            <motion.div
              key={member.user_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 260, damping: 20 }}
              className="flex items-center justify-between p-5 rounded-2xl transition-all hover:bg-white/[0.04]"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${colors.text}22 0%, ${colors.text}0A 100%)`,
                    border: `1px solid ${colors.text}33`,
                    color: colors.text,
                  }}
                >
                  {(member.email || 'M').charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate max-w-md">
                      {member.email}
                    </p>
                    {isMe && (
                      <span className="text-[10px] text-zinc-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md font-medium">
                        Você
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        color: colors.text
                      }}
                    >
                      <Shield size={10} />
                      {member.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                {can('manage_members') && !isOwner && !isMe ? (
                  <div className="flex items-center gap-3">
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.user_id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-xs focus:outline-none focus:border-[#00D4FF] focus:bg-zinc-900 transition-all cursor-pointer"
                    >
                      <option value="admin" className="bg-zinc-900">Admin</option>
                      <option value="member" className="bg-zinc-900">Member</option>
                      <option value="visualizer" className="bg-zinc-900">Visualizer</option>
                    </select>

                    <motion.button
                      onClick={() => handleRemove(member.user_id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      title="Remover membro"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 italic">
                    {isOwner ? 'Proprietário do Projeto' : 'Somente Leitura'}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <InviteMemberModal
            projectId={projectId!}
            onClose={() => setIsInviteModalOpen(false)}
            onSuccess={(newMember) => {
              setMembers(prev => [...prev, newMember]);
              setIsInviteModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-componente: InviteMemberModal
function InviteMemberModal({ projectId, onClose, onSuccess }: {
  projectId: string;
  onClose: () => void;
  onSuccess: (member: ProjectMember) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await addProjectMember(projectId, { 
        email: email.trim(), 
        role,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess(result);
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao convidar membro para o projeto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !loading && onClose()}
        className="absolute inset-0 bg-[#000000]/70 backdrop-blur-sm"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 p-6 z-10"
        style={{
          background: 'rgba(15, 15, 15, 0.9)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-[#00D4FF]" />
            Convidar Novo Membro
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
              <Check size={24} />
            </div>
            <p className="font-semibold text-white">Convite Enviado!</p>
            <p className="text-xs text-zinc-400 mt-1">O membro foi adicionado e notificado.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Endereço de E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00D4FF] focus:bg-white/[0.08] transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Papel no Projeto (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-[#00D4FF] focus:bg-white/[0.08] transition-all text-sm appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1em'
                }}
              >
                <option value="admin" className="bg-zinc-900">Admin</option>
                <option value="member" className="bg-zinc-900">Member</option>
                <option value="visualizer" className="bg-zinc-900">Visualizer</option>
              </select>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl text-xs bg-red-500/10 border border-red-500/25 text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !email}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                  boxShadow: '0 4px 15px rgba(0, 212, 255, 0.1)',
                }}
              >
                {loading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : null}
                Enviar Convite
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
