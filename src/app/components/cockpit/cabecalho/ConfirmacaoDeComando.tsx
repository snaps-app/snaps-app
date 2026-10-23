import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/app/components/ui/dialog';
export function ConfirmacaoDeComando({titulo,texto,comando,onConfirmar,onCancelar}:{titulo:string;texto:string;comando:string;onConfirmar:()=>void;onCancelar:()=>void}) {
    return <Dialog open onOpenChange={aberto => {if (!aberto) onCancelar();}}><DialogContent role="alertdialog">
        <DialogTitle>{titulo}</DialogTitle><DialogDescription>{texto}</DialogDescription>
        <div className="flex justify-end gap-2"><button type="button" onClick={onCancelar}>Cancelar</button><button type="button" onClick={onConfirmar}>{comando}</button></div>
    </DialogContent></Dialog>;
}
