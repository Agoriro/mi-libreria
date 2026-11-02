/* node --test verificacion/fase2.test.cjs
   Pruebas de interacción con DOM y almacenamiento simulados, sin dependencias. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
class Element {
  get value() { return this._value; }
  set value(value) { this._value = String(value); }
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.events = {}; this.value = ''; this.textContent = ''; }
  append(...items) { items.forEach(item => { item.parent = this; this.children.push(item); }); }
  replaceChildren(...items) { this.children = []; this.append(...items); }
  setAttribute(key,value) { this.attrs[key] = value; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(type,fn) { this.events[type] = fn; }
  focus() { this.focused = true; }
  after(item) { item.parent = this.parent; this.parent?.children.push(item); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); }
  all() { return this.children.flatMap(child => [child,...child.all()]); }
  querySelectorAll(selector) {
    return this.all().filter(child => selector === '.field-error' ? child.className === 'field-error' : selector === '[aria-invalid]' ? 'aria-invalid' in child.attrs : selector === '[aria-invalid="true"]' ? child.attrs['aria-invalid'] === 'true' : false);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  async fire(type,extra={}) { return this.events[type]?.({preventDefault(){},stopPropagation(){},currentTarget:this,...extra}); }
}
function setup(page,{search='',storage=new Map(),confirm=true,blocked=false} = {}) {
  const html = fs.readFileSync(path.join(root,'pantallas',`${page}.html`),'utf8');
  const nodes = new Map();
  for (const match of html.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const element = new Element(match[1]); element.id = match[3];
    element.type = match[2].match(/\btype="([^"]+)"/)?.[1] || '';
    element.dataset.hint = match[2].match(/data-hint="([^"]+)"/)?.[1];
    element.validity = {valid:true}; nodes.set(element.id,element);
  }
  const form = new Element('form'); form.fields = {};
  for (const match of html.matchAll(/<(input|select)\b[^>]*\bname="([^"]+)"[^>]*>/g)) {
    const fieldId = match[0].match(/\bid="([^"]+)"/)?.[1];
    const field = nodes.get(fieldId); form.fields[match[2]] = field; form.append(field);
  }
  form.elements = {namedItem: name => form.fields[name],...form.fields};
  form.reset = () => Object.values(form.fields).forEach(field => { field.value = ''; });
  const document = {
    body:{dataset:{page}},
    createElement: tag => new Element(tag),
    querySelector: selector => selector === 'form' ? form : selector === 'h1' ? (nodes.get('h1') || nodes.set('h1',new Element('h1')).get('h1')) : nodes.get(selector.slice(1)),
    querySelectorAll: () => []
  };
  const ctx = {
    window:{Libreria:{confirmar:async () => confirm,informar:async () => { ctx.informed = true; }}},
    document,localStorage:{getItem:key => storage.get(key) ?? null,setItem:(key,value) => { if (blocked) throw Error('Bloqueado'); storage.set(key,value); }},
    location:{search,href:''},URLSearchParams,Intl,Node:Element,
    FormData:class { constructor(f) { this.entries = Object.entries(f.fields).map(([name,field]) => [name,field.value]); } [Symbol.iterator]() { return this.entries[Symbol.iterator](); } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'js/fase2.js'),'utf8'),ctx);
  return {ctx,nodes,form,data:ctx.window.LibreriaDatos,storage,
    fill(values) { Object.entries(values).forEach(([name,value]) => { form.fields[name].value = String(value); }); },
    findButton(text) { return nodes.get('lista').all().find(node => node.tag === 'button' && node.textContent === text); }
  };
}
test('los ocho HTML tienen estructura, scripts locales y un solo botón principal',() => {
  for (const page of ['usuarios','usuario-form','usuario-clave','libros','libro-form','autores','tipos-de-libro','casas-editoriales']) {
    const html = fs.readFileSync(path.join(root,'pantallas',`${page}.html`),'utf8');
    assert.equal((html.match(/class="button primary"/g)||[]).length,1,page);
    for (const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
      assert.ok(fs.existsSync(path.resolve(root,'pantallas',match[1])),`${page}: ${match[1]}`);
    }
    assert.ok(html.includes('data-shell') && html.includes('data-menu') && html.includes('id="contenido"'));
    assert.equal(/style=|#[a-f0-9]{6}\b|\b\d+px\b/i.test(html),false);
  }
});
test('crear usuario, persistir y cargar la lista en otra página',async () => {
  const a = setup('usuario-form'); a.fill({nombre:'Usuario de prueba',usuario:'prueba',correo:'prueba@example.com',rol:'Consulta',estado:'Activo'});
  await a.form.fire('submit'); assert.equal(a.ctx.location.href,'usuarios.html?guardado=1');
  const b = setup('usuarios',{storage:a.storage}); assert.equal(b.data.usuarios.length,4);
  assert.equal(b.data.usuarios[3].usuario,'prueba');
});
test('rechaza usuarios duplicados y protege a la última persona encargada',async () => {
  const a = setup('usuario-form'); a.fill({nombre:'Prueba',usuario:'LIBRERIA',correo:'p@example.com',rol:'Consulta',estado:'Activo'});
  await a.form.fire('submit'); assert.equal(a.form.fields.usuario.attrs['aria-invalid'],'true'); assert.equal(a.data.usuarios.length,3);
  const b = setup('usuario-form',{search:'?id=1'}); b.fill({rol:'Consulta'}); await b.form.fire('submit'); assert.equal(b.form.fields.rol.attrs['aria-invalid'],'true');
});
test('editar libro conserva relaciones y rechaza cantidades negativas',async () => {
  const a = setup('libro-form',{search:'?id=1'}); a.fill({titulo:'Título corregido',existencias:-1}); await a.form.fire('submit');
  assert.equal(a.form.fields.existencias.attrs['aria-invalid'],'true');
  a.fill({existencias:3,precio:45000}); await a.form.fire('submit');
  assert.equal(a.ctx.location.href,'libros.html?guardado=1'); assert.equal(a.data.libros[0].titulo,'Título corregido'); assert.equal(a.data.libros[0].autorId,1);
  assert.equal(a.form.fields.existencias.attrs['aria-invalid'],undefined);
});
test('búsqueda sin tildes encuentra María y muestra estado vacío',async () => {
  const a = setup('libros'); a.nodes.get('buscar').value='maria'; await a.nodes.get('buscar').fire('input');
  assert.equal(a.nodes.get('cantidad-resultados').textContent,'1 de 20 libros.');
  a.nodes.get('buscar').value='sin-coincidencias'; await a.nodes.get('buscar').fire('input');
  assert.equal(a.nodes.get('cantidad-resultados').textContent,'0 de 20 libros.'); assert.equal(a.nodes.get('lista').children[0].tag,'p');
});
test('catálogo crea, modifica y elimina; cancelar conserva los datos',async () => {
  const a = setup('autores'); a.fill({nombre:'Autor de prueba'}); await a.form.fire('submit'); assert.equal(a.data.autores.length,9);
  const edit = a.nodes.get('lista').all().filter(node => node.tag==='button' && node.textContent==='✎ Modificar').at(-1); await edit.fire('click');
  a.fill({nombre:'Autor corregido'}); await a.form.fire('submit'); assert.equal(a.data.autores.at(-1).nombre,'Autor corregido');
  const del = a.nodes.get('lista').all().filter(node => node.tag==='button' && node.textContent==='× Eliminar').at(-1); await del.fire('click'); assert.equal(a.data.autores.length,8);
  const b = setup('libros',{confirm:false}); await b.findButton('× Eliminar').fire('click'); assert.equal(b.data.libros.length,20);
  const c = setup('libros'); await c.findButton('× Eliminar').fire('click'); assert.equal(c.data.libros.length,19);
});
test('autores asociados no se eliminan y renombrar tipos actualiza libros',async () => {
  const a = setup('autores'); await a.findButton('× Eliminar').fire('click'); assert.equal(a.data.autores.length,8); assert.equal(a.ctx.informed,true);
  const b = setup('tipos-de-libro'); await b.findButton('✎ Modificar').fire('click'); b.fill({nombre:'Narrativa'}); await b.form.fire('submit');
  assert.equal(b.data.libros[0].tipo,'Narrativa'); assert.equal(b.data.libros[0].tipoId,1);
});
test('contraseñas: comprueba coincidencia y nunca las persiste',async () => {
  const a = setup('usuario-clave',{search:'?id=1'}); a.fill({actual:'lectura',nueva:'inventada123',repetir:'otra'}); await a.form.fire('submit'); assert.equal(a.form.fields.repetir.attrs['aria-invalid'],'true');
  a.fill({repetir:'inventada123'}); await a.form.fire('submit');
  assert.ok(a.nodes.get('estado').textContent.includes('simulado')); assert.equal(a.form.fields.nueva.value,'');
  assert.equal([...a.storage.values()].some(value => value.includes('inventada123')),false);
});
test('registro inexistente y almacenamiento bloqueado informan sin romper la página',async () => {
  const a = setup('libro-form',{search:'?id=9999'}); assert.equal(a.form.hidden,true);
  const b = setup('usuario-form',{blocked:true}); b.fill({nombre:'Prueba',usuario:'prueba',correo:'p@example.com',rol:'Consulta',estado:'Activo'}); await b.form.fire('submit'); await b.form.fire('submit');
  assert.equal(b.data.usuarios.length,4); assert.equal(b.ctx.location.href,''); assert.ok(b.nodes.get('estado').textContent.includes('solo en esta pantalla'));
});
test('código de barras: editar, conservar ceros iniciales, persistir y buscar',async()=>{
  const a=setup('libro-form',{search:'?id=1'});a.fill({codigoBarras:'0012345678905'});await a.form.fire('submit');
  assert.equal(a.data.libros[0].codigoBarras,'0012345678905');
  const b=setup('libro-form',{search:'?id=1',storage:a.storage});assert.equal(b.form.fields.codigoBarras.value,'0012345678905');
  await b.form.fire('submit');assert.equal(b.ctx.location.href,'libros.html?guardado=1');
  const c=setup('libros',{storage:b.storage});c.nodes.get('buscar').value='0012345678905';await c.nodes.get('buscar').fire('input');assert.equal(c.nodes.get('cantidad-resultados').textContent,'1 de 20 libros.');
});
test('el código no se puede repetir en otro libro y debe tener un formato legible',async()=>{
  const a=setup('libro-form',{search:'?id=1'});a.fill({codigoBarras:'LIB-001'});await a.form.fire('submit');
  const b=setup('libro-form',{search:'?id=2',storage:a.storage});b.fill({codigoBarras:'LIB-001'});await b.form.fire('submit');assert.equal(b.form.fields.codigoBarras.attrs['aria-invalid'],'true');assert.equal(b.ctx.location.href,'');
  b.fill({codigoBarras:'código con espacios'});await b.form.fire('submit');assert.equal(b.form.fields.codigoBarras.attrs['aria-invalid'],'true');
});
test('un libro anterior sin código se puede modificar y el lector no envía el formulario al pulsar Enter',async()=>{
  const a=setup('libro-form',{search:'?id=1'});let prevented=false;
  await a.form.fields.codigoBarras.fire('keydown',{key:'Enter',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(a.form.fields.autorId.focused,true);assert.equal(a.ctx.location.href,'');
  a.fill({codigoBarras:''});await a.form.fire('submit');assert.equal(a.ctx.location.href,'libros.html?guardado=1');assert.equal(a.data.libros[0].codigoBarras,'');
});
