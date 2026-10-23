import { Play,Square } from 'lucide-react';
import { useSessaoDoNo } from '@/app/components/cockpit/sessao/useSessaoDoNo';
interface ExecutionTimerProps {executionId:string;projectId:string;embutido?:boolean;apenasControles?:boolean;onSessaoIniciada?:(inicio:string,id:string)=>void;onSessaoEncerrada?:(inicio:string,fim:string,id:string)=>void}
/** Controls only. Lifecycle belongs to the root's provider, outside the header. */
export function ExecutionTimer(_props:ExecutionTimerProps) {
    const sessao=useSessaoDoNo();
    return <span className="inline-flex items-center gap-2">
        <button type="button" aria-label={sessao.aberta?'Pausar sessão':'Iniciar sessão'} disabled={sessao.abrindo}
            onClick={()=>{void (sessao.aberta?sessao.pausar():sessao.play());}} className="rounded p-1 text-[var(--snaps-text-secondary)]">
            {sessao.aberta?<Square className="h-3 w-3"/>:<Play className="h-3 w-3"/>}
        </button>
        {sessao.erro&&<span role="alert" className="text-xs text-[var(--snaps-error)]">{sessao.erro}</span>}
    </span>;
}
