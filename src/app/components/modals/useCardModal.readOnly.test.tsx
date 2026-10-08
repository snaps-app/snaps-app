import {act,renderHook,render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
vi.mock('@/services/cards',()=>({getCard:vi.fn(),deleteCard:vi.fn()}));
vi.mock('@/services/tasks',()=>({createTask:vi.fn(),deleteTask:vi.fn(),updateTask:vi.fn()}));
vi.mock('@/services/storage',()=>({uploadAttachment:vi.fn()}));
vi.mock('@/app/components/modals/execution-wizard-modal',()=>({ExecutionWizardModal:()=>null}));
import {deleteCard} from '@/services/cards';
import {createTask,deleteTask,updateTask} from '@/services/tasks';
import {uploadAttachment} from '@/services/storage';
import {useCardModal} from './useCardModal';
import {CardModal} from './card-modal';
const card:any={id:'c',title:'Card viewer',status:'todo',card_type:'feature',description:'texto',tasks:[],labels:[],bdd_scenarios:[]};

it('readonly bloqueia escritas mesmo quando handlers são chamados diretamente',async()=>{
  const save=vi.fn(),close=vi.fn();
  const {result}=renderHook(()=>useCardModal({isOpen:true,initialData:card,initialDataIsFresh:true,readOnly:true,canDelete:false,safeColumns:[],repoNames:[],onSave:save,onClose:close}));
  await act(async()=>{
    result.current.handleSave();
    await result.current.handleDelete();
    await result.current.handleAddTask('task');
    await result.current.handleToggleTask({id:'t',completed:false} as any);
    await result.current.handleDeleteTask('t');
    await result.current.handleUploadFiles([new File(['a'],'a.txt')] as any);
  });
  for(const fn of [save,deleteCard,createTask,deleteTask,updateTask,uploadAttachment,close]) expect(fn).not.toHaveBeenCalled();
});

it('CardModal viewer desabilita os controles e conserva fechar',()=>{
  const {container}=render(<CardModal isOpen initialData={card} initialDataIsFresh readOnly canDelete={false} onSave={vi.fn()} onClose={vi.fn()}/>);
  for(const field of container.querySelectorAll('input,textarea,select')) expect(field).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Save Changes'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Delete'})).toBeNull();
  expect(screen.getByRole('button',{name:'Cancel'})).toBeEnabled();
});
it('não fecha nem perde o conteúdo quando a API rejeita salvar',async()=>{
  const close=vi.fn();
  const {result}=renderHook(()=>useCardModal({isOpen:true,initialData:card,initialDataIsFresh:true,readOnly:false,safeColumns:[],repoNames:[],onSave:vi.fn().mockRejectedValue(new Error('403')),onClose:close}));
  await act(async()=>{await result.current.handleSave();});
  expect(close).not.toHaveBeenCalled();
  expect(result.current.saveError).toBe('Não foi possível salvar o card.');
  expect(result.current.title).toBe('Card viewer');
});
