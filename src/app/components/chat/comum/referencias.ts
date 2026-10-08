import {unified} from 'unified';
import remarkParse from 'remark-parse';
import {analisarUriSnaps,chaveReferencia,rotaDaPagina,type RefEntidade} from '@/services/entidades';

interface No {type:string;value?:string;url?:string;children?:No[]}
const PADRAO=/snaps:\/\/[a-z_]+(?:\/[^\s<>`\[\]()]+)?|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+\b/gi;
function referencia(token:string):RefEntidade|undefined {
  if(/^snaps:\/\//i.test(token)) return analisarUriSnaps(token)?.ref;
  return token.length===36&&token[8]==='-'?{id:token}:{code:token};
}
export function detectarReferencias(markdown:string):RefEntidade[] {
  const refs=new Map<string,RefEntidade>();
  const arvore=unified().use(remarkParse).parse(markdown) as No;
  percorrer(arvore,no=>{
    if(no.type==='link') {
      const ref=no.url?analisarUriSnaps(no.url)?.ref:undefined;
      if(ref) refs.set(chaveReferencia(ref),ref);
      return;
    }
    if(no.type!=='text') return;
    for(const token of no.value?.match(PADRAO)??[]) {
      const ref=referencia(token);
      if(!ref) continue;
      refs.set(chaveReferencia(ref),ref);
    }
  });
  return [...refs.values()];
}
function percorrer(no:No,visitar:(no:No)=>void) {
  if(['code','inlineCode','linkReference','html'].includes(no.type)) return;
  visitar(no);
  if(no.type==='link') return;
  let emHtml=false;
  no.children?.forEach(child=>{
    if(child.type==='html') {emHtml=!/^<\//.test(child.value??'');return;}
    if(!emHtml) percorrer(child,visitar);
  });
}
export function pluginReferencias(projectId:string,autorizadas:Set<string>) {
  return ()=> (arvore:No)=>{
    const urlDoToken=(token:string)=>{
      const uri=analisarUriSnaps(token);
      if(uri?.pagina) return rotaDaPagina(uri.pagina,projectId);
      const ref=referencia(token);
      if(!ref) return null;
      const key=chaveReferencia(ref);
      return autorizadas.has(key)?`#snaps-ref:${encodeURIComponent(key)}`:null;
    };
    function visitar(no:No) {
      if(['code','inlineCode','html','linkReference'].includes(no.type)) return;
      if(no.type==='link') {
        if(/^snaps:\/\//i.test(no.url??'')) {
          const token=no.url!;
          const url=urlDoToken(token);
          if(url) {
            no.url=url;
            if(analisarUriSnaps(token)?.ref) no.children=[{type:'text',value:token}];
          } else {no.type='text';no.value=token;delete no.url;delete no.children;}
        }
        return;
      }
      if(!no.children) return;
      let emHtml=false;
      no.children=no.children.flatMap(child=>{
        if(child.type==='html') {emHtml=!/^<\//.test(child.value??'');return [child];}
        if(emHtml) return [child];
        if(child.type!=='text') {visitar(child);return [child];}
        const valor=child.value??'';const novos:No[]=[];let pos=0;
        for(const match of valor.matchAll(PADRAO)) {
          const token=match[0];const index=match.index!;
          const url=urlDoToken(token);
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
