import {act,renderHook,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
vi.mock('@/services/chats',()=>({createMessage:vi.fn(async()=>({})),streamChat:vi.fn()}));
import {createMessage,streamChat} from '@/services/chats';
import {useConversa} from './useConversa';

beforeEach(()=>{vi.mocked(createMessage).mockReset();vi.mocked(createMessage).mockResolvedValue({} as any);vi.mocked(streamChat).mockReset();});
describe('ciclo compartilhado',()=>{
  it('trava antes do await e salva exatamente uma resposta vazia com erro',async()=>{
    let liberar!:(v:string)=>void;
    const obterChat=()=>new Promise<string>(resolve=>{liberar=resolve;});
    vi.mocked(streamChat).mockImplementation(async(_p,evento)=>{evento({type:'error',code:'sem_chave',message:'Sem chave'});});
    const {result}=renderHook(()=>useConversa({projectId:'p',chave:'p/c',perfil:'project_chat',superficie:'chat',obterChat}));
    let primeiro!:Promise<boolean>;
    act(()=>{primeiro=result.current.enviar('Oi');});
    expect(await result.current.enviar('Duplicada')).toBe(false);
    await act(async()=>{liberar('c');await primeiro;});
    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(createMessage).toHaveBeenLastCalledWith('c','','assistant',expect.objectContaining({v:1,erro:'sem_chave'}));
  });
  it('cancela a rede e impede eventos antigos de entrar na nova conversa',async()=>{
    let emitir!:(e:any)=>void;
    vi.mocked(streamChat).mockImplementation((_p,aoEvento,signal)=>new Promise((resolve,reject)=>{
      emitir=aoEvento;signal?.addEventListener('abort',()=>reject(new DOMException('Abort','AbortError')),{once:true});
    }));
    const {result,rerender}=renderHook(({chave})=>useConversa({projectId:'p',chave,perfil:'project_chat',superficie:'chat',obterChat:async()=> 'c'}),{initialProps:{chave:'p/c'}});
    let envio!:Promise<boolean>;
    act(()=>{envio=result.current.enviar('Oi');});
    await waitFor(()=>expect(streamChat).toHaveBeenCalledOnce());
    act(()=>{emitir({type:'token',content:'Parcial'});});
    rerender({chave:'p/nova'});
    act(()=>result.current.setMessages([]));
    await act(async()=>{await envio;emitir({type:'token',content:'Atrasado'});});
    expect(result.current.messages).toEqual([]);
    expect(createMessage).toHaveBeenLastCalledWith('c','Parcial','assistant',expect.objectContaining({incompleto:true,terminal:'interrompido'}));
  });
});

it('repete somente o save e troca o ID temporário pelo ID persistido',async()=>{
  vi.mocked(createMessage).mockResolvedValueOnce({} as any).mockRejectedValueOnce(new Error('save indisponível')).mockResolvedValueOnce({id:'assistant-salvo'} as any);
  vi.mocked(streamChat).mockImplementation(async(_p,emitir)=>{emitir({type:'token',content:'Resposta'});});
  const {result}=renderHook(()=>useConversa({projectId:'p',chave:'p/c',perfil:'project_chat',superficie:'chat',obterChat:async()=> 'c'}));
  await act(async()=>{expect(await result.current.enviar('Oi')).toBe(false);});
  expect(result.current.persistenciaPendente).toBe(true);
  expect(await result.current.enviar('Outra')).toBe(false);
  await act(async()=>{await result.current.repetirPersistencia();});
  expect(streamChat).toHaveBeenCalledOnce();
  expect(createMessage).toHaveBeenCalledTimes(3);
  expect(result.current.persistenciaPendente).toBe(false);
  expect(result.current.messages.find(m=>m.role==='assistant')).toMatchObject({id:'assistant-salvo',content:'Resposta'});
});
