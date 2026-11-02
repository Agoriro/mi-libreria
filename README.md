# Mi librería

Interfaz de un sistema de librería orientada a personas de 60 años o más. HTML, CSS y JavaScript puro, sin frameworks ni dependencias externas de ejecución.

## Abrir y evaluar

Abra `index.html` con doble clic o visite el enlace de GitHub Pages del repositorio. La entrada conduce a **Ingresar**.

- Usuario: **libreria**
- Contraseña: **lectura**

También puede entrar directamente por `pantallas/inicio.html`. El acceso es un recorrido de interfaz, no una barrera de seguridad.

Recorrido sugerido para los evaluadores:

1. Abrir el menú, cambiar el tamaño de letra y probar el contraste alto.
2. Crear o modificar un libro. Asignarle un código de barras único, por ejemplo `0012345678905`.
3. Buscar ese libro por nombre o código; revisar la paginación de 10 registros.
4. Registrar una compra y una venta. En el paso de libros, escribir o escanear el código y pulsar Enter. Indicar cantidad y precio de compra cuando corresponda.
5. Probar las validaciones y cancelar una confirmación sin guardar cambios.
6. Registrar libros devueltos y consultar informes con filtros de fechas.
7. Probar Imprimir y Guardar en PDF, y revisar el sitio con teclado y en un teléfono.

Los lectores de códigos deben funcionar como teclado. No se usa la cámara.

## Alcance de los datos

Cada navegador guarda sus propios registros en almacenamiento local. Los compañeros no comparten datos entre sí ni con el autor del proyecto. Los datos ya guardados al abrir archivos locales no se copian al sitio publicado.

No hay servidor, cuentas reales, cobros ni envío real de documentos. La contraseña de prueba es pública. No introduzca datos personales ni contraseñas privadas. Ganancias, impuestos y saldos explican sus estimaciones y ejemplos en los informes.

## Publicar en GitHub Pages

La publicación está preparada con GitHub Actions. El flujo ejecuta las pruebas y genera `_site` con los únicos archivos que necesita la página.

1. Cree un repositorio en GitHub; nombre sugerido: `mi-libreria`. Para GitHub Free, utilice un repositorio público.
2. Suba la rama `main` a ese repositorio. Si ya tiene Git autenticado:

   ```sh
   git remote add origin https://github.com/TU_USUARIO/mi-libreria.git
   git push -u origin main
   ```

3. En el repositorio abra **Settings → Pages → Build and deployment → Source** y elija **GitHub Actions**.
4. En **Actions**, ejecute **Verificar y publicar Mi librería** mediante **Run workflow** si el primer envío se hizo antes de configurar Pages.
5. Espere a que termine. Copie el enlace que aparece en **Settings → Pages** o en el despliegue `github-pages` y compártalo con sus compañeros.

El enlace habitual es `https://TU_USUARIO.github.io/mi-libreria/`. Los nombres de usuario y repositorio deben sustituirse por los reales. Cada nuevo envío a `main` vuelve a verificar y publicar el sitio. Las solicitudes de cambios ejecutan las verificaciones sin publicar.

Guía oficial: [Publicar con flujos personalizados de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Verificar en el equipo

Con Node.js 22 o superior, sin instalar paquetes:

```sh
npm test
npm run check
npm run pages:prepare
```

Node.js solo se necesita para las verificaciones y el empaquetado. Los compañeros solo necesitan un navegador.

En Windows PowerShell, si `npm` está bloqueado por la política de scripts, use `npm.cmd` con los mismos argumentos. No necesita cambiar la configuración de seguridad del equipo.

La auditoría y las pruebas de interacción usan análisis de fuentes y un DOM simulado. No sustituyen las pruebas con lector de pantalla, navegador real y usuarios. El detalle histórico está en `AUDITORIA-FASE-5.md`.

## Estructura

- `index.html`: entrada pública.
- `pantallas/`: páginas de los módulos.
- `css/tokens.css`: colores, medidas y espacios compartidos.
- `css/components.css`: componentes y adaptación de la interfaz.
- `js/`: datos y comportamiento.
- `guia-de-estilo.html`: componentes y criterios de diseño.
- `verificacion/`: pruebas y auditoría.
- `scripts/preparar-pages.cjs`: preparación del sitio público.
- `.github/workflows/pages.yml`: verificación y publicación.

Los informes de auditoría, pruebas, configuración de Git y documentación del repositorio quedan fuera del paquete que se publica en Pages.
