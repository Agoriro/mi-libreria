const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {audit,read,ratio,declarations} = require('./auditoria.cjs');

test('las 26 páginas no contienen incumplimientos estáticos detectables',()=>{
  const result=audit(); assert.equal(result.paginas,26);
  for(const row of result.filas) {
    assert.equal(row.estructura,true,row.archivo);
    for(const key of ['sinEtiqueta','sinIcono','vocabulario','referenciasAusentes']) assert.equal(row[key].length,0,`${row.archivo}: ${key}`);
    assert.equal(row.idsRepetidos,false,row.archivo); assert.equal(row.estilosFueraTokens,false,row.archivo);
  }
  assert.deepEqual(result.valoresEstiloFueraTokens,[]);
});
test('texto, bordes, foco y botón principal superan 7:1 en ambos modos',()=>{
  const result=audit(); assert.equal(result.contrastes.length,72);
  for(const pair of result.contrastes) assert.ok(pair.ratio>=7,JSON.stringify(pair));
  const colors=declarations(read('css/tokens.css').split(":root[data-font")[0]);
  assert.ok(ratio(colors['print-ink'].slice(1),colors['print-paper'].slice(1))>=7);
  assert.ok(ratio(colors['print-surface'].slice(1),colors['print-primary'].slice(1))>=7);
});
test('tamaños, espaciado y fracciones del diseño proceden de tokens',()=>{
  const tokens=declarations(read('css/tokens.css').split(":root[data-font")[0]), css=read('css/components.css');
  assert.equal(tokens.text,'20px'); assert.equal(tokens.leading,'1.6'); assert.equal(tokens['button-height'],'60px'); assert.equal(tokens['field-height'],'56px'); assert.equal(tokens['focus-width'],'3px'); assert.equal(tokens['space-2'],'16px');
  assert.ok(css.includes('min-height: var(--button-height)')); assert.ok(css.includes('min-height: var(--field-height)'));
  assert.ok(css.includes('gap: var(--space-2)')); assert.ok(css.includes('var(--fraction)'));
  assert.ok(css.includes('select[aria-invalid=')&&css.includes('textarea[aria-invalid='));
});
test('la guía reproduce los colores y contrastes actuales sin perder precisión',()=>{
  const html=read('guia-de-estilo.html');
  for(const match of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const hexes=[...match[1].matchAll(/#([a-f0-9]{6})/gi)].map(item=>item[1]); const value=match[1].match(/<td>([\d,]+):1<\/td>/)?.[1];
    if(hexes.length>=2 && value) assert.ok(Math.abs(Number(value.replace(',','.'))-ratio(hexes[0],hexes[1]))<=0.005,match[1]);
  }
  assert.equal(html.includes('Solo incluye Ingresar, Inicio y esta guía'),false);
});
test('el formulario de usuario separa el campo Estado de la región de mensajes',()=>{
  const html=read('pantallas/usuario-form.html');
  assert.equal((html.match(/\bid="estado"/g)||[]).length,1);
  assert.ok(html.includes('for="estado-usuario"')); assert.ok(html.includes('id="estado-usuario" name="estado"'));
});
test('la portada se elige con una acción grande, nombrada y con ícono',()=>{
  const html=read('pantallas/libro-form.html');
  assert.ok(/id="portada"[^>]*hidden/.test(html));
  assert.ok(/<button class="button" id="elegir-portada"[^>]*>[\s\S]*?aria-hidden="true"[\s\S]*?Elegir portada<\/button>/.test(html));
  assert.ok(read('js/fase2.js').includes("'#elegir-portada'"));
});
test('los enlaces de registros creados por JavaScript incluyen ícono y acción comprensible',()=>{
  const source=read('js/fase3.js').split('\n').find(line=>line.includes('const link ='));
  const ctx={node:(tag,text,className)=>({tag,text,className})}; vm.createContext(ctx); vm.runInContext(`${source};globalThis.make=link;`,ctx);
  assert.equal(ctx.make('V-0001','venta-exito.html?id=1').text,'▤ Ver V-0001');
  assert.equal(ctx.make('✎ Modificar','a.html').text,'✎ Modificar');
  assert.ok(read('js/fase2.js').includes('aria-label'));
});
function app() {
  const nodes=new Map(), events={}, storage=new Map(), scrolls=[];
  class Element {
    constructor(id) {this.id=id;this.attrs={};this.dataset={};this.events={};this.textContent='';this.tagName='DIV';this.rect={top:0,bottom:120};}
    set innerHTML(value) {
      this.html=value;
      for(const match of value.matchAll(/\bid="([^"]+)"/g)) nodes.set(match[1],new Element(match[1]));
      if(value.includes('class="toolbar"')) nodes.set('.toolbar',new Element('toolbar'));
    }
    get innerHTML() {return this.html;}
    setAttribute(name,value) {this.attrs[name]=value;}
    addEventListener(type,handler) {this.events[type]=handler;}
    querySelector(selector) {if(selector==='nav')return {append(){}};return nodes.get(selector);}
    append() {}
    focus() {document.activeElement=this;}
    contains(target) {return target===this;}
    getBoundingClientRect() {return this.rect;}
    showModal() {this.open=true;}
    close() {this.open=false;this.events.close?.();}
    fire(type,event={preventDefault(){}}) {return this.events[type]?.(event);}
  }
  const root=new Element('root'), shell=new Element('shell'), menu=new Element('menu'), opener=new Element('opener');
  const document={documentElement:root,body:{dataset:{page:'guia'},append(element){nodes.set(element.id || 'dialog',element);}},activeElement:opener,
    querySelector(selector){if(selector==='[data-shell]')return shell;if(selector==='[data-menu]')return menu;return nodes.get(selector.slice(1))||nodes.get(selector)||null;},
    querySelectorAll(){return [];},createElement(){return new Element();},addEventListener(type,handler){events[type]=handler;}};
  const ctx={window:{scrollBy:value=>scrolls.push(value)},document,location:{},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},getComputedStyle:()=>({getPropertyValue:()=> '16px'})};
  vm.createContext(ctx);vm.runInContext(read('js/app.js'),ctx);
  return {ctx,root,nodes,events,scrolls,Element,document,opener};
}
test('letra: tres niveles, contraste alto y navegación de ayuda compartida',()=>{
  const a=app(); assert.equal(a.root.dataset.font,'0');
  a.nodes.get('letra').fire('click'); assert.equal(a.root.dataset.font,'1');
  a.nodes.get('letra').fire('click'); assert.equal(a.root.dataset.font,'2');
  a.nodes.get('letra').fire('click'); assert.equal(a.root.dataset.font,'0');
  a.nodes.get('contraste').fire('click'); assert.equal(a.root.dataset.contrast,'high'); assert.equal(a.nodes.get('contraste').attrs['aria-pressed'],'true');
  for(const id of ['volver','ayuda','letra','contraste'])assert.ok(a.nodes.has(id));
});
test('confirmación: cancelar es el foco inicial, Escape cancela y se devuelve el foco',async()=>{
  const a=app();const pending=a.ctx.window.Libreria.confirmar({titulo:'¿Eliminar?',mensaje:'Ejemplo',aceptar:'Sí, eliminar'});
  assert.equal(a.document.activeElement,a.nodes.get('dialog-cancel'));assert.equal(a.nodes.get('dialog').open,true);
  a.nodes.get('dialog').fire('cancel');assert.equal(await pending,false);assert.equal(a.document.activeElement,a.opener);
  const accepted=a.ctx.window.Libreria.confirmar({titulo:'¿Continuar?',mensaje:'Ejemplo'});a.nodes.get('dialog-accept').fire('click');assert.equal(await accepted,true);
});
test('el foco que queda bajo la cabecera se desplaza usando el espacio del token',()=>{
  const a=app(),field=new a.Element('campo');field.rect={top:10,bottom:66};
  a.events.focusin({target:field});assert.equal(a.scrolls[0].top,-126);assert.equal(a.scrolls[0].behavior,'auto');
  assert.ok(read('css/components.css').includes('max-height: var(--toolbar-max-height)'));
});
test('barra compacta: seis controles con nombre accesible, ayuda y área de pulsación conservada',()=>{
  const source=read('js/app.js').split('<header class="toolbar"')[1].split('</header>')[0];
  assert.equal((source.match(/class="control-label"/g)||[]).length,6);
  assert.equal((source.match(/<(?:button|a)\b[^>]*aria-label=/g)||[]).length,6);
  assert.equal((source.match(/title=/g)||[]).length,6);
  const css=read('css/components.css');
  assert.ok(css.includes('.toolbar .button { width: var(--button-height)'));
  assert.ok(css.includes('.skip:focus { top: var(--zero); }'));
});
test('el menú empieza cerrado, se abre con su botón y devuelve el foco al cerrar',()=>{
  const a=app(),panel=a.nodes.get('menu-panel'),toggle=a.nodes.get('menu-toggle');
  assert.equal(Boolean(panel.open),false);
  assert.equal(toggle.attrs['aria-expanded'],undefined); // El atributo inicial está declarado en la plantilla.
  assert.ok(read('js/app.js').includes('aria-expanded="false" aria-controls="menu-panel"'));
  toggle.fire('click');assert.equal(panel.open,true);assert.equal(toggle.attrs['aria-expanded'],'true');assert.equal(a.document.activeElement,a.nodes.get('menu-close'));
  a.nodes.get('menu-close').fire('click');assert.equal(panel.open,false);assert.equal(toggle.attrs['aria-expanded'],'false');assert.equal(a.document.activeElement,toggle);
});
test('Escape usa el cierre nativo y pulsar el fondo cierra el menú',()=>{
  const a=app(),panel=a.nodes.get('menu-panel'),toggle=a.nodes.get('menu-toggle');
  toggle.fire('click');panel.close();assert.equal(toggle.attrs['aria-expanded'],'false');
  toggle.fire('click');panel.rect={left:0,right:480,top:0,bottom:800};
  panel.fire('click',{target:panel,clientX:200,clientY:200});assert.equal(panel.open,true);
  panel.fire('click',{target:panel,clientX:600,clientY:200});assert.equal(panel.open,false);
});
