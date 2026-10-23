import { fireEvent,screen,waitFor,within } from '@testing-library/react';
import { beforeEach,expect,it,vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderComConsulta } from '@/test/comConsulta';
const mutacoes=vi.hoisted(()=>({rollback:vi.fn(),avancar:vi.fn(),override:vi.fn()}));
vi.mock('../superficie/useAcoesDoNo',()=>({useAcoesDoNo:()=>({podeAgir:true,ehAdmin:true,pode:()=>true,emAndamento:null,acoes:mutacoes})}));
import { CabecalhoDoNo,type CabecalhoDoNoProps } from './CabecalhoDoNo';
const props=()=>({raiz:{rootId:'r',projectId:'p',projectName:'Projeto',sprintIds:[],sprintTags:[],alvo:[],titulo:'Raiz'},execucao:{id:'n',project_id:'p',root_id:'r',phase:'assurance',status:'in_progress',lock_version:1,sprint_ids:[]},identidade:{id:'n',fase:'assurance',rotuloDaFase:'Assurance',tp:null,tentativa:1,cor:'var(--snaps-accent-blue)'},terminal:false,descartado:false,workflow:{phases:[{key:'assurance',on_failure:'micro_planning'}]},snapshot:null,resumo:{pendencias:[],condicoes:[],sessoes:{encerradas_segundos:0,ativas_desde:[]}},cards:[],filtroDeCard:null,onFiltrarCard:vi.fn(),recolhido:true,onAlternarRecolhido:vi.fn(),onNovoNo:vi.fn()} as unknown as CabecalhoDoNoProps);
beforeEach(()=>vi.clearAllMocks());
it('rollback com o cabeçalho recolhido mostra a confirmação; cancelar não chama rollbackAgentExecution',async()=>{
    const p=props();renderComConsulta(<MemoryRouter><CabecalhoDoNo {...p}/></MemoryRouter>);
    fireEvent.click(screen.getByRole('button',{name:'Rollback'}));
    const dialogo=screen.getByRole('alertdialog',{name:'Confirmar rollback'});
    fireEvent.click(within(dialogo).getByRole('button',{name:'Cancelar'}));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mutacoes.rollback).not.toHaveBeenCalled();
});
it('confirmação é fechada ao trocar de nó',async()=>{
    const p=props();const view=renderComConsulta(<MemoryRouter><CabecalhoDoNo {...p}/></MemoryRouter>);
    fireEvent.click(screen.getByRole('button',{name:'Rollback'}));expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    view.rerender(<MemoryRouter><CabecalhoDoNo {...p} execucao={{...p.execucao,id:'outro'}}/></MemoryRouter>);
    await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull());
});
it('gates estão na linha das ações e a recusa pode ser dispensada',async()=>{
    const p={...props(),recolhido:false,snapshot:{gates:{advance_conditions:{error:'Recusa do motor'}}}} as unknown as CabecalhoDoNoProps;
    renderComConsulta(<MemoryRouter><CabecalhoDoNo {...p}/></MemoryRouter>);
    expect(screen.getByTestId('linha-de-acoes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Dispensar'}));expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName('Voltar');
});
