import { useEffect, useState } from 'react';
import { onAuthStateChange } from '@/services/auth.service';

/**
 * Id do usuário da sessão: `undefined` enquanto não se sabe, `null` sem sessão.
 *
 * As abas são por usuário (`snaps.cockpit.abas.v1.<userId>`). Ler antes de saber
 * quem é leria as abas de ninguém, e gravar gravaria por cima das de alguém.
 */
export function useIdDoUsuario(): string | null | undefined {
    const [id, setId] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        const { data } = onAuthStateChange((usuario) => setId(usuario?.id ?? null));
        return () => data.subscription.unsubscribe();
    }, []);
    return id;
}
