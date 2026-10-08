import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {Composer,MensagemComum} from './Conversa';
import type {RegistroDoTurnoV1} from '@/services/types';

it('abre links externos e imagens em aba segura, preservando mailto',()=>{
  render(<MensagemComum message={{id:'m',chat_id:'c',role:'assistant',created_at:'',content:'https://example.com\n\n![foto](https://example.com/foto.png)\n\n[email](mailto:contato@example.com)'}}/>);
  for(const nome of ['https://example.com','foto']) {
    const link=screen.getByRole('link',{name:nome});
    expect(link).toHaveAttribute('target','_blank');
    expect(link).toHaveAttribute('rel','noopener noreferrer nofollow');
  }
  expect(screen.getByRole('link',{name:'email'})).not.toHaveAttribute('target');
});

it('conta ferramentas, recolhe ao terminar e preserva ordem dos segmentos',()=>{
  const registro:RegistroDoTurnoV1={v:1,perfil:'',incompleto:false,snaps_referenciados:[],passos:[{type:'text',content:'Antes'},{type:'tool',id:'t',tool:'buscar',resumo:'Resultado',status:'running'},{type:'thinking',content:'Pensamento separado'},{type:'text',content:'Depois'}]};
  const message={id:'assistant-stream',chat_id:'c',role:'assistant' as const,created_at:'',content:'AntesDepois',tool_calls:registro};
  const {container,rerender}=render(<MensagemComum message={message}/>);
  expect(screen.getByText('1 ferramenta')).toBeInTheDocument();
  expect(container.querySelector('details[data-tool-step]')).toHaveAttribute('open');
  const terminal={...message,tool_calls:{...message.tool_calls,terminal:'eof'}};
  rerender(<MensagemComum message={terminal}/>);
  expect(container.querySelector('details[data-tool-step]')).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText(/buscar ·/));
  expect(container.querySelector('details[data-tool-step]')).toHaveAttribute('open');
  rerender(<MensagemComum message={{...terminal}}/>);
  expect(container.querySelector('details[data-tool-step]')).toHaveAttribute('open');
  expect(container.textContent).toMatch(/Antes.*buscar.*Depois/s);
});

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
