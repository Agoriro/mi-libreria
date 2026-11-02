/* Paginación de la vista: conserva todos los registros y sus acciones. */
(() => {
  'use strict';
  const PAGE_SIZE = 10;
  const enhanced = new WeakSet();
  const make = (tag,text,className) => { const item=document.createElement(tag); if(text!=null)item.textContent=text; if(className)item.className=className; return item; };
  function enhance(table) {
    if(enhanced.has(table) || !table.tBodies.length) return;
    enhanced.add(table); table.classList.add('paginated-table'); table.setAttribute('role','table');
    const head=table.tHead, body=table.tBodies[0], caption=table.caption;
    const title=caption?.textContent || 'Lista de registros';
    const headers=head ? [...head.rows[0].cells].map(cell=>cell.textContent.trim()) : [];
    table.tHead?.setAttribute('role','rowgroup'); body.setAttribute('role','rowgroup');
    if(head) [...head.rows].forEach(row=>{row.setAttribute('role','row');[...row.cells].forEach(cell=>cell.setAttribute('role','columnheader'));});
    if(caption) caption.tabIndex=-1;
    const nav=make('nav',null,'pagination'); nav.setAttribute('aria-label',`Páginas de ${title}`);
    const previous=make('button','← Anterior','button'), next=make('button','Siguiente →','button');
    previous.type='button'; next.type='button';
    const status=make('p'); status.setAttribute('role','status');status.setAttribute('aria-atomic','true');
    nav.append(previous,status,next); table.after(nav);
    let page=0, rows=[];
    function render(focus=false) {
      const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)); page=Math.min(page,pages-1);
      rows.forEach((row,index)=>{row.hidden=index<page*PAGE_SIZE || index>=(page+1)*PAGE_SIZE;});
      previous.disabled=page===0; next.disabled=page===pages-1;
      previous.hidden=pages===1;next.hidden=pages===1;nav.hidden=rows.length===0;
      const first=rows.length ? page*PAGE_SIZE+1 : 0,last=Math.min((page+1)*PAGE_SIZE,rows.length);
      status.textContent=`Página ${page+1} de ${pages} · Registros ${first} a ${last} de ${rows.length}`;
      if(focus) caption?.focus();
    }
    function refresh() {
      rows=[...body.rows];
      rows.forEach(row=>{
        row.setAttribute('role','row');
        [...row.cells].forEach((cell,index)=>{
          cell.dataset.label=headers[index] || 'Dato';
          cell.setAttribute('role',cell.tagName==='TH'?'rowheader':'cell');
          const text=cell.textContent.trim();
          if(/^[-−]?\s*\$?\s*\d[\d.,\s]*$/.test(text)) cell.classList.add('cell-number');
        });
      }); render();
    }
    previous.addEventListener('click',()=>{if(page>0){page--;render(true);}});
    next.addEventListener('click',()=>{if((page+1)*PAGE_SIZE<rows.length){page++;render(true);}});
    new MutationObserver(refresh).observe(body,{childList:true});
    refresh();
  }
  function scan(){document.querySelectorAll('.table-wrap table').forEach(enhance);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
  new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes].some(item=>item.nodeType===1 && (item.tagName==='TABLE'||item.querySelector?.('table')))))scan();
  }).observe(document.body,{childList:true,subtree:true});
})();
