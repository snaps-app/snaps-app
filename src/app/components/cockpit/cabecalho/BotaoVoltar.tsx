import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/app/components/ui/dropdown-menu';
export function BotaoVoltar({projectId}:{projectId:string}) {
    return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label="Voltar" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[var(--snaps-text-primary)]">‹</button></DropdownMenuTrigger>
        <DropdownMenuContent><DropdownMenuItem asChild><Link to={`/project/${projectId}/board`}>Board da sprint</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to={`/project/${projectId}/executions`}>Execuções do projeto</Link></DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>;
}
