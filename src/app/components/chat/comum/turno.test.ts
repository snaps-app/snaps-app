import {describe,it,expect} from 'vitest';
import {iniciarTurno,reduzirTurno,terminarTurno,lerRegistro} from './turno';

describe('registro puro do turno', () => {
  it('intercala texto e tools, correlaciona chamadas repetidas por ID', () => {
    let t=iniciarTurno('board_planner');
    for(const e of [
      {type:'token',content:'Antes'},
      {type:'tool_start',id:'a',tool:'save',resumo:'Executando'},
      {type:'tool_start',id:'b',tool:'save',resumo:'Executando'},
      {type:'tool_end',id:'b',tool:'save',resumo:'Pronto',ok:true},
      {type:'token',content:'Depois'},
    ] as const) t=reduzirTurno(t,e);
    const fim=terminarTurno(t,'interrompido');
    expect(fim.content).toBe('AntesDepois');
    expect(fim.registro.passos.map(p=>p.type)).toEqual(['text','tool','tool','text']);
    expect(fim.registro.passos[1]).toMatchObject({id:'a',status:'interrompido'});
    expect(fim.registro.passos[2]).toMatchObject({id:'b',status:'ok'});
    expect(t.registro.passos[1]).toMatchObject({status:'running'});
  });
  it('limita thinking a mil caracteres e persiste vazio com erro', () => {
    let t=reduzirTurno(iniciarTurno('project_chat'),{type:'thinking',content:'a'.repeat(2000)});
    const fim=terminarTurno(t);
    expect(fim.content).toBe('');
    expect(fim.registro.passos[0]).toMatchObject({content:'a'.repeat(1000)});
    expect(fim.registro.erro).toBe('sem_resposta');
    expect(fim.registro.incompleto).toBe(true);
  });
  it('preserva erro e guarda sem reclassificar como vazio, EOF parcial é incompleto', () => {
    let t=reduzirTurno(iniciarTurno('project_chat'),{type:'error',code:'sem_chave',message:'Sem chave'});
    expect(terminarTurno(t).registro.erro).toBe('sem_chave');
    t=reduzirTurno(iniciarTurno('project_chat'),{type:'token',content:'Parcial'});
    expect(terminarTurno(t).registro.incompleto).toBe(true);
  });
  it('lê v1, lista legada, null e texto sem reescrever o histórico', () => {
    const r=iniciarTurno('project_chat').registro;
    expect(lerRegistro(r,'texto').v).toBe(1);
    expect(lerRegistro([{perfil:'board_planner',snaps_referenciados:['s']}],'texto')).toMatchObject({perfil:'board_planner',snaps_referenciados:['s'],passos:[{type:'text',content:'texto'}]});
    expect(lerRegistro(null,'texto').passos).toEqual([{type:'text',content:'texto'}]);
  });
});

it('deduplica start e end com ID sem fundir chamadas legadas',()=>{
  let t=iniciarTurno('project_chat');
  const start={type:'tool_start' as const,id:'tool-1',tool:'buscar',resumo:'Buscando'};
  t=reduzirTurno(t,start);t=reduzirTurno(t,start);
  const end={type:'tool_end' as const,id:'tool-1',tool:'buscar',ok:true,resumo:'Encontrado'};
  t=reduzirTurno(t,end);t=reduzirTurno(t,end);t=reduzirTurno(t,start);
  expect(t.registro.passos).toHaveLength(1);
  expect(t.registro.passos[0]).toMatchObject({status:'ok',resumo:'Encontrado'});
  t=reduzirTurno(t,{type:'tool_start',tool:'buscar',resumo:'Legada'});
  t=reduzirTurno(t,{type:'tool_start',tool:'buscar',resumo:'Legada'});
  expect(t.registro.passos).toHaveLength(3);
});
