/* Gestión local de los datos ficticios. No crea cuentas ni almacena contraseñas. */
(() => {
  'use strict';
  const page = document.body.dataset.page;
  const data = window.LibreriaDatos;
  const key = 'libreria-fase2-v1';
  const collections = ['usuarios','libros','autores','tiposDeLibro','casasEditoriales'];
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved) {
      if (!collections.every(name => Array.isArray(saved[name]) && saved[name].every(row => row && Number.isSafeInteger(row.id) && row.id > 0))) throw new Error('Datos incompletos');
      collections.forEach(name => { data[name] = saved[name]; });
    }
    localStorage.setItem(key,JSON.stringify(Object.fromEntries(collections.map(name => [name,data[name]]))));
  } catch {
    storageAvailable = false;
  }
  const notice = document.querySelector('#persistencia');
  notice.textContent = storageAvailable
    ? 'ⓘ Los cambios se guardan en este navegador. Use siempre el mismo navegador y carpeta. No escriba datos personales.'
    : 'ⓘ No se pueden guardar cambios en este navegador. Puede probar la pantalla, pero al salir se perderán los cambios.';
  notice.hidden = storageAvailable;
  const status = document.querySelector('#estado');
  function message(text,error = false) {
    status.hidden = false; status.className = `alert ${error ? 'error' : 'success'}`;
    status.textContent = `${error ? '! ' : '✓ '}${text}`; status.focus();
  }
  function persist() {
    try {
      localStorage.setItem(key,JSON.stringify(Object.fromEntries(collections.map(name => [name,data[name]]))));
      storageAvailable = true;
      return true;
    } catch {
      storageAvailable = false;
      notice.textContent = 'ⓘ No se pudo guardar en el navegador. Los cambios solo permanecerán mientras siga en esta pantalla. Si adjuntó una portada, pruebe una imagen más pequeña.';
      notice.hidden = false;
      return false;
    }
  }
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CO').trim();
  const nextId = name => Math.max(0,...data[name].map(row => row.id)) + 1;
  const el = (tag,text,className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
  const findName = (name,id) => data[name].find(item => item.id === id)?.nombre || 'Sin asignar';
  function link(text,href) { const a = el('a',text,'button'); a.href = href; return a; }
  function button(text,handler,danger = false) { const b = el('button',text,`button${danger ? ' danger' : ''}`); b.type = 'button'; b.addEventListener('click',handler); return b; }
  function clearErrors(form) {
    form.querySelectorAll('[aria-invalid]').forEach(field => {
      field.removeAttribute('aria-invalid');
      if (field.dataset.hint) field.setAttribute('aria-describedby',field.dataset.hint);
      else field.removeAttribute('aria-describedby');
    });
    form.querySelectorAll('.field-error').forEach(node => node.remove());
  }
  function invalid(form,id,text) {
    const field = form.elements.namedItem(id);
    field.setAttribute('aria-invalid','true');
    const error = el('span',text,'field-error'); error.id = `${id}-error`;
    field.setAttribute('aria-describedby',`${field.dataset.hint || ''} ${error.id}`.trim());
    field.after(error);
  }
  function errorsFound(form) {
    const first = form.querySelector('[aria-invalid="true"]');
    if (!first) return false;
    message('Revise los campos señalados. Cada mensaje explica qué debe corregir.',true);
    first.focus(); return true;
  }
  function required(form,ids) { ids.forEach(id => { if (!form.elements.namedItem(id).value.trim()) invalid(form,id,'Escriba o elija este dato para continuar.'); }); }
  function populate(form,record) { Object.entries(record).forEach(([name,value]) => { const field = form.elements.namedItem(name); if (field && field.type !== 'file') field.value = value; }); }
  function read(form) { return Object.fromEntries(new FormData(form)); }
  const idText = new URLSearchParams(location.search).get('id');
  const id = idText === null ? null : Number(idText);
  function missing() {
    document.querySelector('form').hidden = true;
    message('No encontramos este registro. Vuelva a la lista y elija uno de los que aparecen allí.',true);
  }
  async function remove(name,record,label,redraw) {
    const used = name === 'autores' ? data.libros.some(book => book.autorId === record.id)
      : name === 'casasEditoriales' ? data.libros.some(book => book.casaEditorialId === record.id)
      : name === 'tiposDeLibro' ? data.libros.some(book => book.tipoId === record.id) : false;
    if (used) { await window.Libreria.informar('Este registro tiene libros asociados','Primero modifique esos libros y elija otro registro. Después podrá eliminar este sin dejar libros sin información.'); return; }
    if (name === 'usuarios' && record.estado === 'Activo' && record.rol === 'Persona encargada' && data.usuarios.filter(u => u.estado === 'Activo' && u.rol === 'Persona encargada').length === 1) {
      message('Conserve al menos una persona encargada activa. Cree o active otra antes de eliminar esta.',true); return;
    }
    if (!await window.Libreria.confirmar({titulo:`¿Desea eliminar ${label}?`,mensaje:'Se quitará de los datos registrados de este navegador. Si prefiere conservarlo, elija Volver sin cambios.',aceptar:'Sí, eliminar'})) return;
    data[name] = data[name].filter(row => row.id !== record.id);
    const stored = persist(); redraw(); message(`${label} se eliminó.${stored ? '' : ' El cambio solo se conserva en esta pantalla.'}`);
  }
  function renderTable(headers,rows,caption) {
    const wrap = document.querySelector('#lista'); wrap.replaceChildren();
    if (!rows.length) { wrap.append(el('p','No hay registros para mostrar. Puede crear uno nuevo o cambiar la búsqueda.','alert warning')); return; }
    const table = el('table'); table.append(el('caption',caption));
    const thead = el('thead'), head = el('tr');
    headers.forEach(text => { const th = el('th',text); th.scope = 'col'; head.append(th); }); thead.append(head); table.append(thead);
    const body = el('tbody'); rows.forEach(cells => { const tr = el('tr'); cells.forEach((value,index) => { const cell = el(index === 0 ? 'th' : 'td'); if (!index) cell.scope = 'row'; if (value instanceof Node) { value.querySelectorAll?.('button,a').forEach(action => action.setAttribute('aria-label',`${action.textContent} · ${cells[0]}`)); cell.append(value); } else cell.textContent = value; tr.append(cell); }); body.append(tr); }); table.append(body); wrap.append(table);
  }
  if (page === 'usuarios') {
    const draw = () => renderTable(['Nombre','Usuario','Permiso','Estado','Acciones'],data.usuarios.map(user => {
      const actions = el('div',null,'stack'); actions.append(link('✎ Modificar',`usuario-form.html?id=${user.id}`),link('⚿ Cambiar contraseña',`usuario-clave.html?id=${user.id}`),button('× Eliminar',() => remove('usuarios',user,user.nombre,draw),true));
      return [user.nombre,user.usuario,user.rol,user.estado,actions];
    }),'Usuarios'); draw();
  }
  if (page === 'usuario-form') {
    const form = document.querySelector('form');
    let current = id === null ? null : data.usuarios.find(user => user.id === id);
    if (id !== null && !current) { missing(); return; }
    if (current) { populate(form,current); document.querySelector('h1').textContent = 'Modificar usuario'; }
    form.addEventListener('submit',event => {
      event.preventDefault(); clearErrors(form); required(form,['nombre','usuario','correo','rol','estado']);
      const values = read(form);
      if (values.correo && !form.elements.correo.validity.valid) invalid(form,'correo','Escriba un correo con este formato: nombre@ejemplo.com.');
      if (data.usuarios.some(user => user.id !== current?.id && normalize(user.usuario) === normalize(values.usuario))) invalid(form,'usuario','Este usuario ya existe. Escriba otro nombre de usuario.');
      if (current?.rol === 'Persona encargada' && current.estado === 'Activo' && (values.rol !== current.rol || values.estado !== current.estado) && !data.usuarios.some(user => user.id !== current.id && user.rol === 'Persona encargada' && user.estado === 'Activo')) invalid(form,'rol','Conserve una persona encargada activa. Asigne ese permiso a otra persona antes de cambiarlo aquí.');
      if (errorsFound(form)) return;
      const record = {id:current?.id ?? nextId('usuarios'),...Object.fromEntries(Object.entries(values).map(([k,v]) => [k,v.trim()]))};
      if (current) Object.assign(current,record); else data.usuarios.push(record);
      current = data.usuarios.find(user => user.id === record.id);
      const stored = persist();
      if (stored) location.href = 'usuarios.html?guardado=1';
      else message('Usuario actualizado solo en esta pantalla. El navegador no pudo conservar los cambios. Puede volver a intentar guardarlo.',true);
    });
  }
  if (page === 'usuario-clave') {
    const form = document.querySelector('form'); const user = data.usuarios.find(user => user.id === id);
    if (!user) { missing(); return; }
    document.querySelector('#persona').textContent = `Usuario: ${user.nombre} (${user.usuario})`;
    form.addEventListener('submit',event => {
      event.preventDefault(); clearErrors(form); required(form,['actual','nueva','repetir']);
      const values = read(form);
      if (values.actual && values.actual !== 'lectura') invalid(form,'actual','Escriba lectura como contraseña actual.');
      if (values.nueva && values.nueva.length < 8) invalid(form,'nueva','Use al menos 8 caracteres para probar una contraseña nueva.');
      if (values.nueva && values.nueva === values.actual) invalid(form,'nueva','Elija una contraseña diferente de la actual.');
      if (values.repetir && values.repetir !== values.nueva) invalid(form,'repetir','Las contraseñas no coinciden. Escriba la misma contraseña nueva en ambos campos.');
      if (errorsFound(form)) return;
      form.reset(); message('Cambio de contraseña simulado correctamente. No se guardó ninguna clave. El acceso de prueba sigue siendo libreria / lectura.');
    });
  }
  document.querySelectorAll('[data-toggle-password]').forEach(toggle => toggle.addEventListener('click',() => {
    const input = document.getElementById(toggle.dataset.togglePassword); const show = input.type === 'password'; input.type = show ? 'text' : 'password'; toggle.textContent = `◉ ${show ? 'Ocultar' : 'Mostrar'} contraseña`; toggle.setAttribute('aria-pressed',String(show));
  }));
  if (page === 'libros') {
    const search = document.querySelector('#buscar');
    const draw = () => {
      const term = normalize(search.value);
      const books = data.libros.filter(book => normalize([book.titulo,book.codigoBarras || '',findName('autores',book.autorId),findName('tiposDeLibro',book.tipoId),findName('casasEditoriales',book.casaEditorialId)].join(' ')).includes(term));
      document.querySelector('#cantidad-resultados').textContent = `${books.length} de ${data.libros.length} libros.`;
      renderTable(['Libro','Autor','Tipo de libro','Casas editoriales','Precio','Cantidad','Acciones'],books.map(book => {
        const actions = el('div',null,'stack'); actions.append(link('✎ Modificar',`libro-form.html?id=${book.id}`),button('× Eliminar',() => remove('libros',book,book.titulo,draw),true));
        return [book.titulo,findName('autores',book.autorId),findName('tiposDeLibro',book.tipoId),findName('casasEditoriales',book.casaEditorialId),window.pesosColombianos(book.precio),String(book.existencias),actions];
      }),'Libros de la librería');
    };
    search.addEventListener('input',draw); document.querySelector('#limpiar-busqueda').addEventListener('click',() => { search.value = ''; draw(); search.focus(); }); draw();
  }
  if (page === 'libro-form') {
    const form = document.querySelector('form'); let current = id === null ? null : data.libros.find(book => book.id === id);
    if (id !== null && !current) { missing(); return; }
    [['autorId','autores'],['tipoId','tiposDeLibro'],['casaEditorialId','casasEditoriales']].forEach(([field,name]) => data[name].forEach(item => { const option = el('option',item.nombre); option.value = item.id; form.elements.namedItem(field).append(option); }));
    let cover = current?.portada || ''; let reading = false;
    const preview = document.querySelector('#portada-vista');
    const showCover = () => { preview.hidden = !cover; if (cover) preview.src = cover; else preview.removeAttribute('src'); };
    if (current) { populate(form,current); document.querySelector('h1').textContent = 'Modificar libro'; } showCover();
    form.elements.codigoBarras.addEventListener('keydown',event => {
      if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); form.elements.autorId.focus(); }
    });
    const file = form.elements.portada;
    document.querySelector('#elegir-portada').addEventListener('click',() => file.click());
    file.addEventListener('change',() => {
      const selected = file.files[0]; if (!selected) return;
      if (!['image/jpeg','image/png','image/webp'].includes(selected.type) || selected.size > 750000) { file.value = ''; message('Elija una imagen JPG, PNG o WebP de hasta 750 KB. La portada anterior se conserva.',true); return; }
      reading = true; const reader = new FileReader();
      reader.onload = () => { cover = reader.result; reading = false; showCover(); document.querySelector('#portada-nombre').textContent = `Portada elegida: ${selected.name}`; };
      reader.onerror = () => { reading = false; message('No pudimos leer esa imagen. Elija otro archivo e intente de nuevo.',true); };
      reader.readAsDataURL(selected);
    });
    document.querySelector('#quitar-portada').addEventListener('click',async () => {
      if (!cover) { message('El libro todavía no tiene portada. Puede elegir una imagen.'); return; }
      if (await window.Libreria.confirmar({titulo:'¿Desea quitar la portada?',mensaje:'El libro conservará sus otros datos. El cambio se aplicará cuando guarde el libro.',aceptar:'Sí, quitar la portada'})) { cover = ''; file.value = ''; showCover(); document.querySelector('#portada-nombre').textContent = 'Sin portada elegida.'; }
    });
    form.addEventListener('submit',event => {
      event.preventDefault(); clearErrors(form); required(form,['titulo','autorId','tipoId','casaEditorialId','precio','existencias']);
      if (reading) { message('La imagen se está leyendo. Vuelva a pulsar Guardar libro cuando aparezca la vista previa.',true); return; }
      const values = read(form);
      const codigoBarras = window.CodigosLibros.normalizar(values.codigoBarras);
      if (codigoBarras && !window.CodigosLibros.valido(codigoBarras)) invalid(form,'codigoBarras','Use hasta 64 letras de la A a la Z, números o signos, sin espacios ni tildes.');
      if (codigoBarras && window.CodigosLibros.buscar(data.libros,codigoBarras).some(book => book.id !== current?.id)) invalid(form,'codigoBarras','Este código ya pertenece a otro libro. Revise el código o modifique el libro que ya está registrado.');
      [['autorId','autores'],['tipoId','tiposDeLibro'],['casaEditorialId','casasEditoriales']].forEach(([field,name]) => { if (values[field] && !data[name].some(item => item.id === Number(values[field]))) invalid(form,field,'Elija una opción disponible en la lista.'); });
      ['precio','existencias'].forEach(field => { const value = Number(values[field]); if (values[field] && (!Number.isSafeInteger(value) || value < (field === 'precio' ? 1 : 0))) invalid(form,field,field === 'precio' ? 'Escriba el precio en pesos enteros, mayor que cero.' : 'Escriba una cantidad entera, desde cero.'); });
      if (errorsFound(form)) return;
      const record = {id:current?.id ?? nextId('libros'),titulo:values.titulo.trim(),codigoBarras,autorId:Number(values.autorId),tipoId:Number(values.tipoId),casaEditorialId:Number(values.casaEditorialId),precio:Number(values.precio),existencias:Number(values.existencias),portada:cover,tipo:findName('tiposDeLibro',Number(values.tipoId))};
      if (current) Object.assign(current,record); else data.libros.push(record);
      current = data.libros.find(book => book.id === record.id);
      const stored = persist();
      if (stored) location.href = 'libros.html?guardado=1';
      else message('Libro actualizado solo en esta pantalla. El navegador no pudo conservarlo. Pruebe una portada más pequeña o quite la portada y vuelva a guardar.',true);
    });
  }
  const config = {
    autores: ['autores','autor'],
    'tipos-de-libro': ['tiposDeLibro','tipo de libro'],
    'casas-editoriales': ['casasEditoriales','registro de Casas editoriales']
  }[page];
  if (config) {
    const [name,singular] = config; const form = document.querySelector('form'); let editing = null;
    function reset() { editing = null; form.reset(); clearErrors(form); document.querySelector('#form-titulo').textContent = `Crear ${singular}`; document.querySelector('#guardar').textContent = '✓ Guardar'; }
    const draw = () => renderTable(name === 'casasEditoriales' ? ['Nombre','Ciudad','Acciones'] : ['Nombre','Acciones'],data[name].map(record => {
      const actions = el('div',null,'stack'); actions.append(button('✎ Modificar',() => { reset(); editing = record.id; populate(form,record); document.querySelector('#form-titulo').textContent = `Modificar ${singular}`; form.elements.nombre.focus(); }),button('× Eliminar',() => remove(name,record,record.nombre,() => { if (editing === record.id) reset(); draw(); }),true));
      return name === 'casasEditoriales' ? [record.nombre,record.ciudad,actions] : [record.nombre,actions];
    }),`Lista de ${page === 'casas-editoriales' ? 'casas editoriales' : page === 'tipos-de-libro' ? 'tipos de libro' : 'autores'}`);
    document.querySelector('#nuevo').addEventListener('click',() => { reset(); form.elements.nombre.focus(); });
    document.querySelector('#cancelar').addEventListener('click',() => { reset(); document.querySelector('#nuevo').focus(); });
    form.addEventListener('submit',event => {
      event.preventDefault(); clearErrors(form); required(form,name === 'casasEditoriales' ? ['nombre','ciudad'] : ['nombre']); const values = read(form);
      if (data[name].some(record => record.id !== editing && normalize(record.nombre) === normalize(values.nombre))) invalid(form,'nombre','Este nombre ya está en la lista. Modifique el registro existente o escriba otro nombre.');
      if (errorsFound(form)) return;
      const record = {id:editing ?? nextId(name),...Object.fromEntries(Object.entries(values).map(([k,v]) => [k,v.trim()]))};
      if (editing !== null) Object.assign(data[name].find(item => item.id === editing),record); else data[name].push(record);
      if (name === 'tiposDeLibro') data.libros.filter(book => book.tipoId === record.id).forEach(book => { book.tipo = record.nombre; });
      const stored = persist(); reset(); draw(); message(`Se guardó ${record.nombre}.${stored ? '' : ' El cambio solo se conserva en esta pantalla.'}`);
    }); reset(); draw();
  }
  if (new URLSearchParams(location.search).get('guardado') === '1') message('Los cambios quedaron guardados en los datos registrados de este navegador.');
})();
