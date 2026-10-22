/**
 * Esqueleto do Cockpit enquanto o chunk dele carrega (rota `lazy`, ADR-0071).
 *
 * Fica FORA de `components/cockpit/` de propósito: `App.tsx` o importa
 * estaticamente, e a trava de `App.consulta.test.ts` proíbe import estático de
 * `cockpit/` — é ela que garante o chunk próprio.
 */
export function EsqueletoDoCockpit() {
    return (
        <div
            role="status"
            aria-label="Carregando o Cockpit"
            className="flex h-screen flex-col"
            style={{ backgroundColor: 'var(--snaps-bg)' }}
        >
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4">
                <div className="mr-3 h-4 w-12 animate-pulse rounded bg-white/10" />
                <div className="h-8 w-44 animate-pulse rounded-lg bg-white/10" />
                <div className="h-8 w-36 animate-pulse rounded-lg bg-white/5" />
            </div>
            <div className="flex min-h-0 flex-1 gap-3 p-4">
                <div className="w-72 animate-pulse rounded-xl bg-white/5" />
                <div className="flex-1 animate-pulse rounded-xl bg-white/5" />
                <div className="w-96 animate-pulse rounded-xl bg-white/5" />
            </div>
        </div>
    );
}
