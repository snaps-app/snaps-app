import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export async function getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });
}

export async function syncUserWithBackend(user: User, apiUrl: string) {
    const session = await getSession();
    if (!session) return;
    await fetch(`${apiUrl}/users/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            email: user.email ?? '',
            name: user.user_metadata?.name ?? user.email ?? 'User',
            supabase_id: user.id,
        }),
    });
}
