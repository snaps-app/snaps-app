import {api} from './client';
export interface JanelaOrcamento {
 period:'day'|'month'; starts_at:string; ends_at:string;
 known_usd:string; pending_usd:string; debt_usd:string;
 coverage:'complete'|'unknown'; warning:boolean;
}
export interface Orcamento {
 enabled:boolean; daily_limit_usd:string|null; monthly_limit_usd:string|null;
 timezone:string; warning_pct:number; lock_version:number; windows:JanelaOrcamento[];
}
export type EdicaoOrcamento=Pick<Orcamento,'enabled'|'daily_limit_usd'|'monthly_limit_usd'|'lock_version'>;
export const getOrcamento=async():Promise<Orcamento>=>(await api.get('/api/system/neuron/orcamento')).data;
export const editarOrcamento=async(data:EdicaoOrcamento):Promise<Orcamento>=>(await api.patch('/api/system/neuron/orcamento',data)).data;
