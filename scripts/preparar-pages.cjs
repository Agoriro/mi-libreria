/* Empaqueta archivos estáticos; no compila ni instala dependencias. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.resolve(root,'_site');
if(path.dirname(output)!==root || path.basename(output)!=='_site')throw Error('Carpeta de publicación fuera del proyecto.');
// Solo se limpia la carpeta de salida generada y verificada arriba.
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
for(const file of ['index.html','guia-de-estilo.html','.nojekyll','css','js','pantallas']) {
  fs.cpSync(path.join(root,file),path.join(output,file),{recursive:true});
}
console.log('Sitio preparado en _site. Solo contiene los archivos públicos de la página.');
