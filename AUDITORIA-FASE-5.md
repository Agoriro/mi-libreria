# Auditoría de accesibilidad · FASE 5

Revisión de las 25 pantallas y la guía de estilo contra AGENTS.md. No se agregaron pantallas. Se autorizaron y corrigieron archivos de fases anteriores como parte de esta auditoría.

La verificación combina análisis de fuentes, cálculo de luminancia y pruebas de interacción con DOM y almacenamiento simulados. No se ejecutó una inspección visual en navegador ni pruebas con un lector de pantalla real. Los resultados siguientes describen ese alcance; no son una certificación de WCAG 2.2 AAA.

## Hallazgos y correcciones

| Criterio solicitado | Hallazgo inicial | Corrección y evidencia final |
|---|---|---|
| Contraste | Texto de apoyo: 6,64:1 sobre aviso y 6,80:1 sobre éxito. Acento: 6,45:1 sobre aviso. El foco era 6,10:1 y los bordes 4,54:1 sobre aviso; estos dos ya superaban el mínimo gráfico de 3:1, pero se reforzaron. | Se oscurecieron texto de apoyo, acento, foco y bordes. Texto normal: mínimo 7,18:1 entre los fondos previstos; modo alto: 16,62:1. Mínimo de los 72 pares revisados, incluyendo foco y bordes: 7,07:1. Guía actualizada. |
| Tamaños mínimos | Los valores base ya eran correctos. Las tarjetas no declaraban un mínimo propio y el selector nativo de archivos dependía del navegador. | Texto 20/24/28 px; botones y tarjetas ≥60 px; campos ≥56 px; foco 3 px; separación de acciones ≥16 px. Se añadió mínimo explícito a tarjetas, límites a campos y botón propio para elegir portada. Los títulos de 28–36 px crecen a petición del usuario. |
| Botones sin ícono | Las 86 acciones declaradas en HTML ya tenían símbolo. El enlace creado por JavaScript para consultar una venta solo mostraba V-0001. | El enlace ahora dice «▤ Ver V-0001». La elección de portada tiene ícono y texto. Las acciones repetidas de tablas incluyen el nombre del registro en su nombre accesible. |
| Valores fuera de tokens.css | Dos fracciones 1fr de las rejillas y el crecimiento flex: 1 estaban declarados en components.css. | Se llevaron a --fraction y --grow. Sin colores, medidas literales ni estilos en línea en las pantallas o components.css. Las cifras de las gráficas son datos, no estilos. Los códigos hex y medidas escritos como ejemplos en la guía son documentación solicitada. |
| Vocabulario | «Casa editorial» figuraba como etiqueta y encabezado, en lugar de la denominación obligatoria. | Etiquetas, búsqueda, tabla y títulos de creación usan «Casas editoriales». No se detectan términos técnicos prohibidos en el texto HTML visible. Se mantienen nombres internos de archivo y propiedades, que no son texto de la interfaz. |
| Estructura entre módulos | No todos los títulos principales tenían el mismo identificador ni daban nombre a la región principal. Inicio y la guía aún describían fases anteriores. | Los 26 documentos usan titulo-pagina y main con aria-labelledby. Se conserva cabecera, menú, título y zona de trabajo compartidos; las diferencias de tablas, formularios e informes responden a su tarea. Inicio y la guía describen el alcance actual. |
| Foco y cabecera | La barra fija podía cubrir campos, mensajes o títulos con letra ampliada. | Se limita a 40vh y permite desplazamiento interno. Al recibir foco, los elementos situados debajo de la barra se desplazan usando el espacio definido en tokens.css. Las cinco acciones siguen disponibles en la cabecera; en ventanas pequeñas pueden requerir desplazamiento dentro de ella. Pendiente comprobar la presentación real en tamaños pequeños. |
| Identificadores y errores | En usuario-form.html, el mensaje y el selector Estado compartían id=estado. | El selector usa estado-usuario; el mensaje conserva estado. Su etiqueta apunta al nuevo identificador. Los errores de select y textarea ahora reciben el mismo borde que los de input. |
| Controles nativos | Marcadores de texto y campos desactivados podían adoptar colores del navegador. | Colores explícitos para estos estados y color-scheme coherente con el contraste seleccionado. El botón de archivo del sistema se sustituye por una acción de 60 px. |

## Resultado por página

Esta tabla es de revisión de fuentes y componentes compartidos, no una medición de píxeles de cada pantalla renderizada. «0» indica que no se detectan incumplimientos en el análisis estático. Las acciones creadas por JavaScript se verifican adicionalmente en las pruebas de sus recorridos y fábricas.

| Página | Contraste normal / alto¹ | Texto / botón / campo² | Acciones estáticas sin ícono | Estilos fuera de tokens | Términos prohibidos | Estructura |
|---|---|---|---|---|---|---|
| guia-de-estilo.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/autores.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/casas-editoriales.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/cliente-proveedor-form.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/clientes-proveedores.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/compras.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/cuadre-del-dia.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/ganancias.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/impuestos.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/informe-compras.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/informe-ventas.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/informes.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/inicio.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/libro-form.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/libros-devueltos.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/libros-mas-y-menos-vendidos.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/libros.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/lo-que-debemos-pagar.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/lo-que-nos-deben.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/login.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/tipos-de-libro.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/usuario-clave.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/usuario-form.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/usuarios.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/venta-exito.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |
| pantallas/ventas.html | ≥7,18 / 16,62¹ | 20 / 60 / 56² | 0 | 0 | 0 | Unificada |

¹ Valores de texto mínimos de los componentes y sus fondos previstos. Para foco y bordes, el mínimo combinado es 7,07:1. El modo alto usa 16,62:1 para texto y 13,83:1 para el foco.

² Medidas mínimas en px heredadas del sistema. No todas las páginas contienen campos. Se revisaron 67 campos HTML no ocultos individualmente, todos con etiqueta visible, y 86 acciones estáticas; las pantallas guiadas contienen controles dentro de pasos inicialmente ocultos. La portada añade un campo de archivo oculto, operado por su botón accesible.

## Tokens modificados y añadidos

| Token | Resultado |
|---|---|
| --muted | #3F4942 |
| --accent | #75331E |
| --border y --print-border | #3F4942 |
| --focus | #1645AA |
| --grow | 1 |
| --fraction | 1fr |
| --toolbar-max-height | 40vh |
| --scheme | light; dark al activar contraste alto |

Se conservaron el fondo crema, el texto carbón, el verde principal, el rojo ladrillo y las medidas de lectura existentes. La guía reproduce los nuevos códigos y relaciones de contraste.

## Lista de verificación de accesibilidad

### Verificado en fuentes y pruebas simuladas

- [x] Idioma es-CO, título de documento, un encabezado principal y región principal nombrada en las 26 páginas.
- [x] Menú compartido y acceso a Inicio, Volver, ¿Necesita ayuda? y Letra más grande.
- [x] Tres niveles de letra y estado aria-pressed del contraste alto.
- [x] Texto ≥20 px; botones ≥60 px; campos ≥56 px; espacios entre acciones ≥16 px; foco de 3 px.
- [x] Contraste de los 72 pares de paleta previstos ≥7:1; texto normal ≥7,18:1 y alto ≥16,62:1.
- [x] Mensajes e indicaciones no dependen solo del color.
- [x] Etiquetas de campos persistentes y asociaciones for/id válidas.
- [x] Sin identificadores duplicados ni referencias ARIA ausentes en el HTML.
- [x] Errores amables, estado aria-invalid y asociación con el mensaje del campo.
- [x] Acciones con símbolo y texto; nombres accesibles con contexto en tablas repetitivas.
- [x] Botón para elegir portada y texto alternativo para su vista previa.
- [x] Confirmación antes de borrar, quitar una portada o enviar factura; el ejemplo de terminar el cuadre también confirma.
- [x] Diálogo: cancelar recibe el foco inicial, Escape cancela y el foco regresa al control de origen, comprobado con DOM simulado.
- [x] Ajuste del desplazamiento para evitar foco bajo la cabecera, probado con geometría simulada.
- [x] Sin temporizadores de sesión, animaciones rápidas ni mensajes que se borren automáticamente.
- [x] Gráficos con nombre y valor escritos junto a cada barra y tabla alternativa; no dependen de una leyenda por colores.
- [x] Impresión conserva periodo y filtros aplicados; estilo propio legible al imprimir desde contraste alto.
- [x] Ampliación del navegador permitida y campos limitados al ancho disponible.
- [x] Ninguna pantalla nueva; sin frameworks ni dependencias de red.

### Pendiente de validación manual

- [ ] Recorrer todas las pantallas con teclado en un navegador real; comprobar orden, desplazamiento y ausencia de foco oculto.
- [ ] Comprobar ventanas pequeñas, orientación horizontal y zoom de 200 % y 400 %, incluida la cabecera desplazable.
- [ ] Revisar controles nativos de fecha y listas, estados desactivados y colores forzados del sistema operativo.
- [ ] Probar lectura de encabezados, tablas, errores y confirmaciones con NVDA o JAWS.
- [ ] Verificar composición y saltos de página en impresión y PDF reales.
- [ ] Realizar pruebas de comprensión y pulsación con personas de 60 años o más.

Estas comprobaciones manuales siguen abiertas; no se afirma conformidad integral con WCAG 2.2 AAA.

## Evidencia reproducible

- Comando: node verificacion/auditoria.cjs
- Pruebas: node --test verificacion/auditoria.test.cjs verificacion/fase2.test.cjs verificacion/fase3.test.cjs verificacion/fase4.test.cjs
- Resultado: 57 pruebas aprobadas, sin fallos. Incluye 47 pruebas previas y 10 comprobaciones nuevas de auditoría.
- Detalle por documento y por par de contraste: verificacion/auditoria-resultados.json.
