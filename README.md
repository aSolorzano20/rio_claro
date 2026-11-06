# Sitio web Río Claro

Sitio web comercial de Río Claro con una portada pública y un portal separado para clientes y operaciones. El frontend usa HTML, CSS y JavaScript vanilla; el backend usa Node.js 24, Express 5 y Microsoft Foundry Projects SDK 2.x.

## Estructura por módulos

### Servidor

- `server.js`: arranque, hosting de `public/`, `/health`, estado de integraciones y montaje de rutas.
- `src/config/`: variables de entorno y cliente de Microsoft Foundry inicializado una vez.
- `src/data/`: datos temporales de demostración.
- `src/middleware/`: autenticación, permisos por rol y protección del modo demo.
- `src/routes/`: módulos de autenticación, catálogo, pedidos, facturas, administración e IA.
- `src/services/`: hash de contraseñas, JWT y comunicación multi-turno con Foundry.

### Sitio y portal

- `public/index.html` y `public/site.css`: sitio público con inicio, información, servicios y catálogo.
- `public/js/site.js`: navegación del sitio público y render del catálogo.
- `public/portal.html`: acceso de clientes y operaciones en `/portal`.
- `public/js/portal.js`: navegación y composición de módulos del portal.
- `public/js/core/api.js`: cliente HTTP, sesión y utilidades de interfaz.
- `public/js/modules/`: autenticación, catálogo, pedidos, facturas/reportes/notificaciones y chat.
- `public/styles.css`: estilos del portal.

## Ejecutar localmente

```sh
npm install
cp .env.example .env
npm run dev
```

Abre <http://localhost:3000> para el sitio público y <http://localhost:3000/portal> para iniciar sesión, registrarte o usar los módulos. `GET /health` devuelve `{"status":"ok"}`. La aplicación requiere Node 24 o posterior.

En local el modo demo está habilitado por defecto. Los datos se guardan en memoria y se pierden al reiniciar; **no representan una conexión a la base comercial de Microsoft Foundry ni son aptos para producción**. Para iniciar una cuenta administradora local, completa `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` con valores propios en `.env`; no hay contraseñas demo fijas en el código.

## Microsoft Foundry

Configura `FOUNDRY_PROJECT_ENDPOINT` y `FOUNDRY_AGENT_NAME=AgenteAtencionClientes`. En Azure, la aplicación usa `DefaultAzureCredential` y debe asignarse el acceso requerido a la identidad administrada del App Service. El browser solo llama al backend. `/api/chat` está abierto al público, no requiere inicio de sesión ni limita la cantidad de mensajes; valida cada entrada a un máximo de 2000 caracteres. Considera que el uso público puede generar consumo en Foundry. Sin configuración de Foundry, `/api/chat` responde con un error genérico `502`; no se generan respuestas que parezcan venir del agente.

## Integraciones aún pendientes para producción

El proyecto no incluye el contrato de un API de datos comerciales en Foundry ni un proveedor de identidad y correo/SMS. Por lo tanto:

- Usuarios, roles, catálogo y operaciones son datos temporales de demo. En producción, sus rutas responden `503` en vez de aparentar persistencia.
- Recuperación de contraseña, MFA y envío de facturas por correo necesitan un proveedor de identidad y de mensajería configurado.
- La factura del demo se puede imprimir o guardar como PDF desde el navegador; no es una factura fiscal ni se envía por correo.
- Antes de abrir operaciones de producción hay que definir e integrar el API/almacén de comercio y autenticación real; configure los secretos solo en el entorno de ejecución.

## Variables y despliegue

Revisa `.env.example`. `JWT_SECRET` es obligatorio en producción; genera un valor aleatorio y guárdalo en la configuración segura de App Service. El inicio de producción es `npm start` (`node server.js`). `DEMO_MODE` no habilita datos temporales en `NODE_ENV=production`.
