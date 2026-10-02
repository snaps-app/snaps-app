import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {acompanharReferencias,resolverReferencias,rotaDaEntidade,type Candidato} from '@/services/entidades';
import {supabase} from '@/lib/supabaseClient';
import {detectarReferencias} from './referencias';

export function useSmartLinks(content:string,projectId:string|undefined,finalizado:boolean) {
  const [candidatos,setCandidatos]=useState<Map<string,Candidato[]>>(new Map());
  const [revisao,setRevisao]=useState(0);
  useEffect(()=>acompanharReferencias(()=>{setCandidatos(new Map());setRevisao(n=>n+1);}),[]);
  useEffect(()=>{
    if(!projectId) return;
    const sub=supabase.auth.onAuthStateChange?.(()=>{setCandidatos(new Map());setRevisao(n=>n+1);});
    return ()=>sub?.data.subscription.unsubscribe();
  },[projectId]);
  useEffect(()=>{
    setCandidatos(new Map());
    if(!projectId||!finalizado) return;
    const refs=detectarReferencias(content);
    if(!refs.length) return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      void resolverReferencias(projectId,refs,controller.signal).then(setCandidatos).catch(()=>{});
    },150);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[content,projectId,finalizado,revisao]);
  const autorizadas=useMemo(()=>new Set([...candidatos].filter(([,lista])=>lista.length>0).map(([key])=>key)),[candidatos]);
  return {candidatos,autorizadas};
}
export function LinkDaReferencia({candidatos,projectId,children}:{candidatos:Candidato[];projectId:string;children:ReactNode}) {
  const [aberto,setAberto]=useState(false);
  if(candidatos.length===1) return <a href={rotaDaEntidade(candidatos[0],projectId)}>{children}</a>;
  if(candidatos.length===0) return <>{children}</>;
  return <span>
    <button type="button" aria-haspopup="dialog" onClick={()=>setAberto(true)} className="underline text-orange-300">{children} · escolher</button>
    {aberto&&<span role="dialog" aria-label="Escolher entidade" className="block rounded-xl bg-neutral-900 border border-white/20 p-4">
      <span className="block">Este código identifica mais de uma entidade:</span>
      {candidatos.map(c=><a key={`${c.tipo}:${c.id}`} className="block my-2" href={rotaDaEntidade(c,projectId)}>
        {c.codigo??c.id} · {c.rotulo} · {c.tipo} · {c.project_id??'global'}
      </a>)}
      <button type="button" onClick={()=>setAberto(false)}>Fechar seleção</button>
    </span>}
  </span>;
}
