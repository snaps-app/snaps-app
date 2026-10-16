import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChange } from '@/services/auth.service';
import { loginComNext } from '@/lib/safeNext';
import type { User } from '@supabase/supabase-js';

interface Props {
    children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const location = useLocation();

    useEffect(() => {
        const { data } = onAuthStateChange((u) => setUser(u));
        return () => data.subscription.unsubscribe();
    }, []);

    if (user === undefined) {
        // Still initializing — render nothing to avoid flash
        return null;
    }

    if (!user) {
        // Guarda o destino: sem `next`, quem perdia a sessao por SIGNED_OUT
        // voltava sempre para o Dashboard (SNA-SUP-84).
        return <Navigate to={loginComNext(location.pathname + location.search)} replace />;
    }

    return <>{children}</>;
}
