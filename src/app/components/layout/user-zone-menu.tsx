/**
 * Zona do Usuário (card 10159d7e, defeitos C1 e C2).
 *
 * C1 — `/profile` existia como rota e não tinha navegação nenhuma. Não faltava
 * um link: faltava a área do usuário. O rodapé da barra lateral, que era um
 * bloco decorativo, vira o menu do avatar.
 *
 * C2 — o papel exibido era "Admin" escrito no cliente. Agora vem de
 * `global_role`.
 *
 * Só entram destinos que já têm tela: Perfil, Storage (aba do Perfil) e, para
 * quem tem direito, Users. Axon Connections, Minhas Máquinas e MCP Servers são
 * do E9 (Sprint 27.0) e ficam de fora — um item que aceita o clique e não faz
 * nada é o padrão morto do "Add Snap" (C17), e o card proíbe repeti-lo.
 */
import { useNavigate } from 'react-router-dom';
import { User, HardDrive, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';
import { UserZoneSkeleton } from '@/app/components/layout/zone-skeletons';
import { GLOBAL_ROLE_LABELS, useCurrentUser } from '@/app/components/layout/use-current-user';

export function UserZoneMenu({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const navigate = useNavigate();
  const { email, globalRole, loading, roleError } = useCurrentUser();

  if (loading) return <UserZoneSkeleton isCollapsed={isCollapsed} />;

  const iniciais = email ? email.substring(0, 2).toUpperCase() : '--';
  const papel = globalRole ? GLOBAL_ROLE_LABELS[globalRole] : null;

  const destinos = [
    { label: 'Perfil', icon: User, path: '/profile' },
    { label: 'Storage', icon: HardDrive, path: '/profile?tab=storage' },
  ];

  // `/users` já existe, mas só o super_admin a enxerga — é o mesmo critério que
  // a barra lateral aplica. Esconder é ergonomia: o backend recusa de qualquer
  // forma (Neuron D92).
  if (globalRole === 'super_admin') {
    destinos.push({ label: 'Users', icon: Users, path: '/users' });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menu do usuário"
        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-all outline-none focus-visible:ring-1 focus-visible:ring-border"
      >
        <div
          className="w-8 h-8 rounded-full p-[1px] shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--snaps-accent-blue) 0%, var(--snaps-accent-purple) 100%)',
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
            style={{ backgroundColor: 'var(--snaps-bg)' }}
          >
            {iniciais}
          </div>
        </div>

        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden text-left max-w-[180px]">
            <span className="text-xs font-bold text-white truncate" title={email ?? undefined}>
              {email ?? 'Sessão sem e-mail'}
            </span>
            {papel ? (
              <span className="text-[10px] text-zinc-500">{papel}</span>
            ) : (
              <span
                className="text-[10px]"
                style={{ color: roleError ? 'var(--snaps-error)' : 'var(--snaps-placeholder)' }}
              >
                {roleError ? 'Papel indisponível' : 'Sem papel definido'}
              </span>
            )}
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-[240px]">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-foreground">{email ?? 'Sessão sem e-mail'}</span>
          {papel ? (
            <span className="text-muted-foreground font-normal">{papel}</span>
          ) : (
            <span
              className="font-normal"
              style={{ color: roleError ? 'var(--snaps-error)' : 'var(--snaps-placeholder)' }}
            >
              {roleError ? 'Papel indisponível' : 'Sem papel definido'}
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {destinos.map((destino) => (
          <DropdownMenuItem key={destino.path} onSelect={() => navigate(destino.path)}>
            <destino.icon className="w-4 h-4 text-muted-foreground" />
            {destino.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
