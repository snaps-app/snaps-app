import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { signIn, syncUserWithBackend } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { user } = await signIn(email, password);
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            if (user) await syncUserWithBackend(user, apiUrl);
            navigate('/');
        } catch (err: any) {
            setError(err?.message ?? 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ backgroundColor: 'var(--snaps-bg)' }}
        >
            {/* Animated background blobs */}
            <motion.div
                className="absolute w-96 h-96 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
                    top: '-10%',
                    left: '-10%',
                }}
                animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute w-80 h-80 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(138,43,226,0.08) 0%, transparent 70%)',
                    bottom: '-5%',
                    right: '-5%',
                }}
                animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm relative"
            >
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <motion.div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(138,43,226,0.15) 100%)',
                            border: '1px solid rgba(0,212,255,0.3)',
                            boxShadow: '0 0 30px rgba(0,212,255,0.15)',
                        }}
                        animate={{ boxShadow: ['0 0 20px rgba(0,212,255,0.1)', '0 0 40px rgba(0,212,255,0.25)', '0 0 20px rgba(0,212,255,0.1)'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <span className="text-2xl font-bold" style={{ color: '#00D4FF' }}>S</span>
                    </motion.div>
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>
                        Welcome to Snaps
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--snaps-text-secondary)' }}>
                        Sign in to your workspace
                    </p>
                </div>

                {/* Card */}
                <div
                    className="rounded-2xl p-6"
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label
                                className="block text-xs font-medium mb-1.5"
                                style={{ color: 'var(--snaps-text-secondary)' }}
                            >
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--snaps-text-primary)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.border = '1px solid rgba(0,212,255,0.5)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                className="block text-xs font-medium mb-1.5"
                                style={{ color: 'var(--snaps-text-secondary)' }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--snaps-text-primary)',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.border = '1px solid rgba(0,212,255,0.5)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color: 'var(--snaps-text-secondary)' }}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                                    style={{
                                        background: 'rgba(255,80,80,0.1)',
                                        border: '1px solid rgba(255,80,80,0.3)',
                                        color: '#FF6B6B',
                                    }}
                                >
                                    <AlertCircle size={14} />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{
                                background: loading
                                    ? 'rgba(0,212,255,0.3)'
                                    : 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                                color: loading ? 'rgba(255,255,255,0.6)' : '#fff',
                                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,212,255,0.3)',
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                    className="w-4 h-4 rounded-full border-2"
                                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                                />
                            ) : (
                                <>
                                    <LogIn size={15} />
                                    Enter with Email
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
