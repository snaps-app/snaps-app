import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, RefreshCw, Mail, Calendar, Plus, X, Shield, Check } from 'lucide-react';
import { api } from '@/services/client';

interface AppUser {
    id: string;
    email: string;
    global_role: string;
    created_at: string;
    updated_at: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    
    // Form state
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('user');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get<AppUser[]>('/users/');
            setUsers(data);
        } catch (err: any) {
            if (err?.response?.status === 403) {
                window.location.href = '/';
                return;
            }
            setError(err?.response?.data?.detail ?? 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setInviteLoading(true);
        setInviteError(null);
        setInviteSuccess(false);

        try {
            await api.post('/users/', { 
                email: inviteEmail.trim(),
                global_role: inviteRole,
                redirect_to: `${window.location.origin}/update-password`
            });
            setInviteSuccess(true);
            setInviteEmail('');
            fetchUsers();
            setTimeout(() => {
                setIsInviteModalOpen(false);
                setInviteSuccess(false);
            }, 1500);
        } catch (err: any) {
            setInviteError(err?.response?.data?.detail ?? 'Failed to invite user');
        } finally {
            setInviteLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
                            User Management
                        </h1>
                        <p className="text-sm text-zinc-400">
                            Manage global platform accounts and invite new administrators.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={fetchUsers}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'var(--snaps-text-secondary)',
                        }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </motion.button>

                    <motion.button
                        onClick={() => {
                            setInviteEmail('');
                            setInviteError(null);
                            setInviteSuccess(false);
                            setIsInviteModalOpen(true);
                        }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all"
                        style={{
                            background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                            boxShadow: '0 4px 20px rgba(0, 212, 255, 0.15)',
                        }}
                    >
                        <Plus size={16} />
                        Invite User
                    </motion.button>
                </div>
            </div>

            {/* Error alerts */}
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

            {/* Users List */}
            {loading && users.length === 0 ? (
                <div className="flex items-center justify-center py-24">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 rounded-full border-2 border-t-transparent"
                        style={{ borderColor: 'rgba(0, 212, 255, 0.2)', borderTopColor: '#00D4FF' }}
                    />
                </div>
            ) : (
                <div className="grid gap-4">
                    {users.map((user, i) => (
                        <motion.div
                            key={user.id}
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
                                        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                                        border: '1px solid rgba(0, 212, 255, 0.15)',
                                        color: '#00D4FF',
                                    }}
                                >
                                    {(user.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-white truncate max-w-md">
                                        {user.email}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-[10px] text-[#A855F7] bg-[#A855F7]/10 px-2 py-0.5 rounded-md border border-[#A855F7]/25 font-bold uppercase tracking-wider">
                                            <Shield size={10} />
                                            {user.global_role}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                                            <Calendar size={12} />
                                            Registered: {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right text-xs text-zinc-600 font-mono">
                                ID: {user.id}
                            </div>
                        </motion.div>
                    ))}

                    {!loading && users.length === 0 && (
                        <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl" style={{ color: 'var(--snaps-text-secondary)' }}>
                            <Users size={32} className="mx-auto mb-3 opacity-30 text-zinc-500" />
                            No users registered on the platform yet.
                        </div>
                    )}
                </div>
            )}

            {/* Invite User Modal */}
            <AnimatePresence>
                {isInviteModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !inviteLoading && setIsInviteModalOpen(false)}
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
                                    <Mail size={18} className="text-[#00D4FF]" />
                                    Invite New User
                                </h3>
                                <button
                                    onClick={() => setIsInviteModalOpen(false)}
                                    disabled={inviteLoading}
                                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {inviteSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-8 text-center"
                                >
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                                        <Check size={24} />
                                    </div>
                                    <p className="font-semibold text-white">Invitation Sent!</p>
                                    <p className="text-xs text-zinc-400 mt-1">An email invite has been dispatched.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleInviteUser} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="name@company.com"
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00D4FF] focus:bg-white/[0.08] transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                            Global Role
                                        </label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-[#00D4FF] focus:bg-white/[0.08] transition-all text-sm appearance-none"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em' }}
                                        >
                                            <option value="user" className="bg-zinc-900">User</option>
                                            <option value="super_admin" className="bg-zinc-900">Super Admin</option>
                                        </select>
                                    </div>

                                    {inviteError && (
                                        <div className="p-3.5 rounded-xl text-xs bg-red-500/10 border border-red-500/25 text-red-400">
                                            {inviteError}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsInviteModalOpen(false)}
                                            disabled={inviteLoading}
                                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={inviteLoading || !inviteEmail}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all disabled:opacity-40"
                                            style={{
                                                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                                                boxShadow: '0 4px 15px rgba(0, 212, 255, 0.1)',
                                            }}
                                        >
                                            {inviteLoading ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : null}
                                            Send Invite
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
