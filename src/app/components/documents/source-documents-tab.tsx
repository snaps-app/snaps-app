import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { listSourceDocuments } from '@/services/sourceDocuments';
import type { SourceDocument } from '@/services/sourceDocuments';

/**
 * A aba `Source documents`.
 *
 * O que existia neste lugar eram tres itens fixos no codigo -- "Zettelkasten
 * Method Guide", "PARA Method Explained" -- com um contador que parecia
 * informacao e nao era. Agora sao os documentos do projeto.
 *
 * Cada linha responde duas coisas sem que ninguem abra nada: em que ponto do
 * pipeline o material esta, e o que fazer com ele agora.
 */

interface Props {
  projectId: string;
  onAbrir: (doc: SourceDocument) => void;
  onRevisar?: (doc: SourceDocument) => void;
  onReprocessar?: (doc: SourceDocument) => void;
  /** Quantos materiais existem, para a badge da aba. `null` = desconhecido:
   *  depois de uma falha ninguem sabe quantos ha, e dizer zero seria inventar. */
  onContagem?: (n: number | null) => void;
}

const ROTULO: Record<string, { texto: string; cor: string }> = {
  uploaded: { texto: 'aguardando extração', cor: 'var(--snaps-text-secondary)' },
  extracted: { texto: 'extraído', cor: 'var(--snaps-accent-blue)' },
  extraction_failed: { texto: 'extração falhou', cor: 'var(--snaps-accent-red)' },
};

function tamanhoLegivel(bytes?: number): string | null {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function SourceDocumentsTab({ projectId, onAbrir, onRevisar, onReprocessar, onContagem }: Props) {
  const [docs, setDocs] = useState<SourceDocument[] | null>(null);
  // Falha e um estado proprio, nunca uma lista vazia: os dois desenham telas
  // diferentes porque significam coisas diferentes.
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      // Uma chamada, com as contagens ja dentro. Isto aqui fazia UMA chamada
      // por documento -- 24 requisicoes para 23 materiais, e a espera crescia
      // junto com o acervo.
      const lista = await listSourceDocuments(projectId);
      setDocs(lista);
      onContagem?.(lista.length);
    } catch (e: any) {
      setDocs(null);
      setErro(e?.response?.data?.detail ?? e?.message ?? 'erro desconhecido');
      onContagem?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--snaps-accent-orange)' }}>
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-80" />
        <p className="text-lg">Nao foi possivel carregar os materiais</p>
        <p className="text-sm mt-2 opacity-80">{erro}</p>
        <button
          onClick={() => void carregar()}
          className="mt-4 px-4 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--snaps-text-primary)' }}
        >
          Tentar carregar de novo
        </button>
      </div>
    );
  }

  if (docs === null) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--snaps-text-secondary)' }}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--snaps-text-secondary)' }}>
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-lg">Nenhum material importado ainda</p>
        <p className="text-sm mt-2 opacity-70">
          Use <strong>Importar</strong> e escolha <em>Source documents</em> para trazer uma aula,
          artigo ou transcrição.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {docs.map((d) => {
        const rotulo = ROTULO[d.status] ?? ROTULO.uploaded;
        const aRevisar = d.notas_pendentes ?? 0;
        const tamanho = tamanhoLegivel(d.raw_data?.size ?? undefined);

        return (
          <div
            key={d.id}
            className="flex items-center gap-4 px-4 py-3 rounded-xl flex-wrap"
            style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <button
              onClick={() => onAbrir(d)}
              className="flex-1 min-w-0 text-left"
              style={{ color: 'var(--snaps-text-primary)' }}
            >
              <div className="text-sm font-medium truncate">{d.name}</div>
              <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--snaps-placeholder)' }}>
                {[tamanho, rotulo.texto].filter(Boolean).join(' · ')}
              </div>
              {d.status === 'extraction_failed' && d.extraction_error && (
                <div className="text-xs mt-1" style={{ color: 'var(--snaps-accent-red)' }}>
                  {d.extraction_error}
                </div>
              )}
            </button>

            {aRevisar > 0 && (
              <span
                className="text-xs px-2 py-1 rounded font-mono"
                style={{
                  color: 'var(--snaps-accent-orange)',
                  border: '1px solid rgba(255,107,53,0.45)',
                  background: 'rgba(255,107,53,0.10)',
                }}
              >
                {aRevisar} a revisar
              </span>
            )}

            <div className="flex gap-2 shrink-0">
              {/* So aparece se ha quem reprocesse. Botao que nao faz nada e
                  pior do que botao ausente: ensina que a tela esta quebrada e
                  nao diz o que fazer. */}
              {d.status === 'extraction_failed' && onReprocessar && (
                <button
                  onClick={() => onReprocessar(d)}
                  className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    color: 'var(--snaps-accent-orange)',
                    border: '1px solid rgba(255,107,53,0.45)',
                    background: 'rgba(255,107,53,0.10)',
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tentar de novo
                </button>
              )}
              {aRevisar > 0 && (
                <button
                  onClick={() => (onRevisar ?? onAbrir)(d)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    color: 'var(--snaps-accent-blue)',
                    border: '1px solid rgba(0,212,255,0.5)',
                    background: 'rgba(0,212,255,0.14)',
                  }}
                >
                  Revisar lote
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
