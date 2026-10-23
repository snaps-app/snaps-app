import { useSessaoDoNo } from '@/app/components/cockpit/sessao/useSessaoDoNo';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setDispatchScope,getAgentExecution } from '@/services/agentExecutions';
import { getResumoDoNo } from '@/services/resumoDoNo';
import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import type { AgentTaskExecution } from '@/services/types';

export function mesmosIds(a:readonly string[],b:readonly string[]) {
    const x=new Set(a),y=new Set(b);return x.size===y.size && [...x].every(id => y.has(id));
}
export function RevisaoDoEscopo({execution,admin,avancar=false,onConfirmar,onCancelar}:{execution:AgentTaskExecution;admin:boolean;avancar?:boolean;onConfirmar:(no:AgentTaskExecution)=>void|Promise<void>;onCancelar?:()=>void}) {
    const sessao=useSessaoDoNo();
    const cliente=useQueryClient();
    const retrato=execution.despacho;
    const [ids,setIds]=useState(retrato?.efetivo_ids ?? []);
    const [motivo,setMotivo]=useState('');
    const [limpar,setLimpar]=useState(false);
    const [erro,setErro]=useState<string|null>(null);
    const [salvando,setSalvando]=useState(false);
    if (!retrato) return <p role="alert">Revisão do escopo indisponível nesta leitura. Recarregue o nó.</p>;
    const mudou=limpar || !mesmosIds(ids,retrato.efetivo_ids);
    const fora=ids.filter(id => !retrato.candidatos.some(p => p.id===id));
    const enviar=async () => {
        const abrirSessao=sessao.capturarEscrita(execution.id);
        setSalvando(true);setErro(null);
        try {
            let atual=execution;
            if (mudou) {
                if (!admin || !motivo.trim()) throw new Error('Alterar ou limpar o escopo exige motivo e papel admin.');
                const resposta=await setDispatchScope(execution.id,limpar?[]:ids,motivo.trim(),execution.lock_version);
                await abrirSessao();
                const relida=await getAgentExecution(execution.id);
                if (relida.lock_version !== resposta.lock_version) throw new Error('A execução mudou. Releia e reconfirme o escopo.');
                atual={...relida,lock_version:resposta.lock_version};
                cliente.setQueryData(chaves.aba(execution.id,'plano'),atual);
                await Promise.all([cliente.invalidateQueries({queryKey:chaves.arvore(execution.root_id || execution.id)}),cliente.invalidateQueries({queryKey:chaves.snapshot(execution.id)})]);
            }
            if (avancar) {
                const resumo=await getResumoDoNo(execution.id);
                cliente.setQueryData(chaves.resumo(execution.id),resumo);
                const faltas=resumo.condicoes?.filter(c => c.estado==='falta') ?? [];
                if (faltas.length) throw new Error('Escopo confirmado; faltam: '+faltas.map(c => c.motivo || c.chave).join('; '));
            } else await cliente.invalidateQueries({queryKey:chaves.resumo(execution.id)});
            await onConfirmar(atual);
        } catch(e) {
            if ((e as {response?:{status?:number}})?.response?.status===409) {
                await cliente.invalidateQueries({queryKey:chaves.aba(execution.id,'plano')});
                setErro('Conflito: releia o nó e reconfirme a seleção. Nenhum avanço foi enviado.');
            } else setErro((e as {response?:{data?:{detail?:string}}})?.response?.data?.detail || (e as Error).message || 'Não foi possível confirmar o escopo.');
        } finally {setSalvando(false);}
    };
    return <div className="space-y-3 text-sm text-[var(--snaps-text-primary)]">
        {retrato.candidatos.map(p => <label key={p.id} className="flex items-center gap-2"><input type="checkbox" aria-label={p.title} checked={ids.includes(p.id)} disabled={!admin || salvando}
            onChange={() => {setLimpar(false);setIds(a => a.includes(p.id)?a.filter(id=>id!==p.id):[...a,p.id]);}} />{p.title} · {p.status} · {p.approval === 'stale' ? 'aprovação desatualizada' : p.approval === 'missing' ? 'sem aprovação' : 'aprovação atual'}{!ids.includes(p.id)&&' · adiado'}</label>)}
        <p>Padrão do motor: {retrato.candidatos.filter(p=>retrato.padrao_ids.includes(p.id)).map(p=>p.title).join(', ') || 'nenhum'}</p>
        {fora.length>0 && <p role="alert">Escopo contém planos indisponíveis. Revise a seleção: {fora.join(', ')}</p>}
        {admin && retrato.explicito && <button type="button" onClick={() => {setIds(retrato.padrao_ids);setLimpar(true);}}>Voltar ao padrão do motor</button>}
        {mudou && <label>Motivo do escopo<textarea aria-label="Motivo do escopo" value={motivo} onChange={e=>setMotivo(e.target.value)} disabled={!admin} className="w-full rounded border border-white/10 bg-white/5 p-2" /></label>}
        {erro && <p role="alert">{erro}</p>}
        <div className="flex justify-end gap-2">{onCancelar && <button type="button" onClick={onCancelar} disabled={salvando}>Cancelar</button>}
        {(avancar || admin) && <button type="button" onClick={enviar} disabled={salvando || ids.length===0 || fora.length>0 || (mudou && (!admin || !motivo.trim()))}>{avancar?'Confirmar e avançar':'Confirmar escopo'}</button>}</div>
    </div>;
}
