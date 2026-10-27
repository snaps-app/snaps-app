import { fireEvent,render,screen } from '@testing-library/react';
import { expect,it,vi } from 'vitest';
import type { Card } from '@/services/types';
import { FaixaDeCards } from './FaixaDeCards';
it('recolhida mantém o filtro ativo e permite limpar',()=>{
    const filtrar=vi.fn(),alternar=vi.fn();
    render(<FaixaDeCards cards={[{id:'a',code:'SNA-1',title:'Card',status:'todo'} as Card]} pendencias={[]} filtro="a" onFiltrar={filtrar} recolhida onAlternar={alternar}/>);
    expect(screen.getByRole('group')).toHaveTextContent('Cards do escopo · 1');
    expect(screen.getByText('SNA-1')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Limpar'}));expect(filtrar).toHaveBeenCalledWith(null);
    fireEvent.click(screen.getByRole('button',{name:'Cards do escopo · 1'}));expect(alternar).toHaveBeenCalled();
});
