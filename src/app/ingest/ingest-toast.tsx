import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Scissors, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIngestQueue } from '@/app/ingest/ingestQueue';
import type { EstadoItem } from '@/app/ingest/ingestQueue';

/**
 * O aviso flutuante da fila de importacao.
 *
 * Depois que a modal fecha, ele e o unico vestigio do trabalho em curso -- e
 * por isso nao pode arredondar a verdade. Em especial: material que parou por
 * ser grande NAO e sucesso nem falha, e sim decisao pendente. Chamar isso de
 * "pronto" faria o usuario nunca voltar nele, e o material ficaria extraido
 * para sempre sem virar nota nenhuma.
 *
 * Da para encolher, porque expandido ele cobria os botoes do painel de revisao
 * -- sobrepor a acao que o proprio aviso pede e o pior lugar possivel. Mas
 * encolhido ele NAO pode virar so uma bolinha: continua contando quantos
 * materiais esperam decisao, senao esconder vira perder.
 */

const ETAPA: Record<EstadoItem, string> = {
  esperando: 'na fila',
  subindo: 'enviando o arquivo',
  extraindo: 'lendo o conteúdo',
  decompondo: 'quebrando em notas',
  pronto: 'pronto',
  'grande-demais': 'espera sua decisão',
  falhou: 'parou',
};

const TERMINADOS: EstadoItem[] = ['pronto', 'falhou', 'grande-demais'];

export function IngestToast() {
  const { itens, progresso, ativa, dispensar } = useIngestQueue();
  const [minimizado, setMinimizado] = useState(false);

  if (itens.length === 0) return null;

  const concluidos = itens.filter((i) => TERMINADOS.includes(i.estado)).length;
  const corrente = itens.find((i) => !TERMINADOS.includes(i.estado));
  const problemas = itens.filter((i) => i.estado === 'falhou' || i.estado === 'grande-demais');
  const esperandoDecisao = itens.filter((i) => i.estado === 'grande-demais').length;
  const pct = Math.round(progresso * 100);

  if (minimizado) {
    return (
      <button
        onClick={() => setMinimizado(false)}
        aria-label="Maximizar"
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full"
        style={{
          background: '#101014',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
        }}
      >
        {ativa ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--snaps-accent-blue)' }} />
        ) : (
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--snaps-accent-green)' }} />
        )}
        <span className="text-xs font-mono" style={{ color: 'var(--snaps-text-secondary)' }}>
          {concluidos} de {itens.length} · {pct}%
        </span>
        {esperandoDecisao > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              color: 'var(--snaps-accent-orange)',
              border: '1px solid rgba(255,107,53,0.45)',
              background: 'rgba(255,107,53,0.12)',
            }}
          >
            {esperandoDecisao} esperando você
          </span>
        )}
        <ChevronUp className="w-4 h-4" style={{ color: 'var(--snaps-text-secondary)' }} />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed bottom-6 right-6 z-[60] w-full max-w-sm rounded-2xl p-4"
        style={{
          background: '#101014',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {ativa ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--snaps-accent-blue)' }} />
              ) : (
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--snaps-accent-green)' }} />
              )}
              <span className="text-sm font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>
                Importando materiais
              </span>
            </div>
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--snaps-placeholder)' }}>
              {concluidos} de {itens.length} · {pct}%
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMinimizado(true)}
              aria-label="Minimizar"
              style={{ color: 'var(--snaps-text-secondary)' }}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {!ativa && (
              <button
                onClick={dispensar}
                aria-label="Dispensar"
                style={{ color: 'var(--snaps-text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div
          className="h-1 rounded-full overflow-hidden mb-3"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #00D4FF 0%, #A855F7 100%)',
            }}
          />
        </div>

        {corrente && (
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--snaps-text-secondary)' }}>
            <span className="truncate font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
              {corrente.nome}
            </span>
            <span className="shrink-0 opacity-70">— {ETAPA[corrente.estado]}</span>
          </div>
        )}

        {problemas.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {problemas.map((i) => (
              <div key={i.id} className="flex items-start gap-2 text-xs">
                {i.estado === 'grande-demais' ? (
                  <Scissors className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--snaps-accent-orange)' }} />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--snaps-accent-red)' }} />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
                    {i.nome}
                  </div>
                  <div style={{ color: 'var(--snaps-placeholder)' }}>
                    {i.estado === 'grande-demais'
                      ? `${i.blocos} blocos — ${ETAPA[i.estado]} no painel do material.`
                      : i.erro}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </motion.div>
    </AnimatePresence>
  );
}
