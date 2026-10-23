import { createContext, useContext, type ReactNode } from 'react';
import type { EstadoDaAba } from '@/services/cockpitAbas';

type Parcial = Partial<Pick<EstadoDaAba, 'scrollDaConversa' | 'filtroDeCard' | 'ramosRecolhidos' | 'leituras'>>;

interface ValorDoContexto {
    estado: EstadoDaAba | null;
    /** Grava estado de tela da aba ativa (scroll da Conversa, filtro de card). */
    atualizar: (parcial: Parcial) => void;
}

const Contexto = createContext<ValorDoContexto>({ estado: null, atualizar: () => undefined });

/**
 * Estado de tela da aba de raiz ativa, para os painéis lerem e gravarem sem
 * conhecer o storage. O nó e a aba da Superfície NÃO passam por aqui: eles vêm
 * da URL, e trocá-los é navegar com `rotaDoNo`.
 */
export function EstadoDaAbaProvider({ value, children }: { value: ValorDoContexto; children: ReactNode }) {
    return <Contexto.Provider value={value}>{children}</Contexto.Provider>;
}

export function useEstadoDaAba(): ValorDoContexto {
    return useContext(Contexto);
}
