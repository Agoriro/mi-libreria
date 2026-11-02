/* Consultas de solo lectura. Nunca cambian los registros de fases anteriores. */
(() => {
  'use strict';
  const day = value => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw Error('Hay un registro con una fecha que no se puede leer. Revíselo antes de consultar el informe.');
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get = key => parts.find(part => part.type === key).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const sum = (rows,key) => rows.reduce((total,item) => total + Number(item[key] || 0),0);
  const dateValid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
  const dateText = value => value.split('-').reverse().join('/');
  const chart = (title,items,unit = 'pesos') => ({title,items:items.map(([label,value]) => ({label,value})),unit});
  const money = value => window.pesosColombianos(value);
  function source() {
    if (window.Fase3Datos.invalido) throw Error('No pudimos leer los datos guardados. Pida ayuda para revisarlos. No se muestran cifras de ejemplo en su lugar.');
    return window.Fase3Datos.datos;
  }
  function generate(kind,filters) {
    const {desde,hasta} = filters;
    if (!dateValid(desde) || !dateValid(hasta)) throw Error('Elija una fecha inicial y una fecha final válidas.');
    if (desde > hasta) throw Error('La fecha inicial debe ser anterior o igual a la fecha final. Revise las dos fechas.');
    const data = source(), extra = window.LibreriaDatos.ejemplosFase4;
    const within = item => { const d = day(item.fecha); return d >= desde && d <= hasta; };
    const beforeEnd = item => day(item.fecha) <= hasta;
    const result = {summary:[],charts:[],headers:[],rows:[],notes:[],count:0};
    const totalsByDay = rows => {
      const grouped = new Map(); rows.forEach(row => { const d = day(row.fecha); grouped.set(d,(grouped.get(d) || 0) + row.valor); });
      return [...grouped.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([d,value]) => [dateText(d),value]);
    };
    if (kind === 'compras' || kind === 'ventas') {
      const operations = data[kind].filter(within);
      const returns = data.devueltos.filter(item => item.tipo === kind && within(item));
      const gross = sum(operations,'total'), returned = sum(returns,'total');
      result.summary = [[kind === 'compras' ? 'Compras registradas' : 'Ventas registradas',gross],['Libros devueltos en el periodo',returned],['Total después de libros devueltos',gross - returned]];
      const events = [...operations.map(item => ({...item,valor:item.total})),...returns.map(item => ({...item,valor:-item.total}))];
      result.charts = [chart('Total por día después de libros devueltos',totalsByDay(events))];
      result.headers = ['Fecha','Registro','Persona','Movimiento','Valor'];
      result.rows = [...operations.map(item => [day(item.fecha),item.referencia,item.personaNombre,kind === 'compras' ? 'Compra' : 'Venta',item.total]),...returns.map(item => [day(item.fecha),item.referencia,item.personaNombre,'Libros devueltos',-item.total])].sort((a,b)=>a[0].localeCompare(b[0])).map(([d,...values])=>[dateText(d),...values.slice(0,-1),money(values.at(-1))]);
      result.notes = ['Las fechas corresponden a cada movimiento. Un libro devuelto en este periodo puede pertenecer a una compra o venta anterior.','Los importes son los registrados; no se agregan impuestos que no estén guardados.'];
      result.count = events.length;
    } else if (kind === 'ganancias') {
      function cost(bookId,sale) {
        const candidates = data.compras.filter(item => item.fecha <= sale.fecha && item.lineas.some(line => line.libroId === bookId)).sort((a,b)=>b.fecha.localeCompare(a.fecha));
        return candidates[0]?.lineas.find(line => line.libroId === bookId).precio ?? extra.costosIniciales.find(item => item.libroId === bookId)?.costo ?? null;
      }
      const events = [];
      data.ventas.filter(within).forEach(sale => sale.lineas.forEach(line => events.push({fecha:sale.fecha,referencia:sale.referencia,titulo:line.titulo,cantidad:line.cantidad,precio:line.precio,costo:cost(line.libroId,sale)})));
      data.devueltos.filter(item => item.tipo === 'ventas' && within(item)).forEach(item => {
        const sale = data.ventas.find(sale => sale.id === item.documentoId);
        events.push({fecha:item.fecha,referencia:`${item.referencia} · Libro devuelto`,titulo:item.titulo,cantidad:-item.cantidad,precio:item.precio,costo:sale ? cost(item.libroId,sale) : null});
      });
      const known = events.filter(item => item.costo !== null);
      const income = known.reduce((total,item)=>total + item.cantidad * item.precio,0), costs = known.reduce((total,item)=>total + item.cantidad * item.costo,0);
      result.summary = [['Ventas netas con costo disponible',income],['Costo estimado de esos libros',costs],['Ganancia estimada',income - costs]];
      result.charts = [chart('Ganancia estimada por día',totalsByDay(known.map(item => ({...item,valor:item.cantidad * (item.precio - item.costo)}))))];
      result.headers = ['Registro y fecha','Libro','Cantidad neta','Venta por ejemplar','Costo estimado por ejemplar','Ganancia estimada'];
      result.rows = events.map(item => [`${item.referencia} · ${dateText(day(item.fecha))}`,item.titulo,String(item.cantidad),money(item.precio),item.costo === null ? 'Sin costo disponible' : money(item.costo),item.costo === null ? 'No calculada' : money(item.cantidad * (item.precio - item.costo))]);
      result.notes = ['Estimación: usa el último precio de compra anterior a la venta. Si no existe, usa un costo inicial ficticio del 65 % del precio de ejemplo. No equivale a una ganancia contable.','No incluye gastos del negocio ni impuestos. Los libros devueltos revierten el ingreso y el costo estimado de la venta original.'];
      if (known.length !== events.length) result.notes.push('Hay libros sin costo disponible. Aparecen en la tabla y se excluyen de la ganancia estimada.');
      result.count = events.length;
    } else if (kind === 'libros-mas-y-menos-vendidos') {
      const books = new Map(data.libros.map(book => [book.id,{...book,unidades:0}]));
      data.ventas.filter(within).forEach(sale => sale.lineas.forEach(line => {
        if (!books.has(line.libroId)) books.set(line.libroId,{id:line.libroId,titulo:line.titulo,unidades:0});
        const returned = data.devueltos.filter(item => item.tipo === 'ventas' && item.documentoId === sale.id && item.libroId === line.libroId && beforeEnd(item)).reduce((total,item)=>total + item.cantidad,0);
        books.get(line.libroId).unidades += line.cantidad - returned;
      }));
      const matching = [...books.values()].filter(book => (!filters.autor || String(book.autorId) === String(filters.autor)) && (!filters.tipoLibro || String(book.tipoId) === String(filters.tipoLibro)));
      const sorted = matching.sort((a,b)=>b.unidades - a.unidades || a.titulo.localeCompare(b.titulo,'es'));
      const most = sorted.slice(0,5), least = [...sorted].sort((a,b)=>a.unidades - b.unidades || a.titulo.localeCompare(b.titulo,'es')).slice(0,5);
      result.summary = [['Ejemplares vendidos después de libros devueltos',sum(sorted,'unidades'),'unidades'],['Libros que coinciden con los filtros',sorted.length,'unidades']];
      result.charts = [chart('Los 5 que más se venden',most.map(book => [book.titulo,book.unidades]),'unidades'),chart('Los 5 que menos se venden',least.map(book => [book.titulo,book.unidades]),'unidades')];
      result.headers = ['Libro','Autor','Tipo de libro','Ejemplares vendidos'];
      result.rows = sorted.map(book=>[book.titulo,data.autores.find(item=>item.id===book.autorId)?.nombre || 'Sin autor disponible',data.tiposDeLibro.find(item=>item.id===book.tipoId)?.nombre || 'Sin tipo disponible',String(book.unidades)]);
      result.notes = ['Cuenta las ventas originadas en el periodo y descuenta sus libros devueltos hasta la fecha final. Incluye libros sin ventas.','Ambos gráficos usan la misma escala. Puede elegir un autor y un tipo de libro a la vez. Con pocos libros, un título puede aparecer en ambos grupos.'];
      result.count = matching.length;
    } else if (kind === 'lo-que-debemos-pagar') {
      const rows = data.compras.filter(within).map(item => {
        const returns = data.devueltos.filter(row=>row.tipo === 'compras' && row.documentoId === item.id && beforeEnd(row));
        const paid = extra.pagosCompras.filter(row=>row.referencia === item.referencia && beforeEnd(row));
        const net = item.total - sum(returns,'total'), payments = sum(paid,'valor'), balance = net - payments;
        return {nombre:item.personaNombre,ref:item.referencia,fecha:day(item.fecha),total:net,abonos:payments,saldo:Math.max(0,balance),favor:Math.max(0,-balance)};
      });
      result.summary = [['Compras después de libros devueltos',sum(rows,'total')],['Pagos de ejemplo registrados',sum(rows,'abonos')],['Lo que debemos pagar',sum(rows,'saldo')],['Saldo a favor con proveedores',sum(rows,'favor')]];
      const grouped = new Map(); rows.forEach(row=>grouped.set(row.nombre,(grouped.get(row.nombre)||0)+row.saldo));
      result.charts = [chart('Saldo pendiente por proveedor',[...grouped])];
      result.headers = ['Compra y fecha','Proveedor','Valor después de libros devueltos','Pagos registrados','Pendiente','A favor'];
      result.rows = rows.map(row=>[`${row.ref} · ${dateText(row.fecha)}`,row.nombre,money(row.total),money(row.abonos),money(row.saldo),money(row.favor)]);
      result.notes = ['Muestra compras creadas en el periodo y calcula su saldo hasta la fecha final. Los pagos posteriores no se descuentan.','La fase 3 no registra pagos de compras. Se incluye un pago parcial ficticio para C-0001; las demás compras se muestran pendientes hasta contar con un pago registrado.']; result.count=rows.length;
    } else if (kind === 'lo-que-nos-deben') {
      const rows = extra.cuentasCobrar.filter(within).map(item=> {
        const paid = sum(item.abonos.filter(beforeEnd),'valor'); return {...item,pagado:paid,saldo:Math.max(0,item.total-paid)};
      });
      result.summary = [['Valor de las cuentas de ejemplo',sum(rows,'total')],['Abonos recibidos hasta la fecha final',sum(rows,'pagado')],['Lo que nos deben',sum(rows,'saldo')]];
      result.charts = [chart('Saldo pendiente por cliente',rows.map(item=>[item.personaNombre,item.saldo]))];
      result.headers = ['Cuenta y fecha','Cliente','Valor original','Abonos','Pendiente'];
      result.rows = rows.map(item=>[`${item.referencia} · ${dateText(day(item.fecha))}`,item.personaNombre,money(item.total),money(item.pagado),money(item.saldo)]);
      result.notes = ['Son cuentas independientes de ejemplo, originadas en el periodo, con abonos hasta la fecha final.','Las ventas de la fase 3 se registran con pago inmediato y no se presentan como deudas. No se inventan saldos pendientes para esas ventas.']; result.count=rows.length;
    } else if (kind === 'cuadre-del-dia') {
      const opening = Number(filters.fondo), counted = filters.contado === '' || filters.contado == null ? null : Number(filters.contado);
      if (!Number.isSafeInteger(opening) || opening < 0 || (counted !== null && (!Number.isSafeInteger(counted) || counted < 0))) throw Error('Escriba el fondo inicial y el dinero contado en pesos enteros, desde cero. Puede dejar Dinero contado sin llenar.');
      const cash = data.ventas.filter(item=>within(item) && item.pago === 'Efectivo');
      const payments = extra.pagosCompras.filter(item=>within(item) && item.forma === 'Efectivo' && data.compras.some(buy=>buy.referencia===item.referencia));
      const collected = extra.cuentasCobrar.flatMap(item=>item.abonos.filter(row=>within(row) && row.forma==='Efectivo').map(row=>({...row,referencia:item.referencia,personaNombre:item.personaNombre})));
      const received = sum(cash,'total') + sum(collected,'valor'), out = sum(payments,'valor'), expected = opening + received - out;
      result.summary = [['Fondo inicial indicado',opening],['Dinero recibido en efectivo',received],['Pagos registrados en efectivo',out],['Dinero esperado en caja',expected]];
      if (counted !== null) result.summary.push(['Dinero contado',counted],['Diferencia: contado menos esperado',counted - expected]);
      result.charts = [chart('Dinero en efectivo del periodo',[['Fondo inicial',opening],['Recibido en efectivo',received],['Pagado en efectivo',out],['Esperado en caja',expected],...(counted===null?[]:[['Contado',counted],['Diferencia',counted-expected]])])];
      result.headers = ['Fecha','Registro','Movimiento','Valor'];
      result.rows = [...cash.map(item=>[day(item.fecha),item.referencia,'Venta en efectivo',item.total]),...payments.map(item=>[day(item.fecha),item.referencia,'Pago de compra de ejemplo',-item.valor]),...collected.map(item=>[day(item.fecha),item.referencia,'Abono recibido de ejemplo',item.valor])].sort((a,b)=>a[0].localeCompare(b[0])).map(([d,ref,label,value])=>[dateText(d),ref,label,money(value)]);
      result.notes = ['Fondo inicial: dinero que había al comenzar el periodo. El valor precargado es un ejemplo y puede cambiarlo. Este informe no cierra ni bloquea la caja.','Las ventas con tarjeta o transferencia no entran en el efectivo. Los libros devueltos no mueven dinero en la fase 3 y no se descuentan de caja.','Incluye pagos y abonos ficticios identificados en la tabla. Las compras sin pago registrado no se descuentan del efectivo.']; result.count=cash.length+payments.length+collected.length;
    } else if (kind === 'impuestos') {
      const rows = extra.impuestos.filter(within), sales = rows.filter(item=>item.origen==='Ventas'), buys = rows.filter(item=>item.origen==='Compras');
      result.summary = [['IVA registrado en ventas de ejemplo',sum(sales,'iva')],['IVA registrado en compras de ejemplo',sum(buys,'iva')],['Otros impuestos registrados',sum(rows,'otros')]];
      result.charts = [chart('Importes de impuestos de ejemplo',[['IVA en ventas',sum(sales,'iva')],['IVA en compras',sum(buys,'iva')],['Otros en ventas',sum(sales,'otros')],['Otros en compras',sum(buys,'otros')]])];
      result.headers = ['Registro y fecha','Concepto','Origen','Valor base','IVA','Otros impuestos'];
      result.rows = rows.map(item=>[`${item.referencia} · ${dateText(day(item.fecha))}`,item.concepto,item.origen,money(item.base),money(item.iva),money(item.otros)]);
      result.notes = ['Importes fiscales inventados para mostrar el diseño. Son ejemplos independientes de las compras y ventas de libros de la fase 3.','La fase 3 no guarda el detalle de impuestos. Esos registros no se interpretan como operaciones con impuesto cero.','No se aplican tarifas automáticas ni se calcula un impuesto por pagar. Los valores no sirven para presentar declaraciones.']; result.count=rows.length;
    } else throw Error('No encontramos este informe. Vuelva a Informes y elija una tarjeta.');
    if (!result.count) result.notes.unshift('No hay registros para estos filtros. Puede ampliar el periodo o cambiar los filtros.');
    return result;
  }
  window.InformesDatos = {generar:generate,dia:day,fechaValida:dateValid,fechaTexto:dateText};
})();
