/**
 * A regra de tamanho da ingestao.
 *
 * Sao DOIS portoes, para dois custos diferentes, e a diferenca entre eles foi
 * medida, nao estimada:
 *
 *   Extracao      -- parsing local nao custa nada; Vision cobra POR PAGINA.
 *   Decomposicao  -- uma chamada custa ~2 mil tokens (1.309 de entrada + 712 de
 *                    saida, medido em gpt-4o). Ou seja: centavos. O que pesa
 *                    aqui nao e a conta, e a ESPERA, porque as chamadas saem em
 *                    sequencia.
 *
 * Por isso a decomposicao so pergunta quando a espera passa de um minuto, e a
 * extracao por Vision pergunta sempre.
 */
import { describe, it, expect } from 'vitest';
import {
  precisaConfirmarExtracao,
  precisaConfirmarDecomposicao,
  estimarDecomposicao,
  BLOCOS_POR_CHAMADA,
  LIMITE_AUTO_BLOCOS,
  MAX_PAGINAS_VISION,
} from '@/services/ingestRules';

describe('extracao', () => {
  it('nao pergunta quando o parsing e local', () => {
    // Sem custo e sem decisao a tomar: perguntar seria um clique a toa.
    for (const mimetype of [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
    ]) {
      expect(precisaConfirmarExtracao({ mimetype }).confirmar).toBe(false);
    }
  });

  it('nao pergunta em PDF que ja tem camada de texto', () => {
    expect(
      precisaConfirmarExtracao({
        mimetype: 'application/pdf',
        temCamadaDeTexto: true,
        paginas: 240,
      }).confirmar,
    ).toBe(false);
  });

  it('pergunta em PDF sem camada de texto, dizendo quantas paginas', () => {
    // Vision cobra por pagina. O numero precisa estar na tela ANTES do gasto --
    // descobrir pela fatura foi o cenario que o teto no backend existe para
    // impedir.
    const r = precisaConfirmarExtracao({
      mimetype: 'application/pdf',
      temCamadaDeTexto: false,
      paginas: 18,
    });
    expect(r.confirmar).toBe(true);
    expect(r.paginas).toBe(18);
    expect(r.motivo).toMatch(/vision/i);
  });

  it('pergunta em imagem, que sempre passa por Vision', () => {
    expect(precisaConfirmarExtracao({ mimetype: 'image/png' }).confirmar).toBe(true);
  });

  it('avisa que o backend vai recusar acima do teto, em vez de deixar tentar', () => {
    // O backend recusa em MAX_PAGINAS_VISION. Deixar o usuario confirmar um
    // gasto que vai falhar de qualquer jeito e desperdicar o tempo dele.
    const r = precisaConfirmarExtracao({
      mimetype: 'application/pdf',
      temCamadaDeTexto: false,
      paginas: MAX_PAGINAS_VISION + 1,
    });
    expect(r.bloqueado).toBe(true);
    expect(r.motivo).toContain(String(MAX_PAGINAS_VISION));
  });

  it('nao bloqueia exatamente no teto', () => {
    expect(
      precisaConfirmarExtracao({
        mimetype: 'application/pdf',
        temCamadaDeTexto: false,
        paginas: MAX_PAGINAS_VISION,
      }).bloqueado,
    ).toBe(false);
  });
});

describe('estimativa da decomposicao', () => {
  it('conta chamadas em lotes de 12, arredondando para cima', () => {
    // O lote parcial tambem e uma chamada. Arredondar para baixo faria a tela
    // subestimar sempre.
    expect(estimarDecomposicao(1).chamadas).toBe(1);
    expect(estimarDecomposicao(BLOCOS_POR_CHAMADA).chamadas).toBe(1);
    expect(estimarDecomposicao(BLOCOS_POR_CHAMADA + 1).chamadas).toBe(2);
    expect(estimarDecomposicao(60).chamadas).toBe(5);
    expect(estimarDecomposicao(127).chamadas).toBe(11);
  });

  it('documento sem bloco nenhum nao tem chamada', () => {
    expect(estimarDecomposicao(0).chamadas).toBe(0);
    expect(estimarDecomposicao(0).segundos).toBe(0);
  });

  it('a espera cresce junto com as chamadas, porque elas sao sequenciais', () => {
    expect(estimarDecomposicao(120).segundos).toBeGreaterThan(
      estimarDecomposicao(12).segundos,
    );
  });
});

describe('decomposicao', () => {
  it('nao pergunta ate o limite', () => {
    expect(precisaConfirmarDecomposicao(1).confirmar).toBe(false);
    expect(precisaConfirmarDecomposicao(LIMITE_AUTO_BLOCOS).confirmar).toBe(false);
  });

  it('pergunta a partir do primeiro bloco acima do limite', () => {
    // O corte fica onde a espera cruza um minuto: abaixo disso um spinner ainda
    // parece carregamento, acima comeca a parecer travado.
    expect(precisaConfirmarDecomposicao(LIMITE_AUTO_BLOCOS + 1).confirmar).toBe(true);
  });

  it('quando pergunta, entrega os numeros que justificam a pergunta', () => {
    const r = precisaConfirmarDecomposicao(127);
    expect(r.confirmar).toBe(true);
    expect(r.chamadas).toBe(11);
    expect(r.segundos).toBeGreaterThan(60);
  });

  it('o limite corresponde a cerca de um minuto de espera', () => {
    // Se alguem mexer em LIMITE_AUTO_BLOCOS sem pensar na espera, este teste
    // reclama -- e a razao do numero fica registrada, em vez de virar folclore.
    const noLimite = estimarDecomposicao(LIMITE_AUTO_BLOCOS).segundos;
    expect(noLimite).toBeGreaterThanOrEqual(45);
    expect(noLimite).toBeLessThanOrEqual(90);
  });
});
