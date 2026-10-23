import { useCockpitPlans } from '@/app/components/execution/useCockpitPlans';
import type { AgentTaskExecution } from '@/services/types';
import { act,renderHook } from '@testing-library/react';
import { beforeEach,expect,it,vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { novoClienteDeTeste } from '@/test/comConsulta';
vi.mock('@/services/plans',()=>({updatePlan:vi.fn(async()=>({id:'p',content_revision:2})),approvePlan:vi.fn(),deletePlan:vi.fn()}));
vi.mock('@/services/timeLogs',()=>({startExecutionSession:vi.fn(),endExecutionSession:vi.fn(async()=>{}),encerrarSessaoKeepalive:vi.fn()}));
vi.mock('@/services/resumoDoNo',()=>({aplicarSessaoAberta:vi.fn(),aplicarSessaoFechada:vi.fn()}));
import { startExecutionSession,endExecutionSession,encerrarSessaoKeepalive } from '@/services/timeLogs';
import { aplicarSessaoAberta } from '@/services/resumoDoNo';
import { SessaoDoNoProvider,useSessaoDoNo } from './useSessaoDoNo';
beforeEach(()=>{vi.clearAllMocks();vi.mocked(startExecutionSession).mockResolvedValue({session_id:'s',started_at:'2026-10-22T12:00:00Z'});});
function montar() {
    let id='n1';const cliente=novoClienteDeTeste();
    const hook=renderHook(()=>useSessaoDoNo(),{wrapper:({children}:{children:ReactNode})=><QueryClientProvider client={cliente}><SessaoDoNoProvider noId={id} habilitada>{children}</SessaoDoNoProvider></QueryClientProvider>});
    return {...hook,trocar:(novo:string)=>{id=novo;hook.rerender();}};
}
it('selecionar nós não abre sessão; Play abre',async()=>{
    const h=montar();h.trocar('n2');h.trocar('n3');expect(startExecutionSession).not.toHaveBeenCalled();
    await act(async()=>{await h.result.current.play();});expect(startExecutionSession).toHaveBeenCalledWith('n3');
});
it('abertura que resolve depois da desmontagem é encerrada',async()=>{
    let resolver!:(s:{session_id:string;started_at:string})=>void;
    vi.mocked(startExecutionSession).mockReturnValue(new Promise(r=>{resolver=r;}));
    const h=montar();act(()=>{void h.result.current.play();});h.unmount();
    await act(async()=>{resolver({session_id:'tardia',started_at:'2026-10-22T12:00:00Z'});await Promise.resolve();});
    expect(endExecutionSession).toHaveBeenCalledWith('n1','tardia');expect(aplicarSessaoAberta).not.toHaveBeenCalled();
});
it('duas escritas concorrentes abrem só uma sessão',async()=>{
    const h=montar();const a=h.result.current.capturarEscrita('n1'),b=h.result.current.capturarEscrita('n1');
    await act(async()=>{await Promise.all([a(),b()]);});
    expect(startExecutionSession).toHaveBeenCalledTimes(1);expect(aplicarSessaoAberta).toHaveBeenCalledTimes(1);
});
it('escrita tardia não abre sessão no nó antigo nem no sucessor',async()=>{
    const h=montar();const sucesso=h.result.current.capturarEscrita('n1');h.trocar('n2');
    await act(async()=>{await sucesso();});expect(startExecutionSession).not.toHaveBeenCalled();
});
it('pagehide fecha por keepalive',async()=>{
    const h=montar();await act(async()=>{await h.result.current.play();});
    act(()=>window.dispatchEvent(new Event('pagehide')));expect(encerrarSessaoKeepalive).toHaveBeenCalledWith('n1','s');
});
it('falha do timer não transforma escrita concluída em falha',async()=>{
    vi.mocked(startExecutionSession).mockRejectedValue(new Error('offline'));
    const h=montar();await act(async()=>{await expect(h.result.current.capturarEscrita('n1')()).resolves.toBeUndefined();});
    expect(h.result.current.erro).toContain('sessão de tempo');
});

it('editar plano como primeira escrita abre sessão, sem abrir ao entrar no editor',async()=>{
    const cliente=novoClienteDeTeste();const execution={id:'n1',context_data:{plans:[{id:'p',title:'Plano',content:'c',content_revision:1}]}} as AgentTaskExecution;
    const h=renderHook(()=>useCockpitPlans(execution,vi.fn(),false,null),{wrapper:({children}:{children:ReactNode})=><QueryClientProvider client={cliente}><SessaoDoNoProvider noId="n1" habilitada>{children}</SessaoDoNoProvider></QueryClientProvider>});
    act(()=>h.result.current.handleEditPlan({id:'p',title:'Plano',content:'c'}));
    expect(startExecutionSession).not.toHaveBeenCalled();
    await act(async()=>{await h.result.current.handleSavePlan();});
    expect(startExecutionSession).toHaveBeenCalledTimes(1);
});
