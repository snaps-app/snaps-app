import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  uploadSourceDocument,
  extractSourceDocument,
  decomposeSourceDocument,
} from '@/services/sourceDocuments';
import { precisaConfirmarDecomposicao } from '@/services/ingestRules';

/**
 * A fila de importacao de varios materiais.
 *
 * Vive ACIMA das rotas, e isso e o ponto: morando na tela de Documents, entrar
 * num material para revisar desmontaria o componente e mataria os uploads em
 * curso -- exatamente o que este fluxo existe para permitir.
 *
 * Um arquivo por vez, inteiro. Nao e timidez: a decomposicao ja faz chamadas em
 * sequencia no servidor, e subir varios PDFs de 2 MB em paralelo disputaria a
 * mesma banca sem chegar antes. O ganho de verdade e nao ter de ficar olhando.
 */

export type EstadoItem =
  | 'esperando'
  | 'subindo'
  | 'extraindo'
  | 'decompondo'
  | 'pronto'
  | 'grande-demais'
  | 'falhou';

export interface ItemFila {
  id: string;
  nome: string;
  projectId: string;
  estado: EstadoItem;
  erro?: string;
  docId?: string;
  blocos?: number;
  criados?: number;
}

interface Fila {
  itens: ItemFila[];
  /** Quanto da fila ja andou, de 0 a 1. */
  progresso: number;
  ativa: boolean;
  /** Muda a cada material que passa a existir no servidor. Telas que listam
   *  materiais observam isto para recarregar sozinhas. */
  versao: number;
  enfileirar: (projectId: string, arquivos: File[]) => void;
  dispensar: () => void;
}

const Contexto = createContext<Fila | null>(null);

// Fracao ja vencida de um arquivo em cada etapa. Sao pesos grosseiros de
// proposito: o que o usuario precisa saber e "esta andando e falta pouco", nao
// um numero exato que nao temos como medir -- o servidor nao reporta progresso
// de extracao nem de decomposicao.
const PESO: Record<EstadoItem, number> = {
  esperando: 0,
  subindo: 0.2,
  extraindo: 0.6,
  decompondo: 0.9,
  pronto: 1,
  'grande-demais': 1,
  falhou: 1,
};

const detalhe = (e: any) =>
  e?.response?.data?.detail ?? e?.message ?? 'erro desconhecido';

export function IngestQueueProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [versao, setVersao] = useState(0);
  // Um unico trabalhador. O ref evita que duas renderizacoes disparem dois
  // lacos sobre a mesma fila -- o que faria o mesmo arquivo subir duas vezes.
  const trabalhando = useRef(false);

  const marcar = useCallback((id: string, mudanca: Partial<ItemFila>) => {
    setItens((atual) => atual.map((i) => (i.id === id ? { ...i, ...mudanca } : i)));
  }, []);

  const enfileirar = useCallback((projectId: string, arquivos: File[]) => {
    const novos: ItemFila[] = arquivos.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      nome: f.name,
      projectId,
      estado: 'esperando',
    }));
    pendentes.current.push(...novos.map((item, i) => ({ item, arquivo: arquivos[i] })));
    setItens((atual) => [...atual, ...novos]);
  }, []);

  const pendentes = useRef<{ item: ItemFila; arquivo: File }[]>([]);

  const dispensar = useCallback(() => {
    // So o que ja terminou sai. Limpar o que ainda vai rodar esconderia
    // trabalho em curso, e o usuario nao teria como saber que ele continua.
    setItens((atual) =>
      atual.filter((i) => !['pronto', 'falhou', 'grande-demais'].includes(i.estado)),
    );
  }, []);

  useEffect(() => {
    if (trabalhando.current) return;
    if (pendentes.current.length === 0) return;

    trabalhando.current = true;

    (async () => {
      while (pendentes.current.length > 0) {
        const { item, arquivo } = pendentes.current.shift()!;

        marcar(item.id, { estado: 'subindo' });
        let doc;
        try {
          doc = await uploadSourceDocument(item.projectId, arquivo);
        } catch (e) {
          // Nada foi guardado: recusa de tamanho ou de mimetype acontece antes
          // de o binario ir para o storage.
          marcar(item.id, { estado: 'falhou', erro: detalhe(e) });
          continue;
        }
        // O material ja existe na lista a partir daqui.
        marcar(item.id, { estado: 'extraindo', docId: doc.id });
        setVersao((v) => v + 1);

        let blocos: number;
        try {
          blocos = (await extractSourceDocument(item.projectId, doc.id)).blocos;
        } catch (e) {
          // O binario ficou no servidor -- o painel do material retoma sem
          // precisar de novo upload.
          marcar(item.id, { estado: 'falhou', erro: detalhe(e) });
          continue;
        }

        if (precisaConfirmarDecomposicao(blocos).confirmar) {
          // Aqui nao ha a quem perguntar, e decidir sozinho por gastar minutos
          // de espera seria pior do que parar. O material fica extraido; o
          // painel dele oferece a decomposicao com a conta na tela.
          marcar(item.id, { estado: 'grande-demais', blocos });
          setVersao((v) => v + 1);
          continue;
        }

        marcar(item.id, { estado: 'decompondo', blocos });
        try {
          const r = await decomposeSourceDocument(item.projectId, doc.id);
          marcar(item.id, { estado: 'pronto', criados: r.criados });
        } catch (e) {
          marcar(item.id, { estado: 'falhou', erro: detalhe(e) });
        }
        setVersao((v) => v + 1);
      }
      trabalhando.current = false;
    })();
  }, [itens, marcar]);

  const total = itens.length;
  const progresso = total === 0 ? 0 : itens.reduce((s, i) => s + PESO[i.estado], 0) / total;
  const ativa = itens.some((i) => !['pronto', 'falhou', 'grande-demais'].includes(i.estado));

  return (
    <Contexto.Provider value={{ itens, progresso, ativa, versao, enfileirar, dispensar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useIngestQueue(): Fila {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useIngestQueue precisa do IngestQueueProvider acima na arvore.');
  return ctx;
}
