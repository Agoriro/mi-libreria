(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const catalog = window.LibreriaDatos.informesFase4;
  const node = (tag,text,className) => { const item = document.createElement(tag); if (text != null) item.textContent = text; if (className) item.className = className; return item; };
  if (document.body.dataset.page === 'informes') {
    catalog.forEach(([,title,file,description,icon]) => {
      const card = node('a',null,'module-card'); card.href = file;
      const symbol = node('span',icon,'icon'); symbol.setAttribute('aria-hidden','true');
      card.append(symbol,node('strong',title),node('span',description),node('span','Abrir informe →'));
      $('tarjetas-informes').append(card);
    }); return;
  }
  const kind = document.body.dataset.report;
  const config = catalog.find(item => item[0] === kind);
  const api = window.InformesDatos;
  const form = $('filtros');
  function message(text,error = false) {
    const box = $('estado'); box.hidden = false; box.className = `alert ${error ? 'error' : 'warning'}`; box.textContent = `${error ? '! ' : 'ⓘ '}${text}`;
    if (error) box.focus();
  }
  if (!config) { message('No encontramos este informe. Vuelva a Informes y elija una tarjeta.',true); return; }
  if (window.Fase3Datos.temporal) { $('origen-datos').hidden = false; $('origen-datos').textContent = 'ⓘ El navegador no permite leer los datos guardados. Se muestran solo ejemplos iniciales.'; }
  if (window.Fase3Datos.invalido) { $('contenido-informe').hidden = true; message('No pudimos leer los datos guardados. Pida ayuda para revisarlos antes de consultar el informe.',true); return; }
  const data = window.Fase3Datos.datos, extra = window.LibreriaDatos.ejemplosFase4;
  let days;
  try { days = [...data.compras,...data.ventas,...data.devueltos,...extra.cuentasCobrar,...extra.impuestos].map(item=>api.dia(item.fecha)).sort(); }
  catch(error) { $('contenido-informe').hidden = true; message(error.message,true); return; }
  const today = api.dia(new Date().toISOString());
  $('desde').value = (days[0] || today).slice(0,7) + '-01';
  $('hasta').value = [today,...days].sort().at(-1);
  if (kind === 'cuadre-del-dia') $('fondo').value = extra.fondoInicial;
  if (kind === 'libros-mas-y-menos-vendidos') {
    [['autor',data.autores],['tipo-libro',data.tiposDeLibro]].forEach(([id,items]) => items.forEach(item=>{
      const option = node('option',item.nombre); option.value = item.id; $(id).append(option);
    }));
  }
  const read = () => ({desde:$('desde').value,hasta:$('hasta').value,autor:$('autor')?.value || '',tipoLibro:$('tipo-libro')?.value || '',fondo:$('fondo')?.value,contado:$('contado')?.value});
  function clearErrors() {
    form.querySelectorAll('.field-error').forEach(item=>item.remove());
    form.querySelectorAll('[aria-invalid]').forEach(field=>{ field.removeAttribute('aria-invalid'); if (field.dataset.hint) field.setAttribute('aria-describedby',field.dataset.hint); else field.removeAttribute('aria-describedby'); });
  }
  function invalid(field,text) { field.setAttribute('aria-invalid','true'); const error = node('span',text,'field-error'); error.id = `${field.id}-error`; field.after(error); field.setAttribute('aria-describedby',`${field.dataset.hint || ''} ${error.id}`.trim()); }
  function drawChart(container,graph,scale) {
    const figure = node('figure',null,'report-chart panel'); figure.append(node('figcaption',graph.title));
    if (!graph.items.length) { figure.append(node('p','No hay registros para dibujar con estos filtros.')); container.append(figure); return; }
    figure.append(node('p',graph.unit === 'unidades' ? 'Cantidad de ejemplares. Cada barra muestra el número junto al título.' : 'Valores en pesos. Cada barra muestra el importe junto al nombre.','hint'));
    graph.items.forEach(item => {
      const row = node('div',null,'chart-row'); const label = node('p',null,'chart-label');
      const value = graph.unit === 'unidades' ? `${item.value} ejemplares` : window.pesosColombianos(item.value);
      label.append(node('strong',item.label),node('strong',value));
      const meter = node('meter',value,'report-meter'); meter.min = 0; meter.max = scale; meter.value = Math.abs(item.value); meter.setAttribute('aria-hidden','true');
      row.append(label,meter); figure.append(row);
    });
    if (graph.items.some(item => item.value < 0)) figure.append(node('p','El signo menos indica una disminución. La longitud de la barra representa la magnitud del importe.','hint'));
    container.append(figure);
  }
  function drawTable(headers,rows) {
    const target = $('tabla'); target.replaceChildren();
    if (!rows.length) { target.append(node('p','No hay registros para estos filtros. Puede ampliar las fechas.','alert warning')); return; }
    const table = node('table'); table.append(node('caption',`Detalle: ${config[1]}`));
    const head = node('thead'), row = node('tr'); headers.forEach(text=>{ const cell=node('th',text); cell.scope='col'; row.append(cell); }); head.append(row); table.append(head);
    const body = node('tbody'); rows.forEach(values=>{const tr=node('tr'); values.forEach((text,index)=>{ const cell=node(index?'td':'th',text); if (!index) cell.scope='row'; tr.append(cell); }); body.append(tr);}); table.append(body); target.append(table);
  }
  function apply(focus = true) {
    clearErrors(); const filters = read();
    ['desde','hasta'].forEach(id=>{ if (!api.fechaValida($(id).value)) invalid($(id),'Elija una fecha válida.'); });
    if (api.fechaValida(filters.desde) && api.fechaValida(filters.hasta) && filters.desde > filters.hasta) invalid($('hasta'),'La fecha final debe ser posterior o igual a la inicial.');
    if (kind === 'cuadre-del-dia') {
      ['fondo','contado'].forEach(id=>{ const value=$(id).value; if ((id==='fondo' || value !== '') && (value==='' || !Number.isSafeInteger(Number(value)) || Number(value)<0)) invalid($(id),'Escriba pesos enteros, desde cero.'); });
    }
    const first = form.querySelector('[aria-invalid="true"]');
    if (first) { $('contenido-informe').hidden = true; message('Revise los campos señalados antes de consultar o imprimir.',true); first.focus(); return false; }
    try {
      const report = api.generar(kind,filters);
      $('contenido-informe').hidden = false; $('estado').hidden = true;
      $('periodo').textContent = `Periodo: ${api.fechaTexto(filters.desde)} al ${api.fechaTexto(filters.hasta)} · Fechas de Colombia`;
      $('filtros-aplicados').textContent = kind === 'libros-mas-y-menos-vendidos' ? `Autor: ${data.autores.find(item=>String(item.id)===filters.autor)?.nombre || 'Todos'} · Tipo de libro: ${data.tiposDeLibro.find(item=>String(item.id)===filters.tipoLibro)?.nombre || 'Todos'}` : '';
      $('resumen').replaceChildren(); report.summary.forEach(([label,value,unit])=>{const card=node('div',null,'panel'); card.append(node('p',label),node('p',unit === 'unidades' ? String(value) : window.pesosColombianos(value),'report-amount')); $('resumen').append(card);});
      $('graficos').replaceChildren(); const common = Math.max(1,...report.charts.flatMap(graph=>graph.items.map(item=>Math.abs(item.value))));
      report.charts.forEach(graph=>drawChart($('graficos'),graph,kind === 'libros-mas-y-menos-vendidos' ? common : Math.max(1,...graph.items.map(item=>Math.abs(item.value)))));
      $('notas').replaceChildren(); report.notes.forEach(text=>$('notas').append(node('p',text)));
      drawTable(report.headers,report.rows);
      $('resultado').textContent = report.count ? `Informe actualizado: ${report.count} registros o libros consultados.` : 'No hay registros para estos filtros.';
      document.title = `${config[1]} ${filters.desde} a ${filters.hasta} · Mi librería`;
      if (focus) $('titulo-resultado').focus(); return true;
    } catch(error) { $('contenido-informe').hidden = true; message(error.message,true); return false; }
  }
  form.addEventListener('submit',event=>{event.preventDefault(); apply();});
  $('imprimir').addEventListener('click',()=>{if (apply(false)) window.print();});
  $('guardar-pdf').addEventListener('click',()=>{
    if (!apply(false)) return;
    $('ayuda-pdf').hidden = false;
    window.print();
  });
  apply(false);
})();
