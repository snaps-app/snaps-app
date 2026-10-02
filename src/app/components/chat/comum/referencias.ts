import {unified} from 'unified';
import remarkParse from 'remark-parse';
import {chaveReferencia,rotaDaPagina,type RefEntidade} from '@/services/entidades';

interface No {type:string;value?:string;url?:string;children?:No[]}
const PADRAO=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+\b|snaps:\/\/[a-z_]+/gi;
export function detectarReferencias(markdown:string):RefEntidade[] {
  const refs=new Map<string,RefEntidade>();
  const arvore=unified().use(remarkParse).parse(markdown) as No;
  percorrer(arvore,no=>{
    if(no.type!=='text') return;
    for(const token of no.value?.match(PADRAO)??[]) {
      if(token.startsWith('snaps://')) continue;
      const ref:RefEntidade=token.length===36&&token[8]==='-'?{id:token}:{code:token};
      refs.set(chaveReferencia(ref),ref);
    }
  });
  return [...refs.values()];
}
function percorrer(no:No,visitar:(no:No)=>void) {
  if(['code','inlineCode','link','linkReference','html'].includes(no.type)) return;
  visitar(no);
  no.children?.forEach(child=>percorrer(child,visitar));
}
export function pluginReferencias(projectId:string,autorizadas:Set<string>) {
  return ()=> (arvore:No)=>{
    function visitar(no:No) {
      if(['code','inlineCode','html','linkReference'].includes(no.type)) return;
      if(no.type==='link') {
        if(no.url?.startsWith('snaps://')) no.url=rotaDaPagina(no.url.slice(8),projectId)??'';
        return;
      }
      if(!no.children) return;
      no.children=no.children.flatMap(child=>{
        if(child.type!=='text') {visitar(child);return [child];}
        const valor=child.value??'';const novos:No[]=[];let pos=0;
        for(const match of valor.matchAll(PADRAO)) {
          const token=match[0];const index=match.index!;
          let url:string|null=null;
          if(token.startsWith('snaps://')) url=rotaDaPagina(token.slice(8),projectId);
          else {
            const key=chaveReferencia(token.length===36&&token[8]==='-'?{id:token}:{code:token});
            if(autorizadas.has(key)) url=`#snaps-ref:${encodeURIComponent(key)}`;
          }
          if(!url) continue;
          novos.push({type:'text',value:valor.slice(pos,index)},{type:'link',url,children:[{type:'text',value:token}]});
          pos=index+token.length;
        }
        return novos.length?[...novos,{type:'text',value:valor.slice(pos)}]:[child];
      });
    }
    visitar(arvore);
  };
}
