import {api} from './client';
import {supabase} from '@/lib/supabaseClient';

export type TipoEntidade='card'|'execution'|'plan'|'sprint'|'snap'|'board'|'decision'|'governance_doc'|'project';
export interface Candidato {tipo:TipoEntidade;id:string;project_id:string|null;rotulo:string;codigo:string|null;board_id:string|null}
export type RefEntidade={code:string}|{id:string;tipo?:TipoEntidade};
const TIPOS=new Set<string>(['card','execution','plan','sprint','snap','board','decision','governance_doc','project']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function analisarUriSnaps(uri:string):{ref?:RefEntidade;pagina?:string}|null {
  const match=/^snaps:\/\/([a-z_]+)(?:\/([^/]+))?$/i.exec(uri);
  if(!match) return null;
  const tipo=match[1].toLowerCase(),valor=match[2];
  if(TIPOS.has(tipo)&&valor&&UUID.test(valor)) return {ref:{tipo:tipo as TipoEntidade,id:valor.toLowerCase()}};
  if(tipo==='pagina'&&valor&&/^[a-z_]+$/i.test(valor)) return {pagina:valor.toLowerCase()};
  return valor?null:{pagina:tipo};
}
export const chaveReferencia=(r:RefEntidade)=>'code' in r?`code:${r.code.toUpperCase()}`:`${r.tipo??'id'}:${r.id.toLowerCase()}`;
let geracao=0;
const cache=new Map<string,{ate:number;candidatos:Candidato[]}>();
const assinantes=new Set<()=>void>();
let observaSessao=false;
export function acompanharReferencias(aoInvalidar:()=>void){
  if(!observaSessao&&supabase.auth.onAuthStateChange) {
    supabase.auth.onAuthStateChange(()=>invalidarReferencias());
    observaSessao=true;
  }
  assinantes.add(aoInvalidar);return ()=>{assinantes.delete(aoInvalidar);};
}
export function invalidarReferencias(){geracao++;cache.clear();assinantes.forEach(fn=>fn());}
export async function resolverReferencias(projectId:string,refs:RefEntidade[],signal?:AbortSignal):Promise<Map<string,Candidato[]>> {
  const {data}=await supabase.auth.getSession();
  if(!data.session) {invalidarReferencias();return new Map();}
  const identidade=`${data.session.user.id}:${data.session.access_token}:${projectId}:${geracao}`;
  const epoch=geracao;
  const resultados=new Map<string,Candidato[]>();
  const unicas=[...new Map(refs.map(r=>[chaveReferencia(r),r])).values()];
  const faltam:RefEntidade[]=[];
  for(const ref of unicas) {
    const key=chaveReferencia(ref);const entry=cache.get(`${identidade}:${key}`);
    if(entry&&entry.ate>Date.now()) resultados.set(key,entry.candidatos);else faltam.push(ref);
  }
  for(let inicio=0;inicio<faltam.length;inicio+=50) {
    const lote=faltam.slice(inicio,inicio+50);
    const {data:resposta}=await api.post<{resultados:{indice:number;candidatos:Candidato[]}[]}>('/api/entidades/resolver',{project_id:projectId,refs:lote},{signal});
    if(epoch!==geracao||signal?.aborted) return new Map();
    for(const item of resposta.resultados) {
      if(!lote[item.indice]) continue;
      const key=chaveReferencia(lote[item.indice]);
      resultados.set(key,item.candidatos);
      cache.set(`${identidade}:${key}`,{ate:Date.now()+15000,candidatos:item.candidatos});
    }
  }
  return resultados;
}
export function rotaDaEntidade(c:Candidato,contexto:string):string {
  const p=c.project_id??contexto;
  const base=`/project/${encodeURIComponent(p)}`;
  const id=encodeURIComponent(c.id);
  switch(c.tipo) {
    case 'card':return `${base}/board${c.board_id?'/'+encodeURIComponent(c.board_id):''}?card=${id}`;
    case 'execution':return `${base}/execution/${id}`;
    case 'plan':return `${base}/plans?plan=${id}`;
    case 'sprint':return `${base}/board?sprint=${id}`;
    case 'decision':return `${base}/decisions?adr=${id}`;
    case 'governance_doc':return `/governance?tab=docs&doc=${id}&project=${encodeURIComponent(p)}`;
    case 'snap':return `/memory?snap=${id}&project=${encodeURIComponent(p)}`;
    case 'board':return `${base}/board/${id}`;
    case 'project':return base;
  }
}
export function rotaDaPagina(pagina:string,projectId:string):string|null {
  const base=`/project/${encodeURIComponent(projectId)}`;
  const paginas:Record<string,string>={settings:`${base}/settings`,sprints:`${base}/board`,board:`${base}/board`,plans:`${base}/plans`,decisions:`${base}/decisions`,memory:`/memory?project=${encodeURIComponent(projectId)}`,governance:'/governance'};
  return paginas[pagina]??null;
}
