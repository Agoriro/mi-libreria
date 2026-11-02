/* Información ficticia. Los precios son pesos colombianos. */
window.LibreriaDatos = {
  autores: [
    { id: 1, nombre: 'Gabriel García Márquez' }, { id: 2, nombre: 'Laura Restrepo' },
    { id: 3, nombre: 'Jorge Isaacs' }, { id: 4, nombre: 'José Eustasio Rivera' },
    { id: 5, nombre: 'Piedad Bonnett' }, { id: 6, nombre: 'William Ospina' },
    { id: 7, nombre: 'Tomás Carrasquilla' }, { id: 8, nombre: 'Rafael Pombo' }
  ],
  casasEditoriales: [
    { id: 1, nombre: 'Casa del Río', ciudad: 'Bogotá' },
    { id: 2, nombre: 'Letras del Sur', ciudad: 'Cali' },
    { id: 3, nombre: 'Lecturas de la Montaña', ciudad: 'Medellín' },
    { id: 4, nombre: 'Páginas del Caribe', ciudad: 'Barranquilla' },
    { id: 5, nombre: 'Horizonte de Papel', ciudad: 'Bucaramanga' },
    { id: 6, nombre: 'Semillas de Lectura', ciudad: 'Pereira' }
  ],
  clientes: [
    { id: 1, nombre: 'Marta Lucía Rojas', ciudad: 'Bogotá', telefono: '3000000001' },
    { id: 2, nombre: 'Jorge Enrique Ruiz', ciudad: 'Medellín', telefono: '3000000002' },
    { id: 3, nombre: 'Ana María Gómez', ciudad: 'Cali', telefono: '3000000003' },
    { id: 4, nombre: 'Luis Fernando Díaz', ciudad: 'Pereira', telefono: '3000000004' },
    { id: 5, nombre: 'Carmen Rosa López', ciudad: 'Bogotá', telefono: '3000000005' },
    { id: 6, nombre: 'Carlos Alberto Peña', ciudad: 'Tunja', telefono: '3000000006' }
  ],
  proveedores: [
    { id: 1, nombre: 'Distribuidora Lecturas Andinas', ciudad: 'Bogotá', telefono: '6010000001' },
    { id: 2, nombre: 'Libros del Valle', ciudad: 'Cali', telefono: '6020000002' },
    { id: 3, nombre: 'Distribuidora del Caribe', ciudad: 'Barranquilla', telefono: '6050000003' },
    { id: 4, nombre: 'Papel y Letras', ciudad: 'Medellín', telefono: '6040000004' }
  ],
  libros: [
    [1,'Cien años de soledad',1,1,'Novela',65000,12],
    [2,'El coronel no tiene quien le escriba',1,1,'Novela',38000,8],
    [3,'El amor en los tiempos del cólera',1,4,'Novela',62000,10],
    [4,'Crónica de una muerte anunciada',1,4,'Novela',42000,7],
    [5,'Delirio',2,2,'Novela',54000,9],
    [6,'La multitud errante',2,2,'Novela',39000,5],
    [7,'Dulce compañía',2,3,'Novela',46000,6],
    [8,'María',3,2,'Novela',32000,15],
    [9,'La vorágine',4,1,'Novela',35000,11],
    [10,'Tierra de promisión',4,5,'Poesía',28000,4],
    [11,'Lo que no tiene nombre',5,3,'Memorias',48000,8],
    [12,'El hilo de los días',5,5,'Poesía',30000,6],
    [13,'Qué hacer con estos pedazos',5,3,'Novela',52000,7],
    [14,'Ursúa',6,1,'Novela',59000,5],
    [15,'El país de la canela',6,5,'Novela',58000,9],
    [16,'La serpiente sin ojos',6,4,'Novela',57000,4],
    [17,'Frutos de mi tierra',7,3,'Novela',36000,6],
    [18,'La marquesa de Yolombó',7,3,'Novela',44000,5],
    [19,'Cuentos pintados',8,6,'Infantil',27000,18],
    [20,'Fábulas y verdades',8,6,'Infantil',25000,14]
  ].map(([id,titulo,autorId,casaEditorialId,tipo,precio,existencias]) => ({id,titulo,autorId,casaEditorialId,tipo,precio,existencias})),
  modulos: [
    ['Libros','Consultar los libros y las cantidades disponibles.','▤'],
    ['Autores','Consultar quién escribió cada libro.','✎'],
    ['Tipos de libro','Organizar las lecturas por su tipo.','☷'],
    ['Casas editoriales','Consultar las casas que publican los libros.','▥'],
    ['Clientes y Proveedores','Consultar a quienes compran y nos abastecen.','♧'],
    ['Ventas','Registrar una venta y enviar factura electrónica.','▣'],
    ['Compras','Registrar los libros que llegan a la librería.','⊕'],
    ['Libros devueltos','Revisar los libros que se han devuelto.','↶'],
    ['Lo que debemos pagar','Consultar los pagos pendientes a proveedores.','↗'],
    ['Lo que nos deben','Consultar los pagos pendientes de clientes.','↙'],
    ['Cuadre del día','Revisar el dinero recibido y los pagos del día.','☑']
  ]
};
window.pesosColombianos = valor => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(valor);

/* Catálogos adicionales de la fase 2. Se conservan los datos originales. */
window.LibreriaDatos.tiposDeLibro = [
  {id:1,nombre:'Novela'}, {id:2,nombre:'Poesía'},
  {id:3,nombre:'Memorias'}, {id:4,nombre:'Infantil'}
];
window.LibreriaDatos.usuarios = [
  {id:1,nombre:'Marta Lucía Rojas',usuario:'libreria',correo:'marta@example.com',rol:'Persona encargada',estado:'Activo'},
  {id:2,nombre:'Jorge Enrique Ruiz',usuario:'jorge',correo:'jorge@example.com',rol:'Ventas',estado:'Activo'},
  {id:3,nombre:'Ana María Gómez',usuario:'ana',correo:'ana@example.com',rol:'Consulta',estado:'Inactivo'}
];
window.LibreriaDatos.libros.forEach(libro => {
  libro.tipoId = window.LibreriaDatos.tiposDeLibro.find(tipo => tipo.nombre === libro.tipo).id;
  libro.portada = '';
  libro.codigoBarras = '';
});
// Los códigos son texto: se conservan los ceros iniciales y no se convierten a número.
window.CodigosLibros = {
  normalizar: valor => String(valor ?? '').trim(),
  valido: codigo => /^[!-~]{1,64}$/.test(codigo),
  buscar: (libros,codigo) => {
    const valor = String(codigo ?? '').trim();
    return valor ? libros.filter(libro => String(libro.codigoBarras ?? '').trim() === valor) : [];
  }
};

/* Operaciones históricas ficticias para practicar con libros devueltos.
   Las cantidades iniciales del catálogo ya contemplan estas operaciones. */
window.LibreriaDatos.ejemplosFase3 = {
  ventas: [{id:1,referencia:'V-0001',fecha:'2026-11-01T15:00:00.000Z',personaId:1,personaNombre:'Marta Lucía Rojas',correo:'cliente1@example.com',pago:'Efectivo',lineas:[{libroId:8,titulo:'María',cantidad:2,precio:32000}],total:64000,envio:'simulado'}],
  compras: [{id:1,referencia:'C-0001',fecha:'2026-11-01T14:00:00.000Z',personaId:1,personaNombre:'Distribuidora Lecturas Andinas',lineas:[{libroId:1,titulo:'Cien años de soledad',cantidad:5,precio:42000}],total:210000}],
  devueltos: []
};

/* Fase 4: ejemplos complementarios, separados de las operaciones de la fase 3.
   Los importes de impuestos son inventados: no representan reglas tributarias. */
window.LibreriaDatos.ejemplosFase4 = {
  costosIniciales: window.LibreriaDatos.libros.map(libro => ({libroId:libro.id,costo:Math.round(libro.precio * 0.65)})),
  pagosCompras: [{referencia:'C-0001',fecha:'2026-11-01T16:00:00.000Z',valor:120000,forma:'Efectivo',detalle:'Pago parcial de ejemplo'}],
  cuentasCobrar: [{referencia:'EJ-COBRO-01',fecha:'2026-10-30T15:00:00.000Z',personaNombre:'Jorge Enrique Ruiz',total:135000,detalle:'Cuenta independiente de ejemplo; no corresponde a una venta de la fase 3',abonos:[{fecha:'2026-11-01T16:30:00.000Z',valor:50000,forma:'Efectivo'}]}],
  impuestos: [
    {referencia:'EJ-IMP-01',fecha:'2026-11-01T15:00:00.000Z',concepto:'Servicio de empaque de ejemplo',origen:'Ventas',base:50000,iva:9500,otros:1000},
    {referencia:'EJ-IMP-02',fecha:'2026-11-01T14:00:00.000Z',concepto:'Materiales de oficina de ejemplo',origen:'Compras',base:100000,iva:19000,otros:2500}
  ],
  fondoInicial: 200000
};
window.LibreriaDatos.informesFase4 = [
  ['compras','Informe de compras','informe-compras.html','Revise las compras y los libros entregados de vuelta al proveedor.','⊕'],
  ['ventas','Informe de ventas','informe-ventas.html','Consulte las ventas y los libros que regresan del cliente.','▣'],
  ['ganancias','Ganancias','ganancias.html','Compare las ventas con el costo estimado de los libros vendidos.','↗'],
  ['libros-mas-y-menos-vendidos','Libros que más y menos se venden','libros-mas-y-menos-vendidos.html','Compare ejemplares vendidos y filtre por autor y tipo de libro.','▤'],
  ['cuadre-del-dia','Cuadre del día','cuadre-del-dia.html','Compare el efectivo esperado con el dinero contado.','☑'],
  ['lo-que-debemos-pagar','Lo que debemos pagar','lo-que-debemos-pagar.html','Consulte saldos pendientes y pagos registrados a proveedores.','↗'],
  ['lo-que-nos-deben','Lo que nos deben','lo-que-nos-deben.html','Consulte cuentas de ejemplo y abonos recibidos de clientes.','↙'],
  ['impuestos','Impuestos','impuestos.html','Revise importes de ejemplo de IVA y otros impuestos por periodo.','▥']
];
