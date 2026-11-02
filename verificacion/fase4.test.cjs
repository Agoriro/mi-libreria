/* node --test verificacion/fase4.test.cjs */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const clone = value => JSON.parse(JSON.stringify(value));
function setup({saved2,saved3,corrupt=false} = {}) {
  const storage = new Map(); if (saved2) storage.set('libreria-fase2-v1',JSON.stringify(saved2)); if (saved3) storage.set('libreria-fase3-v1',JSON.stringify(saved3)); if (corrupt) storage.set('libreria-fase3-v1','malformado');
  const ctx = {window:{},Intl,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}};
  vm.createContext(ctx); for (const file of ['data.js','fase3-datos.js','informes-datos.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),ctx);
  return {ctx,api:ctx.window.InformesDatos,store:ctx.window.Fase3Datos,storage};
}
const period = {desde:'2026-10-01',hasta:'2026-11-02'};
const summary = report => report.summary.map(item=>item[1]);
test('las nueve pantallas enlazan archivos existentes y centralizan sus estilos',()=>{
  const slugs=['informes','informe-compras','informe-ventas','ganancias','libros-mas-y-menos-vendidos','cuadre-del-dia','lo-que-debemos-pagar','lo-que-nos-deben','impuestos'];
  for(const slug of slugs) {
    const html=fs.readFileSync(path.join(root,'pantallas',slug+'.html'),'utf8');
    assert.equal(/style=|#[a-f0-9]{6}\b|\b\d+(?:px|rem|mm)\b/i.test(html),false);
    for(const match of html.matchAll(/(?:href|src)="([^"?#]+)(?:[?#][^"]*)?"/g)) assert.ok(fs.existsSync(path.resolve(root,'pantallas',match[1])),`${slug}: ${match[1]}`);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]); assert.equal(ids.length,new Set(ids).size);
    if(slug!=='informes') { for(const id of ['desde','hasta','imprimir','guardar-pdf','periodo','graficos']) assert.ok(ids.includes(id)); assert.equal((html.match(/class="button primary"/g)||[]).length,1); }
  }
});
test('compras y ventas leen sus importes originales sin alterar almacenamiento',()=>{
  const a=setup(); const before=JSON.stringify([...a.storage]);
  assert.deepEqual(clone(summary(a.api.generar('compras',period))),[210000,0,210000]);
  assert.deepEqual(clone(summary(a.api.generar('ventas',period))),[64000,0,64000]);
  assert.equal(JSON.stringify([...a.storage]),before);
});
test('fechas de Colombia son inclusivas y rechazan fechas imposibles o invertidas',()=>{
  const a=setup(); assert.equal(a.api.dia('2026-11-02T03:59:59.000Z'),'2026-11-01'); assert.equal(a.api.dia('2026-11-02T05:00:00.000Z'),'2026-11-02');
  assert.equal(a.api.fechaValida('2026-02-30'),false);
  assert.throws(()=>a.api.generar('ventas',{desde:'2026-11-03',hasta:'2026-11-01'}),/inicial/);
  const r=a.api.generar('ventas',{desde:'2026-11-01',hasta:'2026-11-01'}); assert.equal(r.count,1);
});
test('un periodo vacío no mezcla ejemplos de otras fechas',()=>{
  const a=setup(); for(const kind of ['compras','ventas','ganancias','lo-que-debemos-pagar','lo-que-nos-deben','impuestos']) {const r=a.api.generar(kind,{desde:'2025-01-01',hasta:'2025-01-02'}); assert.equal(r.count,0,kind); assert.ok(r.notes[0].includes('No hay registros')); assert.ok(summary(r).every(value=>value===0));}
});
test('ganancia usa costo de libros vendidos, sin restar todas las compras del periodo',()=>{
  const a=setup(); const r=a.api.generar('ganancias',period);
  assert.deepEqual(clone(summary(r)),[64000,41600,22400]); assert.ok(r.notes.join(' ').includes('65 %'));
});
test('compra anterior aporta el costo de una venta; una compra posterior no lo reemplaza',()=>{
  const a=setup(); const seed=clone(a.ctx.window.LibreriaDatos.ejemplosFase3);
  seed.ventas.push({id:2,referencia:'V-0002',fecha:'2026-11-01T18:00:00Z',personaNombre:'Prueba',lineas:[{libroId:1,titulo:'Cien años de soledad',cantidad:1,precio:65000}],total:65000,pago:'Tarjeta'});
  seed.compras.push({id:2,referencia:'C-0002',fecha:'2026-11-02T18:00:00Z',personaNombre:'Prueba',lineas:[{libroId:1,titulo:'Cien años de soledad',cantidad:1,precio:60000}],total:60000});
  const b=setup({saved3:{...a.store.datos,...seed}}); const r=b.api.generar('ganancias',period); assert.equal(r.rows[1][4],b.ctx.window.pesosColombianos(42000));
});
test('libros devueltos disminuyen ventas y revierten su ganancia estimada',()=>{
  const a=setup(); const data=a.store.datos; data.devueltos.push({id:1,tipo:'ventas',documentoId:1,libroId:8,titulo:'María',referencia:'V-0001',personaNombre:'Marta',fecha:'2026-11-02T12:00:00Z',cantidad:1,precio:32000,total:32000});
  const b=setup({saved3:data}); assert.deepEqual(clone(summary(b.api.generar('ventas',period))),[64000,32000,32000]); assert.equal(summary(b.api.generar('ganancias',period))[2],11200);
  const later=b.api.generar('ventas',{desde:'2026-11-02',hasta:'2026-11-02'}); assert.equal(summary(later)[2],-32000); assert.equal(later.charts[0].items[0].value,-32000);
});
test('clasificación incluye libros sin ventas y combina autor y tipo',()=>{
  const a=setup(); const r=a.api.generar('libros-mas-y-menos-vendidos',period); assert.equal(r.rows.length,20); assert.equal(r.charts[0].items[0].label,'María'); assert.equal(r.charts[0].items[0].value,2); assert.equal(r.charts[1].items[0].value,0);
  const single=a.api.generar('libros-mas-y-menos-vendidos',{...period,autor:'3',tipoLibro:'1'}); assert.equal(single.rows.length,1); assert.equal(single.rows[0][0],'María');
  const empty=a.api.generar('libros-mas-y-menos-vendidos',{...period,autor:'3',tipoLibro:'2'}); assert.equal(empty.count,0);
});
test('clasificación no resta libros devueltos después de la fecha final',()=>{
  const a=setup(); const data=a.store.datos; data.devueltos.push({tipo:'ventas',documentoId:1,libroId:8,fecha:'2026-11-03T12:00:00Z',cantidad:1,total:32000}); const b=setup({saved3:data});
  assert.equal(b.api.generar('libros-mas-y-menos-vendidos',period).charts[0].items[0].value,2);
  assert.equal(b.api.generar('libros-mas-y-menos-vendidos',{...period,hasta:'2026-11-03'}).charts[0].items[0].value,1);
});
test('saldos por pagar descuentan solo pagos hasta la fecha final',()=>{
  const a=setup(); assert.deepEqual(clone(summary(a.api.generar('lo-que-debemos-pagar',period))),[210000,120000,90000,0]);
  a.ctx.window.LibreriaDatos.ejemplosFase4.pagosCompras[0].fecha='2026-11-03T16:00:00Z';
  assert.equal(summary(a.api.generar('lo-que-debemos-pagar',period))[2],210000);
});
test('libros entregados al proveedor pueden generar saldo a favor, sin deuda negativa',()=>{
  const a=setup(); const data=a.store.datos; data.devueltos.push({tipo:'compras',documentoId:1,fecha:'2026-11-02T12:00:00Z',cantidad:5,total:210000}); const b=setup({saved3:data});
  assert.deepEqual(clone(summary(b.api.generar('lo-que-debemos-pagar',period))),[0,120000,0,120000]);
});
test('lo que nos deben separa sus ejemplos de las ventas con pago inmediato',()=>{
  const a=setup(); assert.deepEqual(clone(summary(a.api.generar('lo-que-nos-deben',period))),[135000,50000,85000]);
  assert.equal(a.api.generar('lo-que-nos-deben',{desde:'2026-11-01',hasta:'2026-11-02'}).count,0);
});
test('cuadre considera solo efectivo y permite comparar el dinero contado',()=>{
  const a=setup(); const r=a.api.generar('cuadre-del-dia',{...period,fondo:'200000',contado:'194000'});
  assert.deepEqual(clone(summary(r)),[200000,114000,120000,194000,194000,0]);
  assert.throws(()=>a.api.generar('cuadre-del-dia',{...period,fondo:'-1'}),/pesos enteros/);
  const noCount=a.api.generar('cuadre-del-dia',{...period,fondo:'200000',contado:''}); assert.equal(noCount.summary.length,4);
});
test('impuestos muestran importes registrados de ejemplo sin atribuirlos a los libros',()=>{
  const a=setup(); const r=a.api.generar('impuestos',period); assert.deepEqual(clone(summary(r)),[9500,19000,3500]);
  assert.equal(r.rows.length,2); assert.ok(r.notes.join(' ').includes('no guarda')); assert.ok(r.notes.join(' ').includes('No se aplican tarifas'));
});
test('datos guardados corruptos no se presentan como cifras válidas',()=>{
  const a=setup({corrupt:true}); assert.throws(()=>a.api.generar('ventas',period),/datos guardados/);
});

class Element {
  constructor(tag) {this.tag=tag; this.children=[]; this.attrs={}; this.events={}; this.dataset={}; this.value=''; this.textContent=''; this.hidden=false;}
  append(...items) {items.forEach(item=>{item.parent=this; this.children.push(item);});}
  replaceChildren(...items) {this.children=[]; this.append(...items);}
  setAttribute(key,value) {this.attrs[key]=value;} removeAttribute(key) {delete this.attrs[key];}
  addEventListener(type,handler) {this.events[type]=handler;}
  after(item) {item.parent=this.parent; this.parent?.children.push(item);}
  remove() {if(this.parent)this.parent.children=this.parent.children.filter(item=>item!==this);}
  all() {return this.children.flatMap(item=>[item,...item.all()]);}
  querySelectorAll(selector) {return this.all().filter(item=>selector==='.field-error'?item.className==='field-error':selector==='[aria-invalid]'?'aria-invalid' in item.attrs:selector==='[aria-invalid="true"]'?item.attrs['aria-invalid']==='true':false);}
  querySelector(selector) {return this.querySelectorAll(selector)[0]||null;}
  focus() {this.focused=true;}
  fire(type) {return this.events[type]?.({preventDefault(){}});}
}
function ui(slug) {
  const a=setup(), html=fs.readFileSync(path.join(root,'pantallas',slug+'.html'),'utf8'), nodes=new Map();
  for(const match of html.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {const e=new Element(match[1]); e.id=match[3]; e.hidden=/\bhidden\b/.test(match[2]); e.dataset.hint=match[2].match(/data-hint="([^"]+)"/)?.[1]; nodes.set(e.id,e);}
  if(nodes.has('filtros')) for(const match of html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g))nodes.get('filtros').append(nodes.get(match[1]));
  let prints=0; a.ctx.window.print=()=>{prints++;};
  a.ctx.document={title:'',body:{dataset:{page:slug,report:html.match(/data-report="([^"]+)"/)?.[1]}},getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag)};
  vm.runInContext(fs.readFileSync(path.join(root,'js/informes.js'),'utf8'),a.ctx);
  return {...a,nodes,get prints(){return prints;}};
}
test('tarjetas de informes, etiquetas directas y barras CSS sin bibliotecas',()=>{
  const dashboard=ui('informes'); assert.equal(dashboard.nodes.get('tarjetas-informes').children.length,8);
  const a=ui('informe-ventas'); assert.equal(a.nodes.get('contenido-informe').hidden,false); assert.ok(a.nodes.get('periodo').textContent.includes('Periodo:'));
  const bars=a.nodes.get('graficos').all().filter(item=>item.tag==='meter'); assert.ok(bars.length>0); assert.ok(bars.every(item=>item.attrs['aria-hidden']==='true' && item.value>=0));
  assert.ok(a.nodes.get('graficos').all().some(item=>item.tag==='strong' && item.textContent.includes('64')));
});
test('Imprimir y Guardar en PDF aplican filtros actuales y abren impresión',()=>{
  const a=ui('informe-ventas'); a.nodes.get('desde').value='2026-11-01'; a.nodes.get('hasta').value='2026-11-01'; a.nodes.get('imprimir').fire('click');
  assert.equal(a.prints,1); assert.ok(a.nodes.get('periodo').textContent.includes('01/11/2026 al 01/11/2026'));
  a.nodes.get('guardar-pdf').fire('click'); assert.equal(a.prints,2); assert.equal(a.nodes.get('ayuda-pdf').hidden,false);
  a.nodes.get('hasta').value='2026-10-01'; a.nodes.get('guardar-pdf').fire('click'); assert.equal(a.prints,2); assert.equal(a.nodes.get('hasta').attrs['aria-invalid'],'true'); assert.equal(a.nodes.get('contenido-informe').hidden,true);
});
test('los filtros de autor y tipo se conservan en el resultado que se imprime',()=>{
  const a=ui('libros-mas-y-menos-vendidos'); a.nodes.get('autor').value='3'; a.nodes.get('tipo-libro').value='1'; a.nodes.get('filtros').fire('submit');
  assert.ok(a.nodes.get('filtros-aplicados').textContent.includes('Jorge Isaacs')); assert.ok(a.nodes.get('filtros-aplicados').textContent.includes('Novela'));
});
