const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {read,pages}=require('./auditoria.cjs');
function setup() {
  const observers=[]; let active;
  class Element {
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.events={};this.hidden=false;this.disabled=false;this.id='';this._text='';}
    set textContent(value){this._text=String(value);this.children=[];}
    get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
    append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
    after(item){item.parent=this.parent;const index=this.parent.children.indexOf(this);this.parent.children.splice(index+1,0,item);}
    replaceChildren(...items){this.children.forEach(item=>{item.parent=null;});this.children=[];this.append(...items);}
    setAttribute(key,value){this.attrs[key]=String(value);}
    getAttribute(key){return this.attrs[key]??null;}
    removeAttribute(key){delete this.attrs[key];}
    addEventListener(type,handler){(this.events[type]??=[]).push(handler);}
    dispatchEvent(event){for(const handler of this.events[event.type]||[])handler(event);return true;}
    fire(type,props={}){this.dispatchEvent({type,preventDefault(){},stopPropagation(){},...props});}
    focus(){active=this;}
    contains(item){return item===this||this.children.some(child=>child.contains(item));}
    all(){return this.children.flatMap(child=>[child,...child.all()]);}
    closest(){return null;}
    get selected(){return this.parent instanceof Select && this.parent.options[this.parent.selectedIndex]===this;}
  }
  class Select extends Element {
    constructor(){super('select');this._index=0;}
    get options(){return this.children;}
    get selectedIndex(){return this._index;}
    set selectedIndex(value){this._index=Number(value);}
    get value(){return this.options[this._index]?.value??'';}
    set value(value){this._index=this.options.findIndex(option=>option.value===String(value));}
  }
  const body=new Element('body'),label=new Element('label'),select=new Select(),form=new Element('form');
  label.htmlFor='autor';label.textContent='Autor';select.id='autor';select.required=true;select.form=form;
  const initial=[['','Elija una opción'],['1','Gabriel García Márquez'],['2','Laura Restrepo'],['3','Piedad Bonnett']];
  function add(value,text){const option=new Element('option');option.value=value;option.textContent=text;select.append(option);return option;}
  initial.forEach(([value,text])=>add(value,text));body.append(label,select);
  const doc={body,readyState:'complete',createElement:tag=>new Element(tag),querySelectorAll:tag=>body.all().filter(item=>item.tagName===tag.toUpperCase()),addEventListener(){}};
  const ctx={document:doc,window:{},HTMLSelectElement:Select,Event:class {constructor(type){this.type=type;}},queueMicrotask,MutationObserver:class {constructor(handler){this.handler=handler;}observe(target){this.target=target;observers.push(this);}}};
  vm.createContext(ctx);vm.runInContext(read('js/listas-filtrables.js'),ctx);
  const get=id=>body.all().find(item=>item.id===id);
  const trigger=get('autor-selector'),input=get('autor-selector-buscar'),panel=get('autor-selector-panel'),results=get('autor-selector-resultados');
  const flush=()=>observers.filter(observer=>observer.target===select).forEach(observer=>observer.handler([]));
  return {select,label,body,form,trigger,input,panel,results,get,add,flush,get active(){return active;}};
}
test('las 26 páginas cargan la mejora compartida sin dependencias',()=>{
  for(const page of pages()) assert.ok(read(page).includes('js/listas-filtrables.js'),page);
});
test('abrir una lista enfoca la búsqueda y conserva una etiqueta y el control original',()=>{
  const a=setup();assert.equal(a.select.hidden,true);assert.equal(a.label.htmlFor,a.trigger.id);assert.equal(a.panel.hidden,true);
  a.trigger.fire('click');assert.equal(a.panel.hidden,false);assert.equal(a.active,a.input);assert.equal(a.results.children.length,4);assert.equal(a.trigger.getAttribute('aria-expanded'),'true');
});
test('búsqueda parcial sin tildes y selección actualizan el dato y disparan change',()=>{
  const a=setup();let changes=0;a.select.addEventListener('change',()=>changes++);a.trigger.fire('click');a.input.value='garcia';a.input.fire('input');
  assert.equal(a.results.children.length,1);assert.ok(a.results.children[0].textContent.includes('García'));
  a.results.children[0].fire('click');assert.equal(a.select.value,'1');assert.equal(changes,1);assert.equal(a.panel.hidden,true);assert.equal(a.active,a.trigger);assert.equal(a.get('autor-selector-valor').textContent,'Gabriel García Márquez');
});
test('sin coincidencias no cambia el valor elegido y Escape conserva la selección',()=>{
  const a=setup();a.select.value='2';a.trigger.fire('click');a.input.value='sin-coincidencias';a.input.fire('input');assert.equal(a.results.children.length,0);assert.equal(a.select.value,'2');
  const widget=a.trigger.parent;widget.fire('keydown',{key:'Escape'});assert.equal(a.panel.hidden,true);assert.equal(a.active,a.trigger);assert.equal(a.select.value,'2');
});
test('teclado: flechas, Enter único y cierre sin enviar el formulario',()=>{
  const a=setup();a.trigger.fire('keydown',{key:'ArrowDown'});a.input.fire('keydown',{key:'ArrowDown'});assert.equal(a.active,a.results.children[0]);
  a.results.children[0].fire('keydown',{key:'ArrowDown'});assert.equal(a.active,a.results.children[1]);
  a.input.value='bonnett';a.input.fire('input');a.input.fire('keydown',{key:'Enter'});assert.equal(a.select.value,'3');assert.equal(a.panel.hidden,true);
});
test('modificar un registro y resetear el formulario mantienen sincronizado el valor visible',async()=>{
  const a=setup();a.select.value='2';assert.equal(a.get('autor-selector-valor').textContent,'Laura Restrepo');
  a.select.selectedIndex=1;assert.equal(a.get('autor-selector-valor').textContent,'Gabriel García Márquez');
  a.form.fire('reset');a.select._index=0;await Promise.resolve();assert.equal(a.get('autor-selector-valor').textContent,'Elija una opción');
});
test('opciones agregadas después, campos desactivados y errores se reflejan en la interfaz',()=>{
  const a=setup();a.add('4','José Eustasio Rivera');a.flush();a.trigger.fire('click');a.input.value='jose';a.input.fire('input');assert.equal(a.results.children.length,1);
  a.select.setAttribute('aria-invalid','true');a.select.setAttribute('aria-describedby','autor-error');a.flush();assert.equal(a.trigger.getAttribute('aria-invalid'),'true');assert.equal(a.trigger.getAttribute('aria-describedby'),'autor-error');
  a.select.focus();assert.equal(a.active,a.trigger);
  a.select.disabled=true;a.flush();assert.equal(a.trigger.disabled,true);assert.equal(a.input.disabled,true);assert.equal(a.panel.hidden,true);
});
