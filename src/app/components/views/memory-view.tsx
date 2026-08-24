import { getAllSnaps, searchSnapsGlobal, promoteSnaps, discardSnaps } from '@/services/snaps';
import type { Snap, SnapSearchResult } from '@/services/types';
import { useEffect, useState } from 'react';
import { Search, Folder, ChevronRight, ChevronDown, FileText, Brain, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { SnapDetailModal } from '@/app/components/modals/snap-detail-modal';
import { SnapCard } from '@/app/components/shared/snap-card';

interface FolderNode {
  id: string;
  name: string;
  type: 'project' | 'group';
  children?: FolderNode[];
  count?: number;
}

interface MemoryCard extends Snap {
  project_name?: string;
}

function FolderTree({ nodes, level = 0 }: { nodes: FolderNode[]; level?: number }) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['1', '2', '3', '4']);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div>
      {nodes.map((node) => {
        const isExpanded = expandedFolders.includes(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
          <div key={node.id}>
            <motion.button
              onClick={() => hasChildren && toggleFolder(node.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group"
              style={{
                paddingLeft: `${(level * 16) + 12}px`,
                backgroundColor: 'transparent'
              }}
              whileHover={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--snaps-accent-blue)' }} />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--snaps-text-secondary)' }} />
                )
              ) : (
                <div className="w-4" />
              )}

              <Folder
                className="w-4 h-4 flex-shrink-0"
                style={{
                  color: node.type === 'project'
                    ? 'var(--snaps-accent-blue)'
                    : 'var(--snaps-accent-purple)'
                }}
              />

              <span
                className="flex-1 text-left font-medium"
                style={{ color: 'var(--snaps-text-primary)' }}
              >
                {node.name}
              </span>

              {node.count !== undefined && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    color: 'var(--snaps-accent-blue)'
                  }}
                >
                  {node.count}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {isExpanded && hasChildren && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FolderTree nodes={node.children!} level={level + 1} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// MemoryCardComponent removed. Using SnapCard instead.

export function MemoryView() {
  const [searchQuery, setSearchQuery] = useState('');
  // Resultados vindos do SERVIDOR. `null` = nenhuma busca ativa, e a grade
  // mostra a listagem normal. Distinto de `[]`, que e "buscou e nao achou" --
  // colapsar os dois esconderia o estado vazio, que e resposta legitima.
  const [searchResults, setSearchResults] = useState<SnapSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<string | null>(null);
  // Falha da requisicao e um TERCEIRO estado, distinto de `[]`. Colapsar os
  // dois fazia 401, CORS e timeout desenharem a mesma tela de "nao achei" --
  // com a propria tela afirmando que "vazio aqui significa vazio de verdade",
  // coisa que o codigo nao sustentava.
  const [searchError, setSearchError] = useState<string | null>(null);
  const [revisando, setRevisando] = useState<string | null>(null);


  const [ruleFilter, setRuleFilter] = useState<'all' | 'staged' | 'active' | 'deprecated' | 'agent-memory'>('all');
  const [isSnapDetailModalOpen, setIsSnapDetailModalOpen] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<MemoryCard | null>(null);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderNode[]>([]);
  const [mobileView, setMobileView] = useState<'sidebar' | 'main'>('main');

  // Pendencias derivadas do que ja esta carregado -- nao ha chamada extra. A
  // tela de Memory e global e o endpoint de revisao e por projeto, entao o
  // agrupamento acontece aqui e cada acao vai ao projeto do proprio lote.
  const staged = memoryCards.filter(c => (c.status || c.snadds?.status) === 'staged');
  const pendentes = staged.length;

  // O LOTE de importacao e a unidade de revisao, nao o snap solto: importar uma
  // aula gera dezenas de uma vez, e revisar um a um sem agrupamento reproduz o
  // limbo que este fluxo existe para resolver.
  const lotes = Object.values(
    staged.reduce((acc, snap) => {
      const gid = snap.snadds?.group_id || 'sem-lote';
      const chave = `${snap.project_id}::${gid}`;
      (acc[chave] ||= {
        chave,
        groupId: snap.snadds?.group_id,
        projectId: snap.project_id,
        projectName: snap.project_name,
        importado: snap.trust_level === 'imported',
        snaps: [] as Snap[],
      }).snaps.push(snap);
      return acc;
    }, {} as Record<string, any>)
  );

  const revisarLote = async (lote: any, acao: 'promover' | 'descartar') => {
    const rotulo = lote.groupId ? 'este lote' : 'os snaps sem lote';
    const verbo = acao === 'promover' ? 'promover' : 'DESCARTAR';
    if (!confirm(`${verbo} ${lote.snaps.length} snap(s) de ${rotulo}?`)) return;

    setRevisando(lote.chave);
    try {
      // Sempre por snap_ids, mesmo havendo group_id: o group_id pode repetir
      // entre projetos, e a rota e por projeto. Enviar ids e inequivoco.
      const ids = lote.snaps.map((x: Snap) => x.id);
      if (acao === 'promover') {
        await promoteSnaps(lote.projectId, { snap_ids: ids });
      } else {
        await discardSnaps(lote.projectId, { snap_ids: ids });
      }
      const { snaps } = await getAllSnaps();
      setMemoryCards(snaps as MemoryCard[]);
    } catch (e) {
      console.error('Revisao falhou:', e);
      alert('Falha ao revisar o lote. Veja o console.');
    } finally {
      setRevisando(null);
    }
  };

  // Busca no servidor, com debounce. Antes isto era `.includes()` sobre a base
  // inteira carregada no browser -- o que, alem do trafego, deixava invisiveis
  // os snaps de projetos com mais de 100 notas: eles nunca chegavam ao cliente.
  useEffect(() => {
    const termo = searchQuery.trim();
    if (!termo) {
      setSearchResults(null);
      setSearchMode(null);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    const t = setTimeout(async () => {
      try {
        const r = await searchSnapsGlobal(termo, 50);
        // O endpoint devolve as colunas do snap, sem `project_name` -- ele nao
        // faz join com projects. Numa busca GLOBAL, resultado sem indicacao de
        // projeto e ambiguo: o mesmo assunto aparece em varios, e o usuario
        // precisa saber de onde veio antes de agir sobre a nota.
        // Os nomes ja estao carregados na barra lateral; e so casar por id.
        const nomes = new Map(folderStructure.map(f => [f.id, f.name]));
        setSearchResults(r.map(x => ({ ...x, project_name: x.project_name ?? nomes.get(x.project_id) })));
        setSearchMode(r.length > 0 ? (r[0].modo ?? null) : null);
      } catch (e: any) {
        console.error('Busca falhou:', e);
        const status = e?.response?.status;
        setSearchError(
          status === 401 ? 'Sua sessao expirou. Entre de novo para buscar.'
          : status === 403 ? 'Voce nao tem acesso aos projetos desta busca.'
          : status ? `A API respondeu ${status}.`
          : `Nao foi possivel falar com a API (${e?.message ?? 'erro desconhecido'}).`
        );
        setSearchResults(null);
        setSearchMode(null);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, folderStructure]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { snaps, projects } = await getAllSnaps();

        // Transform Snaps to MemoryCards
        setMemoryCards(snaps as MemoryCard[]);

        // Generate Folder Structure from Projects
        const folders: FolderNode[] = projects.map(p => ({
          id: p.id,
          name: p.name,
          type: 'project',
          count: snaps.filter(s => s.project_id === p.id).length,
          children: [] // Groups not supported yet in MVP
        }));
        setFolderStructure(folders);
      } catch (error) {
        console.error('Failed to fetch memory data:', error);
      }
    };
    fetchData();
  }, []);

  const handleCardClick = (card: MemoryCard) => {
    setSelectedSnap(card);
    setIsSnapDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Dense Neural Network Background */}
      <NeuralBackground density="high" />



      <div className="relative z-10 h-screen flex pb-safe md:pb-0">
        {/* Mobile View Toggle */}
        <div className="md:hidden fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center p-1 rounded-full backdrop-blur-2xl"
          style={{ background: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => setMobileView('sidebar')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mobileView === 'sidebar' ? 'bg-white/10 text-white' : 'text-white/50'}`}
          >
            Folders
          </button>
          <button
            onClick={() => setMobileView('main')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mobileView === 'main' ? 'bg-white/10 text-white' : 'text-white/50'}`}
          >
            Search
          </button>
        </div>

        {/* LEFT SIDEBAR - Folder Structure */}
        <motion.div
          className={`w-full md:w-80 border-r border-white/10 backdrop-blur-[30px] flex-col ${mobileView === 'sidebar' ? 'flex' : 'hidden md:flex'}`}
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)' }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Sidebar Header */}
          <div className="h-auto md:h-[100px] p-6 pt-20 md:py-0 border-b border-white/10 flex flex-col justify-center flex-shrink-0">
            <h2
              className="text-2xl font-bold mb-1"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Knowledge Base
            </h2>
            <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
              All your projects and memories
            </p>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <FolderTree nodes={folderStructure} />
          </div>

          {/* Stats Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {memoryCards.length}
                </div>
                <div className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                  Total
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: 'var(--snaps-accent-blue)' }}
                >
                  {folderStructure.length}
                </div>
                <div className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                  Projects
                </div>
              </div>
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: 'var(--snaps-accent-purple)' }}
                >
                  0
                </div>
                <div className="text-xs" style={{ color: 'var(--snaps-text-secondary)' }}>
                  Groups
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* MAIN AREA - Knowledge Grid */}
        <div className={`flex-1 flex-col ${mobileView === 'main' ? 'flex' : 'hidden md:flex'}`}>
          {/* Search Header */}
          <motion.div
            className="p-8 pt-20 md:pt-8 border-b border-white/10 backdrop-blur-[30px]"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="max-w-4xl mx-auto">
              {/* Neural Search Badge */}
              <motion.div
                className="flex items-center justify-center gap-2 mb-4"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 212, 255, 0.4)',
                    '0 0 40px rgba(0, 212, 255, 0.6)',
                    '0 0 20px rgba(0, 212, 255, 0.4)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(168, 85, 247, 0.2))',
                    border: '1px solid rgba(0, 212, 255, 0.5)',
                    boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(0, 212, 255, 0.1)'
                  }}
                >
                  <Brain className="w-4 h-4" style={{ color: 'var(--snaps-accent-blue)' }} />
                  {/* O rotulo acompanha o que a busca REALMENTE fez.
                    *
                    * Este selo dizia "Neural Search" sobre um `.includes()` de
                    * substring. Um rotulo que afirma capacidade inexistente e
                    * pior que rotulo nenhum: renova a cada uso a crenca de que
                    * a busca semantica ja existia -- foi assim que "cada snap e
                    * vetorizado ao ser salvo" sobreviveu com 0 de 576 vetores.
                    *
                    * 'lexical' significa que o ramo vetorial caiu; o usuario
                    * precisa saber que o resultado esta mais fraco. */}
                  <span style={{
                    background: searchMode === 'lexical'
                      ? 'linear-gradient(135deg, #FFB020 0%, #FF6B35 100%)'
                      : 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {isSearching
                      ? 'Buscando...'
                      : searchMode === 'hibrida'
                        ? 'Neural Search'
                        : searchMode === 'lexical'
                          ? 'Busca textual (semantica indisponivel)'
                          : 'Busca'}
                  </span>
                </div>
              </motion.div>

              {/* Search Bar */}
              <div className="relative">
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6"
                  style={{ color: 'var(--snaps-accent-blue)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all your knowledge..."
                  className="w-full pl-16 pr-6 py-5 rounded-2xl backdrop-blur-xl text-lg focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid rgba(0, 212, 255, 0.3)',
                    color: 'var(--snaps-text-primary)',
                    boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.6)';
                    e.target.style.boxShadow = '0 0 40px rgba(0, 212, 255, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                    e.target.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.3)';
                  }}
                />
              </div>

              {/* Type Filters / Staged Rules Section */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setRuleFilter('all')}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                  style={{
                    background: ruleFilter === 'all' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.05)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: 'var(--snaps-accent-blue)'
                  }}
                >
                  <FileText className="w-4 h-4" />
                  All Snaps
                </button>
                <button
                  onClick={() => setRuleFilter('staged')}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,107,53,0.2)]"
                  style={{
                    background: ruleFilter === 'staged' ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255, 107, 53, 0.05)',
                    border: '1px solid rgba(255, 107, 53, 0.5)',
                    color: 'var(--snaps-accent-orange)'
                  }}
                >
                  <Folder className="w-4 h-4" />
                  Staged Rules
                  {/* Contador de pendencias. A ausencia de sinalizacao e metade
                    * da causa de 572 snaps terem ficado parados em staging:
                    * ninguem deixou de revisar por decisao, deixou por nao
                    * haver nada indicando que havia o que revisar. */}
                  {pendentes > 0 && (
                    <span
                      className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: 'var(--snaps-accent-orange)',
                        color: '#0B0F19'
                      }}
                    >
                      {pendentes}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setRuleFilter('active')}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                  style={{
                    background: ruleFilter === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.05)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: 'var(--snaps-accent-green)'
                  }}
                >
                  <Brain className="w-4 h-4" />
                  Active Rules
                </button>
                <button
                  onClick={() => setRuleFilter('agent-memory')}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                  style={{
                    background: ruleFilter === 'agent-memory' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.05)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#A855F7'
                  }}
                >
                  <Brain className="w-4 h-4" />
                  Agent Memory
                </button>
              </div>
            </div>
          </motion.div>

          {/* Painel de revisao do staging.
            *
            * O filtro `staged` ja existia -- dava para VER o que estava
            * parado. Faltava a ACAO, e e por isso que 572 snaps ficaram no
            * limbo: nao foi decisao de ninguem, foi ausencia de botao. */}
          {ruleFilter === 'staged' && lotes.length > 0 && (
            <div className="px-8 pt-6">
              <div className="max-w-7xl mx-auto space-y-3">
                {lotes.map((lote: any) => (
                  <div
                    key={lote.chave}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl backdrop-blur-xl"
                    style={{
                      background: 'rgba(255, 107, 53, 0.06)',
                      border: '1px solid rgba(255, 107, 53, 0.3)'
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
                          {lote.snaps.length} snap(s)
                        </span>
                        {lote.projectName && (
                          <span className="text-sm opacity-70" style={{ color: 'var(--snaps-text-secondary)' }}>
                            · {lote.projectName}
                          </span>
                        )}
                        {/* Lote importado precisa ser visivel ANTES da acao:
                          * aprovar material de terceiro nao e a mesma decisao
                          * que aprovar uma nota escrita pelo time. */}
                        {lote.importado && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold"
                            style={{ background: 'rgba(168,85,247,0.2)', color: '#A855F7' }}
                          >
                            importado
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 opacity-60 truncate" style={{ color: 'var(--snaps-text-secondary)' }}>
                        {lote.groupId ? `lote ${String(lote.groupId).slice(0, 8)}` : 'sem lote de importacao'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={revisando === lote.chave}
                        onClick={() => revisarLote(lote, 'promover')}
                        className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        style={{
                          background: 'rgba(0, 212, 255, 0.15)',
                          border: '1px solid rgba(0, 212, 255, 0.5)',
                          color: 'var(--snaps-accent-blue)'
                        }}
                      >
                        {revisando === lote.chave ? '...' : 'Aprovar lote'}
                      </button>
                      <button
                        disabled={revisando === lote.chave}
                        onClick={() => revisarLote(lote, 'descartar')}
                        className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        style={{
                          background: 'rgba(255, 107, 53, 0.1)',
                          border: '1px solid rgba(255, 107, 53, 0.4)',
                          color: 'var(--snaps-accent-orange)'
                        }}
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Grid */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {(searchResults ?? memoryCards).filter(card => {
                    // Filtro por status ou por label de agente.
                    if (ruleFilter === 'agent-memory') {
                      const labels: string[] = card.snadds?.labels ?? [];
                      if (!labels.includes('agent-memory')) return false;
                    } else if (ruleFilter !== 'all') {
                      // Le a COLUNA `status`, canonica desde a migration 052.
                      // Lia `snadds.status`, e por isso 59 snaps apareciam com
                      // status diferente conforme quem perguntasse: a rota de
                      // promocao gravava so no JSON, a coluna ficava no default.
                      // O fallback ao JSON cobre a janela ate o deploy.
                      const snapStatus = card.status || card.snadds?.status || '';
                      if (snapStatus !== ruleFilter) return false;
                    }
                    // Sem filtro de texto aqui: quando ha busca, quem filtrou
                    // foi o servidor, e refiltrar no cliente descartaria
                    // justamente os acertos semanticos -- que por definicao nao
                    // contem o termo digitado.
                    return true;
                  }).map((card) => (
                    <SnapCard
                      key={card.id}
                      snap={card}
                      projectName={card.project_name}
                      onClick={handleCardClick}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {searchError && !isSearching && (
                <div className="text-center py-16" style={{ color: 'var(--snaps-accent-orange)' }}>
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-80" />
                  <p className="text-lg">A busca nao pode ser feita</p>
                  <p className="text-sm mt-2 opacity-80">{searchError}</p>
                </div>
              )}

              {!searchError && searchResults !== null && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-16" style={{ color: 'var(--snaps-text-secondary)' }}>
                  <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-lg">Nenhum resultado para "{searchQuery}"</p>
                  <p className="text-sm mt-2 opacity-70">
                    A busca nao devolve resultados de baixa similaridade so para preencher a lista.
                    Vazio aqui significa vazio de verdade.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snap Detail Modal */}
      <SnapDetailModal
        isOpen={isSnapDetailModalOpen}
        onClose={() => setIsSnapDetailModalOpen(false)}
        snap={selectedSnap}
      />
    </div>
  );
}