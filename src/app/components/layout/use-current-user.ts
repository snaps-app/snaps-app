/**
 * Usuário autenticado e seu papel na instalação (card 10159d7e, defeito C2).
 *
 * O papel exibido era a string "Admin" escrita no cliente — verdadeira por
 * acaso para quem desenvolvia e falsa para todo o resto, já que o enum
 * `global_role` só admite `super_admin` e `user`. O papel passa a vir do
 * backend, de `/users/me`, que já devolvia o campo; a barra lateral apenas o
 * descartava.
 *
 * Quando o papel não chega, o estado é `erro`, não um papel inventado: uma
 * credencial que a interface não conseguiu confirmar não pode ser desenhada
 * como se tivesse sido confirmada.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/services/client';

export type GlobalRole = 'super_admin' | 'user';

/** Rótulos do enum `global_role`. Nenhum termo fora do que o banco admite. */
export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  super_admin: 'Super Admin',
  user: 'Usuário',
};

export interface CurrentUser {
  email: string | null;
  globalRole: GlobalRole | null;
  /** Carregando a sessão ou o perfil. */
  loading: boolean;
  /** O perfil não pôde ser lido — o papel é desconhecido, não presumido. */
  roleError: boolean;
}

export function useCurrentUser(): CurrentUser {
  const [email, setEmail] = useState<string | null>(null);
  const [globalRole, setGlobalRole] = useState<GlobalRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleError, setRoleError] = useState(false);

  useEffect(() => {
    let ativo = true;

    const carregarPapel = async (token: string) => {
      try {
        const resposta = await api.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!ativo) return;
        const papel = resposta.data?.global_role;
        if (papel === 'super_admin' || papel === 'user') {
          setGlobalRole(papel);
          setRoleError(false);
        } else {
          // O endpoint respondeu sem papel reconhecível: é falta de dado, e a
          // interface diz isso em vez de escolher um valor.
          setGlobalRole(null);
          setRoleError(true);
        }
      } catch (erro) {
        console.error('Failed to fetch global role', erro);
        if (!ativo) return;
        setGlobalRole(null);
        setRoleError(true);
      } finally {
        if (ativo) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      const sessao = data.session;
      setEmail(sessao?.user?.email ?? null);
      if (sessao?.access_token) {
        carregarPapel(sessao.access_token);
      } else {
        setLoading(false);
      }
    });

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!ativo) return;
      setEmail(sessao?.user?.email ?? null);
      if (sessao?.access_token) {
        setLoading(true);
        carregarPapel(sessao.access_token);
      } else {
        setGlobalRole(null);
        setRoleError(false);
        setLoading(false);
      }
    });

    return () => {
      ativo = false;
      inscricao?.subscription?.unsubscribe();
    };
  }, []);

  return { email, globalRole, loading, roleError };
}
