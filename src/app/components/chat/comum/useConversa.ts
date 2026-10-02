import {useEffect,useRef,useState} from 'react';
import {createMessage,streamChat,type PerfilNeuron,type SuperficieNeuron} from '@/services/chats';
import type {Message} from '@/services/types';
import type {EventoNeuron} from '@/services/neuronEvents';
import {iniciarTurno,reduzirTurno,terminarTurno,type Turno} from './turno';

interface Opcoes {
  projectId?:string; chave:string; perfil:PerfilNeuron; superficie:SuperficieNeuron;
  obterChat:(texto:string)=>Promise<string>;
  aoEvento?:(evento:EventoNeuron)=>void;
}
export function useConversa(opcoes:Opcoes) {
  const [messages,setMessages]=useState<Message[]>([]);
  const [ocupado,setOcupado]=useState(false);
  const [erro,setErro]=useState<string|null>(null);
  const geracao=useRef(0);
  const ativo=useRef<{controller:AbortController;geracao:number}|null>(null);
  const cancelar=()=>ativo.current?.controller.abort();
  useEffect(()=>{
    geracao.current+=1;
    setOcupado(false);
    setErro(null);
    return ()=>{geracao.current+=1;ativo.current?.controller.abort();};
  },[opcoes.chave]);

  const enviar=async(texto:string):Promise<boolean>=>{
    if(!texto.trim()||!opcoes.projectId||ativo.current) return false;
    const controller=new AbortController();
    const numero=geracao.current;
    const dono={controller,geracao:numero};
    ativo.current=dono; // trava síncrona, inclusive no mesmo frame
    setOcupado(true);setErro(null);
    const id=crypto.randomUUID();
    let chatId:string|undefined;
    let turno:Turno=iniciarTurno(opcoes.perfil);
    let usuarioGravado=false;
    const valido=()=>geracao.current===numero;
    const mostrar=()=>{
      if(!valido()) return;
      const resposta:Message={id:`assistant-${id}`,chat_id:chatId??'temp',role:'assistant',content:turno.content,
        created_at:new Date().toISOString(),tool_calls:turno.registro};
      setMessages(prev=>{const existe=prev.some(m=>m.id===resposta.id);
        return existe?prev.map(m=>m.id===resposta.id?resposta:m):[...prev,resposta];});
    };
    setMessages(prev=>[...prev,{id:`user-${id}`,chat_id:'temp',role:'user',content:texto,created_at:new Date().toISOString()}]);
    try {
      chatId=await opcoes.obterChat(texto);
      controller.signal.throwIfAborted();
      await createMessage(chatId,texto,'user');
      usuarioGravado=true;
      controller.signal.throwIfAborted();
      await streamChat({projectId:opcoes.projectId,chatId,perfil:opcoes.perfil,superficie:opcoes.superficie,message:texto},evento=>{
        if(controller.signal.aborted) return;
        turno=reduzirTurno(turno,evento);
        mostrar();
        if(valido()) opcoes.aoEvento?.(evento);
      },controller.signal);
    } catch(falha) {
      if(controller.signal.aborted) turno=terminarTurno(turno,'interrompido');
      else turno=reduzirTurno(turno,{type:'error',code:'interno',message:falha instanceof Error?falha.message:'Não foi possível falar com o Neuron agora.'});
    } finally {
      turno=terminarTurno(turno,controller.signal.aborted?'interrompido':'eof');
      mostrar();
      try {
        if(chatId&&usuarioGravado) await createMessage(chatId,turno.content,'assistant',turno.registro);
      } catch {
        if(valido()) setErro('Não foi possível guardar a resposta. O conteúdo permanece nesta conversa.');
      } finally {
        if(ativo.current===dono) ativo.current=null;
        if(valido()) setOcupado(false);
      }
    }
    return true;
  };
  return {messages,setMessages,ocupado,erro,enviar,cancelar};
}
