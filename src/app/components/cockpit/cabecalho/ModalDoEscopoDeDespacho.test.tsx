import { fireEvent,screen,waitFor } from '@testing-library/react';
import { beforeEach,expect,it,vi } from 'vitest';
import { renderComConsulta } from '@/test/comConsulta';
import type { AgentTaskExecution } from '@/services/types';
vi.mock('@/services/agentExecutions',()=>({setDispatchScope:vi.fn(),getAgentExecution:vi.fn()}));
vi.mock('@/services/resumoDoNo',()=>({getResumoDoNo:vi.fn(async()=>({condicoes:[]}))}));
import { getResumoDoNo } from '@/services/resumoDoNo';
import {setDispatchScope,getAgentExecution} from '@/services/agentExecutions';
import {ModalDoEscopoDeDespacho} from './ModalDoEscopoDeDespacho';
const no=()=>({id:'n',project_id:'p',root_id:'r',status:'in_progress',phase:'plan_review',lock_version:3,despacho:{candidatos:[{id:'a',title:'A',status:'selected',approval:'current'},{id:'b',title:'B',status:'approved',approval:'current'}],padrao_ids:['a'],efetivo_ids:['a'],explicito:true,erro:null,lock_version:3}} as AgentTaskExecution);
beforeEach(()=>vi.clearAllMocks());
it('seleção igual não grava nem pede motivo; Cancelar não avança',async()=>{
    const confirmar=vi.fn(),cancelar=vi.fn();renderComConsulta(<ModalDoEscopoDeDespacho execution={no()} admin avancar onConfirmar={confirmar} onCancelar={cancelar}/>);
    expect(screen.queryByRole('textbox')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Confirmar e avançar'}));
    await waitFor(()=>expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({lock_version:3})));
    expect(setDispatchScope).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(cancelar).toHaveBeenCalled();
});
it('escopo herdado reduzido para todos exige motivo e usa a revisão retornada sem SSE',async()=>{
    const confirmar=vi.fn();vi.mocked(setDispatchScope).mockResolvedValue({...no(),lock_version:4});vi.mocked(getAgentExecution).mockResolvedValue({...no(),lock_version:4});
    renderComConsulta(<ModalDoEscopoDeDespacho execution={no()} admin avancar onConfirmar={confirmar} onCancelar={vi.fn()}/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'B'}));expect(screen.getByRole('button',{name:'Confirmar e avançar'})).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox',{name:'Motivo do escopo'}),{target:{value:'incluir B'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar e avançar'}));
    await waitFor(()=>expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({lock_version:4})));
    expect(setDispatchScope).toHaveBeenCalledWith('n',['a','b'],'incluir B',3);
});
it('não-admin lê a seleção e não altera o escopo',()=>{
    renderComConsulta(<ModalDoEscopoDeDespacho execution={no()} admin={false} avancar onConfirmar={vi.fn()} onCancelar={vi.fn()}/>);
    expect(screen.getByRole('checkbox',{name:'A'})).toBeDisabled();expect(screen.getByRole('checkbox',{name:'B'})).toBeDisabled();
});
it('falha de gravação não avança',async()=>{
    vi.mocked(setDispatchScope).mockRejectedValue(new Error('offline'));const confirmar=vi.fn();
    renderComConsulta(<ModalDoEscopoDeDespacho execution={no()} admin avancar onConfirmar={confirmar} onCancelar={vi.fn()}/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'B'}));fireEvent.change(screen.getByRole('textbox',{name:'Motivo do escopo'}),{target:{value:'motivo'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar e avançar'}));await screen.findByRole('alert');expect(confirmar).not.toHaveBeenCalled();
});

it('conflito pede reconferencia sem repetir mutacao nem avancar', async()=>{
    vi.mocked(setDispatchScope).mockRejectedValue({response:{status:409}});const confirmar=vi.fn();
    renderComConsulta(<ModalDoEscopoDeDespacho execution={no()} admin avancar onConfirmar={confirmar} onCancelar={vi.fn()}/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'B'}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'incluir'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar e avançar'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('reconfirme');expect(confirmar).not.toHaveBeenCalled();expect(setDispatchScope).toHaveBeenCalledTimes(1);
});
it('reavalia gates apos salvar escopo e impede avanco com falta',async()=>{
    vi.mocked(setDispatchScope).mockResolvedValue({...no(),lock_version:4});vi.mocked(getAgentExecution).mockResolvedValue({...no(),lock_version:4});
    vi.mocked(getResumoDoNo).mockResolvedValueOnce({condicoes:[{chave:'tactical_plans_approved',estado:'falta',motivo:'aprovacao desatualizada'}]} as Awaited<ReturnType<typeof getResumoDoNo>>);
    const confirmar=vi.fn();renderComConsulta(<ModalDoEscopoDeDespacho execution={no()} admin avancar onConfirmar={confirmar} onCancelar={vi.fn()}/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'B'}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'incluir'}});fireEvent.click(screen.getByRole('button',{name:'Confirmar e avançar'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('faltam');expect(confirmar).not.toHaveBeenCalled();
});
