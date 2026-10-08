import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
vi.mock('@/services/members',()=>({getProjectMembers:vi.fn()}));
vi.mock('@/services/projects',()=>({getProject:vi.fn()}));
vi.mock('@/lib/supabaseClient',()=>({supabase:{auth:{getUser:vi.fn()}}}));
import {getProjectMembers} from '@/services/members';
import {supabase} from '@/lib/supabaseClient';
import {ProjectRoleProvider,useProjectRole} from './project-role-context';
function State(){const role=useProjectRole();return <><output data-testid="state">{role.projectId}:{role.loading?'loading':role.role}:{String(role.can('write'))}</output><button onClick={role.refresh}>Revalidar</button></>;}
beforeEach(()=>{vi.mocked(getProjectMembers).mockReset();vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:{id:'u'}}} as any);});
describe('papel vinculado ao projeto',()=>{
 it('não reutiliza owner ao trocar para projeto ainda sem permissão carregada',async()=>{
  let resolver:any;
  vi.mocked(getProjectMembers).mockResolvedValueOnce([{user_id:'u',email:'u@example.invalid',role:'owner'}]).mockImplementationOnce(()=>new Promise(resolve=>{resolver=resolve;}));
  const tela=render(<ProjectRoleProvider projectId="p"><State/></ProjectRoleProvider>);
  await waitFor(()=>expect(screen.getByTestId('state')).toHaveTextContent('p:owner:true'));
  tela.rerender(<ProjectRoleProvider projectId="q"><State/></ProjectRoleProvider>);
  expect(screen.getByTestId('state')).toHaveTextContent('q:loading:false');
  await waitFor(()=>expect(resolver).toBeDefined());
  resolver([{user_id:'u',email:'u@example.invalid',role:'viewer'}]);
  await waitFor(()=>expect(screen.getByTestId('state')).toHaveTextContent('q:viewer:false'));
 });
 it('bloqueia escrita durante revalidação e aplica redução de papel',async()=>{
  let resolver:any;
  vi.mocked(getProjectMembers).mockResolvedValueOnce([{user_id:'u',email:'u@example.invalid',role:'owner'}]).mockImplementationOnce(()=>new Promise(resolve=>{resolver=resolve;}));
  render(<ProjectRoleProvider projectId="p"><State/></ProjectRoleProvider>);
  await waitFor(()=>expect(screen.getByTestId('state')).toHaveTextContent('p:owner:true'));
  fireEvent.click(screen.getByRole('button',{name:'Revalidar'}));
  expect(screen.getByTestId('state')).toHaveTextContent('p:loading:false');
  await waitFor(()=>expect(resolver).toBeDefined());
  resolver([{user_id:'u',email:'u@example.invalid',role:'viewer'}]);
  await waitFor(()=>expect(screen.getByTestId('state')).toHaveTextContent('p:viewer:false'));
 });
});
