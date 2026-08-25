import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { getReviewSnaps } from '@/services/sourceDocuments';
import type { FiltroRevisao } from '@/services/sourceDocuments';
import { promoteSnaps, discardSnaps, updateSnap } from '@/services/snaps';
import type { Snap } from '@/services/types';

/**
 * A revisao lateral: o portao entre "um material de terceiro foi lido" e "isto
 * entra no contexto dos agentes".
 *
 * As notas nascem `staged` e invisiveis de proposito (SNA-RD-129). Este e o
 * unico lugar onde alguem decide o contrario, e por isso duas coisas aqui nao
 * sao estilo:
 *
 *  - a decisao vai pelos IDS selecionados, nunca por `group_id`. Promover o lote
 *    depois de o usuario ter desmarcado notas promoveria justamente as que ele
 *    recusou;
 *
 *  - dar para editar antes de aprovar existe porque o modelo erra titulo com
 *    alguma frequencia. Sem isso a escolha seria aprovar errado ou descartar
 *    conteudo bom.
 */

interface Props {
  projectId: string;
  filtro: FiltroRevisao;
  titulo?: string;
  onFechar: () => void;
  onMudou?: () => void;
}

interface Rascunho {
  name: string;
  description: string;
  content: string;
}

export function ReviewPanel({ projectId, filtro, titulo, onFechar, onMudou }: Props) {
  const [notas, setNotas] = useState<Snap[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Descartar precisa de confirmacao e aprovar nao, e a assimetria e
  // deliberada: `review/discard` faz `db.delete()` -- nao ha status
  // `discarded`, nao ha desfazer. Somado a lista comecar toda marcada, um
  // clique distraido apagaria o lote inteiro. Aprovar erra para o lado
  // recuperavel: a nota fica, e da para descartar depois.
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  const detalhe = (e: any) => e?.response?.data?.detail ?? e?.message ?? 'erro desconhecido';

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const lista = await getReviewSnaps(projectId, filtro);
      setNotas(lista);
      // Tudo marcado: o caso comum e aprovar o lote e tirar as poucas que nao
      // servem. Comecar vazio faria o usuario clicar N vezes para o caminho
      // frequente.
      setSelecionados(new Set(lista.map((n) => n.id)));
    } catch (e) {
      setNotas(null);
      setErro(detalhe(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filtro.sourceDocumentId, filtro.groupId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alternar = (id: string) =>
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });

  const decidir = async (acao: 'promover' | 'descartar') => {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    setConfirmandoDescarte(false);
    setErro(null);
    setOcupado(true);
    try {
      if (acao === 'promover') await promoteSnaps(projectId, { snap_ids: ids });
      else await discardSnaps(projectId, { snap_ids: ids });
      onMudou?.();
      await carregar();
    } catch (e) {
      // A lista fica como esta: perder o que ja foi marcado depois de uma falha
      // obrigaria a refazer a triagem inteira.
      setErro(detalhe(e));
    } finally {
      setOcupado(false);
    }
  };

  const abrirEdicao = (n: Snap) => {
    setEditando(n.id);
    setRascunho({ name: n.name, description: n.description ?? '', content: n.content ?? '' });
  };

  const salvar = async (id: string) => {
    if (!rascunho) return;
    setErro(null);
    setOcupado(true);
    try {
      const atualizado = await updateSnap(id, rascunho);
      setNotas((atual) => (atual ?? []).map((n) => (n.id === id ? { ...n, ...atualizado } : n)));
      setEditando(null);
      setRascunho(null);
    } catch (e) {
      setErro(detalhe(e));
    } finally {
      setOcupado(false);
    }
  };

  const n = selecionados.size;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="h-full w-full max-w-xl flex flex-col"
        style={{ background: '#0d0d11', borderLeft: '1px solid rgba(255,255,255,0.11)' }}
      >
        <header
          className="flex items-start justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-semibold" style={{ color: 'var(--snaps-text-primary)' }}>
              Revisar notas
            </h2>
            {titulo && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--snaps-placeholder)' }}>
                {titulo}
              </p>
            )}
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--snaps-text-secondary)' }}>
              Nada aqui está visível para os agentes ainda. Aprovar é o que coloca a nota no contexto.
            </p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" style={{ color: 'var(--snaps-text-secondary)' }}>
            <X className="w-5 h-5" />
          </button>
        </header>

        {erro && (
          <div
            className="flex items-start gap-2 mx-5 mt-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: 'var(--snaps-text-primary)' }}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--snaps-accent-red)' }} />
            <span>{erro}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {notas === null && !erro ? (
            <div className="flex items-center justify-center py-16" style={{ color: 'var(--snaps-text-secondary)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : notas && notas.length === 0 ? (
            <p className="text-center py-16 text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
              Nada a revisar neste lote.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {(notas ?? []).map((nota) => {
                const emEdicao = editando === nota.id;
                return (
                  <div
                    key={nota.id}
                    data-testid={`nota-${nota.id}`}
                    className="px-4 py-3 rounded-xl"
                    style={{
                      background: selecionados.has(nota.id) ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.035)',
                      border: `1px solid ${selecionados.has(nota.id) ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${nota.name}`}
                        checked={selecionados.has(nota.id)}
                        onChange={() => alternar(nota.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        {emEdicao && rascunho ? (
                          <div className="flex flex-col gap-2">
                            <label className="text-xs" style={{ color: 'var(--snaps-placeholder)' }}>
                              Título
                              <input
                                value={rascunho.name}
                                onChange={(e) => setRascunho({ ...rascunho, name: e.target.value })}
                                className="w-full mt-1 px-2 py-1.5 rounded text-sm"
                                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.14)', color: 'var(--snaps-text-primary)' }}
                              />
                            </label>
                            <label className="text-xs" style={{ color: 'var(--snaps-placeholder)' }}>
                              Conteúdo
                              <textarea
                                value={rascunho.content}
                                rows={5}
                                onChange={(e) => setRascunho({ ...rascunho, content: e.target.value })}
                                className="w-full mt-1 px-2 py-1.5 rounded text-sm"
                                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.14)', color: 'var(--snaps-text-primary)' }}
                              />
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => void salvar(nota.id)}
                                disabled={ocupado}
                                className="px-3 py-1.5 rounded text-xs disabled:opacity-40"
                                style={{ color: 'var(--snaps-accent-green)', border: '1px solid rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.12)' }}
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => {
                                  setEditando(null);
                                  setRascunho(null);
                                }}
                                className="px-3 py-1.5 rounded text-xs"
                                style={{ color: 'var(--snaps-text-secondary)', border: '1px solid rgba(255,255,255,0.12)' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
                                {nota.name}
                              </h3>
                              <button
                                onClick={() => abrirEdicao(nota)}
                                aria-label={`Editar ${nota.name}`}
                                className="shrink-0 flex items-center gap-1 text-xs"
                                style={{ color: 'var(--snaps-text-secondary)' }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar
                              </button>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--snaps-text-secondary)' }}>
                              {nota.content}
                            </p>
                            {nota.source_ref?.page && (
                              <p className="text-xs mt-2 font-mono" style={{ color: 'var(--snaps-placeholder)' }}>
                                página {nota.source_ref.page}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {confirmandoDescarte && (
          <div
            className="mx-5 mb-4 px-4 py-4 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)' }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--snaps-accent-red)' }}>
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold text-sm">Descartar apaga de vez</span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--snaps-text-secondary)' }}>
              {n} {n === 1 ? 'nota some' : 'notas somem'} do banco e{' '}
              <strong style={{ color: 'var(--snaps-text-primary)' }}>não dá para desfazer</strong>. O
              documento continua guardado — para trazer estas notas de volta seria preciso decompor
              o material outra vez.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmandoDescarte(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--snaps-text-primary)' }}
              >
                Manter as notas
              </button>
              <button
                onClick={() => void decidir('descartar')}
                disabled={ocupado}
                className="px-4 py-2 rounded-lg text-sm disabled:opacity-40"
                style={{ color: 'var(--snaps-accent-red)', border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.14)' }}
              >
                Apagar {n} {n === 1 ? 'nota' : 'notas'}
              </button>
            </div>
          </div>
        )}

        {notas && notas.length > 0 && (
          <footer
            className="flex flex-wrap items-center gap-2 px-5 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() =>
                setSelecionados(n === notas.length ? new Set() : new Set(notas.map((x) => x.id)))
              }
              className="text-xs px-3 py-2 rounded-lg"
              style={{ color: 'var(--snaps-text-secondary)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {n === notas.length ? 'Desmarcar tudo' : 'Marcar tudo'}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setConfirmandoDescarte(true)}
              disabled={n === 0 || ocupado}
              className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40"
              style={{ color: 'var(--snaps-accent-red)', border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.10)' }}
            >
              <Trash2 className="w-4 h-4" />
              Descartar {n > 0 ? n : ''}
            </button>
            <button
              onClick={() => void decidir('promover')}
              disabled={n === 0 || ocupado}
              className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40"
              style={{ color: 'var(--snaps-accent-green)', border: '1px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.14)' }}
            >
              <Check className="w-4 h-4" />
              Aprovar {n > 0 ? n : ''}
            </button>
          </footer>
        )}
      </motion.aside>
    </div>
  );
}
