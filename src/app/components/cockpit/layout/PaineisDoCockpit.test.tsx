/** Painéis do Cockpit: recolher, trilhos, teclado e duplo clique no divisor (P14; TP-4). */
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { layoutPadrao, type LayoutDoCockpit } from '@/services/cockpitLayout';
import { PaineisDoCockpit, type InfoDoTrilho } from './PaineisDoCockpit';

function Montado({ inicial, trilhos, aoMudar }: {
    inicial: LayoutDoCockpit;
    trilhos?: Partial<Record<'workflow' | 'superficie' | 'conversa', InfoDoTrilho>>;
    aoMudar?: (l: LayoutDoCockpit) => void;
}) {
    const [layout, setLayout] = useState(inicial);
    return (
        <>
            <PaineisDoCockpit
                layout={layout}
                onMudarLayout={(l) => { aoMudar?.(l); setLayout(l); }}
                workflow={<p>conteúdo do workflow</p>}
                superficie={<p>conteúdo da superfície</p>}
                conversa={<p>conteúdo da conversa</p>}
                trilhos={trilhos}
            />
            <output data-testid="layout">{JSON.stringify(layout)}</output>
        </>
    );
}

const lido = (): LayoutDoCockpit => JSON.parse(screen.getByTestId('layout').textContent ?? '{}');
const PADRAO = layoutPadrao(1440);

describe('PaineisDoCockpit', () => {
    it('mostra Workflow, Superfície e Conversa lado a lado, com dois divisores', () => {
        render(<Montado inicial={PADRAO} />);
        expect(screen.getByRole('region', { name: 'Workflow' })).toHaveTextContent('conteúdo do workflow');
        expect(screen.getByRole('region', { name: 'Superfície' })).toHaveTextContent('conteúdo da superfície');
        expect(screen.getByRole('region', { name: 'Conversa' })).toHaveTextContent('conteúdo da conversa');
        expect(screen.getAllByRole('separator')).toHaveLength(2);
    });

    it('seta para a esquerda no divisor da Conversa alarga a Conversa 16 px', () => {
        render(<Montado inicial={PADRAO} />);
        const divisor = screen.getByRole('separator', { name: 'Redimensionar Conversa' });
        act(() => divisor.focus());
        fireEvent.keyDown(divisor, { key: 'ArrowLeft' });
        expect(lido().larguraConversa).toBe(416);
        expect(divisor).toHaveAttribute('aria-valuetext', '416 px');
        fireEvent.keyDown(divisor, { key: 'ArrowRight' });
        expect(lido().larguraConversa).toBe(400);
    });

    it('o divisor tem os atributos de separador e o duplo clique restaura a largura', () => {
        render(<Montado inicial={{ ...PADRAO, larguraWorkflow: 460 }} />);
        const divisor = screen.getByRole('separator', { name: 'Redimensionar Workflow' });
        expect(divisor).toHaveAttribute('tabindex', '0');
        fireEvent.doubleClick(divisor);
        expect(lido().larguraWorkflow).toBe(300);
    });

    it('Home e End não mexem: o px salvo e a tela não divergem', () => {
        const aoMudar = vi.fn();
        render(<Montado inicial={PADRAO} aoMudar={aoMudar} />);
        fireEvent.keyDown(screen.getByRole('separator', { name: 'Redimensionar Workflow' }), { key: 'End' });
        expect(aoMudar).not.toHaveBeenCalled();
    });

    it('recolher a Superfície vira trilho com o nome da aba aberta, e a luz não some', () => {
        render(<Montado inicial={PADRAO} trilhos={{ superficie: { luz: true, detalhe: 'Plano', novidade: 2 } }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Recolher Superfície' }));

        expect(screen.queryByRole('region', { name: 'Superfície' })).not.toBeInTheDocument();
        const trilho = screen.getByTestId('trilho-superficie');
        expect(trilho).toHaveTextContent('Superfície · Plano');
        expect(within(trilho).getByLabelText('ação sua pendente')).toBeInTheDocument();
        expect(within(trilho).getByLabelText('2 novidade(s)')).toHaveTextContent('2');
        // Sem o centro, só sobra o divisor do Workflow.
        expect(screen.getAllByRole('separator')).toHaveLength(1);
    });

    it('o último painel aberto não recolhe', () => {
        render(<Montado inicial={PADRAO} />);
        fireEvent.click(screen.getByRole('button', { name: 'Recolher Superfície' }));
        fireEvent.click(screen.getByRole('button', { name: 'Recolher Conversa' }));
        expect(lido().recolhidos).toEqual({ workflow: false, superficie: true, conversa: true });
        expect(screen.queryByRole('button', { name: 'Recolher Workflow' })).not.toBeInTheDocument();
        expect(screen.queryAllByRole('separator')).toHaveLength(0);
    });

    it('o trilho reabre o painel', () => {
        render(<Montado inicial={{ ...PADRAO, recolhidos: { workflow: true, superficie: false, conversa: false } }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Expandir Workflow' }));
        expect(screen.getByRole('region', { name: 'Workflow' })).toBeInTheDocument();
        expect(lido().recolhidos.workflow).toBe(false);
    });

    it.each(['Workflow', 'Superfície', 'Conversa'])(
        'recolher e reabrir %s monta outro grupo de painéis: um grupo vivo não ganha nem perde painel',
        async (nome) => {
            // Aceite DEV da 24.0: "‹" do Workflow e depois "Workflow" deram
            // "Panel data not found for index 2" no navegador.
            render(<Montado inicial={PADRAO} />);
            const idDoGrupo = () => document.querySelector('[data-panel-group-id]')?.getAttribute('data-panel-group-id');
            const inicial = idDoGrupo();

            fireEvent.click(screen.getByRole('button', { name: `Recolher ${nome}` }));
            await act(() => new Promise((r) => setTimeout(r, 0)));
            const recolhido = idDoGrupo();
            expect(recolhido).not.toBe(inicial);
            expect(document.querySelectorAll('[data-panel-id]')).toHaveLength(2);

            fireEvent.click(screen.getByRole('button', { name: `Expandir ${nome}` }));
            await act(() => new Promise((r) => setTimeout(r, 0)));
            expect(idDoGrupo()).not.toBe(recolhido);
            expect(document.querySelectorAll('[data-panel-id]')).toHaveLength(3);
            expect(screen.getByRole('region', { name: nome })).toBeInTheDocument();
        },
    );
});
