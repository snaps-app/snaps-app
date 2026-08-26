/**
 * Quando a ingestao anda sozinha e quando ela para para perguntar.
 *
 * Sao dois portoes, porque sao dois custos de natureza diferente.
 *
 * EXTRACAO. Parsing local (PDF com camada de texto, DOCX, PPTX, TXT, MD) nao
 * custa nada, entao nao ha o que perguntar. Vision cobra POR PAGINA e so entra
 * quando o PDF nao tem camada de texto -- ai o numero de paginas precisa estar
 * na tela antes do gasto. Descobrir o custo pela fatura foi exatamente o cenario
 * que o teto do backend existe para impedir.
 *
 * DECOMPOSICAO. Medido numa chamada real a gpt-4o com 12 blocos: 1.309 tokens
 * de entrada e 712 de saida. Cerca de 2 mil por chamada -- um documento de 120
 * blocos sai por centavos. O dinheiro nao e o problema aqui.
 *
 * O problema e a ESPERA. `decompor` percorre os lotes em sequencia, uma chamada
 * de cada vez, e a tela fica parada durante todas elas. Por isso o corte nao
 * esta num valor em dolar: esta no ponto em que a espera cruza um minuto, que e
 * onde um spinner deixa de parecer carregamento e comeca a parecer travado.
 */

/** Espelha `BLOCOS_POR_CHAMADA` em services/decomposition.py. */
export const BLOCOS_POR_CHAMADA = 12;

/**
 * Estimativa de duracao de uma chamada de decomposicao.
 *
 * Diferente dos tokens, este numero NAO foi medido -- e uma aproximacao para uma
 * chamada de saida estruturada de ~2 mil tokens. Serve para dimensionar a espera
 * e escolher o corte, nao para prometer prazo ao usuario, e por isso a tela fala
 * em "~2 minutos" e nunca em segundos exatos.
 */
export const SEGUNDOS_POR_CHAMADA = 12;

/** Acima disto a decomposicao para e pergunta. 60 blocos = 5 chamadas = ~1 min. */
export const LIMITE_AUTO_BLOCOS = 60;

/** Espelha `MAX_PAGINAS_VISION` em services/extraction.py, onde o backend recusa. */
export const MAX_PAGINAS_VISION = 60;

const MIMETYPES_PARSING_LOCAL = [
  'application/pdf', // so quando tem camada de texto; tratado a parte
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
];

export interface Documento {
  mimetype: string;
  /** So faz sentido em PDF. `undefined` em outros formatos. */
  temCamadaDeTexto?: boolean;
  paginas?: number;
}

export interface Veredito {
  confirmar: boolean;
  /** O backend vai recusar de qualquer jeito: nem oferecer a confirmacao. */
  bloqueado: boolean;
  motivo?: string;
  paginas?: number;
}

export function precisaConfirmarExtracao(doc: Documento): Veredito {
  const porVision =
    doc.mimetype.startsWith('image/') ||
    (doc.mimetype === 'application/pdf' && doc.temCamadaDeTexto === false);

  if (!porVision && MIMETYPES_PARSING_LOCAL.includes(doc.mimetype)) {
    return { confirmar: false, bloqueado: false };
  }

  if (!porVision) {
    // Formato sem extrator conhecido. O backend responde com erro legivel; a
    // tela nao inventa uma confirmacao para algo que nao vai rodar.
    return {
      confirmar: false,
      bloqueado: true,
      motivo: `Nao sei ler arquivos do tipo ${doc.mimetype}.`,
    };
  }

  const paginas = doc.paginas;

  if (paginas !== undefined && paginas > MAX_PAGINAS_VISION) {
    return {
      confirmar: false,
      bloqueado: true,
      paginas,
      motivo:
        `Este documento tem ${paginas} paginas e precisa ser lido por Vision, ` +
        `que cobra por pagina. O limite e ${MAX_PAGINAS_VISION}. ` +
        `Exporte um recorte menor, ou um PDF com texto selecionavel.`,
    };
  }

  return {
    confirmar: true,
    bloqueado: false,
    paginas,
    motivo:
      paginas !== undefined
        ? `Este documento nao tem texto selecionavel: as ${paginas} paginas serao lidas por Vision, que cobra por pagina.`
        : 'Este arquivo sera lido por Vision, que cobra por pagina.',
  };
}

export interface Estimativa {
  chamadas: number;
  segundos: number;
}

export function estimarDecomposicao(blocos: number): Estimativa {
  // Lote parcial tambem e uma chamada. Arredondar para baixo faria a tela
  // subestimar sempre, e justo no documento grande, que e onde importa.
  const chamadas = Math.ceil(Math.max(0, blocos) / BLOCOS_POR_CHAMADA);
  return { chamadas, segundos: chamadas * SEGUNDOS_POR_CHAMADA };
}

export interface VeredictoDecomposicao extends Estimativa {
  confirmar: boolean;
  blocos: number;
}

export function precisaConfirmarDecomposicao(blocos: number): VeredictoDecomposicao {
  const { chamadas, segundos } = estimarDecomposicao(blocos);
  return { confirmar: blocos > LIMITE_AUTO_BLOCOS, blocos, chamadas, segundos };
}
