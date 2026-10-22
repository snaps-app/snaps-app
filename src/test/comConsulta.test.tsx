/** O wrapper de teste do cache: cliente novo por teste, sem retry. */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { renderComConsulta } from '@/test/comConsulta';

function Leitor({ buscar }: { buscar: () => Promise<string> }) {
    const { data, isError } = useQuery({ queryKey: ['teste'], queryFn: buscar });
    if (isError) return <p>falhou</p>;
    return <p>{data ?? 'carregando'}</p>;
}

describe('renderComConsulta', () => {
    it('monta o provider e entrega o cliente usado', async () => {
        const { cliente } = renderComConsulta(<Leitor buscar={async () => 'pronto'} />);
        expect(await screen.findByText('pronto')).toBeInTheDocument();
        expect(cliente.getQueryData(['teste'])).toBe('pronto');
    });

    it('um cliente novo por render: o cache de um teste não vaza para o outro', () => {
        const a = renderComConsulta(<p>a</p>).cliente;
        const b = renderComConsulta(<p>b</p>).cliente;
        expect(a).not.toBe(b);
    });

    it('sem retry: a falha aparece na primeira chamada', async () => {
        const buscar = vi.fn().mockRejectedValue(new Error('404'));
        renderComConsulta(<Leitor buscar={buscar} />);
        expect(await screen.findByText('falhou')).toBeInTheDocument();
        expect(buscar).toHaveBeenCalledOnce();
    });
});
