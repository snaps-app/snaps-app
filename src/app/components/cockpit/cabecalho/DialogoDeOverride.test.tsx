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

function montar(recusadas: string[] = []) {
    const onAplicar = vi.fn();
    render(
        <DialogoDeOverride fase="micro_planning" gates={GATES} recusadas={recusadas} aplicando={false} erro={null}
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

    it('sem motivo não aplica', () => {
        const { onAplicar } = montar();
        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do override' }), { target: { value: '   ' } });
        expect(screen.getByRole('button', { name: 'Aplicar override' })).toBeDisabled();
        expect(onAplicar).not.toHaveBeenCalled();
    });
});
