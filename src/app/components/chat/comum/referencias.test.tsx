import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
vi.mock('@/services/client',()=>({api:{post:vi.fn()}}));
vi.mock('@/lib/supabaseClient',()=>({supabase:{auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'u'},access_token:'jwt'}}}))}}}));
import {api} from '@/services/client';
import {supabase} from '@/lib/supabaseClient';
import {resolverReferencias,invalidarReferencias,rotaDaEntidade,type Candidato} from '@/services/entidades';
import {detectarReferencias} from './referencias';
import {LinkDaReferencia} from './SmartLinks';
import ReactMarkdown from 'react-markdown';
import {pluginReferencias} from './referencias';
import {chaveReferencia} from '@/services/entidades';
const id='9cc2b098-c921-4960-b76c-d89d5b5fa7bd';
const candidato:Candidato={tipo:'decision',id,project_id:'p',rotulo:'Decisão',codigo:'ADR-0053',board_id:null};
beforeEach(()=>{vi.mocked(api.post).mockReset();invalidarReferencias();});
describe('referências autorizadas',()=>{
  it('renderiza texto e href de URI autorizada com rota e rótulo, e preserva URI desconhecida',()=>{
    const card={...candidato,tipo:'card' as const,board_id:'b',codigo:'SNA-RD-195',rotulo:'Chat comum'};
    render(<ReactMarkdown remarkPlugins={[pluginReferencias('p',new Set([chaveReferencia({id,tipo:'card'})]))]} components={{a:({href,children})=>href?.startsWith('#snaps-ref:')?<LinkDaReferencia candidatos={[card]} projectId="p">{children}</LinkDaReferencia>:<a href={href}>{children}</a>}}>{`snaps://card/${id}\n\n[abrir](snaps://card/${id})\n\n[desconhecida](snaps://pagina/desconhecida)`}</ReactMarkdown>);
    expect(screen.getAllByRole('link',{name:'SNA-RD-195 · Chat comum'})).toHaveLength(2);
    for(const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('href',`/project/p/board/b?card=${id}`);
    expect(screen.getByText('snaps://pagina/desconhecida')).toBeInTheDocument();
    expect(detectarReferencias('snaps://pagina/board [board](snaps://pagina/board)')).toEqual([]);
  });
  it('lê URI de entidade completa em texto e href, sem código ou HTML',()=>{
    expect(detectarReferencias(`snaps://card/${id} [abrir](snaps://card/${id}) snaps://pagina/board \`snaps://snap/${id}\` <b>snaps://plan/${id}</b>`)).toEqual([{id,tipo:'card'}]);
  });
  it('usa código e rótulo autorizado para UUID de entidade',()=>{
    render(<LinkDaReferencia candidatos={[candidato]} projectId="p">{id}</LinkDaReferencia>);
    expect(screen.getByRole('link')).toHaveTextContent('ADR-0053 · Decisão');
  });
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
