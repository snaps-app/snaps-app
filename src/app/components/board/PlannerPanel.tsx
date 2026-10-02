import {useEffect,useRef,useState} from 'react';
import {createChat,getChatHistory,listChats} from '@/services/chats';
import {usePapelNoProjeto} from '../chat/usePapelNoProjeto';
import {podeEscrever} from '../chat/perfis';
import {useConversa} from '../chat/comum/useConversa';
import {Composer,MensagemComum} from '../chat/comum/Conversa';

export const TITULO_CHAT_PLANNER='Planner · board';
interface Props {isOpen:boolean;onClose:()=>void;projectId?:string;onBoardChanged:()=>void}
export function PlannerPanel({isOpen,onClose,projectId,onBoardChanged}:Props) {
  const {papel,carregando:carregandoPapel}=usePapelNoProjeto(projectId);
  const pode=podeEscrever(papel);
  const [entrada,setEntrada]=useState('');
  const [carregando,setCarregando]=useState(false);
  const [erroHistorico,setErroHistorico]=useState<string|null>(null);
  const geracaoDoChat=useRef(0);
  const chatId=useRef<string|null>(null);
  const conversa=useConversa({projectId,chave:`${projectId}:${isOpen}:${pode}`,perfil:'board_planner',superficie:'board_planner',
    obterChat:async()=>{
      if(chatId.current) return chatId.current;
      const geracao=geracaoDoChat.current;
      const chat=await createChat(projectId!,TITULO_CHAT_PLANNER);
      if(geracao===geracaoDoChat.current) chatId.current=chat.id;
      return chat.id;
    },
    aoEvento:evento=>{if(evento.type==='board_changed') onBoardChanged();},
  });
  const {setMessages}=conversa;
  useEffect(()=>{
    geracaoDoChat.current+=1;
    chatId.current=null;setMessages([]);setEntrada('');setErroHistorico(null);
    if(!isOpen||!pode||!projectId) return;
    let atual=true;
    setCarregando(true);
    void (async()=>{
      try {
        const chat=(await listChats(projectId)).find(c=>c.title===TITULO_CHAT_PLANNER);
        if(!chat||!atual) return;
        const history=await getChatHistory(chat.id);
        if(atual) {chatId.current=chat.id;setMessages(history);}
      } catch {if(atual) setErroHistorico('Não foi possível carregar a conversa do Planner.');}
      finally {if(atual) setCarregando(false);}
    })();
    return ()=>{atual=false;geracaoDoChat.current+=1;};
  },[isOpen,pode,projectId,setMessages]);
  if(!isOpen) return null;
  const enviar=()=>{const texto=entrada;if(!texto.trim()||conversa.ocupado) return;setEntrada('');void conversa.enviar(texto);};
  return <>
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
    <aside role="dialog" aria-modal="true" aria-label="Planner — board" className="fixed right-0 inset-y-0 w-full sm:w-[500px] z-50 flex flex-col border-l border-orange-500/30 bg-neutral-950 text-white">
      <header className="p-6 border-b border-white/10 flex justify-between">
        <div><h2 className="text-xl font-bold">Planner — board</h2><p className="text-sm text-white/60">Organiza cards, tasks, sprints e BDD</p></div>
        <button aria-label="Fechar o Planner" onClick={onClose}>Fechar</button>
      </header>
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {carregandoPapel||carregando?<p role="status">Carregando…</p>:!pode?
          <p role="alert">Você não tem permissão para planejar neste projeto.</p>:
          conversa.messages.length===0?<p>Peça ao Planner para criar, detalhar ou mover cards, tasks e sprints deste board.</p>:
          conversa.messages.map(m=><MensagemComum key={m.id} message={m} projectId={projectId} />)}
        {(erroHistorico||conversa.erro)&&<p role="alert">{erroHistorico||conversa.erro}</p>}
        {conversa.persistenciaPendente&&<button disabled={conversa.ocupado} onClick={()=>{void conversa.repetirPersistencia();}}>Guardar resposta novamente</button>}
        {conversa.ocupado&&<p role="status">Respondendo…</p>}
      </div>
      {pode&&<Composer value={entrada} onChange={setEntrada} onSend={enviar} onCancel={conversa.cancelar} busy={conversa.ocupado} disabled={carregando||conversa.persistenciaPendente}
        label="Mensagem ao Planner" sendLabel="Enviar ao Planner" placeholder="Peça ao Planner…" />}
    </aside>
  </>;
}
