import { useEffect, useRef, useState } from 'react';
import { Timer, Minus, X } from 'lucide-react';
import { startExecutionSession, endExecutionSession } from '@/services/timeLogs';

interface ExecutionTimerProps {
    executionId: string;
    projectId: string;
}

function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export const ExecutionTimer: React.FC<ExecutionTimerProps> = ({ executionId }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [startedAt, setStartedAt] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [isMinimized, setIsMinimized] = useState(
        () => localStorage.getItem('timer-minimized') === 'true'
    );
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const startSession = async () => {
            try {
                const data = await startExecutionSession(executionId);
                if (!mounted) {
                    await endExecutionSession(executionId, data.session_id);
                    return;
                }
                setSessionId(data.session_id);
                sessionIdRef.current = data.session_id;
                const start = new Date(data.started_at);
                setStartedAt(start);
                setElapsed(Math.floor((Date.now() - start.getTime()) / 1000));
                intervalRef.current = setInterval(() => {
                    setElapsed(Math.floor((Date.now() - start.getTime()) / 1000));
                }, 1000);
            } catch (err) {
                console.error('[ExecutionTimer] Failed to start session:', err);
            }
        };

        startSession();

        return () => {
            mounted = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (sessionIdRef.current) {
                endExecutionSession(executionId, sessionIdRef.current).catch(() => {});
            }
        };
    }, [executionId]);

    const toggleMinimize = () => {
        setIsMinimized((prev) => {
            const next = !prev;
            localStorage.setItem('timer-minimized', String(next));
            return next;
        });
    };

    const handleClose = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (sessionIdRef.current) {
            endExecutionSession(executionId, sessionIdRef.current).catch(() => {});
            sessionIdRef.current = null;
        }
        setSessionId(null);
    };

    if (!sessionId) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                right: '1.5rem',
                zIndex: 50,
            }}
        >
            {isMinimized ? (
                <div className="flex items-center gap-2 bg-[#1a1d27] border border-purple-500/30 rounded-full px-3 py-1.5 shadow-lg shadow-purple-900/20">
                    <Timer className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span
                        className="text-purple-300 font-mono text-sm font-medium cursor-pointer"
                        onClick={toggleMinimize}
                    >
                        ▶ {formatElapsed(elapsed)}
                    </span>
                    <button
                        onClick={handleClose}
                        className="text-white/30 hover:text-white/60 transition-colors ml-1"
                        title="Encerrar sessão"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className="bg-[#1a1d27] border border-purple-500/20 rounded-xl shadow-xl shadow-purple-900/20 p-4 min-w-[200px]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-purple-400" />
                            <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Timer</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={toggleMinimize}
                                className="text-white/30 hover:text-white/60 transition-colors p-1 rounded"
                                title="Minimizar"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleClose}
                                className="text-white/30 hover:text-white/60 transition-colors p-1 rounded"
                                title="Encerrar sessão"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-2xl font-mono font-bold text-white tracking-wider">
                            {formatElapsed(elapsed)}
                        </div>
                        {startedAt && (
                            <div className="text-white/30 text-xs mt-1">
                                Início: {startedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-green-400/70 text-xs">Sessão ativa</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
