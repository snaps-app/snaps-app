import type { PerfilNeuron } from '@/services/chats';
import { MOTIVO_SO_CHATTER, PERFIS } from './perfis';

interface SeletorDePerfilProps {
  perfil: PerfilNeuron;
  aoTrocar: (perfil: PerfilNeuron) => void;
  habilitado: boolean;
  carregando?: boolean;
}

/** Chatter (padrão), Planner e Coder. Viewer vê o seletor desabilitado com o motivo. */
export function SeletorDePerfil({ perfil, aoTrocar, habilitado, carregando = false }: SeletorDePerfilProps) {
  const desabilitado = carregando || !habilitado;
  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label="Perfil do Neuron"
        value={perfil}
        disabled={desabilitado}
        title={!carregando && !habilitado ? MOTIVO_SO_CHATTER : undefined}
        onChange={(e) => aoTrocar(e.target.value as PerfilNeuron)}
        className="px-3 py-1.5 rounded-[var(--radius-md)] bg-black/30 border border-white/10 text-sm focus:outline-none disabled:opacity-60"
        style={{ color: 'var(--snaps-text-primary)' }}
      >
        {PERFIS.map((p) => (
          <option key={p.key} value={p.key} className="bg-zinc-900">
            {p.rotulo}
          </option>
        ))}
      </select>
      {!carregando && !habilitado && (
        <span className="text-xs max-w-[240px] text-right" style={{ color: 'var(--snaps-text-secondary)' }}>
          {MOTIVO_SO_CHATTER}
        </span>
      )}
    </div>
  );
}
