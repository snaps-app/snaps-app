import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
vi.mock('@/services/client',()=>({api:{get:vi.fn(),patch:vi.fn(),delete:vi.fn()}}));
const role=vi.hoisted(()=>({write:true}));
vi.mock('@/contexts/project-role-context',()=>({useProjectRole:()=>({projectId:'p',loading:false,can:()=>role.write}),ProjectRoleProvider:({children}:any)=>children}));
vi.mock('@/app/components/modals/execution-wizard-modal',()=>({ExecutionWizardModal:()=>null}));
vi.mock('@/app/components/modals/strategy-configurator-modal',()=>({StrategyConfiguratorModal:({projectId,initialCardIds,initialSprintId}:any)=><output data-testid="strategy">{projectId}:{initialCardIds[0]}:{initialSprintId}</output>}));
vi.mock('@/services/storage',()=>({uploadAttachment:vi.fn()}));
vi.mock('@/services/tasks',()=>({createTask:vi.fn(),updateTask:vi.fn(),deleteTask:vi.fn()}));
import {api} from '@/services/client';
import {uploadAttachment} from '@/services/storage';
import {createTask,updateTask,deleteTask} from '@/services/tasks';
import {DetalheDaEntidade} from './DetalheDaEntidade';
const id='9cc2b098-c921-4960-b76c-d89d5b5fa7bd';
const card={id,board_id:'b',title:'Card completo',description:'texto',status:'doing',priority:'Medium',card_type:'feature',epic_id:'e',sprint_id:'s',repo_name:'app',labels:[],tasks:[],bdd_scenarios:[]};
function setup(){return render(<MemoryRouter initialEntries={[`/project/p/board/b?card=${id}`]}><DetalheDaEntidade/></MemoryRouter>);}
beforeEach(()=>{
  vi.clearAllMocks();role.write=true;
  vi.mocked(api.get).mockImplementation(async(url)=>({data:
    url===`/cards/${id}`?card:
    url==='/projects/p/boards'?[{id:'b',project_id:'p',columns:[{id:'doing',title:'Em execução'},{id:'review',title:'Revisão'}]}]:
    url.endsWith('/epics/')?[{id:'e',name:'Epic do projeto'}]:
    url.endsWith('/sprints/')?[{id:'s',name:'Sprint do projeto'}]:{repo_names:'app, api'}}));
  vi.mocked(api.patch).mockResolvedValue({data:card});
});
describe('controles reais do card aberto pela URL',()=>{
  it('carrega opções, mantém status do board e salva campos, tags, BDD e anexo',async()=>{
    const {container}=setup();
    await screen.findByRole('option',{name:'Epic do projeto'});
    expect(screen.getByRole('option',{name:'Sprint do projeto'})).toBeInTheDocument();
    const selects=screen.getAllByRole('combobox');
    expect(selects[0]).toHaveValue('doing');expect(selects[3]).toHaveValue('e');expect(selects[4]).toHaveValue('s');
    fireEvent.change(selects[0],{target:{value:'review'}});
    fireEvent.change(selects[1],{target:{value:'High'}});
    fireEvent.change(selects[5],{target:{value:'api'}});
    fireEvent.change(screen.getByPlaceholderText('Card Title'),{target:{value:'Editado'}});
    fireEvent.change(screen.getByPlaceholderText('Add tag'),{target:{value:'regressão'}});
    fireEvent.keyDown(screen.getByPlaceholderText('Add tag'),{key:'Enter'});
    fireEvent.click(screen.getByRole('button',{name:'Add Scenario'}));
    fireEvent.change(screen.getByPlaceholderText('Scenario Title'),{target:{value:'Cenário criado'}});
    fireEvent.change(screen.getByPlaceholderText('...'),{target:{value:'Dado um card'}});
    fireEvent.click(screen.getByRole('button',{name:'+ Add Step'}));
    vi.mocked(uploadAttachment).mockResolvedValue({url:'https://example.test/a.pdf'} as any);
    fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File(['pdf'],'a.pdf',{type:'application/pdf'})]}});
    await waitFor(()=>expect(screen.getByRole('link',{name:'a.pdf'})).toBeInTheDocument());
    fireEvent.change(container.querySelector('input[type=date]')!,{target:{value:'2026-10-10'}});
    fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
    await waitFor(()=>expect(api.patch).toHaveBeenCalledWith(`/cards/${id}`,expect.objectContaining({title:'Editado',status:'review',priority:'High',epic_id:'e',sprint_id:'s',repo_name:'api',labels:['regressão'],description:'texto\n\n[a.pdf](https://example.test/a.pdf)',due_date:'2026-10-10T12:00:00.000Z',bdd_scenarios:[expect.objectContaining({title:'Cenário criado',steps:[{type:'Given',content:'Dado um card'},{type:'And',content:''}]})]})));
  });
  it('remove vínculos e prazo enviando null em vez de omitir os campos',async()=>{
    const {container}=setup();await screen.findByRole('option',{name:'Epic do projeto'});
    for(const select of screen.getAllByRole('combobox').slice(3)) fireEvent.change(select,{target:{value:''}});
    fireEvent.change(container.querySelector('input[type=date]')!,{target:{value:''}});
    fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
    await waitFor(()=>expect(api.patch).toHaveBeenCalledWith(`/cards/${id}`,expect.objectContaining({epic_id:null,sprint_id:null,repo_name:null,due_date:null})));
  });
  it('cria, conclui e remove tarefas e mantém o configurador de IA original',async()=>{
    vi.mocked(createTask).mockResolvedValue({id:'t',title:'Tarefa nova',completed:false} as any);
    vi.mocked(updateTask).mockResolvedValue({id:'t',title:'Tarefa nova',completed:true} as any);
    const {container}=setup();await screen.findByRole('option',{name:'Epic do projeto'});
    fireEvent.change(screen.getByPlaceholderText('Add a task...'),{target:{value:'Tarefa nova'}});
    fireEvent.keyDown(screen.getByPlaceholderText('Add a task...'),{key:'Enter'});
    const title=await screen.findByText('Tarefa nova');
    const buttons=title.parentElement!.querySelectorAll('button');fireEvent.click(buttons[0]);
    await waitFor(()=>expect(updateTask).toHaveBeenCalledWith('t',{completed:true}));
    await waitFor(()=>expect(screen.getByText('1/1 Completed')).toBeInTheDocument());
    fireEvent.click(buttons[1]);await waitFor(()=>expect(deleteTask).toHaveBeenCalledWith('t'));
    fireEvent.click(screen.getByRole('button',{name:'AI Execute Task'}));
    expect(screen.getByTestId('strategy')).toHaveTextContent(`p:${id}:s`);
    expect(container.querySelector('input[type=date]')).toBeNull();
  });
  it('falha de catálogo não abre formulário com opções vazias e permite retry',async()=>{
    const original=vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation((url,options)=>url.endsWith('/epics/')?Promise.reject({response:{status:500}}):original(url,options));
    setup();await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Save Changes'})).toBeNull();
    vi.mocked(api.get).mockImplementation(original);fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
    await screen.findByRole('option',{name:'Epic do projeto'});
  });
  it('ausência real de GitHub é permitida e viewer continua sem escrita',async()=>{
    role.write=false;const original=vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation((url,options)=>url.endsWith('/github-config')?Promise.reject({response:{status:404}}):original(url,options));
    const {container}=setup();await screen.findByRole('option',{name:'Epic do projeto'});
    for(const field of container.querySelectorAll('input,textarea,select')) expect(field).toBeDisabled();
    expect(screen.queryByRole('button',{name:'Save Changes'})).toBeNull();expect(api.patch).not.toHaveBeenCalled();
  });
});
