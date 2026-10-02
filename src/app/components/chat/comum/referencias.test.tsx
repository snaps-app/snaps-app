import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
vi.mock('@/services/client',()=>({api:{post:vi.fn()}}));
vi.mock('@/lib/supabaseClient',()=>({supabase:{auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'u'},access_token:'jwt'}}}))}}}));
import {api} from '@/services/client';
import {supabase} from '@/lib/supabaseClient';
import {resolverReferencias,invalidarReferencias,rotaDaEntidade,type Candidato} from '@/services/entidades';
import {detectarReferencias} from './referencias';
import {LinkDaReferencia} from './SmartLinks';
const id='9cc2b098-c921-4960-b76c-d89d5b5fa7bd';
const candidato:Candidato={tipo:'decision',id,project_id:'p',rotulo:'Decisão',codigo:'ADR-0053',board_id:null};
beforeEach(()=>{vi.mocked(api.post).mockReset();invalidarReferencias();});
describe('referências autorizadas',()=>{
  it('detecta códigos e UUID completo, exclui código e links existentes',()=>{
    expect(detectarReferencias('ADR-0053 SNA-RD-195 '+id+' `ADR-0054`\n\n```\nADR-0055\n```\n[ADR-0056](https://example.com)\n9cc2b098 snaps://settings')).toEqual([{code:'ADR-0053'},{code:'SNA-RD-195'},{id}]);
  });
  it('divide 51 em lotes até 50, deduplica e isola cache por projeto e sessão',async()=>{
    vi.mocked(api.post).mockImplementation(async(_url,body:any)=>({data:{resultados:body.refs.map((_:unknown,indice:number)=>({indice,candidatos:[candidato]}))}}));
    const refs=Array.from({length:51},(_,i)=>({code:`ADR-${i}`}));
    expect((await resolverReferencias('p',refs)).size).toBe(51);
    expect(vi.mocked(api.post).mock.calls.map(c=>(c[1] as any).refs.length)).toEqual([50,1]);
    await resolverReferencias('p',[refs[0],refs[0]]);
    expect(api.post).toHaveBeenCalledTimes(2);
    await resolverReferencias('outro',[refs[0]]);
    expect(api.post).toHaveBeenCalledTimes(3);
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({data:{session:{user:{id:'outro'},access_token:'outro-jwt'}}} as any);
    await resolverReferencias('p',[refs[0]]);
    expect(api.post).toHaveBeenCalledTimes(4);
  });
  it('não escolhe silenciosamente entre candidatos e constrói rota com IDs autorizados',()=>{
    render(<LinkDaReferencia candidatos={[candidato,{...candidato,id:'outro',rotulo:'Outra'}]} projectId="p">ADR-0053</LinkDaReferencia>);
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:/ADR-0053/}));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(rotaDaEntidade({...candidato,tipo:'card',board_id:'board'},'p')).toBe(`/project/p/board/board?card=${id}`);
  });
});
