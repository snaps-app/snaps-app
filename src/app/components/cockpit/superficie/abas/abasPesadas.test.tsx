import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderComConsulta } from '@/test/comConsulta';
import type { AgentTaskExecution } from '@/services/types';

vi.mock('@/services/ambienteDoNo', async (original) => ({
    ...(await original<typeof import('@/services/ambienteDoNo')>()), getAmbienteDoNo: vi.fn(),
}));
vi.mock('@/services/atividadeDoNo', async (original) => ({
    ...(await original<typeof import('@/services/atividadeDoNo')>()), getAtividadeDoNo: vi.fn(),
}));

import { getAmbienteDoNo } from '@/services/ambienteDoNo';
import { getAtividadeDoNo } from '@/services/atividadeDoNo';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import AbaAmbiente from './AbaAmbiente';
import AbaAtividade from './AbaAtividade';
import { capacidadePelaLargura } from '../Superficie';

const no = { id: 'no', project_id: 'p', phase: 'execution', status: 'in_progress' } as AgentTaskExecution;
const acoes: any = { podeAgir: true, pode: () => true, acoes: {}, emAndamento: null, ehAdmin: false };
const props = { execucao: no, somenteLeitura: false, ativa: true, acoes, onSelecionarAba: vi.fn() };

describe('aba Ambiente', () => {
    it('mostra ambiente, foto, nomes sem valor, alerta de branch e botões de escrita marcados 25.0', async () => {
        vi.mocked(getAmbienteDoNo).mockResolvedValue({
            ambiente: { id: 'e', nome: 'default (preview)', stage: 'preview' }, motivo_vazio: null,
            fotografado_em: '2026-10-20T12:00:00Z', foto_cifrada: false,
            repos: [{ repo: 'snaps-api', base_branch: null, base_branch_declarada: false,
                origem_base_branch: 'nenhuma branch canonica declarada — origin/HEAD', setup_command: null,
                test_command: null, build_command: null, primario: false }],
            variaveis: { total: 1, mudaram_no_projeto_depois: 0,
                itens: [{ chave: 'DATABASE_URL', repo: 'snaps-api', tipo: 'secret', mudou_no_projeto_depois: false }] },
            required_env: { exigidas: [], faltando: [] },
            credenciais: { disponivel: false, motivo: 'broker de credencial (Sprint 27.0)' },
        });
        renderComConsulta(<AbaAmbiente {...props} />);
        expect(await screen.findByText('DATABASE_URL')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('branch canônica não declarada');
        expect(screen.getByText(/Credenciais: chegam por referência, via broker/)).toBeInTheDocument();
        const futuros = screen.getAllByRole('button', { name: /25\.0/ });
        expect(futuros.map((b) => b.textContent)).toEqual([
            'Sobrescrever nesta execução · 25.0', 'Pedir alteração ao projeto · 25.0']);
        expect(futuros.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    });

    it('fase que não roda código fica vazia e explica', async () => {
        vi.mocked(getAmbienteDoNo).mockResolvedValue({
            ambiente: null, motivo_vazio: 'só execution, ci_gate e assurance recebem ambiente',
        } as any);
        renderComConsulta(<AbaAmbiente {...props} />);
        expect(await screen.findByText('só execution, ci_gate e assurance recebem ambiente')).toBeInTheDocument();
    });
});

// Cursor opaco `(created_at|id)`: o app o devolve como veio, sem interpretar.
const CURSOR = '2026-10-20T12:00:00+00:00|7c1e2b7a-0000-4000-8000-000000000001';

const pagina = (proximo: string | null, tool: string) => ({
    resumo: { chamadas: 2, falhas: 1, recusas: 0, tempo_total_ms: 2000, ultima_atividade_em: null, diagnostico_expirado: false },
    chamadas: [{ id: tool, em: '2026-10-20T12:00:00Z', tool, operacao: 'op', recurso: null, desfecho: 'error' as const,
        desfecho_cliente: null, codigo_recusa: null, codigo_erro: 'decifra_recusada', codigo_erro_cliente: null,
        duracao_ms: 1000, turn_id: null, detalhe_expirado: false }],
    recusas_do_motor: [], turnos_do_neuron: [], turnos_motivo_vazio: 'pedidos do Neuron chegam com o E7',
    uso_do_cli: { medido: false, motivo: 'x' }, proximo,
});

describe('aba Atividade', () => {
    it('mostra os rótulos fixos, os códigos, o motivo dos turnos e pagina sobre `antes`', async () => {
        vi.mocked(getAtividadeDoNo)
            .mockResolvedValueOnce(pagina(CURSOR, 'tool_a'))
            .mockResolvedValueOnce(pagina(null, 'tool_b'));
        const { cliente } = renderComConsulta(<AbaAtividade {...props} />);
        expect(await screen.findByText(/Só o que passa pelo Snaps/)).toBeInTheDocument();
        expect(await screen.findByText(/Uso não medido: o CLI não reporta consumo ao Snaps/)).toBeInTheDocument();
        expect(screen.getByText(/decifra_recusada/)).toBeInTheDocument();
        expect(screen.getByText('pedidos do Neuron chegam com o E7')).toBeInTheDocument();
        expect(document.body.textContent).not.toContain('US$ 0,00');

        fireEvent.click(screen.getByRole('button', { name: 'Carregar mais antigas' }));
        await waitFor(() => expect(getAtividadeDoNo).toHaveBeenLastCalledWith('no', { soFalhas: false }, CURSOR));
        expect((await screen.findAllByText(/tool_b/)).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/tool_a/).length).toBeGreaterThan(0);
        // As duas páginas moram na MESMA chave: o cursor novo não a muda.
        const consultas = cliente.getQueryCache().findAll({ queryKey: chaves.atividade('no', { soFalhas: false }) });
        expect(consultas).toHaveLength(1);
        expect((consultas[0].state.data as any).pages).toHaveLength(2);
    });
});

describe('capacidadePelaLargura', () => {
    it('painel estreito põe menos abas antes de "Mais", nunca menos de uma', () => {
        expect(capacidadePelaLargura(1680)).toBe(14);
        expect(capacidadePelaLargura(320)).toBe(1);
        expect(capacidadePelaLargura(100)).toBe(1);
        expect(capacidadePelaLargura(null)).toBe(15);
    });
});
