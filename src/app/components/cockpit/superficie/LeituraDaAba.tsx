import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { ChaveDeAba } from './catalogo';
const Contexto = createContext<((aba: ChaveDeAba) => void) | null>(null);
export function LeituraDaAbaProvider({onExibido,children}:{onExibido:(aba:ChaveDeAba)=>void;children:ReactNode}) {
    return <Contexto.Provider value={onExibido}>{children}</Contexto.Provider>;
}
export function useConteudoExibido(aba: ChaveDeAba, pronto: boolean, atualizadoEm: number) {
    const marcar = useContext(Contexto);
    useEffect(() => { if (pronto) marcar?.(aba); }, [marcar,aba,pronto,atualizadoEm]);
}
