import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  Loader2,
  RefreshCw,
  Scissors,
  XCircle,
} from 'lucide-react';
import {
  getSourceDocument,
  extractSourceDocument,
  decomposeSourceDocument,
  getSourceDocumentDownloadUrl,
  getReviewSnaps,
} from '@/services/sourceDocuments';
import type { SourceDocumentWithBlocks } from '@/services/sourceDocuments';
import { precisaConfirmarDecomposicao } from '@/services/ingestRules';
import { ReviewPanel } from './review-panel';

/**
 * O painel de um material.
 *
 * A lista responde "em que ponto isto esta". Aqui vao as perguntas que a linha
 * nao cabe: por que a extracao falhou, o que exatamente foi lido do arquivo, e o
 * que ainda falta decidir.
 *
 * Sobre a terceira etapa da esteira: `pendente` ali significa "nao ha nota
 * esperando decisao", o que cobre DOIS casos que a API nao distingue -- nunca
 * decomposto, ou ja todo revisado. O texto abaixo da etapa diz isso em vez de
 * fingir certeza. Separar os dois exigiria contar as notas do documento sem
 * filtro de status, e a listagem no cliente ainda nao passa esse filtro.
 */

type Estado = 'concluida' | 'pendente' | 'falhou' | 'corrente';

interface Props {
  projectId: string;
  docId: string;
  onVoltar: () => void;
}

function tamanhoLegivel(bytes?: number): string | null {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function Etapa({
  id,
  titulo,
  estado,
  detalhe,
}: {
  id: string;
  titulo: string;
  estado: Estado;
  detalhe?: string | null;
}) {
  const cor =
    estado === 'concluida'
      ? 'var(--snaps-accent-green)'
      : estado === 'falhou'
        ? 'var(--snaps-accent-red)'
        : estado === 'corrente'
          ? 'var(--snaps-accent-blue)'
          : 'var(--snaps-placeholder)';

  const Icone =
    estado === 'concluida' ? CheckCircle2 : estado === 'falhou' ? XCircle : estado === 'corrente' ? Loader2 : Circle;

  return (
    <div data-testid={`etapa-${id}`} data-estado={estado} className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-2" style={{ color: cor }}>
        <Icone className={`w-4 h-4 ${estado === 'corrente' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{titulo}</span>
      </div>
      {detalhe && (
        <p className="text-xs mt-1 pl-6 leading-relaxed" style={{ color: 'var(--snaps-placeholder)' }}>
          {detalhe}
        </p>
      )}
    </div>
  );
}

export function SourceDocumentPanel({ projectId, docId, onVoltar }: Props) {
  const [doc, setDoc] = useState<SourceDocumentWithBlocks | null>(null);
  // Erro de carregamento e erro de acao sao coisas diferentes: o primeiro tira
  // o painel do ar, o segundo aparece dentro dele sem derrubar o que ja carregou.
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [ocupado, setOcupado] = useState<'extraindo' | 'decompondo' | null>(null);
  const [verBlocos, setVerBlocos] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [revisando, setRevisando] = useState(false);

  const detalhe = (e: any) => e?.response?.data?.detail ?? e?.message ?? 'erro desconhecido';

  const carregar = useCallback(async () => {
    setErroCarga(null);
    try {
      const d = await getSourceDocument(projectId, docId);
      setDoc(d);
    } catch (e) {
      setDoc(null);
      setErroCarga(detalhe(e));
      return;
    }
    try {
      const notas = await getReviewSnaps(projectId, { sourceDocumentId: docId });
      setPendentes(notas.length);
    } catch {
      // Perder a contagem nao pode derrubar o painel -- o resto continua util.
      setPendentes(0);
    }
  }, [projectId, docId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const extrair = async () => {
    setErroAcao(null);
    setOcupado('extraindo');
    try {
      await extractSourceDocument(projectId, docId);
      await carregar();
    } catch (e) {
      setErroAcao(detalhe(e));
    } finally {
      setOcupado(null);
    }
  };

  const decompor = async () => {
    setConfirmando(false);
    setErroAcao(null);
    setOcupado('decompondo');
    try {
      await decomposeSourceDocument(projectId, docId);
      await carregar();
    } catch (e) {
      setErroAcao(detalhe(e));
    } finally {
      setOcupado(null);
    }
  };

  const pedirDecomposicao = () => {
    const blocos = doc?.blocks?.length ?? 0;
    if (precisaConfirmarDecomposicao(blocos).confirmar) {
      setConfirmando(true);
      return;
    }
    void decompor();
  };

  const baixar = async () => {
    setErroAcao(null);
    try {
      const url = await getSourceDocumentDownloadUrl(projectId, docId);
      window.open(url, '_blank');
    } catch (e) {
      setErroAcao(detalhe(e));
    }
  };

  if (erroCarga) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--snaps-accent-orange)' }}>
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-80" />
        <p className="text-lg">Nao foi possivel abrir este material</p>
        <p className="text-sm mt-2 opacity-80">{erroCarga}</p>
        <div className="flex gap-2 justify-center mt-5">
          <button
            onClick={() => void carregar()}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--snaps-text-primary)' }}
          >
            Tentar de novo
          </button>
          <button onClick={onVoltar} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--snaps-text-secondary)' }}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const blocos = doc.blocks ?? [];
  const veredito = precisaConfirmarDecomposicao(blocos.length);
  const minutos = Math.max(1, Math.round(veredito.segundos / 60));
  const tamanho = tamanhoLegivel(doc.raw_data?.size ?? undefined);
  const paginas = doc.raw_data?.paginas;

  const estadoExtracao: Estado =
    ocupado === 'extraindo'
      ? 'corrente'
      : doc.status === 'extraction_failed'
        ? 'falhou'
        : doc.status === 'extracted'
          ? 'concluida'
          : 'pendente';

  const estadoDecomposicao: Estado =
    ocupado === 'decompondo' ? 'corrente' : pendentes > 0 ? 'concluida' : 'pendente';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <button onClick={onVoltar} aria-label="Voltar" style={{ color: 'var(--snaps-text-secondary)' }}>
          <ArrowLeft className="w-5 h-5 mt-1" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate" style={{ color: 'var(--snaps-text-primary)' }}>
            {doc.name}
          </h1>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--snaps-placeholder)' }}>
            {[doc.raw_data?.mimetype, tamanho, paginas ? `${paginas} páginas` : null, blocos.length ? `${blocos.length} blocos` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-6 px-5 py-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <Etapa id="upload" titulo="Enviado" estado="concluida" detalhe="O binário está guardado no servidor." />
        <Etapa
          id="extracao"
          titulo="Extraído"
          estado={estadoExtracao}
          detalhe={
            estadoExtracao === 'falhou'
              ? doc.extraction_error ?? 'A leitura do arquivo falhou.'
              : estadoExtracao === 'concluida'
                ? `${blocos.length} blocos lidos do arquivo.`
                : 'Ainda não foi lido.'
          }
        />
        <Etapa
          id="decomposicao"
          titulo="Decomposto em notas"
          estado={estadoDecomposicao}
          detalhe={
            estadoDecomposicao === 'concluida'
              ? `${pendentes} notas esperando revisão.`
              : 'Nenhuma nota esperando decisão — ou este material ainda não foi decomposto, ou já foi todo revisado.'
          }
        />
      </div>

      {erroAcao && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: 'var(--snaps-text-primary)' }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--snaps-accent-red)' }} />
          <span>{erroAcao}</span>
        </div>
      )}

      {confirmando && (
        <div
          data-testid="portao-decomposicao"
          className="px-5 py-4 rounded-xl"
          style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.4)' }}
        >
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--snaps-accent-orange)' }}>
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold text-sm">Este documento é grande</span>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--snaps-text-secondary)' }}>
            São <strong style={{ color: 'var(--snaps-text-primary)' }}>{blocos.length} blocos</strong>, que viram{' '}
            <strong style={{ color: 'var(--snaps-text-primary)' }}>{veredito.chamadas} chamadas</strong> ao modelo, uma
            de cada vez — cerca de <strong style={{ color: 'var(--snaps-text-primary)' }}>{minutos} min</strong> de
            espera.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmando(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--snaps-text-primary)' }}
            >
              Agora não
            </button>
            <button
              onClick={() => void decompor()}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.5)', color: 'var(--snaps-accent-purple)' }}
            >
              Decompor mesmo assim
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(doc.status === 'extraction_failed' || doc.status === 'uploaded') && (
          <button
            onClick={() => void extrair()}
            disabled={ocupado !== null}
            className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40"
            style={{ color: 'var(--snaps-accent-orange)', border: '1px solid rgba(255,107,53,0.45)', background: 'rgba(255,107,53,0.10)' }}
          >
            <RefreshCw className="w-4 h-4" />
            {doc.status === 'uploaded' ? 'Extrair conteúdo' : 'Tentar de novo'}
          </button>
        )}

        {doc.status === 'extracted' && (
          <button
            onClick={pedirDecomposicao}
            disabled={ocupado !== null}
            className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40"
            style={{ color: 'var(--snaps-accent-purple)', border: '1px solid rgba(168,85,247,0.5)', background: 'rgba(168,85,247,0.14)' }}
          >
            <Scissors className="w-4 h-4" />
            {pendentes > 0 ? 'Decompor de novo' : 'Decompor em notas'}
          </button>
        )}

        {pendentes > 0 && (
          <button
            onClick={() => setRevisando(true)}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--snaps-accent-blue)', border: '1px solid rgba(0,212,255,0.5)', background: 'rgba(0,212,255,0.14)' }}
          >
            Revisar {pendentes} {pendentes === 1 ? 'nota' : 'notas'}
          </button>
        )}

        <button
          onClick={() => void baixar()}
          className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--snaps-text-primary)' }}
        >
          <Download className="w-4 h-4" />
          Baixar original
        </button>
      </div>

      {blocos.length > 0 && (
        <div>
          <button
            onClick={() => setVerBlocos((v) => !v)}
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--snaps-text-secondary)' }}
          >
            {verBlocos ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Ver blocos extraídos ({blocos.length})
          </button>

          {verBlocos && (
            <div className="flex flex-col gap-2 mt-3">
              {blocos.map((b) => (
                <div
                  key={b.id}
                  className="px-4 py-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-xs font-mono mb-1" style={{ color: 'var(--snaps-placeholder)' }}>
                    {[b.page ? `página ${b.page}` : null, b.tipo].filter(Boolean).join(' · ')}
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--snaps-text-secondary)' }}>
                    {b.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {revisando && (
        <ReviewPanel
          projectId={projectId}
          filtro={{ sourceDocumentId: docId }}
          titulo={doc.name}
          onFechar={() => setRevisando(false)}
          onMudou={() => void carregar()}
        />
      )}
    </div>
  );
}
