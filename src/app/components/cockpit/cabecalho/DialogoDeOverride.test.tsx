/**
 * Override humano sempre disponível (SNA-SUP-81), no Cockpit novo. Estas são
 * as garantias que o `execution-requirements-checklist` do Cockpit antigo
 * dava e que passam para o diálogo do cabeçalho (TP-4):
 *   - toda condição da fase, inclusive aprovação de plano, pode ser dispensada;
 *   - a recusa estrutural do motor (fora do template) vira item com rótulo;
 *   - condição do template que também foi recusada não aparece duas vezes.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DialogoDeOverride } from './DialogoDeOverride';
import type { GateDoNo } from './gatesDoNo';

const GATES: GateDoNo[] = [
    { chave: 'tactical_plans_approved', rotulo: 'Planos táticos aprovados', estado: 'ok' },
    { chave: 'plan_approved', rotulo: 'Plano estratégico aprovado', estado: 'falta' },
    { chave: 'ci_passed', rotulo: 'CI verde', estado: 'motor' },
];

function montar(recusadas: string[] = [], { gates = GATES, recusa = null }: { gates?: GateDoNo[]; recusa?: string | null } = {}) {
    const onAplicar = vi.fn();
    render(
        <DialogoDeOverride fase="micro_planning" gates={gates} recusadas={recusadas} recusa={recusa} aplicando={false} erro={null}
            onAplicar={onAplicar} onCancelar={vi.fn()} />,
    );
    return { onAplicar };
}

describe('DialogoDeOverride', () => {
    it('aprovação de plano também pode ser dispensada; vem marcado o que falta', () => {
        montar();
        expect(screen.getByRole('checkbox', { name: /Plano estratégico aprovado/ })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /Planos táticos aprovados/ })).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: /CI verde/ })).not.toBeChecked();
    });

    it('recusa estrutural vira item dispensável, com rótulo, e a condição recusada não duplica', () => {
        const { onAplicar } = montar(['single_execution_multiple_plans', 'tactical_plans_approved']);
        const estrutural = screen.getByRole('checkbox', { name: /Varios planos para uma execucao so/ });
        expect(estrutural).toBeChecked();
        expect(screen.getAllByRole('checkbox', { name: /Planos táticos aprovados/ })).toHaveLength(1);

        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do override' }), { target: { value: 'decisão do PO' } });
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar override' }));
        expect(onAplicar).toHaveBeenCalledWith(
            ['tactical_plans_approved', 'plan_approved', 'single_execution_multiple_plans'], 'decisão do PO',
        );
    });

    it('a recusa do motor aparece escrita no diálogo', () => {
        montar(['required_env'], { recusa: 'Cannot advance phase. Requirements not met:\n- Missing env DATABASE_URL' });
        expect(screen.getByRole('region', { name: 'Recusa do motor' })).toHaveTextContent('Missing env DATABASE_URL');
        expect(screen.getByRole('checkbox', { name: /required_env/ })).toBeChecked();
    });

    it('sem condição marcada não aplica: a API exige ao menos uma', () => {
        const { onAplicar } = montar([], { gates: GATES.map((g) => ({ ...g, estado: 'ok' as const })) });
        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do override' }), { target: { value: 'decisão do PO' } });
        expect(screen.getByRole('button', { name: 'Aplicar override' })).toBeDisabled();
        expect(screen.getByText('Marque ao menos uma condição para dispensar.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('checkbox', { name: /CI verde/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar override' }));
        expect(onAplicar).toHaveBeenCalledWith(['ci_passed'], 'decisão do PO');
    });

    it('fase sem condição e sem recusa: nada a dispensar, use Avançar', () => {
        montar([], { gates: [] });
        expect(screen.getByText(/não há o que dispensar\. Use Avançar\./)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Aplicar override' })).toBeDisabled();
    });

    it('sem motivo não aplica', () => {
        const { onAplicar } = montar();
        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do override' }), { target: { value: '   ' } });
        expect(screen.getByRole('button', { name: 'Aplicar override' })).toBeDisabled();
        expect(onAplicar).not.toHaveBeenCalled();
    });
});
