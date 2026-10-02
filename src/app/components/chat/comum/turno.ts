import type {EventoNeuron} from '@/services/neuronEvents';
import type {RegistroDoTurnoV1} from '@/services/types';

export interface Turno {content:string; registro:RegistroDoTurnoV1; encerrado:boolean}
export function iniciarTurno(perfil:string):Turno {
  return {content:'',registro:{v:1,perfil,passos:[],snaps_referenciados:[],incompleto:false},encerrado:false};
}
export function reduzirTurno(t:Turno,e:EventoNeuron):Turno {
  if(t.encerrado) return t;
  const registro:RegistroDoTurnoV1={...t.registro,passos:t.registro.passos.map(p=>({...p}))};
  const novo={...t,registro};
  switch(e.type) {
    case 'token':
    case 'thinking': {
      const type=e.type==='token'?'text':'thinking';
      const usado=registro.passos.reduce((n,p)=>n+(p.type==='thinking'?p.content.length:0),0);
      const content=type==='thinking'?e.content.slice(0,Math.max(0,1000-usado)):e.content;
      if(content) {
        const ultimo=registro.passos[registro.passos.length-1];
        if(ultimo?.type===type) ultimo.content+=content;
        else registro.passos.push({type,content});
      }
      if(type==='text') novo.content+=content;
      break;
    }
    case 'tool_start':
      registro.passos.push({type:'tool',id:e.id,tool:e.tool,resumo:e.resumo.slice(0,300),status:'running'});
      break;
    case 'tool_end': {
      // Sem ID, mantém a ordem de chegada das chamadas legadas.
      const passo=registro.passos.find(p=>p.type==='tool'&&p.status==='running'&&(e.id?p.id===e.id:p.tool===e.tool));
      if(passo?.type==='tool') {passo.status=e.ok?'ok':'error';passo.resumo=e.resumo.slice(0,300);}
      break;
    }
    case 'snaps_referenced':
      registro.snaps_referenciados=[...new Set([...registro.snaps_referenciados,...e.snaps.map(s=>s.id)])];
      break;
    case 'guardrail_tripped':
      registro.guarda=e.guarda;registro.incompleto=true;break;
    case 'error':
      registro.erro=e.code;registro.mensagem_erro=e.message;registro.incompleto=true;break;
    case 'done':
      registro.perfil=e.perfil;registro.incompleto ||= e.incompleto;
      registro.uso=e.uso;registro.custo_usd=e.custo_usd;registro.preco_estimado=e.preco_estimado;
      registro.recebeu_done=true;
      return terminarTurno(novo,'done');
  }
  return novo;
}
export function terminarTurno(t:Turno,motivo='eof'):Turno {
  if(t.encerrado) return t;
  const registro:RegistroDoTurnoV1={...t.registro,passos:t.registro.passos.map(p=>p.type==='tool'&&p.status==='running'?{...p,status:'interrompido' as const}:{...p})};
  registro.incompleto ||= motivo!=='done';
  registro.terminal=motivo;
  if(!t.content.trim()&&!registro.passos.some(p=>p.type==='tool'&&p.status==='ok')&&!registro.erro&&!registro.guarda&&motivo!=='interrompido') {
    registro.erro='sem_resposta';
    registro.mensagem_erro='O Neuron terminou sem uma resposta. Tente novamente.';
    registro.incompleto=true;
  }
  return {...t,registro,encerrado:true};
}
export function lerRegistro(valor:unknown,content:string):RegistroDoTurnoV1 {
  const candidato=valor&&typeof valor==='object'&&!Array.isArray(valor)?valor as Record<string,unknown>:null;
  if(candidato?.v===1&&Array.isArray(candidato.passos)) {
    const passos=candidato.passos.filter(p=>p&&typeof p==='object'&&(
      ((p.type==='text'||p.type==='thinking')&&typeof p.content==='string')||
      (p.type==='tool'&&typeof p.tool==='string'&&typeof p.resumo==='string'&&['running','ok','error','interrompido'].includes(p.status))));
    return {...candidato,passos,perfil:typeof candidato.perfil==='string'?candidato.perfil:'',
      v:1,incompleto:!!candidato.incompleto,snaps_referenciados:strings(candidato.snaps_referenciados)} as RegistroDoTurnoV1;
  }
  const antigo=Array.isArray(valor)?valor.find(p=>p&&typeof p==='object'&&'perfil' in p):null;
  return {v:1,perfil:typeof antigo?.perfil==='string'?antigo.perfil:'',snaps_referenciados:strings(antigo?.snaps_referenciados),
    incompleto:false,passos:content?[{type:'text',content}]:[]};
}
function strings(valor:unknown):string[] {return Array.isArray(valor)?valor.filter((v):v is string=>typeof v==='string'):[];}
