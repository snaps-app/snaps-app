import {useEffect,useState} from 'react';
import {useLocation,useSearchParams} from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {api} from '@/services/client';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/app/components/ui/dialog';
import {ProjectRoleProvider,useProjectRole} from '@/contexts/project-role-context';
import {CardModal} from '@/app/components/modals/card-modal';
import {SnapDetailModal} from '@/app/components/modals/snap-detail-modal';
import {SnapModal} from '@/app/components/modals/snap-modal';
import {updateCard} from '@/services/cards';
import {updateSnap,deleteSnap} from '@/services/snaps';
import type {Card,Snap} from '@/services/types';

export const PARAMETROS_DE_DETALHE=['card','plan','adr','decision','doc','sprint','snap'] as const;
type Parametro=typeof PARAMETROS_DE_DETALHE[number];
const ENDPOINTS:Record<Parametro,string>={card:'cards',plan:'plans',adr:'decisions',decision:'decisions',doc:'governance-docs',sprint:'sprints',snap:'snaps'};
const ROTULOS:Record<Parametro,string>={card:'Card',plan:'Plano',adr:'ADR',decision:'ADR',doc:'Documento',sprint:'Sprint',snap:'Snap'};
const CAMPOS:Record<Parametro,string[]>={card:['description'],plan:['content'],adr:['context','decision','consequences'],decision:['context','decision','consequences'],
  doc:['content'],sprint:['objective','start_date','end_date','tag','retrospective'],snap:['content']};
const NOMES:Record<string,string>={description:'Descrição',content:'Conteúdo',context:'Contexto',decision:'Decisão',consequences:'Consequências',objective:'Objetivo',
  start_date:'Início',end_date:'Fim',tag:'Tag',retrospective:'Retrospectiva'};

export function DetalheDaEntidade() {
  const [params,setParams]=useSearchParams();
  const location=useLocation();
  const tipo=PARAMETROS_DE_DETALHE.find(p=>params.has(p)&&!(p==='sprint'&&/^\/project\/[^/]+\/board(?:\/|$)/.test(location.pathname)));
  const id=tipo?params.get(tipo):null;
  const projectId=location.pathname.match(/^\/project\/([^/]+)/)?.[1]??params.get('project');
  const boardId=location.pathname.match(/^\/project\/[^/]+\/board\/([^/]+)/)?.[1];
  const chave=`${tipo}:${id}:${projectId}`;
  const [resultado,setResultado]=useState<{chave:string;data:Record<string,unknown>}|null>(null);
  const dado=resultado?.chave===chave?resultado.data:null;
  const setDado=(data:Record<string,unknown>|null)=>setResultado(data?{chave,data}:null);
  const [erro,setErro]=useState<string|null>(null);
  useEffect(()=>{
    setDado(null);setErro(null);
    if(!tipo||!id) return;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {setErro('Recurso não encontrado ou fora do seu escopo.');return;}
    const controller=new AbortController();
    void api.get<Record<string,unknown>>(`/${ENDPOINTS[tipo]}/${id}`,{signal:controller.signal,params:tipo==='doc'&&projectId?{context_project_id:projectId}:undefined})
      .then(async({data})=>{
        if(controller.signal.aborted) return;
        if(projectId&&data.project_id&&data.project_id!==projectId) {setErro('Recurso não encontrado ou fora do seu escopo.');return;}
        if(tipo==='card') {
          if(typeof data.board_id!=='string'||!projectId||(boardId&&data.board_id!==boardId)) {setErro('Recurso não encontrado ou fora do seu escopo.');return;}
          const {data:board}=await api.get<{project_id:string}>(`/boards/${data.board_id}`,{signal:controller.signal});
          if(controller.signal.aborted) return;
          if(board.project_id!==projectId) {setErro('Recurso não encontrado ou fora do seu escopo.');return;}
        }
        setDado(data);
      }).catch(()=>{if(!controller.signal.aborted) setErro('Recurso não encontrado ou fora do seu escopo.');});
    return ()=>controller.abort();
  },[tipo,id,projectId,boardId]);
  const fechar=()=>{
    const nova=new URLSearchParams(params);
    if(tipo) nova.delete(tipo);
    setParams(nova); // deixa filtros e navegação de histórico intactos
  };
  if(!tipo) return null;
  if(dado&&(tipo==='card'||tipo==='snap')&&projectId) return <ProjectRoleProvider key={`${tipo}:${id}:${projectId}`} projectId={projectId}>
    <ModalDaEntidade key={chave} tipo={tipo} dado={dado} fechar={fechar} projectId={projectId}/>
  </ProjectRoleProvider>;
  return <Dialog open onOpenChange={aberto=>{if(!aberto) fechar();}}>
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-neutral-950 text-white border-white/20">
      <DialogTitle>{dado?String(dado.title??dado.name??ROTULOS[tipo]):ROTULOS[tipo]}</DialogTitle>
      <DialogDescription>{dado?String(dado.code??dado.tag??ROTULOS[tipo]):'Detalhes da entidade'}</DialogDescription>
      {erro?<p role="alert">{erro}</p>:!dado?<p role="status">Carregando detalhes…</p>:<>
        {typeof dado.status==='string'&&<p>Estado: {dado.status}</p>}
        {CAMPOS[tipo].map(campo=>typeof dado[campo]==='string'&&dado[campo]?<section key={campo}>
          <h3 className="font-semibold mb-2">{NOMES[campo]}</h3>
          <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{String(dado[campo])}</ReactMarkdown></div>
        </section>:null)}
      </>}
      <button type="button" className="rounded-lg border px-3 py-2 mt-3" onClick={fechar}>Fechar detalhes</button>
    </DialogContent>
  </Dialog>;
}

function ModalDaEntidade({tipo,dado,fechar,projectId}:{tipo:'card'|'snap';dado:Record<string,unknown>;fechar:()=>void;projectId:string}) {
  const {can,loading}=useProjectRole();
  const [editando,setEditando]=useState(false);
  const [erro,setErro]=useState<string|null>(null);
  const avisar=()=>window.dispatchEvent(new CustomEvent('snaps:entity-updated',{detail:{tipo,id:dado.id,projectId,boardId:dado.board_id}}));
  if(loading) return <Dialog open onOpenChange={aberto=>{if(!aberto) fechar();}}><DialogContent><DialogTitle>Detalhes</DialogTitle><DialogDescription>Verificando permissões…</DialogDescription><p role="status">Carregando detalhes…</p></DialogContent></Dialog>;
  if(tipo==='card') return <><CardModal isOpen initialData={dado as unknown as Card} initialDataIsFresh readOnly={!can('write')} canDelete={can('delete')} onClose={fechar}
    onSave={async data=>{if(!can('write')) throw new Error('Sem permissão');await updateCard(String(dado.id),data);avisar();}}
    onDelete={()=>{avisar();}}/>{erro&&<p role="alert">{erro}</p>}</>;
  const snap=dado as unknown as Snap;
  if(editando&&can('write')) return <><SnapModal key={snap.id} isOpen onClose={()=>setEditando(false)} initialData={{title:snap.name??'',content:snap.content??'',tags:snap.snadds?.labels??[]}}
    onSave={async data=>{if(!can('write')) throw new Error('Sem permissão');await updateSnap(snap.id,{name:data.title,content:data.content,snadds:{...snap.snadds,labels:data.tags}});avisar();fechar();}}/>{erro&&<p role="alert">{erro}</p>}</>;
  return <><SnapDetailModal isOpen snap={snap} onClose={fechar} onEdit={can('write')?()=>setEditando(true):undefined}
    onDelete={can('delete')?async()=>{if(!can('delete')||!window.confirm('Excluir este snap?')) return;try {await deleteSnap(snap.id,projectId);avisar();fechar();}catch {setErro('Não foi possível excluir o snap.');}}:undefined}/>{erro&&<p role="alert">{erro}</p>}</>;
}
