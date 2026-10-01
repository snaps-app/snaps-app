/**
 * Papel do usuário no projeto, pela mesma regra da API
 * (`resolve_project_role`): super_admin conta como owner; o dono do projeto é
 * owner; senão vale o papel de membro. A API não tem rota "meu papel", então a
 * tela junta `/users/me`, o projeto e a lista de membros.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getProject } from '@/services/projects';
import { getProjectMembers } from '@/services/members';
import { useCurrentUser } from '@/app/components/layout/use-current-user';
import type { PapelNoProjeto } from './perfis';

export async function resolverPapelNoProjeto(projectId: string, globalRole: string | null): Promise<PapelNoProjeto> {
  if (globalRole === 'super_admin') return 'owner';
  const { data } = await supabase.auth.getSession();
  const eu = data.session?.user?.id;
  const projeto = await getProject(projectId);
  if (eu && projeto.user_id === eu) return 'owner';
  const membros = await getProjectMembers(projectId);
  return membros.find((m) => m.user_id === eu)?.role ?? 'viewer';
}

export function usePapelNoProjeto(projectId: string | undefined) {
  const { globalRole, loading: carregandoUsuario } = useCurrentUser();
  const [papel, setPapel] = useState<PapelNoProjeto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!projectId || carregandoUsuario) return;
    let ativo = true;
    setCarregando(true);
    resolverPapelNoProjeto(projectId, globalRole)
      .then((p) => {
        if (!ativo) return;
        setPapel(p);
        setErro(false);
      })
      .catch(() => {
        if (!ativo) return;
        setPapel(null);
        setErro(true);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [projectId, globalRole, carregandoUsuario]);

  return { papel, carregando: carregando || carregandoUsuario, erro };
}
