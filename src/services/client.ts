import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

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

api.interceptors.request.use(async (config) => {
    const now = Date.now();
    if (!cachedSession || (now - lastSessionFetch > SESSION_TTL)) {
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
    (error) => {
        return Promise.reject(error);
    }
);
