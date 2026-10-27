import { chavesDeConsulta as chaves } from '@/services/chavesDeConsulta';
import type { ChaveDeAba } from './catalogo';

export function consultasDaAba(id: string, rootId: string, aba: ChaveDeAba) {
    const consultas: ReadonlyArray<unknown>[] = [chaves.resumo(id), chaves.aba(id,aba)];
    if (aba === 'cards') consultas.push(chaves.cardsDaRaiz(rootId,[]).slice(0,3));
    if (aba === 'atividade') consultas.push(chaves.atividade(id,{}).slice(0,3));
    if (aba === 'prs') consultas.push(chaves.prs(id,'','').slice(0,3));
    return consultas;
}
