/** History da raiz (E21, TP-1): marcação ✓ ● ○ ↻, ramos, seleção e novidade. */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

vi.mock('@/services/client', () => ({ api: { get: vi.fn() } }));

import { api } from '@/services/client';
import type { ArvoreLeve, NoDaArvore } from '@/services/types';
import { renderComConsulta } from '@/test/comConsulta';
import { HistoryDaRaiz } from './HistoryDaRaiz';

const DIRETIVAS = {
    terminal_statuses: ['cancelled', 'completed', 'done', 'rolled_back', 'superseded'],
    discarded_statuses: ['cancelled', 'rolled_back', 'superseded'],
};

let t = 0;
const no = (id: string, phase: string, status: string, extra: Partial<NoDaArvore> = {}): NoDaArvore => ({
    id, phase, status, parent_id: null, branch_type: 'main', plan_id: null, plano_titulo: null,
    agent_name: null, card_ids: [], lock_version: 1, workflow_snapshot_hash: 'h',
    created_at: `2026-10-21T10:${String(t++).padStart(2, '0')}:00Z`, updated_at: '2026-10-21T10:00:00Z',
    ...extra,
});

// Raiz com fan-out e um rollback no ramo do TP-1, como no canvas (página 2).
const ARVORE: ArvoreLeve = {
    root_id: 'macro',
    workflows: {
        h: {
            phases: [
                { key: 'macro_planning', label: 'Macro planning' },
                { key: 'micro_planning', label: 'Micro planning' },
                { key: 'execution', label: 'Execution' },
                { key: 'ci_gate', label: 'CI gate' },
                { key: 'assurance', label: 'Assurance' },
            ],
        },
    },
    nos: [
        no('macro', 'macro_planning', 'completed'),
        no('micro', 'micro_planning', 'completed', { parent_id: 'macro' }),
        no('tp1-exec', 'execution', 'completed', { parent_id: 'micro', plan_id: 'P1', plano_titulo: 'TP-1 · History e trava' }),
        no('tp2-exec', 'execution', 'in_progress', { parent_id: 'micro', plan_id: 'P2', plano_titulo: 'TP-2 · Superfície' }),
        no('tp1-ci', 'ci_gate', 'rolled_back', { parent_id: 'tp1-exec', plan_id: 'P1' }),
        no('tp1-exec-2', 'execution', 'in_progress', { parent_id: 'tp1-ci', plan_id: 'P1', branch_type: 'hotfix' }),
    ],
};

beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue({ data: DIRETIVAS });
});

const linha = (nome: RegExp) => screen.getByRole('button', { name: nome });

describe('HistoryDaRaiz', () => {
    it('marca concluídos ✓, atuais ●, desfeitos ↻ e projeções ○ desabilitadas', async () => {
        renderComConsulta(<HistoryDaRaiz tree={ARVORE} selecionadoId={null} onSelecionarNo={vi.fn()} />);
        await screen.findByRole('list', { name: 'History da árvore' });

        expect(linha(/^Macro planning, concluído/)).toHaveTextContent('✓');
        expect(linha(/^CI gate, desfeito/)).toHaveTextContent('↻');
        expect(screen.getAllByRole('button', { name: /^Execution, atual/ })[0]).toHaveTextContent('●');
        const projecoes = screen.getAllByRole('button', { name: /projeção$/ });
        expect(projecoes.length).toBeGreaterThan(0);
        projecoes.forEach((p) => {
            expect(p).toBeDisabled();
            expect(p).toHaveTextContent('○');
        });
    });

    it('a nova tentativa depois do rollback aparece como "tentativa 2"', async () => {
        renderComConsulta(<HistoryDaRaiz tree={ARVORE} selecionadoId={null} onSelecionarNo={vi.fn()} />);
        expect(await screen.findByRole('button', { name: /^Execution, atual, tentativa 2/ })).toBeEnabled();
    });

    it('o fan-out abre ramos com o título do plano, recuados', async () => {
        renderComConsulta(<HistoryDaRaiz tree={ARVORE} selecionadoId={null} onSelecionarNo={vi.fn()} />);
        expect(await screen.findByText('TP-1 · History e trava')).toBeInTheDocument();
        expect(screen.getByText('TP-2 · Superfície')).toBeInTheDocument();
        expect(linha(/^Micro planning/).style.paddingLeft).toBe('12px');
        expect(linha(/^Execution, concluído/).style.paddingLeft).toBe('28px');
    });

    it('selecionar um nó concluído chama onSelecionarNo com o id', async () => {
        const onSelecionarNo = vi.fn();
        renderComConsulta(<HistoryDaRaiz tree={ARVORE} selecionadoId="micro" onSelecionarNo={onSelecionarNo} />);
        await screen.findByRole('list', { name: 'History da árvore' });
        expect(linha(/^Micro planning/)).toHaveAttribute('aria-current', 'true');
        fireEvent.click(linha(/^Macro planning/));
        expect(onSelecionarNo).toHaveBeenCalledWith('macro');
    });

    it('contador de novidade por nó, escondido no nó selecionado', async () => {
        const { rerender } = renderComConsulta(
            <HistoryDaRaiz tree={ARVORE} selecionadoId={null} novidades={{ 'tp2-exec': 3 }} onSelecionarNo={vi.fn()} />,
        );
        expect(await screen.findByText('3 novos')).toBeInTheDocument();
        rerender(<HistoryDaRaiz tree={ARVORE} selecionadoId="tp2-exec" novidades={{ 'tp2-exec': 3 }} onSelecionarNo={vi.fn()} />);
        expect(screen.queryByText('3 novos')).not.toBeInTheDocument();
    });

    it('modo compacto por container query: subtítulo e legenda somem abaixo de 250 px', async () => {
        const { container } = renderComConsulta(<HistoryDaRaiz tree={ARVORE} selecionadoId={null} onSelecionarNo={vi.fn()} />);
        await screen.findByRole('list', { name: 'History da árvore' });
        expect(container.firstElementChild).toHaveClass('@container');
        expect(screen.getByTestId('legenda-do-history')).toHaveClass('@max-[250px]:hidden');
        screen.getAllByTestId('subtitulo-do-no').forEach((sub) => expect(sub).toHaveClass('@max-[250px]:hidden'));
    });

    it('sem os status da API não classifica nada (nem como atual)', () => {
        vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
        renderComConsulta(<HistoryDaRaiz tree={ARVORE} selecionadoId={null} onSelecionarNo={vi.fn()} />);
        expect(screen.getByText('Carregando o History…')).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
});
