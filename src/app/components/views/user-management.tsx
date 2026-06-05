import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, RefreshCw, Mail, Calendar } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AppUser {
    id: string;
    email: string;
    name: string;
    created_at: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get<AppUser[]>(`${API_URL}/users`);
            setUsers(data);
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-xl"
                        style={{ background: 'rgba(0, 212, 255, 0.15)', border: '1px solid rgba(0, 212, 255, 0.3)' }}
                    >
                        <Users size={20} style={{ color: '#00D4FF' }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>
                            User Management
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                            {users.length} registered user{users.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <motion.button
                    onClick={fetchUsers}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--snaps-text-secondary)',
                    }}
                >
                    <RefreshCw size={14} />
                    Refresh
                </motion.button>
            </div>

            {error && (
                <div
                    className="mb-4 p-4 rounded-xl text-sm"
                    style={{
                        background: 'rgba(255, 80, 80, 0.1)',
                        border: '1px solid rgba(255, 80, 80, 0.3)',
                        color: '#FF5050',
                    }}
                >
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-6 h-6 rounded-full border-2"
                        style={{ borderColor: 'rgba(0,212,255,0.3)', borderTopColor: '#00D4FF' }}
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map((user, i) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-4 p-4 rounded-xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(138,43,226,0.2) 100%)',
                                    border: '1px solid rgba(0,212,255,0.3)',
                                    color: '#00D4FF',
                                }}
                            >
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" style={{ color: 'var(--snaps-text-primary)' }}>
                                    {user.name}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Mail size={11} style={{ color: 'var(--snaps-text-secondary)' }} />
                                    <p className="text-xs truncate" style={{ color: 'var(--snaps-text-secondary)' }}>
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Calendar size={11} style={{ color: 'var(--snaps-text-secondary)' }} />
                                <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                                    {new Date(user.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </motion.div>
                    ))}

                    {users.length === 0 && (
                        <div className="py-16 text-center" style={{ color: 'var(--snaps-text-secondary)' }}>
                            No users found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
