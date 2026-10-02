import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {acompanharReferencias,resolverReferencias,rotaDaEntidade,type Candidato} from '@/services/entidades';
import {Link,useInRouterContext} from 'react-router-dom';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/app/components/ui/dialog';
import {detectarReferencias} from './referencias';

export function useSmartLinks(content:string,projectId:string|undefined,finalizado:boolean) {
  const [candidatos,setCandidatos]=useState<Map<string,Candidato[]>>(new Map());
  const [revisao,setRevisao]=useState(0);
  useEffect(()=>acompanharReferencias(()=>{setCandidatos(new Map());setRevisao(n=>n+1);}),[]);
  useEffect(()=>{
    setCandidatos(new Map());
    if(!projectId||!finalizado) return;
    const refs=detectarReferencias(content);
    if(!refs.length) return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      void resolverReferencias(projectId,refs,controller.signal).then(resultado=>{if(!controller.signal.aborted) setCandidatos(resultado);}).catch(()=>{});
    },150);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[content,projectId,finalizado,revisao]);
  const autorizadas=useMemo(()=>new Set([...candidatos].filter(([,lista])=>lista.length>0).map(([key])=>key)),[candidatos]);
  return {candidatos,autorizadas};
}
export function LinkDaReferencia({candidatos,projectId,children}:{candidatos:Candidato[];projectId:string;children:ReactNode}) {
  const [aberto,setAberto]=useState(false);
  if(candidatos.length===1) return <LinkInterno href={rotaDaEntidade(candidatos[0],projectId)}>{children}</LinkInterno>;
  if(candidatos.length===0) return <>{children}</>;
  return <span>
    <button type="button" aria-haspopup="dialog" onClick={()=>setAberto(true)} className="underline text-orange-300">{children} · escolher</button>
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="bg-neutral-950 text-white">
      <DialogTitle>Escolher entidade</DialogTitle>
      <DialogDescription>Este código identifica mais de uma entidade:</DialogDescription>
      {candidatos.map(c=><LinkInterno key={`${c.tipo}:${c.id}`} href={rotaDaEntidade(c,projectId)}>
        {c.codigo??c.id} · {c.rotulo} · {c.tipo} · {c.project_id??'global'}
      </LinkInterno>)}
      <button type="button" onClick={()=>setAberto(false)}>Fechar seleção</button>
    </DialogContent></Dialog>
  </span>;
}
export function LinkInterno({href,children}:{href:string;children:ReactNode}) {
  const noRouter=useInRouterContext();
  return noRouter?<Link to={href} className="text-orange-300 underline">{children}</Link>:<a href={href}>{children}</a>;
}
