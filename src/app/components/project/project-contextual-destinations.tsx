/**
 * Entradas contextuais dos destinos que saíram da barra lateral (card 850de8e0).
 *
 * Reagrupar não é apagar. Plans, QA e Retro só viram abas da execução em E21
 * (Sprints 24-25); Timeline vira faixa do Dashboard em E22; Members vira aba de
 * Settings no card 6ea66bc6. Enquanto esses destinos não existem, as telas
 * continuam vivas e alcançáveis daqui — é isso que separa uma reorganização de
 * uma perda de funcionalidade.
 *
 * Quando cada destino definitivo chegar, a entrada correspondente sai daqui, e
 * a remoção da rota é card da sprint que entregar a aba.
 */
import { useNavigate } from 'react-router-dom';
import { buildContextualDestinations } from '@/app/components/layout/project-nav';
import { useProjectRole } from '@/contexts/project-role-context';

export function ProjectContextualDestinations({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { can } = useProjectRole();

  const destinos = buildContextualDestinations(projectId).filter(
    (destino) => !destino.requerVerMembros || can('view_members')
  );

  if (destinos.length === 0) return null;

  return (
    <section aria-labelledby="mais-do-projeto" className="flex flex-col gap-3">
      <h3
        id="mais-do-projeto"
        className="text-[10px] uppercase tracking-widest font-bold"
        style={{ color: 'var(--snaps-text-secondary)' }}
      >
        Mais do projeto
      </h3>

      <div className="flex flex-wrap gap-2">
        {destinos.map((destino) => (
          <button
            key={destino.path}
            onClick={() => navigate(destino.path)}
            title={destino.aguarda}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm"
            style={{ color: 'var(--snaps-text-secondary)' }}
          >
            <destino.icon className="w-4 h-4" />
            <span>{destino.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
