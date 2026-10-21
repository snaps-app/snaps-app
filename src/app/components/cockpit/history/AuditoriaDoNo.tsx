/**
 * Aba Nó do Cockpit: o que o nó foi — Sprint 24.0, E21 (TP-1).
 *
 * Mostra o snapshot derivado pela API (`GET /node-snapshot`, plano f518941f
 * §3.5): o prompt usado, os gates e os overrides, o hash do workflow, os
 * artefatos, os planos e o head de cada PR. Só leitura: nenhuma ação de
 * escrita mora aqui, e o nó concluído é imutável no banco (migration 080).
 *
 * Os selos dizem o que o snapshot sozinho não garante: prompt regravado depois
 * do avanço (antes da trava existir) e artefato editado depois de submetido.
 */
import type { ReactNode } from 'react';
import type { NodeSnapshot } from '@/services/types';

export interface AuditoriaDoNoProps {
    snapshot: NodeSnapshot;
}

const curto = (hash: string | null | undefined) => (hash ? hash.slice(0, 12) : '—');

const quando = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <section aria-label={titulo} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--snaps-text-secondary)]">{titulo}</h3>
            {children}
        </section>
    );
}

function Selo({ children }: { children: ReactNode }) {
    return (
        <span
            role="status"
            className="inline-flex w-fit items-center gap-1 rounded-md border border-[var(--snaps-accent-yellow)]/40 px-2 py-0.5 text-xs text-[var(--snaps-accent-yellow)]"
        >
            {children}
        </span>
    );
}

function Vazio({ children }: { children: ReactNode }) {
    return <p className="text-sm text-[var(--snaps-placeholder)]">{children}</p>;
}

function Prompt({ rotulo, texto }: { rotulo: string; texto: string | null }) {
    if (!texto) return <Vazio>{rotulo}: não registrado.</Vazio>;
    return (
        <details className="rounded-lg bg-[var(--snaps-surface)] px-3 py-2">
            <summary className="cursor-pointer text-sm text-[var(--snaps-text-primary)]">{rotulo}</summary>
            <pre className="mt-2 max-h-96 overflow-auto text-xs whitespace-pre-wrap text-[var(--snaps-text-secondary)]">{texto}</pre>
        </details>
    );
}

export function AuditoriaDoNo({ snapshot }: AuditoriaDoNoProps) {
    const { gates, workflow } = snapshot;
    const condicoes = Object.entries(gates.advance_conditions ?? {});

    return (
        <div className="flex flex-col gap-6 text-sm text-[var(--snaps-text-primary)]">
            <header className="flex flex-col gap-1">
                <p>
                    <span className="font-semibold">{workflow.fase.label}</span>
                    <span className="text-[var(--snaps-text-secondary)]"> · {snapshot.status} · {snapshot.agent_name ?? 'sem agente'}</span>
                </p>
                {snapshot.imutavel && (
                    <p className="text-xs text-[var(--snaps-text-secondary)]">Nó concluído: somente leitura.</p>
                )}
            </header>

            <Secao titulo="Prompt usado">
                {snapshot.prompt_regravado_apos_conclusao && (
                    <Selo>prompt regravado depois da conclusão (antes da trava da 24.0)</Selo>
                )}
                <Prompt rotulo="Entrada" texto={snapshot.prompt.entry} />
                <Prompt rotulo="Saída" texto={snapshot.prompt.exit} />
            </Secao>

            <Secao titulo="Gates">
                {condicoes.length === 0 ? (
                    <Vazio>Sem condição de avanço registrada no nó.</Vazio>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {condicoes.map(([nome, valor]) => (
                            <li key={nome}>
                                <code>{nome}</code>
                                <span className="text-[var(--snaps-text-secondary)]">: {JSON.stringify(valor)}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {gates.avaliacoes.length > 0 && (
                    <ul aria-label="Avaliações de gate" className="flex flex-col gap-1">
                        {gates.avaliacoes.map((avaliacao, i) => (
                            <li key={`${avaliacao.at}-${i}`} className="text-[var(--snaps-text-secondary)]">
                                {quando(avaliacao.at)} · {avaliacao.gate} ·{' '}
                                <span className={avaliacao.result === 'passed' ? 'text-[var(--snaps-success)]' : 'text-[var(--snaps-error)]'}>
                                    {avaliacao.result === 'passed' ? 'passou' : 'falhou'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Secao>

            <Secao titulo="Overrides">
                {gates.overrides.length === 0 ? (
                    <Vazio>Nenhum override neste nó.</Vazio>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {gates.overrides.map((override, i) => {
                            const payload = override.payload as { reason?: string; conditions?: string[]; decision_id?: string };
                            return (
                                <li key={`${override.at}-${i}`}>
                                    {quando(override.at)} · {(payload.conditions ?? []).join(', ') || 'override'}
                                    <span className="text-[var(--snaps-text-secondary)]">
                                        {' '}· motivo: {payload.reason ?? `decisão ${payload.decision_id ?? 'não registrada'}`}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Secao>

            <Secao titulo="Workflow">
                <p>
                    Versão {workflow.template_version ?? '—'} · hash <code title={workflow.snapshot_hash ?? undefined}>{curto(workflow.snapshot_hash)}</code>
                </p>
            </Secao>

            <Secao titulo="Artefatos">
                {snapshot.artefatos.length === 0 ? (
                    <Vazio>Nenhum artefato produzido neste nó.</Vazio>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {snapshot.artefatos.map((artefato) => (
                            <li key={artefato.id} className="flex flex-col gap-1">
                                <span>
                                    {artefato.nome}
                                    <span className="text-[var(--snaps-text-secondary)]">
                                        {' '}· {artefato.artifact_type ?? artefato.tipo} · submetido {quando(artefato.submetido_em)}
                                    </span>
                                </span>
                                {artefato.editado_apos_submissao && <Selo>editado após a submissão</Selo>}
                            </li>
                        ))}
                    </ul>
                )}
            </Secao>

            <Secao titulo="Planos">
                {snapshot.planos.length === 0 ? (
                    <Vazio>Nenhum plano ligado a este nó.</Vazio>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {snapshot.planos.map((plano) => (
                            <li key={plano.id}>
                                {plano.titulo}
                                <span className="text-[var(--snaps-text-secondary)]">
                                    {' '}· {plano.status} · rev. {plano.content_revision}
                                    {plano.approved_revision != null ? ` (aprovada a ${plano.approved_revision})` : ' (sem aprovação)'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Secao>

            <Secao titulo="Pull requests">
                {snapshot.prs.length === 0 ? (
                    <Vazio>Nenhuma PR neste nó.</Vazio>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {snapshot.prs.map((pr) => (
                            <li key={`${pr.repo}-${pr.pr_number}`}>
                                {pr.repo} #{pr.pr_number}
                                <span className="text-[var(--snaps-text-secondary)]">
                                    {' '}· head {pr.head_sha ? <code title={pr.head_sha}>{curto(pr.head_sha)}</code> : `não capturado${pr.motivo ? ` (${pr.motivo})` : ''}`}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Secao>

            <Secao titulo="Skills">
                <p className="text-[var(--snaps-text-secondary)]">Skills ativadas: não registrado nesta versão</p>
            </Secao>
        </div>
    );
}
