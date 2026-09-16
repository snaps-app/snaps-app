import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getProjectMembers } from '@/services/members';
import { getProject } from '@/services/projects';
import { supabase } from '@/lib/supabaseClient';

/**
 * O vocabulário é o do banco: o enum `project_role` admite owner, admin, member
 * e viewer (migration 031). A migration 061 normalizou o `visualizer` que
 * versões antigas gravaram como texto — ver 061_normalize_visualizer_project_role.
 *
 * O cliente ainda falava `visualizer`, e isso não era só um rótulo errado: um
 * papel `viewer` vindo do banco não batia com nenhuma chave daqui, caía no
 * nível -1 e perdia o direito de ver membros que o papel concede. Por isso o
 * termo canônico passa a ser `viewer` e o legado é normalizado na leitura, em
 * vez de um quarto termo aparecer na interface.
 */
type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer' | null;
type ActionType = 'write' | 'manage_members' | 'view_members' | 'delete';

interface ProjectRoleContextValue {
  role: ProjectRole;
  loading: boolean;
  can: (action: ActionType) => boolean;
}

const ROLE_LEVELS: Record<string, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

// Level-based abilities encode the general philosophy: viewer (0) sees
// everything but edits nothing (write starts at member); admin/owner manage.
const CAN_MAP: Record<Exclude<ActionType, 'view_members'>, number> = {
  write: 1,          // member e acima (viewer é read-only)
  manage_members: 2, // admin e owner editam membros
  delete: 3,         // owner apenas
};

// Members management is NOT one of a member's "specific things", so member is
// excluded from viewing entirely — this is non-hierarchical (viewer, level 0,
// may view while member, level 1, may not), so it's matched by explicit role.
const VIEW_MEMBERS_ROLES = new Set(['owner', 'admin', 'viewer']);

/** Rótulos de interface. Nenhum termo que não exista no banco. */
export const PROJECT_ROLE_LABELS: Record<Exclude<ProjectRole, null>, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

/** Aceita o `visualizer` legado sem deixá-lo vazar para a interface. */
export function normalizeProjectRole(role: string | null | undefined): ProjectRole {
  if (!role) return null;
  const normalizado = role === 'visualizer' ? 'viewer' : role;
  return normalizado in ROLE_LEVELS ? (normalizado as ProjectRole) : null;
}

const ProjectRoleContext = createContext<ProjectRoleContextValue>({
  role: null,
  loading: true,
  can: () => false,
});

export function ProjectRoleProvider({
  children,
  projectId,
}: {
  children: ReactNode;
  projectId?: string;
}) {
  const [role, setRole] = useState<ProjectRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setRole(null);
      setLoading(false);
      return;
    }
    let isMounted = true;
    const loadRole = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) {
            setRole(null);
            setLoading(false);
          }
          return;
        }

        // Tenta buscar da listagem de membros
        const members = await getProjectMembers(projectId);
        const me = members.find(m => m.user_id === user.id);

        if (me) {
          if (isMounted) setRole(normalizeProjectRole(me.role));
        } else {
          // Se não encontrou, checar fallback de owner
          const project = await getProject(projectId);
          if (project && project.user_id === user.id) {
            if (isMounted) setRole('owner');
          } else {
            if (isMounted) setRole(null);
          }
        }
      } catch (error) {
        console.error('Failed to load project role:', error);
        if (isMounted) setRole(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRole();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const can = (action: ActionType): boolean => {
    if (!role) return false;
    if (action === 'view_members') return VIEW_MEMBERS_ROLES.has(role);
    const userLevel = ROLE_LEVELS[role] ?? -1;
    const requiredLevel = CAN_MAP[action];
    return userLevel >= requiredLevel;
  };

  return (
    <ProjectRoleContext.Provider value={{ role, loading, can }}>
      {children}
    </ProjectRoleContext.Provider>
  );
}

export function useProjectRole(): ProjectRoleContextValue {
  return useContext(ProjectRoleContext);
}
