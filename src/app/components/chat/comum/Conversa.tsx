import {useEffect,useState,isValidElement,type ReactNode} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {Message} from '@/services/types';
import {lerRegistro} from './turno';
import {rotuloDoPerfil} from '../perfis';
import {pluginReferencias} from './referencias';
import {useSmartLinks,LinkDaReferencia,LinkInterno} from './SmartLinks';

export type ItemDaConversa<T>={type:'message';message:Message}|{type:'extra';id:string;evento:T};
export function ConversaComum<T>({items,projectId,renderItemExtra,header,footer}:{items:ItemDaConversa<T>[];projectId?:string;
  renderItemExtra?:(evento:T)=>ReactNode;header?:ReactNode;footer?:ReactNode}) {
  return <div className="space-y-4">{header}{items.map(item=>item.type==='message'?
    <MensagemComum key={item.message.id} message={item.message} projectId={projectId}/>:
    <div key={item.id}>{renderItemExtra?.(item.evento)}</div>)}{footer}</div>;
}

export function MensagemComum({message,projectId}: {message:Message;projectId?:string}) {
  const registro=lerRegistro(message.tool_calls,message.content);
  const finalizado=!!registro.terminal||!!registro.recebeu_done||!message.id.startsWith('assistant-');
  const {candidatos,autorizadas}=useSmartLinks(message.role==='assistant'?message.content:'',projectId,finalizado);
  return <article className={`rounded-xl border border-white/10 p-4 text-sm ${message.role==='user'?'ml-8 bg-white/5':'bg-orange-500/5'}`} aria-label={message.role==='user'?'Sua mensagem':'Resposta do Neuron'}>
    {message.role==='assistant'&&registro.perfil&&<p className="text-xs text-white/60 mb-2" data-testid="perfil-da-resposta">{rotuloDoPerfil(registro.perfil)??registro.perfil}</p>}
    {registro.passos.some(p=>p.type==='tool')&&<p className="text-xs" role="status">{registro.passos.filter(p=>p.type==='tool').length} {registro.passos.filter(p=>p.type==='tool').length===1?'ferramenta':'ferramentas'}</p>}
    {registro.passos.map((p,i)=>p.type==='tool'?
      <PassoDaFerramenta key={`${message.id}:${p.id??i}`} tool={p.tool} status={p.status} resumo={p.resumo} finalizado={finalizado}/>:p.type==='thinking'?
      <details key={i} className="my-2 text-white/60"><summary className="cursor-pointer">Pensamento</summary><p className="whitespace-pre-wrap">{p.content}</p></details>:
      <div key={i} className="prose prose-invert prose-sm max-w-none overflow-x-auto max-h-[500px] overflow-y-auto" style={{color:'var(--snaps-text-primary)'}}>
        <ReactMarkdown remarkPlugins={projectId?[remarkGfm,pluginReferencias(projectId,autorizadas)]:[remarkGfm]} skipHtml
          components={{a:({href,children})=>{
            if(projectId&&href?.startsWith('#snaps-ref:')) {
              const key=decodeURIComponent(href.slice(11));
              return <LinkDaReferencia candidatos={candidatos.get(key)??[]} projectId={projectId}>{children}</LinkDaReferencia>;
            }
            return href?.startsWith('/')?<LinkInterno href={href}>{children}</LinkInterno>:<a href={href} target={href&&/^https?:\/\//i.test(href)?'_blank':undefined} rel="noopener noreferrer nofollow">{children}</a>;
          },img:({src,alt})=>src&&/^https?:\/\//i.test(src)?<a href={src} target="_blank" rel="noopener noreferrer nofollow">{alt||'Abrir imagem'}</a>:<span>{alt}</span>,pre:({children})=><BlocoDeCodigo>{children}</BlocoDeCodigo>}}>{p.content}</ReactMarkdown>
      </div>)}
    {typeof registro.mensagem_erro==='string'&&<p role="alert" className="mt-2 text-red-300">{registro.mensagem_erro}</p>}
    {registro.incompleto&&<p role="status" className="mt-2 text-amber-300">Resposta incompleta{registro.terminal==='interrompido'?' · turno interrompido':''}.</p>}
  </article>;
}

function PassoDaFerramenta({tool,status,resumo,finalizado}:{tool:string;status:string;resumo:string;finalizado:boolean}) {
  const [aberto,setAberto]=useState(!finalizado);
  useEffect(()=>{setAberto(!finalizado);},[finalizado]);
  return <details data-tool-step open={aberto} onToggle={e=>setAberto(e.currentTarget.open)} className="my-2 rounded border border-white/10 p-2">
    <summary className="cursor-pointer">{tool} · {status==='running'?'Executando…':status==='ok'?'Concluída':status==='error'?'Erro':'Interrompida'}</summary>
    <p className="whitespace-pre-wrap mt-2">{resumo}</p>
  </details>;
}
function BlocoDeCodigo({children}:{children:ReactNode}) {
  const [copiado,setCopiado]=useState(false);
  const codigo=isValidElement<{children?:ReactNode}>(children)?String(children.props.children??''):String(children??'');
  return <div><button type="button" aria-label="Copiar código" onClick={()=>{void navigator.clipboard.writeText(codigo).then(()=>setCopiado(true)).catch(()=>setCopiado(false));}}>{copiado?'Copiado':'Copiar código'}</button><pre className="max-h-[500px] overflow-auto">{children}</pre></div>;
}

interface ComposerProps {
  value:string;onChange:(value:string)=>void;onSend:()=>void;onCancel?:()=>void;busy:boolean;
  label?:string;sendLabel?:string;placeholder?:string;disabled?:boolean;extra?:ReactNode;
}
export function Composer({value,onChange,onSend,onCancel,busy,label='Mensagem ao Neuron',sendLabel='Enviar mensagem',placeholder='Escreva sua mensagem…',disabled,extra}:ComposerProps) {
  return <form className="p-4 border-t border-white/10" onSubmit={e=>{e.preventDefault();if(!busy&&!disabled&&value.trim()) onSend();}}>
    <textarea aria-label={label} placeholder={placeholder} rows={3} value={value} disabled={disabled}
      onChange={e=>onChange(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();if(!busy&&!disabled&&value.trim()) onSend();}}}
      className="w-full resize-y rounded-xl bg-white/5 border border-white/15 p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400" />
    <div className="flex gap-3 justify-end mt-2">{extra}{busy?
      <button type="button" aria-label="Interromper resposta" onClick={onCancel} className="rounded-lg border px-3 py-2">Interromper</button>:
      <button type="submit" aria-label={sendLabel} disabled={disabled||!value.trim()} className="rounded-lg bg-orange-600 px-3 py-2 disabled:opacity-50">Enviar</button>}
    </div>
  </form>;
}
