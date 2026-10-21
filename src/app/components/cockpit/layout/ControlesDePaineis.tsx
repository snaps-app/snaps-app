/**
 * Controles da barra superior (P14 e P28): mostrar e recolher cada painel e o
 * cabeçalho, e o lugar reservado do seletor de modo de supervisão.
 *
 * O seletor de modo é do E7 (TP-6 da raiz `90ea0e7e`). Até lá, o lugar existe
 * e diz em que Cockpit a pessoa está, sem prometer um controle que não age.
 */
import type { ReactNode } from 'react';
import { alternarPainel, paineisAbertos, PAINEIS, type LayoutDoCockpit } from '@/services/cockpitLayout';
import { NOME_DO_PAINEL } from './PaineisDoCockpit';

function Alternador({ rotulo, ativo, desabilitado, onClick }: { rotulo: string; ativo: boolean; desabilitado?: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-pressed={ativo}
            disabled={desabilitado}
            title={desabilitado ? 'O último painel aberto não recolhe' : `${ativo ? 'Recolher' : 'Mostrar'} ${rotulo}`}
            onClick={onClick}
            className={`h-7 rounded-md border px-2.5 text-xs whitespace-nowrap disabled:cursor-not-allowed ${ativo
                ? 'border-white/20 bg-white/10 text-[var(--snaps-text-primary)]'
                : 'border-white/10 text-[var(--snaps-text-secondary)] hover:bg-white/5'}`}
        >
            {rotulo}
        </button>
    );
}

export function ControlesDePaineis({ layout, onMudarLayout, modo }: {
    layout: LayoutDoCockpit;
    onMudarLayout: (layout: LayoutDoCockpit) => void;
    /** O seletor de modo de supervisão, quando o E7 o trouxer. */
    modo?: ReactNode;
}) {
    const abertos = paineisAbertos(layout);
    return (
        <div role="group" aria-label="Painéis" className="flex items-center gap-1.5">
            {PAINEIS.map((painel) => {
                const aberto = !layout.recolhidos[painel];
                return (
                    <Alternador
                        key={painel}
                        rotulo={NOME_DO_PAINEL[painel]}
                        ativo={aberto}
                        desabilitado={aberto && abertos.length <= 1}
                        onClick={() => onMudarLayout(alternarPainel(layout, painel))}
                    />
                );
            })}
            <Alternador
                rotulo="Cabeçalho"
                ativo={!layout.cabecalhoRecolhido}
                onClick={() => onMudarLayout({ ...layout, cabecalhoRecolhido: !layout.cabecalhoRecolhido })}
            />
            <div data-slot="modo-de-supervisao" className="ml-2 flex items-center">
                {modo ?? (
                    <span className="inline-flex h-6 items-center rounded-full border border-[var(--snaps-accent-purple)]/40 bg-[var(--snaps-accent-purple)]/10 px-2.5 text-xs whitespace-nowrap text-[var(--snaps-accent-purple)]">
                        Cockpit novo · Sprint 24.0
                    </span>
                )}
            </div>
        </div>
    );
}
