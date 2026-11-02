/* Operaciones locales. Sin servidor, pagos ni envíos reales. */
(() => {
  'use strict';
  const KEY2 = 'libreria-fase2-v1', KEY3 = 'libreria-fase3-v1';
  const names2 = ['usuarios','libros','autores','tiposDeLibro','casasEditoriales'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const seed = window.LibreriaDatos;
  let phase2 = Object.fromEntries(names2.map(name => [name,copy(seed[name])]));
  let phase3 = {
    clientes: seed.clientes.map(item => ({...item,correo:`cliente${item.id}@example.com`,documento:'',direccion:''})),
    proveedores: seed.proveedores.map(item => ({...item,correo:`proveedor${item.id}@example.com`,documento:'',direccion:''})),
    ...copy(seed.ejemplosFase3)
  };
  let raw2 = null, raw3 = null, temporal = false, invalid = false;
  try { raw2 = localStorage.getItem(KEY2); raw3 = localStorage.getItem(KEY3); }
  catch { temporal = true; }
  try {
    if (raw2) {
      const saved = JSON.parse(raw2);
      if (!names2.every(name => Array.isArray(saved[name]))) throw Error('Datos incompletos');
      phase2 = saved;
    }
    if (raw3) {
      const saved = JSON.parse(raw3);
      if (!['clientes','proveedores','ventas','compras','devueltos'].every(name => Array.isArray(saved[name]))) throw Error('Datos incompletos');
      phase3 = saved;
    }
  } catch { invalid = true; }
  const fail = text => { throw Error(text); };
  const integer = (value,min = 1) => Number.isSafeInteger(Number(value)) && Number(value) >= min;
  const normalize = value => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CO');
  const next = rows => Math.max(0,...rows.map(item => item.id)) + 1;
  const sum = rows => {
    const value = rows.reduce((total,line) => total + line.cantidad * line.precio,0);
    if (!Number.isSafeInteger(value) || value < 0) fail('El total es demasiado alto. Revise los precios y las cantidades.');
    return value;
  };
  function commit(change) {
    if (invalid) fail('No pudimos leer los datos guardados. Conserve esta información y pida ayuda antes de continuar. No se reemplazaron los datos anteriores.');
    const a = copy(phase2), b = copy(phase3);
    const record = change(a,b);
    if (!temporal) {
      let wrote2 = false;
      try {
        if (localStorage.getItem(KEY2) !== raw2 || localStorage.getItem(KEY3) !== raw3) fail('Los datos cambiaron en otra pantalla. Recargue esta página y revise la información antes de guardar.');
        const new2 = JSON.stringify(a), new3 = JSON.stringify(b);
        localStorage.setItem(KEY2,new2); wrote2 = true;
        localStorage.setItem(KEY3,new3);
        raw2 = new2; raw3 = new3;
      } catch (error) {
        if (wrote2) {
          try { if (raw2 === null) localStorage.removeItem(KEY2); else localStorage.setItem(KEY2,raw2); }
          catch { fail('El navegador interrumpió el guardado. Recargue la página y revise las cantidades antes de volver a intentar.'); }
        }
        if (error.message.startsWith('Los datos cambiaron')) throw error;
        fail('No se pudo guardar. No se registró la operación. Revise que el navegador permita guardar datos y vuelva a intentar.');
      }
    }
    phase2 = a; phase3 = b;
    names2.forEach(name => { seed[name] = copy(a[name]); });
    return {record:copy(record),persistido:!temporal};
  }
  function remaining(state,tipo,documentoId,libroId) {
    const original = state[tipo].find(item => item.id === documentoId);
    if (!original) fail('Elija una compra o venta disponible.');
    const line = original.lineas.find(item => item.libroId === libroId);
    if (!line) fail('Elija un libro que aparezca en el registro original.');
    return line.cantidad - state.devueltos.filter(item => item.tipo === tipo && item.documentoId === documentoId && item.libroId === libroId).reduce((total,item) => total + item.cantidad,0);
  }
  window.Fase3Datos = {
    get temporal() { return temporal; },
    get invalido() { return invalid; },
    get datos() { return copy({...phase2,...phase3}); },
    total:sum,
    pendiente:(tipo,documentoId,libroId) => remaining(phase3,tipo,documentoId,libroId),
    guardarPersona(tipo,values,id = null) {
      return commit((a,b) => {
        if (!['clientes','proveedores'].includes(tipo)) fail('Elija Cliente o Proveedor.');
        const record = Object.fromEntries(['nombre','documento','telefono','correo','ciudad','direccion'].map(key => [key,String(values[key] || '').trim()]));
        if (!record.nombre || !record.ciudad || !record.telefono) fail('Complete el nombre, la ciudad y el teléfono.');
        if (!/^[\d\s+()-]{7,20}$/.test(record.telefono) || record.telefono.replace(/\D/g,'').length < 7) fail('Escriba un teléfono con al menos 7 dígitos y hasta 20 caracteres. Puede incluir espacios, +, paréntesis o guiones.');
        if (record.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.correo)) fail('Revise el correo. Use un formato como nombre@ejemplo.com.');
        if (record.documento && b[tipo].some(item => item.id !== id && normalize(item.documento) === normalize(record.documento))) fail('Esta identificación ya está registrada. Revise la lista antes de crear otra persona.');
        const current = id === null ? null : b[tipo].find(item => item.id === id);
        if (id !== null && !current) fail('No encontramos este registro. Vuelva a la lista y elija uno disponible.');
        record.id = current?.id ?? next(b[tipo]);
        if (current) Object.assign(current,record); else b[tipo].push(record);
        return record;
      });
    },
    eliminarPersona(tipo,id) {
      return commit((a,b) => {
        if (!['clientes','proveedores'].includes(tipo)) fail('Elija Cliente o Proveedor.');
        const operations = tipo === 'clientes' ? b.ventas : b.compras;
        if (operations.some(item => item.personaId === id)) fail('Este registro tiene compras o ventas asociadas. Puede modificar sus datos, pero debe conservarlo para consultar esas operaciones.');
        const record = b[tipo].find(item => item.id === id);
        if (!record) fail('Este registro ya no está en la lista.');
        b[tipo] = b[tipo].filter(item => item.id !== id); return record;
      });
    },
    registrarOperacion(tipo,{personaId,lineas,pago}) {
      return commit((a,b) => {
        if (!['ventas','compras'].includes(tipo)) fail('Elija una compra o venta.');
        const sale = tipo === 'ventas';
        const person = b[sale ? 'clientes' : 'proveedores'].find(item => item.id === Number(personaId));
        if (!person) fail(`Elija un ${sale ? 'cliente' : 'proveedor'} disponible.`);
        if (sale && (!person.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.correo))) fail('Este cliente necesita un correo válido. Modifíquelo en Clientes y Proveedores antes de continuar.');
        if (sale && !['Efectivo','Tarjeta','Transferencia'].includes(pago)) fail('Elija una forma de pago.');
        if (!Array.isArray(lineas) || !lineas.length) fail('Agregue al menos un libro antes de continuar.');
        if (new Set(lineas.map(line => Number(line.libroId))).size !== lineas.length) fail('El libro está repetido. Deje una sola fila y revise su cantidad.');
        const details = lineas.map(line => {
          const book = a.libros.find(item => item.id === Number(line.libroId));
          if (!book) fail('Uno de los libros ya no está disponible. Vuelva al paso de libros y elija otro.');
          if (!integer(line.cantidad)) fail('Escriba una cantidad entera mayor que cero.');
          const quantity = Number(line.cantidad), price = sale ? book.precio : Number(line.precio);
          if (!integer(price)) fail('Escriba un precio en pesos enteros mayor que cero.');
          if (!integer(book.existencias,0)) fail('Revise la cantidad del libro en el catálogo antes de continuar.');
          if (sale && quantity > book.existencias) fail(`Solo hay ${book.existencias} ejemplares de ${book.titulo}. Reduzca la cantidad.`);
          book.existencias += sale ? -quantity : quantity;
          if (!integer(book.existencias,0)) fail('La cantidad es demasiado alta. Revise los ejemplares agregados.');
          return {libroId:book.id,titulo:book.titulo,codigoBarras:String(book.codigoBarras ?? ''),cantidad:quantity,precio:price};
        });
        const id = next(b[tipo]);
        const record = {id,referencia:`${sale ? 'V' : 'C'}-${String(id).padStart(4,'0')}`,fecha:new Date().toISOString(),personaId:person.id,personaNombre:person.nombre,correo:person.correo || '',lineas:details,total:sum(details)};
        if (sale) { record.pago = pago; record.envio = 'simulado'; }
        b[tipo].push(record); return record;
      });
    },
    registrarDevuelto({tipo,documentoId,libroId,cantidad,motivo}) {
      return commit((a,b) => {
        if (!['ventas','compras'].includes(tipo)) fail('Elija si el libro viene de una venta o de una compra.');
        documentoId = Number(documentoId); libroId = Number(libroId); cantidad = Number(cantidad);
        if (!integer(cantidad)) fail('Escriba una cantidad entera mayor que cero.');
        const pending = remaining(b,tipo,documentoId,libroId);
        if (cantidad > pending) fail(`Puede registrar hasta ${pending} ejemplares de este libro. Revise la cantidad.`);
        if (!String(motivo || '').trim()) fail('Escriba el motivo para dejar constancia de lo ocurrido.');
        const original = b[tipo].find(item => item.id === documentoId);
        const line = original.lineas.find(item => item.libroId === libroId);
        const book = a.libros.find(item => item.id === libroId);
        if (!book) fail('Este libro ya no está en el catálogo. Pida ayuda para revisar el registro original.');
        if (!integer(book.existencias,0)) fail('Revise la cantidad del libro en el catálogo.');
        if (tipo === 'compras' && cantidad > book.existencias) fail(`Solo hay ${book.existencias} ejemplares disponibles para entregar al proveedor.`);
        book.existencias += tipo === 'ventas' ? cantidad : -cantidad;
        if (!integer(book.existencias,0)) fail('Revise la cantidad disponible antes de continuar.');
        const record = {id:next(b.devueltos),fecha:new Date().toISOString(),tipo,documentoId,referencia:original.referencia,personaNombre:original.personaNombre,libroId,titulo:line.titulo,cantidad,precio:line.precio,total:sum([{cantidad,precio:line.precio}]),motivo:String(motivo).trim()};
        b.devueltos.push(record); return record;
      });
    }
  };
})();
