/* Funciona sin servidor y sin dependencias. No es un sistema de autenticación. */
(() => {
  'use strict';
  const root = document.documentElement;
  const page = document.body.dataset.page;
  const base = page === 'guia' ? '' : '../';
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key,value) => { try { localStorage.setItem(key,value); } catch { /* La página sigue funcionando sin almacenamiento. */ } };
  let level = Number(read('libreria-letra')) || 0;
  if (![0,1,2].includes(level)) level = 0;
  let high = read('libreria-contraste') === 'high';
  const shell = document.querySelector('[data-shell]');
  shell.innerHTML = `<a class="skip" href="#contenido">Saltar al contenido</a>
    <header class="toolbar" aria-label="Navegación y lectura">
      <button class="button" id="menu-toggle" type="button" title="Menú" aria-label="Menú" aria-expanded="false" aria-controls="menu-panel"><span aria-hidden="true">☰</span><span class="control-label">Menú</span></button>
      <a class="button" href="${base}pantallas/inicio.html" title="Inicio" aria-label="Inicio"><span aria-hidden="true">⌂</span><span class="control-label">Inicio</span></a>
      <button class="button" id="volver" type="button" title="Volver" aria-label="Volver"><span aria-hidden="true">←</span><span class="control-label">Volver</span></button>
      <button class="button" id="ayuda" type="button" title="¿Necesita ayuda?" aria-label="¿Necesita ayuda?"><span aria-hidden="true">?</span><span class="control-label">¿Necesita ayuda?</span></button>
      <button class="button" id="letra" type="button" title="Letra más grande" aria-label="Letra más grande"><span aria-hidden="true">A+</span><span class="control-label" id="letra-label">Letra más grande</span></button>
      <button class="button" id="contraste" type="button" title="Contraste alto" aria-label="Contraste alto" aria-pressed="false"><span aria-hidden="true">◐</span><span class="control-label">Contraste alto</span></button>
    </header>`;
  const sidebar = document.querySelector('[data-menu]');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `<p class="brand">▤ Mi librería</p><p class="hint">Todo a su alcance</p>
    <nav aria-label="Menú principal">
      <a class="button" href="${base}pantallas/inicio.html" ${page === 'inicio' ? 'aria-current="page"' : ''}><span aria-hidden="true">⌂</span> Inicio</a>
      <a class="button" href="${base}pantallas/login.html" ${page === 'login' ? 'aria-current="page"' : ''}><span aria-hidden="true">→</span> Ingresar</a>
      <a class="button" href="${base}guia-de-estilo.html" ${page === 'guia' ? 'aria-current="page"' : ''}><span aria-hidden="true">▤</span> Guía de estilo</a>
    </nav>`;
  const catalogos = [
    ['usuarios','Usuarios','usuarios.html','♧'],
    ['libros','Libros','libros.html','▤'],
    ['tipos-de-libro','Tipos de libro','tipos-de-libro.html','☷'],
    ['autores','Autores','autores.html','✎'],
    ['casas-editoriales','Casas editoriales','casas-editoriales.html','▥'],
    ['clientes-proveedores','Clientes y Proveedores','clientes-proveedores.html','♧'],
    ['compras','Compras','compras.html','⊕'],
    ['ventas','Ventas','ventas.html','▣'],
    ['libros-devueltos','Libros devueltos','libros-devueltos.html','↶'],
    ['informes','Informes','informes.html','▤'],
    ['cuadre-del-dia','Cuadre del día','cuadre-del-dia.html','☑'],
    ['lo-que-debemos-pagar','Lo que debemos pagar','lo-que-debemos-pagar.html','↗'],
    ['lo-que-nos-deben','Lo que nos deben','lo-que-nos-deben.html','↙'],
    ['impuestos','Impuestos','impuestos.html','▥']
  ];
  catalogos.forEach(([grupo,nombre,archivo,icono]) => {
    const link = document.createElement('a');
    link.className = 'button'; link.href = `${base}pantallas/${archivo}`;
    link.innerHTML = `<span aria-hidden="true">${icono}</span> ${nombre}`;
    if (page === grupo || document.body.dataset.group === grupo) link.setAttribute('aria-current','page');
    sidebar.querySelector('nav').append(link);
  });
  // El menú sale del flujo de la página: cerrado no ocupa espacio en el contenido.
  const menuPanel = document.createElement('dialog');
  menuPanel.id = 'menu-panel';
  menuPanel.className = 'nav-drawer';
  menuPanel.setAttribute('aria-labelledby','menu-title');
  menuPanel.innerHTML = `<div class="drawer-heading"><h2 id="menu-title">Menú de la librería</h2>
    <button class="button" id="menu-close" type="button"><span aria-hidden="true">×</span> Cerrar menú</button></div>`;
  menuPanel.append(sidebar);
  document.body.append(menuPanel);
  const menuToggle = document.querySelector('#menu-toggle');
  const closeMenu = () => { if (menuPanel.open) menuPanel.close(); };
  menuToggle.addEventListener('click',() => {
    if (menuPanel.open) { closeMenu(); return; }
    menuPanel.showModal();
    menuToggle.setAttribute('aria-expanded','true');
    document.querySelector('#menu-close').focus();
  });
  document.querySelector('#menu-close').addEventListener('click',closeMenu);
  menuPanel.addEventListener('close',() => {
    menuToggle.setAttribute('aria-expanded','false');
    menuToggle.focus();
  });
  menuPanel.addEventListener('click',event => {
    if (event.target !== menuPanel) return;
    const bounds = menuPanel.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
  });
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby','dialog-title');
  dialog.setAttribute('aria-describedby','dialog-message');
  dialog.innerHTML = `<h2 id="dialog-title"></h2><p id="dialog-message"></p><div class="actions">
    <button type="button" class="button" id="dialog-cancel"><span aria-hidden="true">←</span> Volver sin cambios</button>
    <button type="button" class="button danger" id="dialog-accept"></button></div>`;
  document.body.append(dialog);
  let resolveDialog = null;
  let opener = null;
  function finish(value) {
    dialog.close();
    resolveDialog?.(value);
    resolveDialog = null;
    opener?.focus();
  }
  dialog.addEventListener('cancel',event => { event.preventDefault(); finish(false); });
  document.querySelector('#dialog-cancel').addEventListener('click',() => finish(false));
  document.querySelector('#dialog-accept').addEventListener('click',() => finish(true));
  function openDialog({titulo,mensaje,aceptar = 'Sí, continuar',informativo = false}) {
    if (dialog.open) return Promise.resolve(false);
    opener = document.activeElement;
    document.querySelector('#dialog-title').textContent = titulo;
    document.querySelector('#dialog-message').textContent = mensaje;
    const accept = document.querySelector('#dialog-accept');
    accept.textContent = `✓ ${informativo ? 'Entendido' : aceptar}`;
    accept.className = informativo ? 'button' : 'button danger';
    document.querySelector('#dialog-cancel').hidden = informativo;
    return new Promise(resolve => {
      resolveDialog = resolve;
      dialog.showModal();
      document.querySelector(informativo ? '#dialog-accept' : '#dialog-cancel').focus();
    });
  }
  window.Libreria = {
    confirmar: opciones => openDialog(opciones),
    informar: (titulo,mensaje) => openDialog({titulo,mensaje,informativo:true})
  };
  // Evita que la cabecera fija cubra campos, mensajes o títulos al recibir foco.
  document.addEventListener('focusin',event => {
    const toolbar = document.querySelector('.toolbar');
    const target = event.target;
    if (!toolbar || menuPanel.contains(target) || toolbar.contains(target) || typeof target.getBoundingClientRect !== 'function') return;
    const anchor = target.tagName === 'MAIN' ? target.querySelector('h1') : target;
    if (!anchor) return;
    const bounds = anchor.getBoundingClientRect();
    const bottom = toolbar.getBoundingClientRect().bottom;
    const gap = parseFloat(getComputedStyle(root).getPropertyValue('--space-2'));
    if (bounds.top < bottom + gap) window.scrollBy({top:bounds.top - bottom - gap,behavior:'auto'});
  });
  function applyPreferences() {
    root.dataset.font = String(level);
    root.dataset.contrast = high ? 'high' : 'normal';
    document.querySelector('#letra-label').textContent = `Letra más grande · ${level + 1} de 3`;
    document.querySelector('#letra').setAttribute('aria-label',`Letra más grande. Nivel ${level + 1} de 3. ${level === 2 ? 'Cambiar a letra habitual.' : 'Aumentar un nivel.'}`);
    document.querySelector('#letra').setAttribute('title',`Letra más grande · ${level + 1} de 3`);
    document.querySelector('#contraste').setAttribute('aria-pressed',String(high));
  }
  applyPreferences();
  document.querySelector('#letra').addEventListener('click',() => { level = (level + 1) % 3; save('libreria-letra',level); applyPreferences(); });
  document.querySelector('#contraste').addEventListener('click',() => { high = !high; save('libreria-contraste',high ? 'high' : 'normal'); applyPreferences(); });
  document.querySelector('#volver').addEventListener('click',() => {
    // Destino predecible incluso al abrir un archivo directamente.
    location.href = document.body.dataset.back || `${base}pantallas/${page === 'inicio' ? 'login' : 'inicio'}.html`;
  });
  document.querySelector('#ayuda').addEventListener('click',() => window.Libreria.informar('Estamos para ayudarle',
    'Pulse Menú para abrir las opciones de la librería. Puede cerrarlo con Cerrar menú o con la tecla Escape. Use Inicio para ver las tarjetas. Puede aumentar la letra en tres niveles o activar Contraste alto. Para moverse con el teclado, use Tab y pulse Enter para elegir. '));
  const modules = document.querySelector('[data-modules]');
  if (modules) {
    window.LibreriaDatos.modulos.forEach(([nombre,descripcion,icono]) => {
      const destino = catalogos.find(([,label]) => label === nombre);
      const card = document.createElement(destino ? 'a' : 'button');
      if (destino) card.href = `${base}pantallas/${destino[2]}`;
      else card.type = 'button';
      card.className = 'module-card';
      const icon = document.createElement('span'); icon.className = 'icon'; icon.setAttribute('aria-hidden','true'); icon.textContent = icono;
      const title = document.createElement('strong'); title.textContent = nombre;
      const desc = document.createElement('span'); desc.textContent = descripcion;
      const state = document.createElement('span'); state.className = 'hint'; state.textContent = destino ? 'Abrir esta opción →' : 'Disponible en una próxima fase';
      card.append(icon,title,desc,state);
      if (!destino) card.addEventListener('click',() => window.Libreria.informar(nombre,'Esta pantalla se creará en una próxima fase. Por ahora puede explorar las opciones de Inicio y ajustar la lectura.'));
      modules.append(card);
    });
  }
  const form = document.querySelector('#ingresar');
  if (form) {
    const password = document.querySelector('#clave');
    document.querySelector('#mostrar').addEventListener('click',event => {
      const show = password.type === 'password'; password.type = show ? 'text' : 'password';
      event.currentTarget.innerHTML = `<span aria-hidden="true">◉</span> ${show ? 'Ocultar' : 'Mostrar'} clave`;
      event.currentTarget.setAttribute('aria-pressed',String(show));
    });
    document.querySelector('#olvide').addEventListener('click',() => window.Libreria.informar('Recuperar su clave',
      'En el sistema completo, pida ayuda a la persona encargada de la librería. Para ingresar, escriba libreria como usuario y lectura como clave.'));
    form.addEventListener('submit',event => {
      event.preventDefault();
      const username = document.querySelector('#usuario');
      const error = document.querySelector('#ingreso-error');
      const valid = username.value.trim() === 'libreria' && password.value === 'lectura';
      username.setAttribute('aria-invalid',String(!valid)); password.setAttribute('aria-invalid',String(!valid));
      error.hidden = valid;
      if (valid) location.href = 'inicio.html';
      else { error.textContent = '! No pudimos ingresar. Escriba libreria en Usuario y lectura en Contraseña para probar. Puede usar Mostrar clave para revisarla.'; error.focus(); }
    });
  }
  document.querySelectorAll('[data-confirm]').forEach(button => button.addEventListener('click',async () => {
    const kind = button.dataset.confirm;
    const actions = {
      borrar: ['¿Desea borrar este libro?', 'En el sistema completo, el libro se quitaría de la lista. En este ejemplo no se cambia ningún dato.', 'Sí, borrar el libro'],
      factura: ['¿Desea enviar la factura electrónica?', 'Revise el cliente y el valor antes de enviarla. Esta acción no envía documentos.', 'Sí, enviar factura'],
      caja: ['¿Desea terminar el cuadre del día?', 'Revise el dinero recibido y los pagos del día. Esta acción no cambia ningún dato.', 'Sí, terminar el cuadre']
    };
    const [titulo,mensaje,aceptar] = actions[kind];
    const accepted = await window.Libreria.confirmar({titulo,mensaje,aceptar});
    document.querySelector('#resultado-confirmacion').textContent = accepted ? '✓ Confirmación recibida. Es un ejemplo: no se cambió ni envió información.' : '↶ Acción cancelada. No se cambió información.';
  }));
  document.querySelector('#ejemplo-guardar')?.addEventListener('click',() => window.Libreria.informar('Ejemplo de guardado','Los cambios se guardarían aquí. En este ejemplo no se cambia información.'));
})();
