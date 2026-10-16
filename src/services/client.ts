import axios, { type InternalAxiosRequestConfig } from 'axios';
import { supabase } from '@/lib/supabaseClient';
import { loginComNext } from '@/lib/safeNext';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach Supabase JWT to every request when available
// Simple session caching to avoid redundant getSession calls (which can be slow)
let cachedSession: any = null;
let lastSessionFetch = 0;
const SESSION_TTL = 5000; // 5 seconds
// Margem antes do `expires_at`. O cache acima reaproveitava a sessao por 5 s
// sem olhar a validade: um token lido perto do fim seguia no header ja vencido,
// voltava 401 e derrubava a sessao de quem estava usando o app (SNA-SUP-84).
const EXPIRY_MARGIN_MS = 60_000;

const sessaoEmCacheValida = (now: number) => {
    if (!cachedSession || now - lastSessionFetch > SESSION_TTL) return false;
    const expiraEm = cachedSession.expires_at ? cachedSession.expires_at * 1000 : Infinity;
    return expiraEm - now > EXPIRY_MARGIN_MS;
};

type ConfigComRetry = InternalAxiosRequestConfig & { _retryAposRefresh?: boolean };

api.interceptors.request.use(async (config: ConfigComRetry) => {
    // O reenvio pos-refresh ja leva o token novo; reler o cache aqui poderia
    // trocar pelo antigo, que outra requisicao em paralelo tenha guardado.
    if (config._retryAposRefresh && config.headers.Authorization) return config;

    const now = Date.now();
    if (!sessaoEmCacheValida(now)) {
        const { data } = await supabase.auth.getSession();
        cachedSession = data.session;
        lastSessionFetch = now;
    }

    if (cachedSession?.access_token) {
        config.headers.Authorization = `Bearer ${cachedSession.access_token}`;
    }
    return config;
});

// --- Data Caching ---
const dataCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 seconds for project data

export const getCachedData = (key: string) => {
    const entry = dataCache[key];
    if (entry && (Date.now() - entry.timestamp < CACHE_TTL)) {
        return entry.data;
    }
    return null;
};

export const setCachedData = (key: string, data: any) => {
    dataCache[key] = { data, timestamp: Date.now() };
};

/**
 * Descarta as entradas de cache cujo nome começa por `prefix`.
 *
 * O cache não tinha nenhuma invalidação por escrita: quem criava ou editava
 * uma nota podia continuar vendo a lista antiga por até 30 s ao navegar de
 * volta. Era a segunda causa do sintoma "ele vê e eu não", independente do
 * escopo da consulta.
 */
export const invalidateCachedData = (prefix: string) => {
    for (const key of Object.keys(dataCache)) {
        if (key.startsWith(prefix)) delete dataCache[key];
    }
};

// Catch cases where API returns HTML (e.g. port conflict with another app)
api.interceptors.response.use(
    (response) => {
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
            console.error("[API] Received HTML instead of JSON. Check for port conflicts (localhost:8000).", response.config.url);
            return Promise.reject(new Error("API returned HTML instead of JSON. Check if another app is running on port 8000."));
        }
        return response;
    },
    async (error) => {
        // Depois da Sprint 20 o 401 deixou de ser excecao e virou caminho
        // normal: as rotas passaram a exigir sessao. Sem este ramo, sessao
        // expirada chegava a tela como `AxiosError: Network Error` — o usuario
        // via "falhou" e concluia que a API caiu, quando bastava entrar de novo.
        if (error?.response?.status === 401) {
            cachedSession = null;   // forca releitura; o token em cache morreu
            lastSessionFetch = 0;

            // Antes, todo 401 virava logout com reload (SNA-SUP-84). Agora a
            // sessao e renovada e a requisicao reenviada UMA vez; so vai para o
            // login quem nao tem mais refresh token valido, ou cujo reenvio
            // tambem foi recusado.
            const original = error.config as ConfigComRetry | undefined;
            if (original && !original._retryAposRefresh) {
                original._retryAposRefresh = true;
                const token = await renovarSessao();
                if (token) {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                }
            }

            const naTelaDeLogin = window.location.pathname.startsWith('/login');
            if (!naTelaDeLogin) {
                // `replace` e nao `href`: o historico nao deve guardar uma tela
                // que so existiu porque a sessao tinha acabado.
                window.location.replace(loginComNext(window.location.pathname + window.location.search));
            }
            return Promise.reject(
                new Error('Sua sessao expirou. Entre novamente para continuar.')
            );
        }
        return Promise.reject(error);
    }
);

// Um refresh so para N requisicoes que tomem 401 juntas: o refresh token do
// Supabase e rotativo, e dois refreshes paralelos fariam o segundo usar um
// token ja trocado -- e falhar, derrubando a sessao que o primeiro renovou.
let refreshEmCurso: Promise<string | null> | null = null;

function renovarSessao(): Promise<string | null> {
    if (!refreshEmCurso) {
        refreshEmCurso = supabase.auth
            .refreshSession()
            .then(({ data, error }) => {
                if (error || !data.session) return null;
                cachedSession = data.session;
                lastSessionFetch = Date.now();
                return data.session.access_token;
            })
            .catch(() => null)
            .finally(() => {
                refreshEmCurso = null;
            });
    }
    return refreshEmCurso;
}
