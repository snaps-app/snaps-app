import { X, FileText, Brain } from 'lucide-react';
import { motion } from 'motion/react';

/**
 * Para onde vai o arquivo.
 *
 * O "Importar" sempre teve um destino so -- /governance-docs -- e quem quisesse
 * trazer uma aula clicava nele, subia o arquivo e nao acontecia nada do
 * esperado, porque o caminho da aula nao existia.
 *
 * Uma pergunta, e nao dois botoes no cabecalho: "Importar" e "Importar material"
 * lado a lado sao dois rotulos parecidos, e a diferenca entre eles -- um vira
 * documento de contexto, o outro vira memoria que os agentes leem -- e grande
 * demais para caber no espaco de um rotulo.
 */

export type DestinoImportacao = 'governance' | 'source';

interface Props {
  onEscolher: (destino: DestinoImportacao) => void;
  onClose: () => void;
}

export function ImportDestinationModal({ onEscolher, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl p-6"
        style={{ background: '#101014', border: '1px solid rgba(255,255,255,0.11)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>
            O que você está importando?
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg"
            style={{ color: 'var(--snaps-text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--snaps-placeholder)' }}>
          Os dois aceitam PDF, DOCX, PPTX, MD, TXT e imagem. O destino é que muda.
        </p>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <button
            onClick={() => onEscolher('governance')}
            className="text-left p-4 rounded-xl"
            style={{ border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(255,255,255,0.045)' }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--snaps-accent-green)' }}>
              <FileText className="w-4 h-4" />
              <span className="font-semibold">Governance documents</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--snaps-placeholder)' }}>
              PRD, roadmap, playbook. Fica inteiro, do jeito que veio, e alimenta o contexto das
              execuções.
            </p>
          </button>

          <button
            onClick={() => onEscolher('source')}
            className="text-left p-4 rounded-xl"
            style={{ border: '1px solid rgba(168,85,247,0.5)', background: 'rgba(168,85,247,0.07)' }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--snaps-accent-purple)' }}>
              <Brain className="w-4 h-4" />
              <span className="font-semibold">Source documents</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--snaps-placeholder)' }}>
              Aula, artigo, transcrição. É quebrado em notas atômicas e entra na memória{' '}
              <strong style={{ color: 'var(--snaps-text-primary)' }}>depois da sua revisão</strong>.
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
