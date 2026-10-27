import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/app/components/ui/dialog';
import { RevisaoDoEscopo } from '@/app/components/execution/revisao-do-escopo';
import type { AgentTaskExecution } from '@/services/types';
export function ModalDoEscopoDeDespacho({execution,admin,avancar,onConfirmar,onCancelar}:{execution:AgentTaskExecution;admin:boolean;avancar:boolean;onConfirmar:(no:AgentTaskExecution)=>Promise<void>|void;onCancelar:()=>void}) {
    return <Dialog open onOpenChange={aberto=>{if(!aberto)onCancelar();}}><DialogContent><DialogTitle>Revisar escopo de despacho</DialogTitle><DialogDescription>Confirme quais planos esta árvore executa. Alterar a seleção não dispensa gates.</DialogDescription>
        <RevisaoDoEscopo execution={execution} admin={admin} avancar={avancar} onConfirmar={onConfirmar} onCancelar={onCancelar} />
    </DialogContent></Dialog>;
}
