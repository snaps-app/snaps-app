import { QueryClient } from '@tanstack/react-query';
import { expect,it } from 'vitest';
import { shaConhecido } from './arquivosDePr';
import { chavesDeConsulta as chaves } from './chavesDeConsulta';
it('duas PRs do mesmo repositório têm snapshots e chaves próprios', () => {
    const cliente = new QueryClient();
    cliente.setQueryData(chaves.snapshot('n'),{prs:[{repo:'app',pr_number:1,head_sha:'aaa'},{repo:'app',pr_number:2,head_sha:'bbb'}]});
    expect(shaConhecido(cliente,'n','app',1)).toBe('aaa');
    expect(shaConhecido(cliente,'n','app',2)).toBe('bbb');
    expect(chaves.prs('n','app','sha',1)).not.toEqual(chaves.prs('n','app','sha',2));
});
