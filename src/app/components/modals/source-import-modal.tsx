import { useState } from 'react';
import { X, Upload, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import {
  uploadSourceDocument,
  extractSourceDocument,
  decomposeSourceDocument,
} from '@/services/sourceDocuments';
import type { SourceDocument, ResultadoDecomposicao } from '@/services/sourceDocuments';
import { precisaConfirmarDecomposicao } from '@/services/ingestRules';

/**
 * A esteira de importacao de um source document.
 *
 * O portao de tamanho vive aqui, e so o da DECOMPOSICAO. Medido: uma chamada
 * gasta ~2 mil tokens, entao o dinheiro nao e o problema -- a espera e, porque
 * as chamadas saem em sequencia. Acima de 60 blocos a esteira para e mostra os
 * numeros que justificam a pergunta.
 *
 * O portao da EXTRACAO nao esta aqui, e a razao e uma limitacao real: quem
 * decide entre parser nativo e Vision e o backend, olhando se o PDF tem camada
 * de texto -- informacao que o cliente nao tem antes de extrair. Perguntar
 * "pode usar Vision?" em todo PDF seria perguntar quase sempre a toa, ja que a
 * maioria tem texto. Enquanto isso quem protege a carteira e o teto de 60
 * paginas no proprio backend, cuja recusa aparece aqui com o texto dela.
 */

interface Props {
  projectId: string;
  onClose: () => void;
  onPronto: (r: { doc: SourceDocument; group_id: string | null; criados: number }) => void;
}

type Etapa = 'escolha' | 'subindo' | 'extraindo' | 'confirmar' | 'decompondo' | 'erro';

export function SourceImportModal({ projectId, onClose, onPronto }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('escolha');
  const [erro, setErro] = useState<{ texto: string; guardado: boolean } | null>(null);
  const [doc, setDoc] = useState<SourceDocument | null>(null);
  const [blocos, setBlocos] = useState(0);

  const detalhe = (e: any) => e?.response?.data?.detail ?? e?.message ?? 'erro desconhecido';

  const decompor = async (alvo: SourceDocument) => {
    setEtapa('decompondo');
    try {
      const r: ResultadoDecomposicao = await decomposeSourceDocument(projectId, alvo.id);
      onPronto({ doc: alvo, group_id: r.group_id, criados: r.criados });
    } catch (e) {
      setErro({ texto: detalhe(e), guardado: true });
      setEtapa('erro');
    }
  };

  const importar = async () => {
    if (!arquivo) return;
    setErro(null);
    setEtapa('subindo');

    let criado: SourceDocument;
    try {
      criado = await uploadSourceDocument(projectId, arquivo);
      setDoc(criado);
    } catch (e) {
      // Nada foi guardado ainda: recusa de tamanho ou de mimetype acontece antes
      // de o binario ir para o storage.
      setErro({ texto: detalhe(e), guardado: false });
      setEtapa('erro');
      return;
    }

    setEtapa('extraindo');
    let extraidos: number;
    try {
      extraidos = (await extractSourceDocument(projectId, criado.id)).blocos;
      setBlocos(extraidos);
    } catch (e) {
      // O binario JA esta no storage. Dizer isso evita que o usuario suba o
      // mesmo arquivo de novo achando que perdeu o trabalho.
      setErro({ texto: detalhe(e), guardado: true });
      setEtapa('erro');
      return;
    }

    if (precisaConfirmarDecomposicao(extraidos).confirmar) {
      setEtapa('confirmar');
      return;
    }
    await decompor(criado);
  };

  const veredito = precisaConfirmarDecomposicao(blocos);
  const minutos = Math.max(1, Math.round(veredito.segundos / 60));
  const ocupado = ['subindo', 'extraindo', 'decompondo'].includes(etapa);

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
            Importar source document
          </h2>
          <button onClick={onClose} aria-label="Fechar" style={{ color: 'var(--snaps-text-secondary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {etapa === 'confirmar' ? (
          <div>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--snaps-accent-orange)' }}>
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Este documento é grande</span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--snaps-text-secondary)' }}>
              A extração encontrou{' '}
              <strong style={{ color: 'var(--snaps-text-primary)' }}>{blocos} blocos</strong>.
              Decompor tudo são{' '}
              <strong style={{ color: 'var(--snaps-text-primary)' }}>{veredito.chamadas} chamadas</strong>{' '}
              ao modelo, uma de cada vez — cerca de{' '}
              <strong style={{ color: 'var(--snaps-text-primary)' }}>{minutos} min</strong> de espera.
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--snaps-placeholder)' }}>
              O documento já está extraído e guardado. Se preferir, decomponha depois pelo material.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => onPronto({ doc: doc!, group_id: null, criados: 0 })}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--snaps-text-primary)',
                }}
              >
                Agora não
              </button>
              <button
                onClick={() => void decompor(doc!)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  background: 'rgba(168,85,247,0.15)',
                  border: '1px solid rgba(168,85,247,0.5)',
                  color: 'var(--snaps-accent-purple)',
                }}
              >
                Decompor mesmo assim
              </button>
            </div>
          </div>
        ) : etapa === 'erro' ? (
          <div>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--snaps-accent-red)' }}>
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">A importação parou</span>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--snaps-text-primary)' }}>{erro?.texto}</p>
            {erro?.guardado && (
              <p className="text-xs mb-5" style={{ color: 'var(--snaps-placeholder)' }}>
                O arquivo continua guardado no servidor. Dá para tentar de novo pelo material, sem
                subir tudo outra vez.
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--snaps-text-primary)',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="arquivo-source"
              className="block text-sm mb-2"
              style={{ color: 'var(--snaps-text-secondary)' }}
            >
              Arquivo — PDF, DOCX, PPTX, MD, TXT ou imagem
            </label>
            <input
              id="arquivo-source"
              type="file"
              accept=".pdf,.docx,.pptx,.md,.txt,image/*"
              disabled={ocupado}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm mb-5"
              style={{ color: 'var(--snaps-text-secondary)' }}
            />

            {ocupado && (
              <div
                className="flex items-center gap-2 text-sm mb-4"
                style={{ color: 'var(--snaps-accent-blue)' }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                {etapa === 'subindo' && 'Enviando o arquivo…'}
                {etapa === 'extraindo' && 'Lendo o conteúdo…'}
                {etapa === 'decompondo' && 'Quebrando em notas — isso leva alguns instantes.'}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={importar}
                disabled={!arquivo || ocupado}
                className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40"
                style={{
                  background: 'rgba(168,85,247,0.15)',
                  border: '1px solid rgba(168,85,247,0.5)',
                  color: 'var(--snaps-accent-purple)',
                }}
              >
                {etapa === 'escolha' ? <Upload className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                Importar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
