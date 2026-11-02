const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('la entrada funciona desde una carpeta de GitHub Pages y desde archivos locales',()=>{
  const code=fs.readFileSync(path.join(root,'js/entrada.js'),'utf8');
  for(const [url,expected]of [
    ['https://usuario.github.io/mi-libreria/','https://usuario.github.io/mi-libreria/pantallas/login.html'],
    ['https://usuario.github.io/mi-libreria/index.html','https://usuario.github.io/mi-libreria/pantallas/login.html'],
    ['file:///C:/proyecto/index.html','file:///C:/proyecto/pantallas/login.html']
  ]){
    let destination;vm.runInNewContext(code,{URL,window:{location:{href:url,replace(value){destination=value;}}}});assert.equal(destination,expected);
  }
});
test('el paquete público excluye archivos internos y sus enlaces coinciden incluso en Linux',()=>{
  const run=spawnSync(process.execPath,[path.join(root,'scripts/preparar-pages.cjs')],{cwd:root,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const site=path.join(root,'_site');
  assert.deepEqual(fs.readdirSync(site).sort(),['.nojekyll','css','guia-de-estilo.html','index.html','js','pantallas'].sort());
  const files=[path.join(site,'index.html'),path.join(site,'guia-de-estilo.html'),...fs.readdirSync(path.join(site,'pantallas')).filter(file=>file.endsWith('.html')).map(file=>path.join(site,'pantallas',file))];
  for(const file of files){
    const html=fs.readFileSync(file,'utf8');
    for(const match of html.matchAll(/(?:href|src)="([^"?#]+)(?:[?#][^"]*)?"/g)){
      const ref=match[1];assert.equal(ref.startsWith('/'),false,`${file}: debe funcionar bajo /repositorio/`);
      const target=path.resolve(path.dirname(file),ref);assert.ok(target.startsWith(site+path.sep),target);
      let current=site;
      for(const segment of path.relative(site,target).split(path.sep)){
        assert.ok(fs.readdirSync(current).includes(segment),`Nombre exacto de archivo: ${target}`);current=path.join(current,segment);
      }
      assert.ok(fs.statSync(target).isFile(),target);
    }
  }
});
