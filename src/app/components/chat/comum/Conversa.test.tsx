import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {Composer,MensagemComum} from './Conversa';

it('renderiza GFM seguro sem HTML nem execução javascript',()=>{
  const {container}=render(<MensagemComum message={{id:'m',chat_id:'c',role:'assistant',created_at:'',content:'**Texto**\n\n| A | B |\n| - | - |\n| x | y |\n\n<script>window.alert(1)</script>\n\n[ruim](javascript:alert(1))'}} />);
  expect(container.querySelector('strong')).toHaveTextContent('Texto');
  expect(container.querySelector('table')).toBeInTheDocument();
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('a')).not.toHaveAttribute('href','javascript:alert(1)');
});
it('composer conserva Shift+Enter e IME e bloqueia envio enquanto ocupado',()=>{
  const enviar=vi.fn();
  const {rerender}=render(<Composer value="Oi" onChange={()=>{}} onSend={enviar} busy={false}/>);
  const campo=screen.getByRole('textbox');
  fireEvent.keyDown(campo,{key:'Enter',shiftKey:true});
  fireEvent.keyDown(campo,{key:'Enter',isComposing:true,keyCode:229});
  expect(enviar).not.toHaveBeenCalled();
  fireEvent.keyDown(campo,{key:'Enter'});
  expect(enviar).toHaveBeenCalledOnce();
  rerender(<Composer value="Oi" onChange={()=>{}} onSend={enviar} busy onCancel={()=>{}}/>);
  fireEvent.keyDown(campo,{key:'Enter'});
  expect(enviar).toHaveBeenCalledOnce();
  expect(screen.getByRole('button',{name:'Interromper resposta'})).toBeInTheDocument();
});
