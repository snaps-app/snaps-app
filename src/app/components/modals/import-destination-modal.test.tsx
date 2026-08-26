/**
 * A pergunta que faltava no "Importar".
 *
 * O botao sempre mandou o arquivo para /governance-docs. Quem quisesse importar
 * uma aula clicava nele, subia o arquivo e nao acontecia nada do esperado --
 * porque o caminho da aula nem existia na tela.
 *
 * Os dois destinos parecem o mesmo gesto e tem consequencias muito diferentes:
 * um vira documento de contexto, o outro e quebrado em notas que os agentes vao
 * ler como memoria. A diferenca precisa estar na tela, nao no conhecimento
 * previo de quem clica.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ImportDestinationModal } from '@/app/components/modals/import-destination-modal';

beforeEach(() => vi.clearAllMocks());

const abrir = (props: any = {}) =>
  render(
    <ImportDestinationModal
      onEscolher={props.onEscolher ?? vi.fn()}
      onClose={props.onClose ?? vi.fn()}
      {...props}
    />,
  );

it('oferece os dois destinos pelo nome', () => {
  abrir();
  expect(screen.getByRole('button', { name: /governance documents/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /source documents/i })).toBeInTheDocument();
});

it('explica o que cada destino faz com o arquivo', () => {
  // Sem isto os dois botoes sao dois rotulos parecidos, e a escolha vira palpite.
  abrir();
  expect(screen.getByText(/prd, roadmap/i)).toBeInTheDocument();
  expect(screen.getByText(/notas atômicas/i)).toBeInTheDocument();
});

it('avisa que source document passa por revisao antes de virar memoria', () => {
  // E a garantia central do fluxo: material de terceiro nao entra na memoria
  // sem um humano ter olhado.
  abrir();
  expect(screen.getByText(/depois da sua revisão/i)).toBeInTheDocument();
});

it('devolve o destino escolhido', async () => {
  const onEscolher = vi.fn();
  abrir({ onEscolher });
  await userEvent.click(screen.getByRole('button', { name: /source documents/i }));
  expect(onEscolher).toHaveBeenCalledWith('source');
});

it('devolve governanca quando e esse o destino', async () => {
  const onEscolher = vi.fn();
  abrir({ onEscolher });
  await userEvent.click(screen.getByRole('button', { name: /governance documents/i }));
  expect(onEscolher).toHaveBeenCalledWith('governance');
});

it('da para sair sem escolher', async () => {
  // Abrir por engano nao pode obrigar a importar alguma coisa.
  const onClose = vi.fn();
  abrir({ onClose });
  await userEvent.click(screen.getByRole('button', { name: /fechar/i }));
  expect(onClose).toHaveBeenCalled();
});
