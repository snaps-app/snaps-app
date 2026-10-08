import {describe,it,expect,vi} from 'vitest';
vi.mock('./client',()=>({api:{}}));
vi.mock('@/lib/supabaseClient',()=>({supabase:{}}));
import {rotaDaEntidade,rotaDaPagina,type Candidato} from './entidades';
describe('rotas existentes das referências',()=>{
  const candidato:Candidato={tipo:'snap',id:'s',project_id:'p',rotulo:'Snap',codigo:null,board_id:null};
  it('abre memória global com contexto e ADR pelo parâmetro aceito',()=>{
    expect(rotaDaEntidade(candidato,'p')).toBe('/memory?snap=s&project=p');
    expect(rotaDaPagina('memory','p')).toBe('/memory?project=p');
    expect(rotaDaEntidade({...candidato,tipo:'decision'},'p')).toBe('/project/p/decisions?adr=s');
  });
});
