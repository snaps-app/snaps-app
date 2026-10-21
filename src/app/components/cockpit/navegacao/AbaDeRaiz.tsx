import type { ReactNode } from 'react';
import { ProjectRoleProvider } from '@/contexts/project-role-context';

/**
 * Conteúdo de uma aba de raiz, sob o papel do projeto DELA (ADR-0020, F6).
 *
 * Cada aba pode ser de um projeto diferente: admin no A e viewer no B. Um
 * provider só, o do layout, daria às duas abas o mesmo papel; fora de provider
 * nenhum, `can()` responde `false` e ninguém age. O `key` remonta o provider
 * ao trocar de projeto, para que o papel do anterior não valha nem por um render
 * — o mesmo padrão de `chat/comum/DetalheDaEntidade.tsx`.
 */
export function AbaDeRaiz({ projectId, children }: { projectId: string; children: ReactNode }) {
    return (
        <ProjectRoleProvider key={projectId} projectId={projectId}>
            {children}
        </ProjectRoleProvider>
    );
}
