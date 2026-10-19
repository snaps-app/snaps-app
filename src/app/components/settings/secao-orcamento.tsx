import {useEffect,useState} from 'react';
import {getOrcamento,editarOrcamento,type Orcamento} from '@/services/orcamento';
import {statusDoErro} from '@/services/system-settings';

export function SecaoOrcamento() {
 const [config,setConfig]=useState<Orcamento|null>(null);
 const [day,setDay]=useState(''); const [month,setMonth]=useState('');
 const [enabled,setEnabled]=useState(false);
 const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
 const [saved,setSaved]=useState(false);
 const load=async()=>{
  const c=await getOrcamento(); setConfig(c); setDay(c.daily_limit_usd??'');
  setMonth(c.monthly_limit_usd??''); setEnabled(c.enabled);
 };
 useEffect(()=>{let alive=true;
  getOrcamento().then(c=>{if(alive){setConfig(c);setDay(c.daily_limit_usd??'');setMonth(c.monthly_limit_usd??'');setEnabled(c.enabled);}})
   .catch(()=>{if(alive)setError('Não foi possível conferir o limite de gasto. Tente novamente em instantes.');});
  return()=>{alive=false;};
 },[]);
 const valid=(s:string)=>s===''||/^\d{1,10}(\.\d{1,8})?$/.test(s);
 const save=async()=>{
  if(!config||busy||!valid(day)||!valid(month))return;
  setBusy(true);setError(null);setSaved(false);
  try {
   await editarOrcamento({enabled,daily_limit_usd:day||null,monthly_limit_usd:month||null,lock_version:config.lock_version});
   await load();setSaved(true);
  } catch(e) {
   if(statusDoErro(e)===409) {
    setError('Outra pessoa alterou os limites. Confira a versão atual antes de salvar novamente.');
    try {await load();}catch{setConfig(null);}
   } else setError('Não foi possível salvar os limites. Confira sua permissão e tente novamente.');
  } finally {setBusy(false);}
 };
 return <section aria-label="Orçamento do Neuron" className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
  <h3 className="text-sm font-semibold">Orçamento do Neuron</h3>
  <p className="text-xs">Limites globais de gasto bruto, sem markup. Calendário America/Sao_Paulo. Aviso em 80%.</p>
  {error&&<p role="alert">{error}</p>}
  {!config&&!error&&<p role="status">Carregando orçamento…</p>}
  {config&&<>
   <p className="text-xs">{config.enabled?'Controle financeiro ativo':'Controle financeiro desativado'}. Histórico sem cobertura exige reconciliação humana antes da ativação.</p>
   {config.windows.map(w=><div key={w.period} className="text-sm">
    <strong>{w.period==='day'?'Dia':'Mês'}</strong>
    <p>Gasto conhecido: US$ {w.known_usd} · Reservas: US$ {w.pending_usd} · Dívida: US$ {w.debt_usd}</p>
    <p>Cobertura: {w.coverage==='complete'?'completa':'desconhecida'}</p>
    {w.warning&&<p role="status">80% do teto {w.period==='day'?'diário':'mensal'} atingido. Confira o consumo antes de ajustar os limites.</p>}
   </div>)}
   <label>Teto diário (US$)<input aria-label="Teto diário (US$)" inputMode="decimal" value={day} onChange={e=>setDay(e.target.value)} className="block rounded border p-2 bg-black/30"/></label>
   <label>Teto mensal (US$)<input aria-label="Teto mensal (US$)" inputMode="decimal" value={month} onChange={e=>setMonth(e.target.value)} className="block rounded border p-2 bg-black/30"/></label>
   <p className="text-xs">Vazio desativa o teto correspondente. Zero bloqueia novos envios. Valores usam ponto decimal.</p>
   <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Ativar controle financeiro</label>
   <button disabled={busy||!valid(day)||!valid(month)} onClick={()=>void save()} className="rounded border px-4 py-2 disabled:opacity-50">Salvar limites</button>
   {saved&&<p role="status">Limites salvos.</p>}
  </>}
 </section>;
}
