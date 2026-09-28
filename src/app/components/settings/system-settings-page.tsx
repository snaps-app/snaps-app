/**
 * Settings do sistema (SNA-RD-186): a área de gestão da plataforma Snaps.
 *
 * Só `super_admin`. A primeira seção é "Neuron — chave e modelos" (contrato
 * C4). Não se confunde com as Settings de projeto.
 *
 * A chave é só de escrita: o campo é limpo depois de salvar e a tela nunca
 * recebe o valor de volta, só os metadados.
 */
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { KeyRound, Cpu, History, Settings as SettingsIcon } from 'lucide-react';
import { useCurrentUser } from '@/app/components/layout/use-current-user';
import { ZoneEmpty, ZoneError } from '@/app/components/layout/zone-state';
import {
  adicionarModelo,
  detalheDoErro,
  getConfiguracaoNeuron,
  gravarChave,
  statusDoErro,
  testarChave,
  trocarModeloDaCategoria,
  type Categoria,
  type ConfiguracaoNeuron,
} from '@/services/system-settings';

const HISTORICO_MAX = 20;
const SECOES_FUTURAS = [
  { titulo: 'Perfis de agente', texto: 'Leitura dos perfis; a edição segue pelo prompt_sync.' },
  { titulo: 'Guardrails do Neuron', texto: 'Teto por turno, iterações e kill switch.' },
  { titulo: 'Markup padrão da plataforma', texto: 'Custo repassado por projeto.' },
  { titulo: 'Saúde do sistema', texto: 'Versões, prompt_sync check e o Neuron com chave e modelos.' },
  { titulo: 'Users', texto: 'Hoje no menu principal.' },
];

const SEM_PERMISSAO = { response: { status: 403 } };

const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '');

function Secao({ icone, titulo, children }: { icone: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <section
      className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col gap-4"
      aria-label={titulo}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>
        {icone}
        {titulo}
      </h3>
      {children}
    </section>
  );
}

const campo =
  'w-full px-3 py-2 rounded-[var(--radius-md)] bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-white/30';
const botao =
  'px-4 py-2 rounded-[var(--radius-md)] border border-white/10 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50';

function Aviso({ tipo, children }: { tipo: 'ok' | 'erro' | 'aguardando'; children: ReactNode }) {
  const cor = tipo === 'ok' ? 'var(--snaps-success)' : tipo === 'erro' ? 'var(--snaps-error)' : 'var(--snaps-accent-yellow)';
  return (
    <p role={tipo === 'erro' ? 'alert' : 'status'} className="text-xs" style={{ color: cor }}>
      {children}
    </p>
  );
}

function SecaoChave({ config, aoMudar }: { config: ConfiguracaoNeuron; aoMudar: (c: ConfiguracaoNeuron) => void }) {
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const { chave } = config;

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (!valor.trim()) return;
    setSalvando(true);
    setAviso(null);
    try {
      const nova = await gravarChave(valor);
      aoMudar({ ...config, chave: nova });
      setAviso({ tipo: 'ok', texto: 'Chave gravada.' });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: detalheDoErro(erro) });
    } finally {
      setValor(''); // o valor não fica na tela, deu certo ou não
      setSalvando(false);
    }
  };

  const testar = async () => {
    setTestando(true);
    setAviso(null);
    try {
      const r = await testarChave();
      setAviso({ tipo: r.ok ? 'ok' : 'erro', texto: r.mensagem });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: detalheDoErro(erro) });
    } finally {
      setTestando(false);
    }
  };

  return (
    <Secao icone={<KeyRound className="w-4 h-4" />} titulo="Chave de API da Anthropic">
      <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }} data-testid="estado-chave">
        {chave.configurada
          ? `configurada · ••••${chave.ultimos4 ?? ''}${chave.gravada_por ? ` · por ${chave.gravada_por.email}` : ''}${chave.gravada_em ? ` em ${dataHora(chave.gravada_em)}` : ''}`
          : 'Nenhuma chave configurada. O Neuron fica sem responder até uma chave ser gravada.'}
      </p>
      <form onSubmit={salvar} className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="nova-chave">Nova chave</label>
        <input
          id="nova-chave"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={chave.configurada ? 'Substituir a chave' : 'Colar a chave'}
          className={campo}
          style={{ color: 'var(--snaps-text-primary)' }}
        />
        <button type="submit" className={botao} disabled={salvando || !valor.trim()} style={{ color: 'var(--snaps-accent-blue)' }}>
          {salvando ? 'Gravando…' : 'Salvar chave'}
        </button>
        <button type="button" className={botao} onClick={testar} disabled={testando || !chave.configurada} style={{ color: 'var(--snaps-text-primary)' }}>
          {testando ? 'Testando…' : 'Testar chave'}
        </button>
      </form>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
    </Secao>
  );
}

function SecaoModelos({ config, recarregar }: { config: ConfiguracaoNeuron; recarregar: () => Promise<void> }) {
  const [modelId, setModelId] = useState('');
  const [rotulo, setRotulo] = useState('');
  const [entrada, setEntrada] = useState('');
  const [saida, setSaida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    if (!modelId.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await adicionarModelo({
        model_id: modelId.trim(),
        ...(rotulo.trim() ? { label: rotulo.trim() } : {}),
        ...(entrada.trim() ? { price_input_usd_mtok: Number(entrada) } : {}),
        ...(saida.trim() ? { price_output_usd_mtok: Number(saida) } : {}),
      });
      setModelId('');
      setRotulo('');
      setEntrada('');
      setSaida('');
      await recarregar();
    } catch (falha) {
      setErro(detalheDoErro(falha));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Secao icone={<Cpu className="w-4 h-4" />} titulo="Modelos salvos">
      {config.modelos.length === 0 ? (
        <ZoneEmpty title="Nenhum modelo salvo" hint="Adicione o ID de um modelo da Anthropic." />
      ) : (
        <ul className="flex flex-col gap-1 text-sm" aria-label="Lista de modelos">
          {config.modelos.map((m) => (
            <li key={m.id} className="flex justify-between gap-4" style={{ color: 'var(--snaps-text-primary)' }}>
              <span>{m.label ? `${m.label} (${m.model_id})` : m.model_id}</span>
              <span style={{ color: 'var(--snaps-text-secondary)' }}>
                {m.price_input_usd_mtok != null && m.price_output_usd_mtok != null
                  ? `US$ ${m.price_input_usd_mtok} / ${m.price_output_usd_mtok} por MTok`
                  : 'sem preço'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={adicionar} className="grid grid-cols-1 sm:grid-cols-5 gap-2" aria-label="Adicionar modelo">
        <input aria-label="ID do modelo" value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="ID do modelo" className={`${campo} sm:col-span-2`} style={{ color: 'var(--snaps-text-primary)' }} />
        <input aria-label="Rótulo (opcional)" value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Rótulo (opcional)" className={campo} style={{ color: 'var(--snaps-text-primary)' }} />
        <input aria-label="Preço de entrada US$/MTok (opcional)" inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="Entrada US$/MTok" className={campo} style={{ color: 'var(--snaps-text-primary)' }} />
        <input aria-label="Preço de saída US$/MTok (opcional)" inputMode="decimal" value={saida} onChange={(e) => setSaida(e.target.value)} placeholder="Saída US$/MTok" className={campo} style={{ color: 'var(--snaps-text-primary)' }} />
        <button type="submit" className={`${botao} sm:col-span-5`} disabled={enviando || !modelId.trim()} style={{ color: 'var(--snaps-accent-blue)' }}>
          {enviando ? 'Conferindo na Models API…' : 'Adicionar modelo'}
        </button>
      </form>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Secao>
  );
}

function SecaoCategorias({ config, recarregar }: { config: ConfiguracaoNeuron; recarregar: () => Promise<void> }) {
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro' | 'aguardando'; texto: string } | null>(null);

  const trocar = async (categoria: Categoria, modelo: string) => {
    setAviso({ tipo: 'aguardando', texto: `Trocando a categoria ${categoria.categoria}…` });
    try {
      await trocarModeloDaCategoria(categoria.categoria, modelo, categoria.lock_version);
      await recarregar();
      setAviso({ tipo: 'ok', texto: `Categoria ${categoria.categoria} agora usa ${modelo}.` });
    } catch (erro) {
      if (statusDoErro(erro) === 409) {
        await recarregar();
        setAviso({ tipo: 'erro', texto: 'Outra pessoa mudou esta categoria antes. A tela foi recarregada; confira e escolha de novo.' });
      } else {
        setAviso({ tipo: 'erro', texto: detalheDoErro(erro) });
      }
    }
  };

  return (
    <Secao icone={<SettingsIcon className="w-4 h-4" />} titulo="Modelo por categoria">
      <div className="flex flex-col gap-2">
        {config.categorias.map((c) => (
          <div key={c.categoria} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
            <span style={{ color: 'var(--snaps-text-primary)' }}>
              {c.categoria} · {c.rotulo}
            </span>
            {c.fixa ? (
              <span style={{ color: 'var(--snaps-text-secondary)' }} data-testid={`categoria-${c.categoria}`}>
                executores externos (Axon)
              </span>
            ) : (
              <select
                aria-label={`Modelo da categoria ${c.categoria}`}
                value={c.model_id ?? ''}
                onChange={(e) => trocar(c, e.target.value)}
                className={`${campo} sm:w-72`}
                style={{ color: 'var(--snaps-text-primary)' }}
              >
                {!c.model_id && <option value="">Escolha um modelo</option>}
                {config.modelos.map((m) => (
                  <option key={m.id} value={m.model_id} className="bg-zinc-900">
                    {m.label ? `${m.label} (${m.model_id})` : m.model_id}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
    </Secao>
  );
}

function SecaoHistorico({ config }: { config: ConfiguracaoNeuron }) {
  const itens = config.historico.slice(0, HISTORICO_MAX);
  const valor = (v: unknown) => (v == null ? '—' : typeof v === 'string' ? v : JSON.stringify(v));
  return (
    <Secao icone={<History className="w-4 h-4" />} titulo="Histórico de trocas">
      {itens.length === 0 ? (
        <ZoneEmpty title="Nenhuma troca registrada ainda" />
      ) : (
        <ul className="flex flex-col gap-1 text-xs" aria-label="Trocas recentes" style={{ color: 'var(--snaps-text-secondary)' }}>
          {itens.map((h, i) => (
            <li key={`${h.em}-${i}`}>
              {dataHora(h.em)} · {h.por ?? 'sistema'} · {h.entidade} {h.chave}: {valor(h.antes)} → {valor(h.depois)}
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}

export function SystemSettingsPage() {
  const { globalRole, loading: carregandoUsuario } = useCurrentUser();
  const [config, setConfig] = useState<ConfiguracaoNeuron | null>(null);
  const [erro, setErro] = useState<unknown>(null);
  const [carregando, setCarregando] = useState(false);
  const podeVer = globalRole === 'super_admin';

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setConfig(await getConfiguracaoNeuron());
      setErro(null);
    } catch (falha) {
      setErro(falha);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (podeVer) void recarregar();
  }, [podeVer, recarregar]);

  let corpo: ReactNode;
  if (carregandoUsuario || (podeVer && carregando && !config)) {
    corpo = <p role="status" className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>Carregando…</p>;
  } else if (!podeVer) {
    corpo = <ZoneError error={SEM_PERMISSAO} />;
  } else if (erro && !config) {
    corpo = <ZoneError error={erro} onRetry={recarregar} />;
  } else if (config) {
    corpo = (
      <>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>Neuron — chave e modelos</h2>
        <SecaoChave config={config} aoMudar={setConfig} />
        <SecaoModelos config={config} recarregar={recarregar} />
        <SecaoCategorias config={config} recarregar={recarregar} />
        <SecaoHistorico config={config} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Seções futuras">
          {SECOES_FUTURAS.map((s) => (
            <div key={s.titulo} aria-disabled="true" className="rounded-[var(--radius-lg)] border border-white/5 bg-white/[0.02] p-4 opacity-60">
              <p className="text-sm font-medium" style={{ color: 'var(--snaps-text-primary)' }}>{s.titulo}</p>
              <p className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>{s.texto} · em breve</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 flex flex-col gap-6 max-w-4xl" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--snaps-text-primary)' }}>Settings do sistema</h1>
        <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
          Gestão da plataforma Snaps e do Neuron. As Settings de cada projeto ficam no projeto.
        </p>
      </header>
      {corpo}
    </div>
  );
}
