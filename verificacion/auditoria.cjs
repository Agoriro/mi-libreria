/* Auditoría reproducible de fuentes. No sustituye una inspección en navegador. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const pages = () => ['guia-de-estilo.html',...fs.readdirSync(path.join(root,'pantallas')).filter(file=>file.endsWith('.html')).sort().map(file=>'pantallas/'+file)];
const text = html => html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const luminance = hex => {
  const c=hex.match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
};
const ratio = (a,b) => {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const declarations = css => Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(match=>[match[1],match[2].trim()]));
function audit() {
  const css = read('css/tokens.css'); const standard=declarations(css.split(":root[data-font")[0]);
  const high={...standard,...declarations(css.match(/:root\[data-contrast='high'\]\s*\{([^}]+)\}/)[1])};
  const contrast=[];
  for(const [mode,palette]of [['normal',standard],['alto',high]]) {
    for(const fg of ['ink','muted','primary','accent','danger','focus','border']) for(const bg of ['cream','surface','success-bg','warning-bg','error-bg'])contrast.push({modo:mode,texto:fg,fondo:bg,ratio:ratio(palette[fg].slice(1),palette[bg].slice(1))});
    contrast.push({modo:mode,texto:'surface',fondo:'primary',ratio:ratio(palette.surface.slice(1),palette.primary.slice(1))});
  }
  const rows=pages().map(file=>{
    const html=read(file), ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    const fields=[...html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)].filter(match=>!(/\bhidden\b/.test(match[2])));
    const unlabeled=fields.filter(match=>{const id=match[2].match(/\bid="([^"]+)"/)?.[1];return !id||!html.includes(`for="${id}"`);}).map(match=>match[0]);
    const actions=[...html.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/g)].filter(match=>match[1]==='button'||/class="[^"]*(?:button|module-card)/.test(match[2]));
    const noIcon=actions.filter(match=>{const label=text(match[3]);return label && /^[\p{L}\p{N}]/u.test(label)&&!match[3].includes('aria-hidden="true"')&&!match[3].includes('class="icon"');}).map(match=>text(match[3]));
    const visible=text(html);
    const vocabulary=visible.match(/\b(?:Terceros|Productos|Géneros|Editorial|Devoluciones|Utilidades|CXP|CXC|Login)\b|rotación de inventarios|cierre de caja/gi)||[];
    const missingReferences=[];
    for(const match of html.matchAll(/\b(?:aria-labelledby|aria-describedby|aria-controls)="([^"]+)"/g)) for(const id of match[1].split(/\s+/))if(!ids.includes(id))missingReferences.push(id);
    return {archivo:file,campos:fields.length,acciones:actions.length,sinEtiqueta:unlabeled,sinIcono:noIcon,vocabulario:vocabulary,referenciasAusentes:missingReferences,idsRepetidos:ids.length!==new Set(ids).size,
      estilosFueraTokens:/\bstyle\s*=|<style\b/i.test(html),
      estructura:/<html lang="es-CO"/.test(html)&&html.includes('data-shell')&&html.includes('data-menu')&&html.includes('class="page-header"')&&/<h1 id="titulo-pagina"/.test(html)&&html.includes('aria-labelledby="titulo-pagina"')&&html.includes('id="contenido"')};
  });
  const styles=read('css/components.css');
  const outsideTokens=[...styles.matchAll(/#[a-f0-9]{3,8}\b|\brgba?\(|\bhsla?\(|(?:\d*\.)?\d+(?:px|rem|em|vw|vh|mm|cm|pt|fr|%)\b/gi)].map(match=>match[0]);
  return {paginas:rows.length,filas:rows,contrastes:contrast,valoresEstiloFueraTokens:outsideTokens};
}
if(require.main===module) {
  const result=audit(); const issues=result.filas.filter(row=>row.sinEtiqueta.length||row.sinIcono.length||row.vocabulario.length||row.referenciasAusentes.length||row.idsRepetidos||row.estilosFueraTokens||!row.estructura);
  console.log(JSON.stringify({paginas:result.paginas,campos:result.filas.reduce((n,row)=>n+row.campos,0),acciones:result.filas.reduce((n,row)=>n+row.acciones,0),paresContraste:result.contrastes.length,minimo:Math.min(...result.contrastes.map(item=>item.ratio)),hallazgosPendientes:issues,valoresFueraTokens:result.valoresEstiloFueraTokens},null,2));
  if(issues.length||result.valoresEstiloFueraTokens.length||result.contrastes.some(item=>item.ratio<7))process.exitCode=1;
}
module.exports={audit,read,pages,ratio,declarations};
