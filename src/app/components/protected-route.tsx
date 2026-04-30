import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChange } from '@/services/auth.service';
import type { User } from '@supabase/supabase-js';

interface Props {
    children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
    const [user, setUser] = useState<User | null | undefined>(undefined);

    useEffect(() => {
        const { data } = onAuthStateChange((u) => setUser(u));
        return () => data.subscription.unsubscribe();
    }, []);

    if (user === undefined) {
        // Still initializing — render nothing to avoid flash
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
