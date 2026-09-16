/**
 * Carregando · vazio · erro são três estados distintos (card 8e548c10).
 *
 * A regra que não é cosmética: falha de permissão aparece como erro de
 * permissão, nunca como lista vazia (Neuron D92). "Nenhum resultado" e "você
 * não pode ver isto" levam a ações opostas — quem vê vazio conclui que não há
 * nada e vai embora; quem vê a recusa sabe que precisa de acesso. Ocultar a
 * ação é ergonomia; a autorização continua sendo do backend.
 */
import { AlertTriangle, Lock } from 'lucide-react';

/** 401/403 vindos do axios. Qualquer outra falha é erro comum. */
export function isPermissionError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export function ZoneError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const semPermissao = isPermissionError(error);
  const Icone = semPermissao ? Lock : AlertTriangle;

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center"
    >
      <Icone className="w-6 h-6" style={{ color: 'var(--snaps-error)' }} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
          {semPermissao ? 'Você não tem permissão para ver isto' : 'Não foi possível carregar'}
        </p>
        <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
          {semPermissao
            ? 'Peça acesso a um administrador do projeto.'
            : 'Tente de novo em instantes.'}
        </p>
      </div>
      {!semPermissao && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all"
          style={{ color: 'var(--snaps-accent-blue)' }}
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function ZoneEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 px-6 text-center">
      <p className="text-sm font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
        {title}
      </p>
      {hint && (
        <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
