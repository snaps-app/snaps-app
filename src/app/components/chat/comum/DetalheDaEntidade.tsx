import {useEffect,useState} from 'react';
import {Spinner} from '@/app/components/ui/spinner';
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
import {StrategyConfiguratorModal} from '@/app/components/modals/strategy-configurator-modal';
import type {Card,Snap,Epic,Sprint} from '@/services/types';

type ContextoCard={columns:{id:string;title:string}[];epics:Epic[];sprints:Sprint[];repoNames:string[]};
type ResumoBoard={id:string;project_id:string;columns?:ContextoCard['columns']};

export const PARAMETROS_DE_DETALHE=['card','plan','adr','decision','doc','sprint','snap'] as const;
type Parametro=typeof PARAMETROS_DE_DETALHE[number];
const ENDPOINTS:Record<Parametro,string>={card:'cards',plan:'plans',adr:'decisions',decision:'decisions',doc:'governance-docs',sprint:'sprints',snap:'snaps'};
const ROTULOS:Record<Parametro,string>={card:'Card',plan:'Plano',adr:'ADR',decision:'ADR',doc:'Documento',sprint:'Sprint',snap:'Snap'};
const CAMPOS:Record<Parametro,string[]>={card:['description'],plan:['content'],adr:['context','decision','consequences'],decision:['context','decision','consequences'],
  doc:['content'],sprint:['objective','start_date','end_date','tag','retrospective'],snap:['content']};
const NOMES:Record<string,string>={description:'Descrição',content:'Conteúdo',context:'Contexto',decision:'Decisão',consequences:'Consequências',objective:'Objetivo',
  start_date:'Início',end_date:'Fim',tag:'Tag',retrospective:'Retrospectiva'};

export function DetalheDaEntidade() {
  const location=useLocation();
  const [params]=useSearchParams();
  const projectId=location.pathname.match(/^\/project\/([^/]+)/)?.[1]??params.get('project');
  const role=useProjectRole();
  // O layout já autorizou este projeto. Fora dele (Memory), carregar em paralelo.
  if(projectId&&role.projectId!==projectId) return <ProjectRoleProvider key={projectId} projectId={projectId}><ConteudoDoDetalhe/></ProjectRoleProvider>;
  return <ConteudoDoDetalhe/>;
}

function CarregamentoDoDetalhe({fechar,tipo}:{fechar:()=>void;tipo:string}) {
  return <Dialog open onOpenChange={aberto=>{if(!aberto) fechar();}}><DialogContent className="w-auto max-w-xs flex flex-col items-center gap-4">
    <DialogTitle className="sr-only">Abrindo {tipo}</DialogTitle>
    <DialogDescription className="sr-only">Aguarde a leitura atualizada e a verificação de acesso.</DialogDescription>
    <div role="status" className="flex items-center gap-3"><span aria-hidden="true"><Spinner color="border-current"/></span><span>Abrindo {tipo}…</span></div>
    <button type="button" onClick={fechar}>Cancelar</button>
  </DialogContent></Dialog>;
}

function ConteudoDoDetalhe() {
  const [params,setParams]=useSearchParams();
  const location=useLocation();
  const tipo=PARAMETROS_DE_DETALHE.find(p=>params.has(p)&&!(p==='sprint'&&/^\/project\/[^/]+\/board(?:\/|$)/.test(location.pathname)));
  const id=tipo?params.get(tipo):null;
  const projectId=location.pathname.match(/^\/project\/([^/]+)/)?.[1]??params.get('project');
  const boardId=location.pathname.match(/^\/project\/[^/]+\/board\/([^/]+)/)?.[1];
  const chave=`${tipo}:${id}:${projectId}:${boardId}`;
  const [resultado,setResultado]=useState<{chave:string;data:Record<string,unknown>;contexto?:ContextoCard}|null>(null);
  const dado=resultado?.chave===chave?resultado.data:null;
  const setDado=(data:Record<string,unknown>|null,contexto?:ContextoCard)=>setResultado(data?{chave,data,contexto}:null);
  const [erro,setErro]=useState<string|null>(null);
  const [tentativa,setTentativa]=useState(0);
  const role=useProjectRole();
  useEffect(()=>{
    // Revalidar o provider existente em paralelo à entidade, sem remontá-lo.
    if(id&&(tipo==='card'||tipo==='snap')&&!role.loading) role.refresh?.();
  },[tipo,id,projectId,tentativa,role.refresh]);
  useEffect(()=>{
    setDado(null);setErro(null);
    if(!tipo||!id) return;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {setErro('Recurso não encontrado ou fora do seu escopo.');return;}
    const controller=new AbortController();
    const deadline=window.setTimeout(()=>{
      controller.abort();
      setErro('A abertura demorou mais que o esperado. Tente novamente.');
    },15000);
    const options={signal:controller.signal,timeout:15000};
    const leitura=api.get<Record<string,unknown>>(`/${ENDPOINTS[tipo]}/${id}`,{...options,params:tipo==='doc'&&projectId?{context_project_id:projectId}:undefined});
    // BoardSummary não serializa os cards. Ambas as leituras começam juntas.
    const boards=tipo==='card'&&projectId?api.get<ResumoBoard[]>(`/projects/${projectId}/boards`,options):Promise.resolve(null);
    const contexto=tipo==='card'&&projectId?Promise.all([
      api.get<Epic[]>(`/projects/${projectId}/epics/`,options),
      api.get<Sprint[]>(`/projects/${projectId}/sprints/`,options),
      api.get<{repo_names:string}>(`/projects/${projectId}/github-config`,options).catch(error=>{
        if(error?.response?.status===404) return {data:{repo_names:''}};
        throw error;
      }),
    ]):Promise.resolve(null);
    void Promise.all([leitura,boards,contexto]).then(([{data},resumo,catalogos])=>{
      if(controller.signal.aborted) return;
      window.clearTimeout(deadline);
      if(projectId&&data.project_id&&data.project_id!==projectId) {setErro('Recurso não encontrado ou fora do seu escopo.');return;}
      if(tipo==='card') {
        if(typeof data.board_id!=='string'||!projectId||(boardId&&data.board_id!==boardId)||
          !resumo?.data.some(board=>board.id===data.board_id&&board.project_id===projectId)) {
          setErro('Recurso não encontrado ou fora do seu escopo.');return;
        }
      }
      setDado(data,catalogos?{
        columns:resumo?.data.find(board=>board.id===data.board_id)?.columns??[],
        epics:catalogos[0].data,sprints:catalogos[1].data,
        repoNames:catalogos[2].data.repo_names.split(',').map(name=>name.trim()).filter(Boolean),
      }:undefined);
    }).catch(error=>{window.clearTimeout(deadline);if(!controller.signal.aborted) setErro(error?.code==='ECONNABORTED'||error?.code==='ETIMEDOUT'
      ?'A abertura demorou mais que o esperado. Tente novamente.'
      :'Recurso não encontrado ou fora do seu escopo.');});
    return ()=>{window.clearTimeout(deadline);controller.abort();};
  },[tipo,id,projectId,boardId,tentativa]);
  const fechar=()=>{
    const nova=new URLSearchParams(params);
    if(tipo) nova.delete(tipo);
    setParams(nova); // deixa filtros e navegação de histórico intactos
  };
  if(!tipo) return null;
  if(dado&&(tipo==='card'||tipo==='snap')&&projectId) return <ModalDaEntidade key={chave} tipo={tipo} dado={dado} fechar={fechar} projectId={projectId} contexto={resultado?.contexto}/>;
  if(!dado&&!erro&&(tipo==='card'||tipo==='snap')) return <CarregamentoDoDetalhe fechar={fechar} tipo={ROTULOS[tipo].toLowerCase()}/>;
  return <Dialog open onOpenChange={aberto=>{if(!aberto) fechar();}}>
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-neutral-950 text-white border-white/20">
      <DialogTitle>{dado?String(dado.title??dado.name??ROTULOS[tipo]):ROTULOS[tipo]}</DialogTitle>
      <DialogDescription>{dado?String(dado.code??dado.tag??ROTULOS[tipo]):'Detalhes da entidade'}</DialogDescription>
      {erro?<><p role="alert">{erro}</p><button type="button" onClick={()=>setTentativa(n=>n+1)}>Tentar novamente</button></>:!dado?<p role="status">Carregando detalhes…</p>:<>
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

function ModalDaEntidade({tipo,dado,fechar,projectId,contexto}:{tipo:'card'|'snap';dado:Record<string,unknown>;fechar:()=>void;projectId:string;contexto?:ContextoCard}) {
  const {can,loading}=useProjectRole();
  const [executando,setExecutando]=useState(false);
  const [editando,setEditando]=useState(false);
  const [erro,setErro]=useState<string|null>(null);
  const avisar=()=>window.dispatchEvent(new CustomEvent('snaps:entity-updated',{detail:{tipo,id:dado.id,projectId,boardId:dado.board_id}}));
  if(loading) return <CarregamentoDoDetalhe fechar={fechar} tipo={ROTULOS[tipo].toLowerCase()}/>;
  if(tipo==='card') return <>{!executando&&<CardModal {...contexto} onAiExecute={()=>{if(can('write')) setExecutando(true);}} isOpen initialData={dado as unknown as Card} initialDataIsFresh readOnly={!can('write')} canDelete={can('delete')} onClose={fechar}
    onSave={async data=>{if(!can('write')) throw new Error('Sem permissão');await updateCard(String(dado.id),data);avisar();}}
    onDelete={()=>{avisar();}}/>}
    {executando&&can('write')&&<StrategyConfiguratorModal isOpen projectId={projectId} onClose={()=>setExecutando(false)}
      initialSprintId={(dado as unknown as Card).sprint_id??null} initialCardIds={[String(dado.id)]} cards={[dado as unknown as Card]}/>}
    {erro&&<p role="alert">{erro}</p>}</>;
  const snap=dado as unknown as Snap;
  if(editando&&can('write')) return <><SnapModal key={snap.id} isOpen onClose={()=>setEditando(false)} initialData={{title:snap.name??'',content:snap.content??'',tags:snap.snadds?.labels??[]}}
    onSave={async data=>{if(!can('write')) throw new Error('Sem permissão');await updateSnap(snap.id,{name:data.title,content:data.content,snadds:{...snap.snadds,labels:data.tags}});avisar();fechar();}}/>{erro&&<p role="alert">{erro}</p>}</>;
  return <><SnapDetailModal isOpen snap={snap} onClose={fechar} onEdit={can('write')?()=>setEditando(true):undefined}
    onDelete={can('delete')?async()=>{if(!can('delete')||!window.confirm('Excluir este snap?')) return;try {await deleteSnap(snap.id,projectId);avisar();fechar();}catch {setErro('Não foi possível excluir o snap.');}}:undefined}/>{erro&&<p role="alert">{erro}</p>}</>;
}
