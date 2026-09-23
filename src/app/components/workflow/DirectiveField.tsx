/**
 * Campo de diretiva montado a partir do schema que a API serve (SNA-RD-176).
 *
 * Nao ha lista de diretivas aqui: o controle sai do tipo declarado no schema
 * (enum, inteiro, lista, objeto). `stage`, `session_policy` e `context_budget`
 * eram lidas pelo motor e invisiveis no editor; diretiva nova com tipo
 * conhecido aparece sem mudar este arquivo.
 *
 * `null` significa "nao declarada": a fase herda o default do motor.
 */
import { useEffect, useState } from 'react';
import { schemaDoCampo, tipoDoCampo, type Schema } from '@/app/components/workflow/phaseVocabulary';
import type { PhaseDirectivesVocabulary } from '@/services/workflowTemplates';

const inputClass =
  'w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500';

interface DirectiveFieldProps {
  nome: string;
  schema: Schema;
  defs: PhaseDirectivesVocabulary['defs'];
  value: unknown;
  onChange: (valor: unknown) => void;
  obrigatorio?: boolean;
}

export function DirectiveField({ nome, schema, defs, value, onChange, obrigatorio }: DirectiveFieldProps) {
  const s = schemaDoCampo(schema, defs);
  const campo = tipoDoCampo(s, defs);
  const id = `diretiva-${nome}`;

  const rotulo = (
    <label htmlFor={id} title={s.description} className="text-[10px] font-black uppercase text-white/40 tracking-wider font-mono">
      {nome}{obrigatorio && <span className="text-red-400"> *</span>}
    </label>
  );

  switch (campo.tipo) {
    case 'enum':
      return (
        <div className="space-y-1.5">
          {rotulo}
          <select
            id={id}
            value={value == null ? '' : String(value)}
            onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
            className={inputClass}
          >
            <option value="">— não declarada</option>
            {campo.opcoes.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );

    case 'boolean':
      return (
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          aria-label={nome}
          title={s.description}
          onClick={() => onChange(!value)}
          className="w-full flex items-center justify-between p-1.5 rounded text-left text-xs transition-colors hover:bg-white/5"
        >
          <span className="text-white/70 text-[11px] font-mono">{nome}</span>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${value ? 'bg-purple-500' : 'bg-white/10'}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>
      );

    case 'lista_enum': {
      const selecionados = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="space-y-1.5">
          <legend title={s.description} className="text-[10px] font-black uppercase text-white/40 tracking-wider font-mono">{nome}</legend>
          <div className="flex flex-wrap gap-1">
            {campo.opcoes.map(o => {
              const ativo = selecionados.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    const proximo = ativo ? selecionados.filter(x => x !== o) : [...selecionados, o];
                    onChange(proximo.length ? proximo : null);
                  }}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    ativo ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'border-white/10 text-white/40 hover:bg-white/5'
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }

    case 'objeto': {
      const atual = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
      return (
        <fieldset className="space-y-2 border border-white/10 rounded-lg p-2.5 bg-white/5">
          <legend title={s.description} className="px-1 text-[10px] font-black uppercase text-white/60 tracking-wider font-mono">{nome}</legend>
          {Object.entries(campo.propriedades).map(([filho, schemaFilho]) => (
            <DirectiveField
              key={filho}
              nome={`${nome}.${filho}`}
              schema={schemaFilho}
              defs={defs}
              value={atual[filho]}
              obrigatorio={campo.obrigatorias.includes(filho)}
              onChange={v => {
                const proximo = { ...atual, [filho]: v };
                const declarados = Object.fromEntries(
                  Object.entries(proximo).filter(([, x]) => x != null),
                );
                onChange(Object.keys(declarados).length ? declarados : null);
              }}
            />
          ))}
        </fieldset>
      );
    }

    case 'json':
      return <CampoTexto id={id} rotulo={rotulo} value={value} onChange={onChange} formatar={v => JSON.stringify(v)} ler={lerJson} />;

    case 'inteiro':
      return <CampoTexto id={id} rotulo={rotulo} value={value} onChange={onChange} tipo="number" minimo={campo.minimo} ler={lerInteiro} />;

    case 'lista_texto':
      return (
        <CampoTexto
          id={id} rotulo={rotulo} value={value} onChange={onChange}
          placeholder="separados por vírgula"
          formatar={v => (Array.isArray(v) ? v.join(', ') : '')}
          ler={t => t.split(',').map(x => x.trim()).filter(Boolean)}
        />
      );

    case 'misto':
      return <CampoTexto id={id} rotulo={rotulo} value={value} onChange={onChange} ler={t => (/^\d+$/.test(t) ? Number(t) : t || null)} />;

    default:
      return <CampoTexto id={id} rotulo={rotulo} value={value} onChange={onChange} ler={t => t || null} />;
  }
}

const lerInteiro = (t: string) => (t.trim() === '' ? null : Number(t));
const lerJson = (t: string) => {
  if (!t.trim()) return null;
  try { return JSON.parse(t); } catch { return undefined; }
};

/**
 * Texto com rascunho local: '1, ' vira ['1'] no dado, mas a virgula recem
 * digitada precisa continuar na tela. Grava a cada tecla, entao trocar de aba
 * nao perde nada.
 */
function CampoTexto({
  id, rotulo, value, onChange, ler, formatar = v => (v == null ? '' : String(v)), tipo = 'text', minimo, placeholder,
}: {
  id: string;
  rotulo: React.ReactNode;
  value: unknown;
  onChange: (v: unknown) => void;
  /** `undefined` = rascunho ainda invalido; nao grava. */
  ler: (t: string) => unknown;
  formatar?: (v: unknown) => string;
  tipo?: 'text' | 'number';
  minimo?: number;
  placeholder?: string;
}) {
  const [rascunho, setRascunho] = useState(() => formatar(value));
  useEffect(() => {
    // Valor mudou por fora (outra fase selecionada): o rascunho segue o dado.
    if (JSON.stringify(ler(rascunho) ?? null) !== JSON.stringify(value ?? null)) setRascunho(formatar(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-1.5">
      {rotulo}
      <input
        id={id}
        type={tipo}
        min={minimo}
        value={rascunho}
        placeholder={placeholder ?? 'herda o default'}
        onChange={e => {
          setRascunho(e.target.value);
          const v = ler(e.target.value);
          if (v !== undefined) onChange(v);
        }}
        className={inputClass}
      />
    </div>
  );
}
