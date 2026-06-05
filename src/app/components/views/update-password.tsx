import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Lock, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export function UpdatePassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Check if there is an error in the URL (e.g., token expired)
        const queryParams = new URLSearchParams(window.location.search);
        const urlError = queryParams.get('error_description');
        if (urlError) {
            setError(`Link error: ${urlError.replace(/\+/g, ' ')}`);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err: any) {
            setError(err?.message ?? 'Failed to update password. Please try again.');
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
                        First-time Access
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--snaps-text-secondary)' }}>
                        Establish your secure password
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
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-8 text-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                                <Check size={24} />
                            </div>
                            <p className="font-semibold text-white">Password Established!</p>
                            <p className="text-xs text-zinc-400 mt-1">Redirecting you to the workspace...</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Password */}
                            <div>
                                <label
                                    className="block text-xs font-medium mb-1.5"
                                    style={{ color: 'var(--snaps-text-secondary)' }}
                                >
                                    New Password
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

                            {/* Confirm Password */}
                            <div>
                                <label
                                    className="block text-xs font-medium mb-1.5"
                                    style={{ color: 'var(--snaps-text-secondary)' }}
                                >
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                                        onClick={() => setShowConfirmPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                        style={{ color: 'var(--snaps-text-secondary)' }}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
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
                                        <Lock size={15} />
                                        Save Password & Enter
                                    </>
                                )}
                            </motion.button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
