/** Papel por aba de raiz (ADR-0020, F6): admin no projeto A, viewer no B. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'eu' } } }) } },
}));
vi.mock('@/services/members', () => ({
    getProjectMembers: vi.fn(async (projectId: string) => [
        { user_id: 'eu', role: projectId === 'projeto-a' ? 'admin' : 'viewer' },
    ]),
}));
vi.mock('@/services/projects', () => ({ getProject: vi.fn() }));

import { useProjectRole } from '@/contexts/project-role-context';
import { AbaDeRaiz } from './AbaDeRaiz';

/** O que o cabeçalho do TP-4 fará: ação só para quem pode escrever. */
function AcoesDoNo({ nome }: { nome: string }) {
    const { can, loading, role } = useProjectRole();
    if (loading) return <p>carregando {nome}</p>;
    return (
        <div aria-label={`ações ${nome}`}>
            <span>{nome}: {role}</span>
            {can('write') && <button type="button">Avançar {nome}</button>}
        </div>
    );
}

describe('AbaDeRaiz', () => {
    it('cada aba responde pelo papel do projeto dela', async () => {
        render(
            <>
                <AbaDeRaiz projectId="projeto-a"><AcoesDoNo nome="A" /></AbaDeRaiz>
                <AbaDeRaiz projectId="projeto-b"><AcoesDoNo nome="B" /></AbaDeRaiz>
            </>,
        );

        expect(await screen.findByText('A: admin')).toBeInTheDocument();
        expect(await screen.findByText('B: viewer')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Avançar A' })).toBeInTheDocument();
        // Viewer vê, não age: as ações somem no B.
        expect(screen.queryByRole('button', { name: 'Avançar B' })).not.toBeInTheDocument();
    });

    it('sem aba de raiz por fora, ninguém age', () => {
        render(<AcoesDoNo nome="solto" />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
