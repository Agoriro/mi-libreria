(() => {
  'use strict';
  const store = window.Fase3Datos;
  const page = document.body.dataset.page;
  const $ = id => document.getElementById(id);
  const money = window.pesosColombianos;
  const date = value => new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(value));
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CO').trim();
  const node = (tag,text,className) => { const item = document.createElement(tag); if (text != null) item.textContent = text; if (className) item.className = className; return item; };
  const button = (text,handler,danger = false) => { const item = node('button',text,`button${danger ? ' danger' : ''}`); item.type = 'button'; item.addEventListener('click',handler); return item; };
  const link = (text,href,primary = false) => { const label = /^[\p{L}\p{N}]/u.test(text) ? `▤ Ver ${text}` : text; const item = node('a',label,`button${primary ? ' primary' : ''}`); item.href = href; return item; };
  function message(text,error = false) {
    const box = $('estado'); box.hidden = false; box.className = `alert ${error ? 'error' : 'success'}`; box.textContent = `${error ? '! ' : '✓ '}${text}`; box.focus();
  }
  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(item => item.remove());
    form.querySelectorAll('[aria-invalid]').forEach(field => { field.removeAttribute('aria-invalid'); if (field.dataset.hint) field.setAttribute('aria-describedby',field.dataset.hint); else field.removeAttribute('aria-describedby'); });
  }
  function invalid(field,text) {
    field.setAttribute('aria-invalid','true'); const error = node('span',text,'field-error'); error.id = `${field.id}-error`; field.after(error);
    field.setAttribute('aria-describedby',`${field.dataset.hint || ''} ${error.id}`.trim());
  }
  function firstError(form) { const field = form.querySelector('[aria-invalid="true"]'); if (!field) return false; message('Revise los datos señalados para continuar.',true); field.focus(); return true; }
  function options(select,items,placeholder = 'Elija una opción') {
    const empty = node('option',placeholder); empty.value = ''; select.replaceChildren(empty);
    items.forEach(([value,text]) => { const option = node('option',text); option.value = value; select.append(option); });
  }
  function table(target,headers,rows,caption) {
    target.replaceChildren();
    if (!rows.length) { target.append(node('p','No hay registros para mostrar.','alert warning')); return; }
    const grid = node('table'); grid.append(node('caption',caption)); const head = node('thead'), tr = node('tr');
    headers.forEach(text => { const th = node('th',text); th.scope = 'col'; tr.append(th); }); head.append(tr); grid.append(head);
    const body = node('tbody'); rows.forEach(values => { const row = node('tr'); values.forEach((value,index) => { const cell = node(index ? 'td' : 'th'); if (!index) cell.scope = 'row'; if (value instanceof Node) { value.querySelectorAll?.('button,a').forEach(action => { if (!action.textContent.includes(values[0])) action.setAttribute('aria-label',`${action.textContent} · ${values[0]}`); }); cell.append(value); } else cell.textContent = value; row.append(cell); }); body.append(row); }); grid.append(body); target.append(grid);
  }
  $('persistencia').textContent = store.invalido ? 'ⓘ Hay datos guardados que no se pudieron leer. Pida ayuda antes de guardar nuevos registros.' : store.temporal
    ? 'ⓘ El navegador no permite guardar datos. Los cambios se perderán al salir de esta pantalla. No escriba datos personales.'
    : 'ⓘ Los cambios se guardan en este navegador y actualizan las cantidades de los libros. No se realizan pagos ni envíos reales.';
  $('persistencia').hidden = !store.invalido && !store.temporal;
  const params = new URLSearchParams(location.search);
  if (page === 'clientes-proveedores') {
    const draw = () => {
      const filter = $('filtro').value, search = normalize($('buscar').value), data = store.datos;
      const rows = ['clientes','proveedores'].flatMap(tipo => data[tipo].map(person => ({...person,tipo})) ).filter(person => (filter === 'todos' || person.tipo === filter) && normalize(`${person.nombre} ${person.documento || ''} ${person.ciudad}`).includes(search));
      $('resultados').textContent = `${rows.length} registros encontrados.`;
      table($('lista'),['Nombre','Tipo','Ciudad','Teléfono y correo','Acciones'],rows.map(person => {
        const actions = node('div',null,'stack');
        actions.append(link('✎ Modificar',`cliente-proveedor-form.html?tipo=${person.tipo}&id=${person.id}`),button(`× Eliminar ${person.nombre}`,async () => {
          if (!await window.Libreria.confirmar({titulo:`¿Desea eliminar a ${person.nombre}?`,mensaje:'Se quitará de la lista. Los registros con compras o ventas asociadas deben conservarse.',aceptar:'Sí, eliminar'})) return;
          try { const result = store.eliminarPersona(person.tipo,person.id); draw(); message(`Se eliminó el registro.${result.persistido ? '' : ' Solo en esta pantalla.'}`); } catch(error) { message(error.message,true); }
        },true));
        const contact = node('div'); contact.append(node('p',person.telefono),node('p',person.correo || 'Sin correo registrado'));
        return [person.nombre,person.tipo === 'clientes' ? 'Cliente' : 'Proveedor',person.ciudad,contact,actions];
      }),'Clientes y Proveedores');
    };
    if (['clientes','proveedores','todos'].includes(params.get('tipo'))) $('filtro').value = params.get('tipo');
    $('filtro').addEventListener('change',draw); $('buscar').addEventListener('input',draw); draw();
    if (params.get('guardado') === '1') message('Los datos quedaron guardados. Puede consultarlos en la lista.');
  }
  if (page === 'cliente-proveedor-form') {
    const form = $('persona-form');
    const id = params.has('id') ? Number(params.get('id')) : null;
    const tipo = params.get('tipo') || 'clientes';
    const current = id === null ? null : store.datos[tipo]?.find(item => item.id === id);
    if (!['clientes','proveedores'].includes(tipo) || (id !== null && !current)) { form.hidden = true; message('No encontramos este registro. Vuelva a Clientes y Proveedores y elija uno de la lista.',true); return; }
    $('tipo').value = tipo;
    if (current) { $('tipo').disabled = true; $('titulo-pagina').textContent = 'Modificar cliente o proveedor'; Object.entries(current).forEach(([name,value]) => { if ($(name)) $(name).value = value; }); }
    let savedId = id;
    form.addEventListener('submit',event => {
      event.preventDefault(); clearErrors(form);
      ['nombre','ciudad','telefono'].forEach(name => { if (!$(name).value.trim()) invalid($(name),'Complete este dato para continuar.'); });
      if ($('telefono').value && (!/^[\d\s+()-]{7,20}$/.test($('telefono').value.trim()) || $('telefono').value.replace(/\D/g,'').length < 7)) invalid($('telefono'),'Escriba un teléfono con al menos 7 dígitos y hasta 20 caracteres. Puede usar espacios, +, paréntesis o guiones.');
      if ($('correo').value && !$('correo').validity.valid) invalid($('correo'),'Revise el correo. Por ejemplo: persona@example.com.');
      if (firstError(form)) return;
      try {
        const values = Object.fromEntries(['nombre','documento','telefono','correo','ciudad','direccion'].map(name => [name,$(name).value]));
        const result = store.guardarPersona($('tipo').value,values,savedId); savedId = result.record.id; $('tipo').disabled = true;
        if (result.persistido) location.href = `clientes-proveedores.html?tipo=${$('tipo').value}&guardado=1`;
        else message('Datos guardados solo en esta pantalla. Al salir se perderán porque el navegador no permite guardarlos.');
      } catch(error) { message(error.message,true); }
    });
  }
  function showSuccess(record,persisted,sale) {
    $('registro').hidden = true; $('exito').hidden = false;
    $('exito-titulo').textContent = sale ? 'Venta registrada: envío simulado con éxito' : 'Compra registrada con éxito';
    $('exito-detalle').textContent = `${record.referencia} · ${record.personaNombre} · Total: ${money(record.total)}.${persisted ? '' : ' Solo se conserva en esta pantalla.'}`;
    $('exito-titulo').focus();
  }
  if (page === 'compras' || page === 'ventas') {
    const sale = page === 'ventas', form = $('operacion-form');
    let step = 1, lines = [], busy = false, completed = false, foundByCode = false;
    const personType = sale ? 'clientes' : 'proveedores';
    options($('persona'),store.datos[personType].map(person => [person.id,person.nombre]));
    options($('libro'),store.datos.libros.map(book => [book.id,book.titulo]));
    function personInfo() {
      const person = store.datos[personType].find(item => item.id === Number($('persona').value));
      $('persona-detalle').textContent = person ? `${person.ciudad} · ${person.telefono}${sale ? ` · Correo: ${person.correo || 'Sin correo: modifique el cliente antes de vender.'}` : ''}` : 'Elija una opción de la lista.';
    }
    $('persona').addEventListener('change',personInfo); personInfo();
    function bookInfo() {
      const book = store.datos.libros.find(item => item.id === Number($('libro').value));
      $('libro-detalle').textContent = book ? `${book.existencias} ejemplares disponibles. Precio de venta: ${money(book.precio)}. Código de barras: ${book.codigoBarras || 'Sin registrar'}.` : 'Elija un libro para consultar su cantidad.';
      $('precio').value = book ? (sale ? book.precio : '') : '';
    }
    $('libro').addEventListener('change',() => { foundByCode = false; $('codigo-barras').value = ''; $('codigo-resultado').textContent = ''; bookInfo(); }); bookInfo();
    function findBarcode() {
      clearErrors(form);
      const code = window.CodigosLibros.normalizar($('codigo-barras').value);
      const matches = window.CodigosLibros.buscar(store.datos.libros,code);
      $('codigo-resultado').textContent = '';
      if (!code || !window.CodigosLibros.valido(code) || matches.length !== 1) {
        foundByCode = false; $('libro').value = ''; bookInfo();
        const text = !code ? 'Escriba o escanee un código de barras.' : matches.length > 1
          ? 'Este código aparece en varios libros. Corrija los códigos en Libros antes de continuar.'
          : 'No encontramos un libro con ese código. Revíselo o registre el código en el formulario del libro.';
        invalid($('codigo-barras'),text); firstError(form); return;
      }
      const book = matches[0];
      $('codigo-barras').value = code; $('libro').value = book.id; foundByCode = true; bookInfo();
      $('codigo-resultado').textContent = `Libro encontrado: ${book.titulo}. Indique la cantidad${sale ? '' : ' y el precio de compra'} y pulse Agregar libro a la lista.`;
      $('cantidad').focus();
    }
    $('buscar-codigo').addEventListener('click',findBarcode);
    $('codigo-barras').addEventListener('input',() => {
      foundByCode = false; $('codigo-resultado').textContent = '';
      if ($('libro').value) { $('libro').value = ''; bookInfo(); }
    });
    $('codigo-barras').addEventListener('keydown',event => {
      if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); findBarcode(); }
    });
    form.addEventListener('reset',() => { foundByCode = false; $('codigo-resultado').textContent = ''; });
    function drawLines() {
      table($('lineas'),['Libro','Cantidad','Precio por ejemplar','Subtotal','Acciones'],lines.map(line => [line.titulo,String(line.cantidad),money(line.precio),money(line.cantidad * line.precio),button(`× Quitar ${line.titulo}`,async () => {
        if (await window.Libreria.confirmar({titulo:`¿Desea quitar ${line.titulo}?`,mensaje:'Se quitará de esta operación. El libro seguirá en el catálogo.',aceptar:'Sí, quitar de la operación'})) { lines = lines.filter(item => item.libroId !== line.libroId); drawLines(); $('libro').focus(); }
      },true)]),'Libros agregados a esta operación');
      $('total-parcial').textContent = `Total: ${money(store.total(lines))}`;
    }
    function review() {
      const person = store.datos[personType].find(item => item.id === Number($('persona').value));
      $('resumen-persona').textContent = `${sale ? 'Cliente' : 'Proveedor'}: ${person?.nombre || 'Sin elegir'}${sale ? ` · Correo: ${person?.correo || 'Sin correo'}` : ''}`;
      table($('resumen-lineas'),['Libro','Cantidad','Precio por ejemplar','Subtotal'],lines.map(line => [line.titulo,String(line.cantidad),money(line.precio),money(line.precio * line.cantidad)]),'Revise los libros antes de guardar');
      $('total-final').textContent = `Total: ${money(store.total(lines))}`;
    }
    function go(value) {
      step = value; clearErrors(form); $('estado').hidden = true;
      [1,2,3].forEach(number => {
        $(`paso-${number}`).hidden = number !== step;
        const marker = $(`indicador-${number}`); if (number === step) marker.setAttribute('aria-current','step'); else marker.removeAttribute('aria-current');
      });
      $('paso-actual').textContent = `Paso ${step} de 3: ${step === 1 ? (sale ? 'cliente' : 'proveedor') : step === 2 ? 'libros' : 'total'}`;
      $('anterior').hidden = step === 1;
      $('continuar').textContent = step < 3 ? '→ Continuar' : sale ? '↗ Enviar factura electrónica' : '✓ Registrar compra';
      $('continuar').classList.toggle('wide-action',step === 3);
      if (step === 3) review();
      $('paso-actual').focus();
    }
    $('agregar-libro').addEventListener('click',() => {
      clearErrors(form);
      const book = store.datos.libros.find(item => item.id === Number($('libro').value));
      const quantity = Number($('cantidad').value), price = sale ? book?.precio : Number($('precio').value);
      if (!book) invalid($('libro'),'Elija el libro que desea agregar.');
      if (!Number.isSafeInteger(quantity) || quantity < 1) invalid($('cantidad'),'Escriba una cantidad entera mayor que cero.');
      if (!Number.isSafeInteger(price) || price < 1) invalid($('precio'),'Escriba el precio por ejemplar en pesos enteros, mayor que cero.');
      const existing = lines.find(line => line.libroId === book?.id);
      if (sale && book && quantity + (existing?.cantidad || 0) > book.existencias) invalid($('cantidad'),`Solo hay ${book.existencias} ejemplares. Ya agregó ${existing?.cantidad || 0} a esta venta.`);
      if (existing && price !== existing.precio) invalid($('precio'),'Este libro ya tiene otro precio en la lista. Quite esa fila para cambiarlo.');
      if (firstError(form)) return;
      const candidate = lines.map(item => ({...item})); const previous = candidate.find(line => line.libroId === book.id);
      if (previous) previous.cantidad += quantity; else candidate.push({libroId:book.id,titulo:book.titulo,cantidad:quantity,precio:price});
      try {
        store.total(candidate); lines = candidate; drawLines(); $('cantidad').value = '1';
        message(`Se agregó ${book.titulo}. Revise la lista o agregue otro libro.`);
        if (foundByCode) { foundByCode = false; $('codigo-barras').value = ''; $('codigo-resultado').textContent = 'Libro agregado. Puede escanear o escribir el siguiente código.'; $('codigo-barras').focus(); }
        else $('libro').focus();
      } catch(error) { message(error.message,true); }
    });
    async function advance() {
      if (busy || completed) return;
      clearErrors(form);
      if (step === 1) {
        const person = store.datos[personType].find(item => item.id === Number($('persona').value));
        if (!person) invalid($('persona'),`Elija un ${sale ? 'cliente' : 'proveedor'} para continuar.`);
        else if (sale && !person.correo) invalid($('persona'),'Este cliente necesita un correo. Modifique sus datos en Clientes y Proveedores.');
        if (!firstError(form)) go(2); return;
      }
      if (step === 2) { if (!lines.length) { message('Agregue al menos un libro antes de continuar.',true); $('libro').focus(); return; } go(3); return; }
      if (sale && !$('pago').value) { invalid($('pago'),'Elija cómo paga el cliente.'); firstError(form); return; }
      busy = true; $('continuar').disabled = true;
      try {
        if (sale && !await window.Libreria.confirmar({titulo:'¿Desea enviar la factura electrónica?',mensaje:`Cliente: ${store.datos.clientes.find(person => person.id === Number($('persona').value))?.nombre}. Total: ${money(store.total(lines))}. Forma de pago: ${$('pago').value}. Es una simulación: no se envía ningún documento real.`,aceptar:'Sí, enviar factura electrónica'})) return;
        const result = store.registrarOperacion(page,{personaId:Number($('persona').value),lineas:lines,pago:sale ? $('pago').value : undefined}); completed = true;
        if (sale && result.persistido) location.href = `venta-exito.html?id=${result.record.id}`;
        else { showSuccess(result.record,result.persistido,sale); history(); }
      } catch(error) { message(error.message,true); }
      finally { busy = false; $('continuar').disabled = completed; }
    }
    $('continuar').addEventListener('click',advance);
    form.addEventListener('submit',event => { event.preventDefault(); advance(); });
    $('anterior').addEventListener('click',() => go(step - 1));
    // El botón compartido también vuelve al paso anterior sin perder datos.
    $('volver').addEventListener('click',event => { if (step > 1 && !completed) { event.stopImmediatePropagation(); go(step - 1); } },true);
    $('cancelar-operacion').addEventListener('click',async () => {
      if (!await window.Libreria.confirmar({titulo:'¿Desea cancelar este registro?',mensaje:'Los libros agregados aquí no se guardarán. Puede volver sin cambios para seguir trabajando.',aceptar:'Sí, cancelar el registro'})) return;
      lines = []; form.reset(); drawLines(); bookInfo(); personInfo(); go(1);
    });
    function history() {
      table($('historial'),['Registro','Fecha','Persona','Total'],store.datos[page].slice().reverse().map(record => [sale ? link(record.referencia,`venta-exito.html?id=${record.id}`) : record.referencia,date(record.fecha),record.personaNombre,money(record.total)]),sale ? 'Ventas registradas · Ejemplos y nuevas ventas' : 'Compras registradas · Ejemplos y nuevas compras');
    }
    $('nuevo-registro').addEventListener('click',() => { completed = false; $('registro').hidden = false; $('exito').hidden = true; $('continuar').disabled = false; lines = []; form.reset(); drawLines(); bookInfo(); personInfo(); go(1); });
    drawLines(); history(); go(1);
  }
  if (page === 'venta-exito') {
    const record = store.datos.ventas.find(item => item.id === Number(params.get('id')));
    if (!record) { $('comprobante').hidden = true; $('titulo-pagina').textContent = 'Consulte una venta registrada'; message('No encontramos esa venta. Vuelva a Ventas para consultar el historial o registrar una nueva.',true); }
    else {
      $('referencia').textContent = `${record.referencia} · ${date(record.fecha)}`;
      $('detalle-persona').textContent = `Cliente: ${record.personaNombre} · Correo electrónico: ${record.correo}`;
      $('detalle-pago').textContent = `Forma de pago: ${record.pago}`;
      $('total-venta').textContent = `Total: ${money(record.total)}`;
      table($('detalle-lineas'),['Libro','Cantidad','Precio por ejemplar','Subtotal'],record.lineas.map(line => [line.titulo,String(line.cantidad),money(line.precio),money(line.cantidad * line.precio)]),'Detalle de la venta registrada');
    }
  }
  if (page === 'libros-devueltos') {
    const form = $('devuelto-form'); let busy = false;
    function docs() {
      const tipo = $('origen').value;
      options($('documento'),store.datos[tipo].map(record => [record.id,`${record.referencia} · ${record.personaNombre} · ${money(record.total)}`])); books();
    }
    function books() {
      const record = store.datos[$('origen').value].find(item => item.id === Number($('documento').value));
      options($('libro-devuelto'),record ? record.lineas.map(line => [line.libroId,`${line.titulo} · Puede registrar hasta ${store.pendiente($('origen').value,record.id,line.libroId)}`]) : []);
      availability();
    }
    function availability() {
      const record = store.datos[$('origen').value].find(item => item.id === Number($('documento').value));
      const line = record?.lineas.find(item => item.libroId === Number($('libro-devuelto').value));
      const amount = Number($('cantidad-devuelta').value);
      $('disponible').textContent = line ? `Cantidad original: ${line.cantidad}. Ya registrados: ${line.cantidad - store.pendiente($('origen').value,record.id,line.libroId)}. Precio original por ejemplar: ${money(line.precio)}.` : 'Elija un registro y uno de sus libros.';
      $('efecto').textContent = $('origen').value === 'ventas' ? 'El cliente devuelve el libro a la librería. La cantidad disponible aumentará. El valor corresponde al dinero que se devolvería al cliente.' : 'La librería devuelve el libro al proveedor. La cantidad disponible disminuirá. El valor corresponde al dinero que se solicitaría al proveedor.';
      $('valor-devuelto').textContent = `Valor de los libros devueltos: ${money(line && Number.isSafeInteger(amount) && amount > 0 && Number.isSafeInteger(amount * line.precio) ? amount * line.precio : 0)}`;
    }
    $('origen').addEventListener('change',docs); $('documento').addEventListener('change',books); $('libro-devuelto').addEventListener('change',availability); $('cantidad-devuelta').addEventListener('input',availability);
    function draw() {
      table($('historial'),['Registro original','Origen','Libro','Cantidad','Valor','Motivo'],store.datos.devueltos.slice().reverse().map(item => [item.referencia,item.tipo === 'ventas' ? 'Venta: regresa del cliente' : 'Compra: se entrega al proveedor',item.titulo,String(item.cantidad),money(item.total),item.motivo]),'Libros devueltos registrados');
    }
    form.addEventListener('submit',async event => {
      event.preventDefault(); if (busy) return; clearErrors(form);
      if (!$('documento').value) invalid($('documento'),'Elija la compra o venta original.');
      if (!$('libro-devuelto').value) invalid($('libro-devuelto'),'Elija un libro del registro original.');
      const quantity = Number($('cantidad-devuelta').value);
      if (!Number.isSafeInteger(quantity) || quantity < 1) invalid($('cantidad-devuelta'),'Escriba una cantidad entera mayor que cero.');
      else if ($('documento').value && $('libro-devuelto').value) {
        const pending = store.pendiente($('origen').value,Number($('documento').value),Number($('libro-devuelto').value));
        if (quantity > pending) invalid($('cantidad-devuelta'),`Puede registrar hasta ${pending} ejemplares. Revise la cantidad.`);
      }
      if (!$('motivo').value.trim()) invalid($('motivo'),'Escriba el motivo para dejar constancia.');
      if (firstError(form)) return;
      busy = true; $('guardar-devuelto').disabled = true;
      try {
        if (!await window.Libreria.confirmar({titulo:'¿Desea registrar estos libros devueltos?',mensaje:`Cantidad: ${quantity}. ${$('efecto').textContent} No se realizan movimientos reales de dinero.`,aceptar:'Sí, registrar libros devueltos'})) return;
        const result = store.registrarDevuelto({tipo:$('origen').value,documentoId:$('documento').value,libroId:$('libro-devuelto').value,cantidad:quantity,motivo:$('motivo').value});
        form.reset(); docs(); draw(); message(`Se registraron ${result.record.cantidad} ejemplares de ${result.record.titulo}. Valor: ${money(result.record.total)}.${result.persistido ? '' : ' Solo se conserva en esta pantalla.'}`);
      } catch(error) { message(error.message,true); }
      finally { busy = false; $('guardar-devuelto').disabled = false; }
    }); docs(); draw();
  }
})();
