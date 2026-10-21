/**
 * Aba Ambiente (P20): o que o nó recebeu, só leitura. Nenhum valor chega aqui;
 * a escrita de config é da 25.0 (P22) e aparece desabilitada.
 */
import { AlertTriangle } from 'lucide-react';
import { alertasDoAmbiente, getAmbienteDoNo } from '@/services/ambienteDoNo';
import { BotaoFuturo, EstadoDaConsulta, Secao, Vazio, useConteudoDaAba, type PropsDaAba } from './comum';

export default function AbaAmbiente(props: PropsDaAba) {
    const consulta = useConteudoDaAba(props, 'ambiente', () => getAmbienteDoNo(props.execucao.id));
    const ambiente = consulta.data;

    return (
        <EstadoDaConsulta carregando={consulta.isLoading} erro={consulta.error}>
            {ambiente && (ambiente.ambiente === null ? (
                <Vazio>{ambiente.motivo_vazio ?? 'Esta fase não recebe ambiente.'}</Vazio>
            ) : (
                <div className="space-y-8">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="font-bold text-[var(--snaps-text-primary)]">{ambiente.ambiente.nome}</span>
                        <span className="text-[var(--snaps-text-secondary)]">stage {ambiente.ambiente.stage}</span>
                        <span className="text-[var(--snaps-text-secondary)]">
                            {ambiente.fotografado_em
                                ? `foto de ${new Date(ambiente.fotografado_em).toLocaleString('pt-BR')}`
                                : ambiente.motivo_vazio}
                            {ambiente.foto_cifrada && ' · cifrada'}
                        </span>
                    </div>

                    {alertasDoAmbiente(ambiente).map((alerta) => (
                        <p key={alerta.texto} role="alert"
                            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-[var(--snaps-accent-amber)]">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {alerta.texto}
                        </p>
                    ))}

                    <Secao titulo="Repositórios">
                        <ul className="space-y-2">
                            {ambiente.repos.map((r) => (
                                <li key={r.repo} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[11px]">
                                    <p className="font-bold text-[var(--snaps-text-primary)]">
                                        {r.repo}{r.primario && ' · primário'}
                                    </p>
                                    <p className="text-[var(--snaps-text-secondary)]">
                                        branch {r.base_branch ?? 'origin/HEAD'}: {r.origem_base_branch}
                                    </p>
                                    <p className="font-mono text-[var(--snaps-text-secondary)] select-text">
                                        setup: {r.setup_command ?? '—'} · teste: {r.test_command ?? '—'} · build: {r.build_command ?? '—'}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </Secao>

                    <Secao titulo={`Variáveis (${ambiente.variaveis.total})`}>
                        {ambiente.variaveis.itens.length === 0 ? (
                            <p className="text-[11px] text-[var(--snaps-text-secondary)]">
                                {ambiente.variaveis.total > 0
                                    ? 'Os nomes das variáveis aparecem só para member.'
                                    : 'Nenhuma variável na foto.'}
                            </p>
                        ) : (
                            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
                                {ambiente.variaveis.itens.map((v) => (
                                    <li key={`${v.repo}:${v.chave}`} className="flex items-center gap-3 px-3 py-1.5 text-[11px]">
                                        <span className="min-w-0 flex-1 truncate font-mono text-[var(--snaps-text-primary)] select-text">{v.chave}</span>
                                        <span className="text-[var(--snaps-text-secondary)]">{v.repo ?? 'global'}</span>
                                        <span className="text-[var(--snaps-text-secondary)]">{v.tipo}</span>
                                        {v.mudou_no_projeto_depois && (
                                            <span className="text-[var(--snaps-accent-amber)]">mudou no projeto depois da foto</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Secao>

                    <Secao titulo="Exigidas pela fase">
                        <p className="text-[11px] text-[var(--snaps-text-secondary)]">
                            {ambiente.required_env === null
                                ? 'Os nomes exigidos pela fase aparecem só para member.'
                                : ambiente.required_env.exigidas.length === 0
                                    ? 'A fase não declara required_env.'
                                    : `${ambiente.required_env.exigidas.length - ambiente.required_env.faltando.length} de ${ambiente.required_env.exigidas.length} presentes`}
                        </p>
                    </Secao>

                    <Secao titulo="Credenciais">
                        <p className="text-[11px] text-[var(--snaps-text-secondary)]">
                            Credenciais: chegam por referência, via broker ({ambiente.credenciais.motivo}).
                        </p>
                    </Secao>

                    <div className="flex flex-wrap gap-2">
                        <BotaoFuturo rotulo="Sobrescrever nesta execução" versao="25.0" />
                        <BotaoFuturo rotulo="Pedir alteração ao projeto" versao="25.0" />
                    </div>
                </div>
            ))}
        </EstadoDaConsulta>
    );
}
