/* Ejecutar: node --test verificacion/fase3.test.cjs */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const key2 = 'libreria-fase2-v1', key3 = 'libreria-fase3-v1';
const clone = value => JSON.parse(JSON.stringify(value));
function setup({storage = new Map(),blockedRead = false,failWrite = () => false} = {}) {
  const ctx = {window:{},Intl,localStorage:{
    getItem(key) { if (blockedRead) throw Error('Bloqueado'); return storage.get(key) ?? null; },
    setItem(key,value) { if (failWrite(key)) throw Error('Sin espacio'); storage.set(key,value); },
    removeItem(key) { storage.delete(key); }
  }};
  vm.createContext(ctx);
  for (const file of ['data.js','fase3-datos.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),ctx);
  return {ctx,store:ctx.window.Fase3Datos,storage};
}
const sale = (store,quantity = 1) => store.registrarOperacion('ventas',{personaId:1,pago:'Efectivo',lineas:[{libroId:8,cantidad:quantity}]});
const purchase = store => store.registrarOperacion('compras',{personaId:1,lineas:[{libroId:1,cantidad:3,precio:40000}]});
test('los seis HTML usan estilos compartidos y todos sus enlaces locales existen',() => {
  for (const file of ['clientes-proveedores','cliente-proveedor-form','compras','ventas','venta-exito','libros-devueltos']) {
    const html = fs.readFileSync(path.join(root,'pantallas',`${file}.html`),'utf8');
    assert.equal(/style=|#[a-f0-9]{6}\b|\b\d+px\b/i.test(html),false);
    for (const match of html.matchAll(/(?:href|src)="([^"?#]+)(?:[?#][^"]*)?"/g)) assert.ok(fs.existsSync(path.resolve(root,'pantallas',match[1])),`${file}: ${match[1]}`);
    for (const marker of ['data-shell','data-menu','id="contenido"','fase3-datos.js','fase3.js']) assert.ok(html.includes(marker),`${file}: ${marker}`);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(new Set(ids).size,ids.length,`${file}: identificadores únicos`);
  }
});
test('clientes: crear, modificar, persistir, eliminar y proteger historial',() => {
  const a = setup(); const input = {nombre:'Persona de prueba',telefono:'3001234567',ciudad:'Bogotá',correo:'persona@example.com',documento:'DEMO-1'};
  const person = a.store.guardarPersona('clientes',input).record;
  assert.equal(person.id,7); assert.equal(a.store.datos.clientes.length,7);
  a.store.guardarPersona('clientes',{...input,nombre:'Nombre corregido'},person.id);
  const b = setup({storage:a.storage}); assert.equal(b.store.datos.clientes[6].nombre,'Nombre corregido');
  b.store.eliminarPersona('clientes',person.id); assert.equal(b.store.datos.clientes.length,6);
  assert.throws(() => b.store.eliminarPersona('clientes',1),/asociadas/);
});
test('proveedores: validación de teléfono, correo e identificación duplicada',() => {
  const {store} = setup(); const p = {nombre:'Proveedor nuevo',ciudad:'Cali',telefono:'3001234567',correo:'p@example.com',documento:'DEMO-P'};
  assert.throws(() => store.guardarPersona('proveedores',{...p,telefono:'+++++++'}),/dígitos/);
  assert.throws(() => store.guardarPersona('proveedores',{...p,correo:'incorrecto'}),/correo/);
  store.guardarPersona('proveedores',p);
  assert.throws(() => store.guardarPersona('proveedores',p),/identificación/);
  assert.equal(store.datos.proveedores.length,5);
});
test('compra suma cantidades, calcula total y conserva precio de venta',() => {
  const {store,storage} = setup(); const before = store.datos.libros[0]; const result = purchase(store);
  assert.equal(result.record.total,120000); assert.equal(store.datos.libros[0].existencias,before.existencias + 3);
  assert.equal(store.datos.libros[0].precio,before.precio);
  const saved = JSON.parse(storage.get(key2)); assert.equal(saved.libros[0].existencias,15);
  assert.equal(setup({storage}).store.datos.compras.length,2);
});
test('venta usa precio del catálogo, registra pago y descuenta existencias',() => {
  const {store} = setup(); const result = sale(store,2);
  assert.equal(result.record.total,64000); assert.equal(result.record.pago,'Efectivo'); assert.equal(result.record.envio,'simulado');
  assert.equal(store.datos.libros.find(book => book.id === 8).existencias,13);
  assert.equal(result.record.lineas[0].titulo,'María');
});
test('rechaza venta sin libros, sin forma de pago y sin cantidad disponible',() => {
  const {store} = setup();
  assert.throws(() => store.registrarOperacion('ventas',{personaId:1,pago:'Efectivo',lineas:[]}),/al menos/);
  assert.throws(() => store.registrarOperacion('ventas',{personaId:1,pago:'',lineas:[{libroId:8,cantidad:1}]}),/forma de pago/);
  assert.throws(() => sale(store,16),/Solo hay/);
  assert.equal(store.datos.ventas.length,1); assert.equal(store.datos.libros.find(book => book.id === 8).existencias,15);
});
test('venta valida cliente con correo y operaciones rechazan fracciones o libros repetidos',() => {
  const {store} = setup(); store.guardarPersona('clientes',{nombre:'Sin correo',ciudad:'Cali',telefono:'3001234567'},2);
  assert.throws(() => store.registrarOperacion('ventas',{personaId:2,pago:'Tarjeta',lineas:[{libroId:8,cantidad:1}]}),/correo/);
  assert.throws(() => sale(store,1.5),/entera/);
  assert.throws(() => store.registrarOperacion('compras',{personaId:1,lineas:[{libroId:8,cantidad:1,precio:4},{libroId:8,cantidad:2,precio:4}]}),/repetido/);
});
test('libros devueltos de venta: suma existencias y limita la cantidad acumulada',() => {
  const {store} = setup(); const input = {tipo:'ventas',documentoId:1,libroId:8,cantidad:1,motivo:'Libro diferente'};
  const result = store.registrarDevuelto(input); assert.equal(result.record.total,32000); assert.equal(store.pendiente('ventas',1,8),1);
  assert.equal(store.datos.libros.find(book => book.id === 8).existencias,16);
  store.registrarDevuelto(input); assert.equal(store.pendiente('ventas',1,8),0);
  assert.throws(() => store.registrarDevuelto(input),/hasta 0/);
});
test('libros devueltos de compra: usa costo original, resta existencias y valida motivo',() => {
  const {store} = setup(); const input = {tipo:'compras',documentoId:1,libroId:1,cantidad:2,motivo:'Portadas dañadas'};
  const result = store.registrarDevuelto(input); assert.equal(result.record.total,84000); assert.equal(store.datos.libros[0].existencias,10);
  assert.throws(() => store.registrarDevuelto({...input,motivo:''}),/motivo/);
  assert.throws(() => store.registrarDevuelto({...input,libroId:8}),/registro original/);
});
test('no entrega al proveedor ejemplares que ya se vendieron',() => {
  const {store} = setup(); store.registrarOperacion('ventas',{personaId:1,pago:'Transferencia',lineas:[{libroId:1,cantidad:11}]});
  assert.throws(() => store.registrarDevuelto({tipo:'compras',documentoId:1,libroId:1,cantidad:2,motivo:'Prueba'}),/Solo hay 1/);
  assert.equal(store.datos.libros[0].existencias,1);
});
test('los importes históricos no cambian al editar un libro de la fase 2',() => {
  const a = setup(); sale(a.store); const catalog = JSON.parse(a.storage.get(key2)); catalog.libros.find(book => book.id===8).precio=99000; a.storage.set(key2,JSON.stringify(catalog));
  const b = setup({storage:a.storage}); const result = b.store.registrarDevuelto({tipo:'ventas',documentoId:2,libroId:8,cantidad:1,motivo:'Prueba'});
  assert.equal(result.record.total,32000); assert.equal(b.store.datos.libros.find(book => book.id===8).precio,99000);
});
test('si falla el segundo guardado, revierte el catálogo y no registra la compra',() => {
  const a = setup({failWrite:key => key === key3});
  assert.throws(() => purchase(a.store),/No se pudo guardar/);
  assert.equal(a.store.datos.libros[0].existencias,12); assert.equal(a.store.datos.compras.length,1); assert.equal(a.storage.has(key2),false);
});
test('datos modificados en otra pestaña no se sobrescriben',() => {
  const a = setup(); const b = setup({storage:a.storage}); purchase(a.store);
  assert.throws(() => sale(b.store),/otra pantalla/); assert.equal(JSON.parse(a.storage.get(key3)).ventas.length,1);
});
test('almacenamiento bloqueado conserva operación temporal; datos corruptos no se reemplazan',() => {
  const a = setup({blockedRead:true}); assert.equal(a.store.temporal,true); assert.equal(purchase(a.store).persistido,false);
  assert.equal(a.store.datos.libros[0].existencias,15);
  const storage = new Map([[key3,'malformado']]); const b = setup({storage}); assert.equal(b.store.invalido,true);
  assert.throws(() => sale(b.store),/datos guardados/); assert.equal(storage.get(key3),'malformado');
});

// DOM mínimo para probar eventos de la interfaz sin paquetes ni navegador.
class Element {
  constructor(tag) { this.tag=tag; this.children=[]; this.attrs={}; this.dataset={}; this.events={}; this.value=''; this.classList={toggle(){}}; this.validity={valid:true}; }
  get value() { return this._value; } set value(value) { this._value=String(value); }
  append(...items) { for (const item of items) { item.parent=this; this.children.push(item); } }
  replaceChildren(...items) { this.children=[]; this.append(...items); }
  setAttribute(key,value) { this.attrs[key]=value; } removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(type,handler) { this.events[type]=handler; }
  focus() { this.focused=true; }
  after(item) { item.parent=this.parent; this.parent?.children.push(item); }
  remove() { if (this.parent) this.parent.children=this.parent.children.filter(item=>item!==this); }
  all() { return this.children.flatMap(child=>[child,...child.all()]); }
  querySelectorAll(selector) { return this.all().filter(item => selector === '.field-error' ? item.className === 'field-error' : selector === '[aria-invalid]' ? 'aria-invalid' in item.attrs : selector === '[aria-invalid="true"]' ? item.attrs['aria-invalid']==='true' : false); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  async fire(type,extra={}) { return this.events[type]?.({preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...extra}); }
}
function ui(page,{confirm=true,search='',storage}={}) {
  const app = setup({storage}); const html=fs.readFileSync(path.join(root,'pantallas',`${page}.html`),'utf8'); const nodes=new Map(); const forms=[];
  for (const match of html.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const e=new Element(match[1]); e.id=match[3]; e.defaultValue=match[2].match(/\bvalue="([^"]*)"/)?.[1]||''; e.value=e.defaultValue;
    e.dataset.hint=match[2].match(/data-hint="([^"]+)"/)?.[1]; e.hidden=/\bhidden\b/.test(match[2]); nodes.set(e.id,e); if(e.tag==='form')forms.push(e);
  }
  for(const form of forms) { for(const match of html.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/g)) form.append(nodes.get(match[1])); form.reset=()=>form.children.filter(item=>['input','select','textarea'].includes(item.tag)).forEach(item=>{item.value=item.defaultValue;}); }
  if(nodes.has('origen')) { nodes.get('origen').value='ventas'; nodes.get('origen').defaultValue='ventas'; }
  nodes.set('volver',new Element('button')); const confirmations=[];
  Object.assign(app.ctx,{document:{body:{dataset:{page}},getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag)},Node:Element,location:{search,href:''},URLSearchParams});
  app.ctx.window.Libreria={confirmar:async options=>{confirmations.push(options); return confirm;}};
  vm.runInContext(fs.readFileSync(path.join(root,'js/fase3.js'),'utf8'),app.ctx);
  return {...app,nodes,confirmations,set(values){Object.entries(values).forEach(([key,value])=>{nodes.get(key).value=value;});}};
}
async function prepareSale(a) {
  a.set({persona:1}); await a.nodes.get('continuar').fire('click');
  a.set({libro:8,cantidad:2}); await a.nodes.get('libro').fire('change'); await a.nodes.get('agregar-libro').fire('click');
  await a.nodes.get('continuar').fire('click'); a.set({pago:'Tarjeta'});
}
test('recorrido de venta en tres pasos, confirmación, éxito y prevención de doble registro',async () => {
  const a=ui('ventas'); await a.nodes.get('continuar').fire('click'); assert.equal(a.nodes.get('persona').attrs['aria-invalid'],'true');
  await prepareSale(a); assert.equal(a.nodes.get('paso-3').hidden,false); assert.equal(a.nodes.get('continuar').textContent,'↗ Enviar factura electrónica');
  await a.nodes.get('continuar').fire('click'); await a.nodes.get('continuar').fire('click');
  assert.equal(a.confirmations.length,1); assert.equal(a.store.datos.ventas.length,2); assert.equal(a.ctx.location.href,'venta-exito.html?id=2');
  assert.ok(a.confirmations[0].mensaje.includes('simulación'));
});
test('cancelar confirmación de factura conserva paso y libros sin registrar nada',async () => {
  const a=ui('ventas',{confirm:false}); await prepareSale(a); await a.nodes.get('continuar').fire('click');
  assert.equal(a.store.datos.ventas.length,1); assert.equal(a.nodes.get('paso-3').hidden,false); assert.equal(a.ctx.location.href,'');
  await a.nodes.get('anterior').fire('click'); assert.equal(a.nodes.get('paso-2').hidden,false); assert.ok(a.nodes.get('total-parcial').textContent.includes('64'));
});
test('compra guiada muestra éxito y permite iniciar otra sin duplicar la anterior',async () => {
  const a=ui('compras'); a.set({persona:1}); await a.nodes.get('continuar').fire('click');
  a.set({libro:1,cantidad:3,precio:40000}); await a.nodes.get('agregar-libro').fire('click'); await a.nodes.get('continuar').fire('click'); await a.nodes.get('continuar').fire('click');
  assert.equal(a.nodes.get('exito').hidden,false); assert.equal(a.nodes.get('registro').hidden,true); assert.equal(a.store.datos.compras.length,2);
  await a.nodes.get('nuevo-registro').fire('click'); assert.equal(a.nodes.get('registro').hidden,false); assert.equal(a.store.datos.compras.length,2);
});
test('pantalla de éxito no registra otra venta al recargar y contempla registro inexistente',() => {
  const a=ui('venta-exito',{search:'?id=1'}); assert.ok(a.nodes.get('referencia').textContent.includes('V-0001')); assert.equal(a.store.datos.ventas.length,1);
  const b=ui('venta-exito',{search:'?id=999'}); assert.equal(b.nodes.get('comprobante').hidden,true); assert.ok(b.nodes.get('estado').textContent.includes('No encontramos'));
});
test('filtro separa clientes y proveedores; formulario valida datos vacíos',async () => {
  const a=ui('clientes-proveedores'); a.set({filtro:'clientes',buscar:''}); await a.nodes.get('filtro').fire('change'); assert.equal(a.nodes.get('resultados').textContent,'6 registros encontrados.');
  a.set({filtro:'proveedores'}); await a.nodes.get('filtro').fire('change'); assert.equal(a.nodes.get('resultados').textContent,'4 registros encontrados.');
  a.set({filtro:'todos',buscar:'sin-coincidencias'}); await a.nodes.get('buscar').fire('input'); assert.equal(a.nodes.get('resultados').textContent,'0 registros encontrados.');
  const b=ui('cliente-proveedor-form'); await b.nodes.get('persona-form').fire('submit'); assert.equal(b.nodes.get('nombre').attrs['aria-invalid'],'true');
});
test('interfaz de libros devueltos valida, confirma y limpia los campos',async () => {
  const a=ui('libros-devueltos'); a.set({documento:1}); await a.nodes.get('documento').fire('change'); a.set({'libro-devuelto':8,'cantidad-devuelta':3,motivo:'Prueba'}); await a.nodes.get('devuelto-form').fire('submit');
  assert.equal(a.nodes.get('cantidad-devuelta').attrs['aria-invalid'],'true');
  a.set({'cantidad-devuelta':1}); await a.nodes.get('devuelto-form').fire('submit'); assert.equal(a.confirmations.length,1); assert.equal(a.store.datos.devueltos.length,1); assert.ok(a.nodes.get('estado').textContent.includes('María'));
});
function barcodeStorage(duplicate=false){
  const a=setup();const data=a.store.datos;data.libros.find(book=>book.id===8).codigoBarras='0012345678905';if(duplicate)data.libros[0].codigoBarras='0012345678905';
  a.storage.set(key2,JSON.stringify(Object.fromEntries(['usuarios','libros','autores','tiposDeLibro','casasEditoriales'].map(name=>[name,data[name]]))));return a.storage;
}
test('venta por código: Enter encuentra el libro, conserva ceros y registra el código en la venta',async()=>{
  const a=ui('ventas',{storage:barcodeStorage()});a.set({persona:1});await a.nodes.get('continuar').fire('click');
  a.set({'codigo-barras':'0012345678905'});let prevented=false;await a.nodes.get('codigo-barras').fire('keydown',{key:'Enter',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(a.nodes.get('libro').value,'8');assert.equal(a.nodes.get('precio').value,'32000');assert.equal(a.nodes.get('cantidad').focused,true);assert.equal(a.store.datos.ventas.length,1);
  a.set({cantidad:2});await a.nodes.get('agregar-libro').fire('click');assert.equal(a.nodes.get('codigo-barras').value,'');assert.equal(a.nodes.get('codigo-barras').focused,true);
  await a.nodes.get('continuar').fire('click');a.set({pago:'Efectivo'});await a.nodes.get('continuar').fire('click');assert.equal(a.store.datos.ventas.at(-1).lineas[0].codigoBarras,'0012345678905');
});
test('compra por código permite indicar costo sin cambiar el precio de venta del libro',async()=>{
  const a=ui('compras',{storage:barcodeStorage()});a.set({persona:1});await a.nodes.get('continuar').fire('click');a.set({'codigo-barras':'0012345678905'});await a.nodes.get('buscar-codigo').fire('click');assert.equal(a.nodes.get('precio').value,'');
  a.set({cantidad:3,precio:25000});await a.nodes.get('agregar-libro').fire('click');await a.nodes.get('continuar').fire('click');await a.nodes.get('continuar').fire('click');
  assert.equal(a.store.datos.compras.at(-1).total,75000);assert.equal(a.store.datos.compras.at(-1).lineas[0].codigoBarras,'0012345678905');assert.equal(a.store.datos.libros.find(book=>book.id===8).precio,32000);
});
test('códigos desconocidos o repetidos no dejan seleccionado un libro anterior',async()=>{
  const a=ui('ventas',{storage:barcodeStorage()});a.set({persona:1});await a.nodes.get('continuar').fire('click');a.set({'codigo-barras':'0012345678905'});await a.nodes.get('buscar-codigo').fire('click');assert.equal(a.nodes.get('libro').value,'8');
  a.set({'codigo-barras':'DESCONOCIDO'});await a.nodes.get('codigo-barras').fire('input');assert.equal(a.nodes.get('libro').value,'');await a.nodes.get('buscar-codigo').fire('click');assert.equal(a.nodes.get('codigo-barras').attrs['aria-invalid'],'true');assert.equal(a.store.datos.ventas.length,1);
  const b=ui('ventas',{storage:barcodeStorage(true)});b.set({persona:1});await b.nodes.get('continuar').fire('click');b.set({'codigo-barras':'0012345678905'});await b.nodes.get('buscar-codigo').fire('click');assert.equal(b.nodes.get('libro').value,'');assert.equal(b.nodes.get('codigo-barras').attrs['aria-invalid'],'true');
});
