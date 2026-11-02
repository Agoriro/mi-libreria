/* Mejora progresiva: conserva los select originales y sus datos de formulario. */
(() => {
  'use strict';
  const enhanced = new WeakSet();
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CO').trim();
  const make = (tag,text,className) => { const item = document.createElement(tag); if (text != null) item.textContent = text; if (className) item.className = className; return item; };
  function enhance(select) {
    if (enhanced.has(select) || select.multiple || !select.id) return;
    const label = [...document.querySelectorAll('label')].find(item => item.htmlFor === select.id);
    if (!label) return;
    enhanced.add(select);
    const base = `${select.id}-selector`;
    if (!label.id) label.id = `${base}-etiqueta`;
    const widget = make('div',null,'search-select');
    const trigger = make('button',null,'button search-select-trigger');
    trigger.id = base; trigger.type = 'button';
    const icon = make('span','▾'); icon.setAttribute('aria-hidden','true');
    const value = make('span'); value.id = `${base}-valor`;
    trigger.append(icon,value);
    trigger.setAttribute('aria-labelledby',`${label.id} ${value.id}`);
    trigger.setAttribute('aria-expanded','false');
    const panel = make('div',null,'search-select-panel'); panel.id = `${base}-panel`; panel.hidden = true;
    trigger.setAttribute('aria-controls',panel.id);
    const searchLabel = make('label','Buscar una opción');
    const input = make('input'); input.id = `${base}-buscar`; input.type = 'search'; input.autocomplete = 'off';
    searchLabel.htmlFor = input.id;
    input.setAttribute('aria-labelledby',`${label.id} ${base}-buscar-etiqueta`); searchLabel.id = `${base}-buscar-etiqueta`;
    const help = make('p','Escriba parte del nombre. Use las flechas y Enter, o pulse una opción.','hint'); help.id = `${base}-ayuda`;
    input.setAttribute('aria-describedby',help.id);
    const status = make('p',null,'hint'); status.setAttribute('role','status'); status.setAttribute('aria-atomic','true');
    const results = make('div',null,'search-select-results'); results.id = `${base}-resultados`;
    results.setAttribute('role','group'); results.setAttribute('aria-label',`Opciones de ${label.textContent.trim()}`);
    input.setAttribute('aria-controls',results.id);
    panel.append(searchLabel,input,help,status,results); widget.append(trigger,panel);
    select.after(widget); select.hidden = true; label.htmlFor = trigger.id;
    let matches = [], buttons = [];
    const close = (restore = false) => {
      panel.hidden = true; trigger.setAttribute('aria-expanded','false');
      if (restore) trigger.focus();
    };
    function sync() {
      const selected = select.options[select.selectedIndex];
      value.textContent = selected?.textContent || 'Elija una opción';
      trigger.disabled = select.disabled;
      input.disabled = select.disabled;
      trigger.setAttribute('aria-description',select.required ? 'Campo obligatorio. Abra la lista para buscar y elegir una opción.' : 'Abra la lista para buscar y elegir una opción.');
      for (const attr of ['aria-invalid','aria-describedby']) {
        const content = select.getAttribute(attr);
        if (content === null) trigger.removeAttribute(attr); else trigger.setAttribute(attr,content);
      }
      if (select.disabled) close();
    }
    function choose(option) {
      if (select.disabled || option.disabled || !select.contains(option)) return;
      select.value = option.value;
      select.dispatchEvent(new Event('input',{bubbles:true}));
      select.dispatchEvent(new Event('change',{bubbles:true}));
      sync(); close(true);
    }
    function render() {
      const query = normalize(input.value);
      matches = [...select.options].filter(option => !option.disabled && !option.closest('optgroup')?.disabled && !option.hidden && normalize(option.textContent).includes(query));
      results.replaceChildren(); buttons = [];
      status.textContent = matches.length ? `${matches.length} opciones encontradas.` : 'No hay coincidencias. Pruebe con otra palabra.';
      matches.forEach((option,index) => {
        const item = make('button',null,'button'); item.type = 'button';
        const mark = make('span',option.selected ? '✓' : '→'); mark.setAttribute('aria-hidden','true');
        item.append(mark,make('span',option.textContent));
        if (option.selected) item.setAttribute('aria-label',`${option.textContent}. Opción actual.`);
        item.addEventListener('click',() => choose(option));
        item.addEventListener('keydown',event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); const next = index + (event.key === 'ArrowDown' ? 1 : -1);
            if (next < 0) input.focus(); else buttons[Math.min(next,buttons.length - 1)]?.focus();
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault(); buttons[event.key === 'Home' ? 0 : buttons.length - 1]?.focus();
          }
        });
        buttons.push(item); results.append(item);
      });
    }
    function open() {
      if (select.disabled) return;
      panel.hidden = false; trigger.setAttribute('aria-expanded','true'); input.value = ''; render(); input.focus();
    }
    trigger.addEventListener('click',() => panel.hidden ? open() : close());
    trigger.addEventListener('keydown',event => { if (event.key === 'ArrowDown') { event.preventDefault(); open(); } });
    input.addEventListener('input',render);
    input.addEventListener('keydown',event => {
      if (event.isComposing) return;
      if (event.key === 'ArrowDown') { event.preventDefault(); buttons[0]?.focus(); }
      else if (event.key === 'Enter') { event.preventDefault(); if (matches.length === 1) choose(matches[0]); }
    });
    widget.addEventListener('keydown',event => { if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); event.stopPropagation(); close(true); } });
    widget.addEventListener('focusout',event => { if (!widget.contains(event.relatedTarget)) close(); });
    document.addEventListener('pointerdown',event => { if (!widget.contains(event.target)) close(); });
    select.addEventListener('change',sync);
    select.addEventListener('invalid',event => { event.preventDefault(); sync(); trigger.focus(); });
    // Las validaciones existentes siguen enfocando el control que ve la persona.
    select.focus = options => { sync(); trigger.focus(options); };
    // Sincroniza asignaciones de los formularios: select.value = ...
    for (const property of ['value','selectedIndex']) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,property);
      if (descriptor?.get && descriptor?.set) Object.defineProperty(select,property,{
        configurable:true,get(){ return descriptor.get.call(this); },
        set(next){ descriptor.set.call(this,next); sync(); }
      });
    }
    select.form?.addEventListener('reset',() => queueMicrotask(() => { sync(); input.value = ''; close(); }));
    new MutationObserver(() => { sync(); if (!panel.hidden) render(); }).observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','required','aria-invalid','aria-describedby','selected','label']});
    sync();
  }
  function scan() { document.querySelectorAll('select').forEach(enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scan,{once:true}); else scan();
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(item => item.nodeType === 1 && (item.tagName === 'SELECT' || item.querySelector?.('select'))))) scan();
  }).observe(document.body,{childList:true,subtree:true});
})();
