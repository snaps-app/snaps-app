/**
 * Wrapper de teste para componentes que consultam dados (ADR-0071).
 *
 * Um `QueryClient` NOVO por teste: o singleton do app carregaria o cache de um
 * teste para o seguinte, e a contagem de chamadas de um passaria a depender da
 * ordem em que rodaram. `retry: false` faz o erro aparecer na primeira falha,
 * sem esperar a segunda tentativa. O resto da política é a da produção.
 */
import type { ReactElement, ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { criarConsultaCliente } from '@/services/consultaCliente';

export function novoClienteDeTeste(): QueryClient {
    return criarConsultaCliente({ retry: false });
}

export function renderComConsulta(
    ui: ReactElement,
    { cliente = novoClienteDeTeste(), ...opcoes }: RenderOptions & { cliente?: QueryClient } = {},
) {
    function ComConsulta({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
    }
    return { cliente, ...render(ui, { wrapper: ComConsulta, ...opcoes }) };
}
