import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { InstrucoesDoAgente } from './agent-instructions-modal';
it('formata título, lista e tabela sem envolver o conteúdo em pre', () => {
    const {container} = render(<InstrucoesDoAgente agentInstructions={'# Instruções\n\n- Item\n\n| A | B |\n|---|---|\n| 1 | 2 |'} />);
    expect(screen.getByRole('heading',{name:'Instruções'})).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Item');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(container.querySelector('pre')).toBeNull();
});
