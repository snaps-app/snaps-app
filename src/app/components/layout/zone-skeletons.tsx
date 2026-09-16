/**
 * Skeleton de carregamento por zona (card 8e548c10).
 *
 * O app é fetch-on-mount em 34 rotas e não tinha estado de carregamento
 * consistente. Cada skeleton aqui ESPELHA A FORMA do conteúdo que vai chegar —
 * mesma altura, mesma contagem aproximada, mesmo espaçamento — para que a tela
 * não salte quando resolve. Um skeleton com forma diferente do conteúdo troca
 * um spinner por um solavanco de layout.
 *
 * Escopo desta sprint é só o carregamento por zona. Abas de execução nomeadas
 * pela tag da sprint e navegação em dois níveis foram adiadas para E21 /
 * Sprint 24.0 e não são construídas aqui.
 */
import { Skeleton } from '@/app/components/ui/skeleton';

/** Zona global: itens da barra lateral principal (~8 destinos, py-3). */
export function SidebarNavSkeleton({ isCollapsed = false }: { isCollapsed?: boolean }) {
  return (
    <div
      className="flex-1 py-4 flex flex-col gap-1 px-3"
      role="status"
      aria-label="Loading navigation"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          {!isCollapsed && <Skeleton className="h-4 flex-1 max-w-[120px] rounded" />}
        </div>
      ))}
    </div>
  );
}

/**
 * Zona de projeto: três grupos com rótulo e seus destinos. As contagens
 * acompanham o agrupamento real de `buildProjectNav` (TRABALHO tende a 6 com
 * os boards, CONHECIMENTO 2, CONFIGURAÇÃO 1).
 */
export function ContextSidebarSkeleton() {
  const grupos = [6, 2, 1];

  return (
    <div
      className="flex-1 py-4 flex flex-col gap-5 px-3"
      role="status"
      aria-label="Loading project navigation"
    >
      {grupos.map((quantidade, indice) => (
        <div key={indice} className="flex flex-col gap-1">
          <div className="px-3 pb-1">
            <Skeleton className="h-2.5 w-24 rounded" />
          </div>
          {Array.from({ length: quantidade }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
              <Skeleton className="h-3.5 flex-1 max-w-[110px] rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Zona do usuário: avatar do rodapé mais nome e papel (card 10159d7e). */
export function UserZoneSkeleton({ isCollapsed = false }: { isCollapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-2" role="status" aria-label="Loading user">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      {!isCollapsed && (
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-3 w-[140px] rounded" />
          <Skeleton className="h-2.5 w-[70px] rounded" />
        </div>
      )}
    </div>
  );
}

/** Lista genérica de zona (Dashboard, listagens): cartões de mesma altura. */
export function ZoneListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2">
          <Skeleton className="h-4 w-2/5 rounded" />
          <Skeleton className="h-3 w-3/5 rounded" />
        </div>
      ))}
    </div>
  );
}
