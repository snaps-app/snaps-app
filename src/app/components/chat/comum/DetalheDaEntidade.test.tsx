import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation,useNavigate} from 'react-router-dom';
vi.mock('@/services/client',()=>({api:{get:vi.fn()}}));
vi.mock('@/contexts/project-role-context',()=>({ProjectRoleProvider:({children}:any)=><>{children}</>,useProjectRole:()=>({loading:false,can:()=>false})}));
vi.mock('@/app/components/modals/card-modal',()=>({CardModal:({initialData,readOnly,onClose}:any)=><div role="dialog"><h2>{initialData.title}</h2><span>{readOnly?'Somente leitura':'Editável'}</span><button onClick={onClose}>Fechar detalhes</button></div>}));
vi.mock('@/app/components/modals/snap-detail-modal',()=>({SnapDetailModal:({snap,onClose,onEdit,onDelete}:any)=><div role="dialog"><h2>{snap.name}</h2><button onClick={onClose}>Fechar detalhes</button>{onEdit&&<button>Editar</button>}{onDelete&&<button>Excluir</button>}</div>}));
import {api} from '@/services/client';
import {DetalheDaEntidade} from './DetalheDaEntidade';
const id='9cc2b098-c921-4960-b76c-d89d5b5fa7bd';
function Tela(){const location=useLocation();const navigate=useNavigate();return <>
  <output data-testid="url">{location.pathname+location.search}</output>
  <button onClick={()=>navigate(-1)}>Voltar</button><button onClick={()=>navigate(1)}>Avançar</button>
  <DetalheDaEntidade/>
</>;}
beforeEach(()=>vi.mocked(api.get).mockReset());
describe('detalhes na URL',()=>{
  it.each([['plan','plans'],['adr','decisions'],['decision','decisions'],['card','cards'],['doc','governance-docs']])('consome %s por leitura individual sem expor edição',async(tipo,endpoint)=>{
    vi.mocked(api.get).mockImplementation(async(url)=>({data:url==='/boards/b'?{id:'b',project_id:'p'}:{id,title:'Título autorizado',name:'Título autorizado',content:'**Conteúdo**',project_id:'p',board_id:'b'}}));
    render(<MemoryRouter initialEntries={[`/project/p/board?${tipo}=${id}&filtro=abertos`]}><Tela/></MemoryRouter>);
    expect(await screen.findByRole('heading',{name:'Título autorizado'})).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(`/${endpoint}/${id}`,expect.objectContaining({signal:expect.any(AbortSignal)}));
    expect(screen.queryByRole('button',{name:/editar|salvar/i})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Fechar detalhes'}));
    expect(screen.getByTestId('url')).toHaveTextContent('/project/p/board?filtro=abertos');
    fireEvent.click(screen.getByRole('button',{name:'Voltar'}));
    await waitFor(()=>expect(screen.getByRole('heading',{name:'Título autorizado'})).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button',{name:'Avançar',hidden:true}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('falha de acesso não mostra corpo nem permite ação',async()=>{
    vi.mocked(api.get).mockRejectedValue({response:{status:404}});
    render(<MemoryRouter initialEntries={[`/project/p/plans?plan=${id}`]}><Tela/></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Recurso não encontrado ou fora do seu escopo.');
  });
});

it('trata sprint do board como filtro e preserva esse filtro ao fechar card',async()=>{
  vi.mocked(api.get).mockImplementation(async(url)=>({data:url==='/boards/b'?{id:'b',project_id:'p'}:{id,title:'Card',project_id:'p',board_id:'b'}}));
  render(<MemoryRouter initialEntries={[`/project/p/board?card=${id}&sprint=sprint-1`]}><Tela/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByText('Somente leitura')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:'Fechar detalhes'}));
  expect(screen.getByTestId('url')).toHaveTextContent('/project/p/board?sprint=sprint-1');
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('abre CardModal real em modo viewer, sem duplicar o diálogo genérico',async()=>{
  vi.mocked(api.get).mockImplementation(async(url)=>({data:url==='/boards/b'?{id:'b',project_id:'p'}:{id,title:'Card real',board_id:'b'}}));
  render(<MemoryRouter initialEntries={[`/project/p/board/b?card=${id}&sprint=filtro`]}><Tela/></MemoryRouter>);
  expect(await screen.findByText('Somente leitura')).toBeInTheDocument();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
});
it('abre SnapDetailModal real pela Memory sem ações para viewer',async()=>{
  vi.mocked(api.get).mockResolvedValue({data:{id,name:'Snap real',content:'texto',project_id:'p'}});
  render(<MemoryRouter initialEntries={[`/memory?snap=${id}&project=p`]}><Tela/></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Snap real'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Editar'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Excluir'})).toBeNull();
});
it('não mostra card de outro projeto após reler o board',async()=>{
  vi.mocked(api.get).mockResolvedValueOnce({data:{id,title:'Oculto',board_id:'b'}}).mockResolvedValueOnce({data:{project_id:'outro'}});
  render(<MemoryRouter initialEntries={[`/project/p/board?card=${id}`]}><Tela/></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Recurso não encontrado');
  expect(screen.queryByRole('heading',{name:'Oculto'})).toBeNull();
});
