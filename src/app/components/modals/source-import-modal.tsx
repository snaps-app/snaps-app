import { useState } from 'react';
import { X, Upload, FileText, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useIngestQueue } from '@/app/ingest/ingestQueue';

/**
 * A escolha dos materiais a importar.
 *
 * Esta modal ja rodou a esteira inteira aqui dentro, um arquivo por vez, com a
 * tela travada esperando. A esteira mudou de lugar: vive em
 * `app/ingest/ingestQueue`, acima das rotas.
 *
 * O motivo e o que ela impedia: enquanto a esteira rodava aqui, fechar a modal
 * ou navegar matava a importacao -- e nao dava para revisar um material
 * enquanto os outros subiam. O portao de tamanho foi junto, e la ele nao
 * pergunta: numa fila em segundo plano nao ha a quem perguntar, entao o
 * material grande para extraido e o painel dele oferece a decomposicao com a
 * conta na tela.
 */

interface Props {
  projectId: string;
  onClose: () => void;
}

function tamanhoLegivel(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function SourceImportModal({ projectId, onClose }: Props) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const { enfileirar } = useIngestQueue();

  const importar = () => {
    if (arquivos.length === 0) return;
    enfileirar(projectId, arquivos);
    onClose();
  };

  const remover = (nome: string) =>
    setArquivos((atual) => atual.filter((f) => f.name !== nome));

  const n = arquivos.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: '#101014', border: '1px solid rgba(255,255,255,0.11)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>
            Importar source documents
          </h2>
          <button onClick={onClose} aria-label="Fechar" style={{ color: 'var(--snaps-text-secondary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <label
          htmlFor="arquivos-source"
          className="block text-sm mb-2"
          style={{ color: 'var(--snaps-text-secondary)' }}
        >
          Arquivos — PDF, DOCX, PPTX, MD, TXT ou imagem
        </label>
        <input
          id="arquivos-source"
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.md,.txt,image/*"
          onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
          className="block w-full text-sm mb-4"
          style={{ color: 'var(--snaps-text-secondary)' }}
        />

        {n > 0 && (
          <div className="flex flex-col gap-1.5 mb-4 max-h-52 overflow-y-auto">
            {arquivos.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--snaps-accent-purple)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: 'var(--snaps-text-primary)' }}>
                    {f.name}
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--snaps-placeholder)' }}>
                    {tamanhoLegivel(f.size)}
                  </div>
                </div>
                <button
                  onClick={() => remover(f.name)}
                  aria-label={`Remover ${f.name}`}
                  className="shrink-0"
                  style={{ color: 'var(--snaps-text-secondary)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {n > 0 && (
          <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--snaps-placeholder)' }}>
            A importação <strong style={{ color: 'var(--snaps-text-secondary)' }}>continua em segundo
            plano</strong> depois que esta janela fechar. Cada material aparece na lista assim que
            chega, e dá para revisar um enquanto os outros sobem.
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={importar}
            disabled={n === 0}
            className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40"
            style={{
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.5)',
              color: 'var(--snaps-accent-purple)',
            }}
          >
            <Upload className="w-4 h-4" />
            {n === 0 ? 'Importar' : `Importar ${n} ${n === 1 ? 'material' : 'materiais'}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
