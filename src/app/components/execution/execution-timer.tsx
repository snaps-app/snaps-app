import { useEffect, useRef, useState } from 'react';
import { Timer, Minus, X, Play, Square, ListChecks } from 'lucide-react';
import { startExecutionSession, endExecutionSession, saveSessionHeartbeat } from '@/services/timeLogs';

interface ExecutionTimerProps {
    executionId: string;
    projectId: string;
    onManageSessions?: () => void;
}

function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export const ExecutionTimer: React.FC<ExecutionTimerProps> = ({ executionId, onManageSessions }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [startedAt, setStartedAt] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
    const [isStarting, setIsStarting] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isMinimized, setIsMinimized] = useState(
        () => localStorage.getItem('timer-minimized') === 'true'
    );
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const initializedRef = useRef<boolean>(false);

    // Play: só permitido quando não há sessão ativa (sessionId null) e nenhum start em andamento.
    // Isto evita double-start (duas execution_sessions concorrentes para o mesmo usuário+execução).
    const startSession = async () => {
        if (sessionIdRef.current || isStarting) return;
        setIsStarting(true);
        try {
            const data = await startExecutionSession(executionId);
            setSessionId(data.session_id);
            sessionIdRef.current = data.session_id;
            const start = new Date(data.started_at);
            setStartedAt(start);
            setElapsed(Math.floor((Date.now() - start.getTime()) / 1000));
            intervalRef.current = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start.getTime()) / 1000));
            }, 1000);

            // Heartbeat: save session progress every 30s to prevent data loss if browser closes
            heartbeatRef.current = setInterval(() => {
                const elapsedSecs = Math.floor((Date.now() - start.getTime()) / 1000);
                saveSessionHeartbeat(executionId, data.session_id, elapsedSecs).catch(err => {
                    console.warn('[ExecutionTimer] Heartbeat failed:', err);
                });
            }, 30000);
        } catch (err) {
            console.error('[ExecutionTimer] Failed to start session:', err);
        } finally {
            setIsStarting(false);
        }
    };

    // Stop: encerra a sessão ativa corrente (automática ou iniciada via Play) sem desmontar o widget.
    const stopSession = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        intervalRef.current = null;
        heartbeatRef.current = null;

        const activeSessionId = sessionIdRef.current;
        sessionIdRef.current = null;
        setSessionId(null);

        if (activeSessionId) {
            setAccumulatedSeconds((prev) => prev + elapsed);
            try {
                await endExecutionSession(executionId, activeSessionId);
            } catch (err) {
                console.warn('[ExecutionTimer] Failed to end session:', err);
            }
        }
        setElapsed(0);
        setStartedAt(null);
    };

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        startSession();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (sessionIdRef.current) {
                endExecutionSession(executionId, sessionIdRef.current).catch(() => {});
                sessionIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [executionId]);

    const toggleMinimize = () => {
        setIsMinimized((prev) => {
            const next = !prev;
            localStorage.setItem('timer-minimized', String(next));
            return next;
        });
    };

    const handleClose = async () => {
        await stopSession();
        setIsDismissed(true);
    };

    if (isDismissed) return null;

    const totalDisplaySeconds = accumulatedSeconds + elapsed;
    const isRunning = Boolean(sessionId);

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
                    <Timer className={`w-3.5 h-3.5 text-purple-400 ${isRunning ? 'animate-pulse' : ''}`} />
                    <span
                        className="text-purple-300 font-mono text-sm font-medium cursor-pointer"
                        onClick={toggleMinimize}
                    >
                        {isRunning ? '▶' : '⏸'} {formatElapsed(totalDisplaySeconds)}
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
                            {formatElapsed(totalDisplaySeconds)}
                        </div>
                        {isRunning && startedAt ? (
                            <div className="text-white/30 text-xs mt-1">
                                Início: {startedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        ) : accumulatedSeconds > 0 ? (
                            <div className="text-white/30 text-xs mt-1">Pausado</div>
                        ) : null}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                            <span className={`text-xs ${isRunning ? 'text-green-400/70' : 'text-white/30'}`}>
                                {isRunning ? 'Sessão ativa' : 'Pausado'}
                            </span>
                        </div>
                        {isRunning ? (
                            <button
                                onClick={stopSession}
                                className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                                title="Pausar sessão (Stop)"
                            >
                                <Square className="w-3 h-3" /> Stop
                            </button>
                        ) : (
                            <button
                                onClick={startSession}
                                disabled={isStarting}
                                className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 disabled:opacity-50 text-purple-300 text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                                title="Retomar sessão (Play)"
                            >
                                <Play className="w-3 h-3" /> Play
                            </button>
                        )}
                    </div>

                    {onManageSessions && (
                        <button
                            onClick={onManageSessions}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-[11px] font-medium py-1.5 rounded-md transition-colors"
                            title="Listar, criar, editar e excluir sessões desta execução"
                        >
                            <ListChecks className="w-3.5 h-3.5" /> Gerenciar sessões
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
