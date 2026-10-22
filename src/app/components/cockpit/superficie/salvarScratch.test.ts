import { describe, expect, it, vi } from 'vitest';
import type { Snap } from '@/services/types';
import { salvarScratch } from './salvarScratch';

const deps = () => ({
    createSnap: vi.fn(async (dados: any) => ({ id: 'novo', ...dados }) as Snap),
    updateSnap: vi.fn(async (id: string, dados: any) => ({ id, ...dados }) as Snap),
});

const base = { projectId: 'p', executionId: 'e', nome: '' };

describe('salvarScratch', () => {
    it('não cria nota vazia', async () => {
        const d = deps();
        expect(await salvarScratch({ ...base, conteudo: '   \n' }, d)).toBeNull();
        expect(d.createSnap).not.toHaveBeenCalled();
    });

    it('cria a nota quando há texto, como scratch da árvore', async () => {
        const d = deps();
        await salvarScratch({ ...base, nome: 'Ideia', conteudo: 'texto' }, d);
        expect(d.createSnap).toHaveBeenCalledWith(expect.objectContaining({
            project_id: 'p', agent_execution_id: 'e', name: 'Ideia', content: 'texto',
            snadds: expect.objectContaining({ type: 'scratch' }),
        }));
    });

    it('nota existente é atualizada, nunca duplicada', async () => {
        const d = deps();
        await salvarScratch({ ...base, notaId: 'n1', nome: 'X', conteudo: 'novo' }, d);
        expect(d.updateSnap).toHaveBeenCalledWith('n1', { name: 'X', content: 'novo' });
        expect(d.createSnap).not.toHaveBeenCalled();
    });
});
