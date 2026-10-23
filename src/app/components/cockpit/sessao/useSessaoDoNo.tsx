import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startExecutionSession,endExecutionSession,encerrarSessaoKeepalive } from '@/services/timeLogs';
import { aplicarSessaoAberta,aplicarSessaoFechada } from '@/services/resumoDoNo';
interface Sessao {noId:string;id:string;inicio:string}
interface Controle {aberta:boolean;abrindo:boolean;erro:string|null;play:()=>Promise<void>;pausar:()=>Promise<void>;capturarEscrita:(id:string)=>()=>Promise<void>}
const nada=async()=>{};
const vazio:Controle={aberta:false,abrindo:false,erro:null,play:nada,pausar:nada,capturarEscrita:()=>nada};
const Contexto=createContext<Controle>(vazio);
export function useSessaoDoNo() {return useContext(Contexto);}

export function SessaoDoNoProvider({noId,habilitada,children}:{noId:string|null;habilitada:boolean;children:ReactNode}) {
    const cliente=useQueryClient();
    const dono=useRef({id:noId,habilitada,geracao:0});
    if(dono.current.id!==noId || dono.current.habilitada!==habilitada)
        dono.current={id:noId,habilitada,geracao:dono.current.geracao+1};
    const vivo=useRef(true);
    const sessao=useRef<Sessao|null>(null);
    const pendente=useRef<{geracao:number;promessa:Promise<void>}|null>(null);
    const [aberta,setAberta]=useState(false);
    const [abrindo,setAbrindo]=useState(false);
    const [erro,setErro]=useState<string|null>(null);
    const fechar=useCallback(async(s:Sessao) => {
        await endExecutionSession(s.noId,s.id);
        aplicarSessaoFechada(cliente,{id:s.id,inicio:s.inicio,fim:new Date().toISOString()});
        const atual=sessao.current?.id===s.id;
        if(atual) sessao.current=null;
        if(vivo.current && atual) setAberta(false);
    },[cliente]);
    const pausar=useCallback(async()=>{
        if(!sessao.current) return;
        try {await fechar(sessao.current);setErro(null);}
        catch {if(vivo.current)setErro('Não foi possível encerrar a sessão. Tente pausar novamente.');}
    },[fechar]);
    const abrir=useCallback(async(id:string,geracao:number)=>{
        const valida=()=>vivo.current && dono.current.habilitada && dono.current.id===id && dono.current.geracao===geracao;
        if(!valida() || sessao.current?.noId===id) return;
        if(pendente.current?.geracao===geracao) return pendente.current.promessa;
        const promessa=(async()=>{
            setAbrindo(true);setErro(null);
            try {
                const resposta=await startExecutionSession(id);
                const nova={noId:id,id:resposta.session_id,inicio:resposta.started_at};
                if(!valida()) {await endExecutionSession(id,nova.id).catch(()=>encerrarSessaoKeepalive(id,nova.id));return;}
                sessao.current=nova;
                aplicarSessaoAberta(cliente,id,{id:nova.id,inicio:nova.inicio});
                setAberta(true);
            } catch {
                if(valida())setErro('A escrita foi concluída; não foi possível abrir a sessão de tempo. Use Play para tentar abrir a sessão.');
            } finally {
                if(pendente.current?.geracao===geracao)pendente.current=null;
                if(valida())setAbrindo(false);
            }
        })();
        pendente.current={geracao,promessa};
        return promessa;
    },[cliente]);
    const play=useCallback(()=>{
        const atual=dono.current;
        return atual.id?abrir(atual.id,atual.geracao):Promise.resolve();
    },[abrir]);
    const capturarEscrita=useCallback((id:string)=>{
        const geracao=dono.current.geracao;
        return ()=>abrir(id,geracao);
    },[abrir]);
    useEffect(()=>{
        vivo.current=true;
        const pagehide=()=>{const s=sessao.current;if(s)encerrarSessaoKeepalive(s.noId,s.id);};
        window.addEventListener('pagehide',pagehide);
        return ()=>{
            vivo.current=false;dono.current.geracao++;
            window.removeEventListener('pagehide',pagehide);
            const s=sessao.current;
            if(s)void fechar(s).catch(()=>encerrarSessaoKeepalive(s.noId,s.id));
        };
    },[noId,habilitada,fechar]);
    return <Contexto.Provider value={{aberta:aberta&&sessao.current?.noId===noId,abrindo,erro,play,pausar,capturarEscrita}}>{children}</Contexto.Provider>;
}
