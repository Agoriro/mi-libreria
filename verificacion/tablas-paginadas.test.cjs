const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {read,pages}=require('./auditoria.cjs');
function setup(count=20) {
  const observers=[],tables=[];
  class Element {
    constructor(tag,text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.attrs={};this.events={};this.dataset={};this.classes=new Set();this.classList={add:name=>this.classes.add(name)};this.hidden=false;}
    append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
    after(item){item.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,item);}
    setAttribute(name,value){this.attrs[name]=value;}
    addEventListener(type,handler){this.events[type]=handler;}
    fire(type){this.events[type]?.();}
    focus(){this.focused=true;}
  }
  const root=new Element('div');
  function create(size){
    const table=new Element('table'),head=new Element('thead'),body=new Element('tbody'),caption=new Element('caption','Libros de la librería');
    const header=new Element('tr');header.cells=['Libro','Precio','Cantidad','Acciones'].map(text=>new Element('th',text));head.rows=[header];
    body.rows=Array.from({length:size},(_,index)=>{const row=new Element('tr');row.cells=[new Element('th',`Libro ${index+1}`),new Element('td','$ 65.000'),new Element('td','12'),new Element('td','Modificar')];return row;});
    table.tBodies=[body];table.tHead=head;table.caption=caption;root.append(table);tables.push(table);return table;
  }
  const table=create(count);
  const ctx={document:{body:root,readyState:'complete',createElement:tag=>new Element(tag),querySelectorAll:()=>tables},MutationObserver:class {constructor(callback){this.callback=callback;}observe(target){this.target=target;observers.push(this);}}};
  vm.createContext(ctx);vm.runInContext(read('js/tablas-paginadas.js'),ctx);
  const nav=()=>root.children.find(item=>item.tagName==='NAV');
  return {table,root,nav,create,visible:()=>table.tBodies[0].rows.filter(row=>!row.hidden),refresh:()=>observers.find(item=>item.target===table.tBodies[0]).callback([]),scan:()=>observers.find(item=>item.target===root).callback([{addedNodes:[{nodeType:1,tagName:'TABLE'}]}])};
}
test('las 26 páginas activan el componente compartido',()=>{for(const page of pages())assert.ok(read(page).includes('js/tablas-paginadas.js'),page);});
test('la lista conserva 20 filas pero muestra solo diez por página',()=>{
  const a=setup();assert.equal(a.table.tBodies[0].rows.length,20);assert.equal(a.visible().length,10);
  assert.equal(a.nav().children[1].textContent,'Página 1 de 2 · Registros 1 a 10 de 20');
  assert.equal(a.nav().children[0].disabled,true);
  a.nav().children[2].fire('click');assert.equal(a.visible().length,10);assert.equal(a.visible()[0].cells[0].textContent,'Libro 11');assert.equal(a.nav().children[2].disabled,true);assert.equal(a.table.caption.focused,true);
  a.nav().children[0].fire('click');assert.equal(a.visible()[0].cells[0].textContent,'Libro 1');
});
test('la última página muestra los registros sobrantes y los límites funcionan',()=>{
  const a=setup(21);a.nav().children[2].fire('click');a.nav().children[2].fire('click');assert.equal(a.visible().length,1);assert.equal(a.nav().children[1].textContent,'Página 3 de 3 · Registros 21 a 21 de 21');
  a.nav().children[2].fire('click');assert.equal(a.visible().length,1);
});
test('listas de diez o menos no muestran controles innecesarios',()=>{
  for(const count of [0,1,10]){const a=setup(count);assert.equal(a.visible().length,count);assert.equal(a.nav().children[0].hidden,true);assert.equal(a.nav().children[2].hidden,true);assert.equal(a.nav().hidden,count===0);}
});
test('al eliminar registros se ajusta una página final que dejó de existir',()=>{
  const a=setup(21);a.nav().children[2].fire('click');a.nav().children[2].fire('click');a.table.tBodies[0].rows.pop();a.refresh();assert.equal(a.nav().children[1].textContent,'Página 2 de 2 · Registros 11 a 20 de 20');assert.equal(a.visible().length,10);
});
test('una tabla reconstruida por el filtro comienza en la primera página',()=>{
  const a=setup();a.nav().children[2].fire('click');const filtered=a.create(3);a.scan();const last=a.root.children.at(-1);assert.equal(last.tagName,'NAV');assert.equal(last.children[1].textContent,'Página 1 de 1 · Registros 1 a 3 de 3');assert.ok(filtered.tBodies[0].rows.every(row=>!row.hidden));
});
test('etiquetas accesibles y clases numéricas se conservan al adaptar filas',()=>{
  const a=setup();const cells=a.table.tBodies[0].rows[0].cells;assert.equal(cells[0].dataset.label,'Libro');assert.equal(cells[0].attrs.role,'rowheader');assert.equal(cells[1].dataset.label,'Precio');assert.ok(cells[1].classes.has('cell-number'));assert.ok(cells[2].classes.has('cell-number'));assert.equal(a.table.attrs.role,'table');
});
test('los estilos permiten texto partido por líneas e imprimen todas las filas',()=>{
  const css=read('css/components.css');assert.equal(css.includes('.table-wrap { overflow-x: auto; }'),false);assert.ok(css.includes('display: var(--list-row-display)'));assert.ok(css.includes('.paginated-table tbody tr[hidden] { display: table-row !important; }'));assert.ok(css.includes('.pagination { display: none !important; }'));
});
