# Instrucciones del proyecto: Sitio web de Río Claro en App Service

## Qué es este proyecto
Sitio web público de Río Claro con un portal separado para clientes y operaciones, además de un chatbot con IA. El frontend usa HTML, CSS y JavaScript vanilla; el backend Node.js con Express conversa con un agente de Microsoft Foundry. Se despliega en Azure App Service (Linux, Node 24 LTS).

## Entorno de desarrollo
- mac m4 con bash.
- Node.js 24 LTS y npm. Nada de Typescript ni buildders.

## Stack y versiones
- Express 5, ES Modules (`"type": "module"`), `async/await`.
- SDK de Foundry: `@azure/ai-projects` 2.x (API "Foundry projects (new)").
 No uses `@azure/ai-agents` ni la API 1.x.
- Autenticación: `DefaultAzureCredential` de `@azure/identity`.
- Variables de entorno en local con `node --env-file-if-exists=.env` (sin dotenv).

## Arquitectura (no la cambies sin preguntar)
- `server.js`: sirve el sitio público de `public/` en `/`, el portal en `/portal`, las API y `GET /health`.
- La portada es `public/index.html`; los módulos autenticados viven en `public/portal.html`.
- Backend: `src/config/`, `src/data/`, `src/middleware/`, `src/routes/` y `src/services/`, separados por responsabilidad.
- Frontend: `public/js/site.js` y `public/js/modules/`; sin frameworks ni compiladores.
- El navegador NUNCA habla directo con Foundry. Solo el backend.
- Conversación multi-turno: `openai.conversations.create()` y
 `openai.responses.create({ conversation, input }, agentRef)`, donde
 `agentRef = { body: { agent_reference: { name, type: "agent_reference" } } }`.
 El `conversation_id` viaja entre frontend y backend en el JSON.
- El servidor escucha en `process.env.PORT` (App Service lo define).
- Los datos en memoria solo son para demostración local. No deben presentarse ni habilitarse como persistencia de producción.

## Seguridad
- Nunca escribas llaves, tokens ni endpoints reales en el código.
 Todo sale de variables de entorno: `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_AGENT_NAME`.
- En Azure se usa identidad administrada (managed identity), no API keys.
- Valida la entrada (1 a 2000 caracteres) y responde 422 si no cumple.
- Si Foundry falla, responde 502 con un mensaje genérico; no filtres trazas.

## Estilo de código
- Comentarios en español neutro; nombres de variables en inglés.
- Cambios mínimos y enfocados: no reescribas archivos completos si basta editar.

## Cómo validar
- Local: `npm run dev` y abrir http://localhost:3000
- Salud: `Invoke-RestMethod http://localhost:3000/health` debe devolver `status: ok`
- Antes de desplegar, confirma que `package.json` incluye todo lo que se importa
 y que el script `start` es `node server.js`.

## Seguridad en Azure
- Vas a crear un modulo de administración de usuarios y roles en Foundry. No lo hagas con tu cuenta personal. Crea un usuario de servicio (service principal) con rol "Foundry Admin" y asigna la identidad administrada del App Service a ese usuario.
- Roles: ADMIN, USER, CUSTOMER VIEWER. El agente del proyecto debe tener rol USER. No uses el rol ADMIN para el agente.
- Los usuarios de Foundry se crean con `POST /api/users` y se asignan roles con `POST /api/roles`. El agente del proyecto debe tener rol USER. No uses el rol ADMIN para el agente.
- Deberá existir un formulario de registro de usuarios en el frontend, que llame al backend y este a Foundry para crear el usuario y asignarle el rol CUSTOMER. El formulario debe validar que el correo electrónico no esté ya registrado y que la contraseña cumpla con los requisitos de seguridad.

## Conmportamiento del sistema
- El usuario se registra con correo y contraseña. El backend crea el usuario en Foundry y le asigna el rol CUSTOMER. El backend devuelve un token JWT al frontend.
- El usuario inicia sesión con correo y contraseña. El backend valida las credenciales con Foundry y devuelve un token JWT al frontend.
- El token JWT se almacena en el frontend y se envía en cada petición al backend en el encabezado `Authorization: Bearer <token>`.
- El backend valida el token JWT en cada petición y extrae el ID del usuario para usarlo en las llamadas a Foundry.

## Bases de datos para el proyecto
- No se requiere base de datos externa. El backend no debe almacenar usuarios ni conversaciones, todo se maneja con Foundry. El backend solo valida tokens JWT y llama a Foundry.
- Base de datos de foundry: para almacenar todos los productos y sus detalles, incluyendo stock, precios y descripciones. Esta base de datos es gestionada por Foundry y no requiere intervención del backend.
- Deberá poder hacer cruces de datos entre la base de datos de Foundry y la base de datos del backend para generar reportes y estadísticas. Por ejemplo, el backend puede consultar la base de datos de Foundry para obtener información sobre los productos y luego combinarla con los datos de los usuarios y sus compras para generar un reporte de ventas.
- También se derberá controlar el inventario de productos en la base de datos de Foundry, para que el backend pueda mostrar a los usuarios la disponibilidad de los productos en tiempo real.
- deberá generar reportes de ventas y estadísticas de uso del sistema, utilizando los datos almacenados en la base de datos de Foundry y en la base de datos del backend.
- se deberá implementar un sistema de notificaciones para alertar a los administradores sobre eventos importantes, como la baja de stock de un producto o la finalización de una venta.

## Modulos del sistema
### Módulo de Usuario y autenticación
- Inicio de sesión: formulario en el frontend, validación de credenciales con Foundry, generación de token JWT.
- Registro de usuarios: formulario en el frontend, validación de correo y contraseña, creación de
  usuario en Foundry y asignación de rol CUSTOMER.
- Recuperación de contraseña: formulario en el frontend, envío de correo con enlace de recuperación, validación de token y actualización de contraseña en Foundry.
- Autenticación multifactor: formulario en el frontend, envío de código por correo o SMS, validación de código y generación de token JWT.

### Módulo de Chatbot
- Formulario de chat en el frontend, envío de mensajes al backend, manejo de conversación multim-turno con Foundry, respuesta del agente al frontend.
- Servicio a Clientes: formulario de chat en el frontend, envío de mensajes al backend, manejo de conversación multi-turno con Foundry, respuesta del agente al frontend.
- Agente de ventas: formulario de chat en el frontend, envío de mensajes al backend, manejo de conversación multi-turno con Foundry, respuesta del agente al frontend.

### Módulo deAdministración
- Administración de usuarios y roles: módulo en el backend para crear usuarios y asignar roles en Foundry, accesible solo para usuarios con rol ADMIN.
- Administración de productos: módulo en el backend para crear, editar y eliminar productos en Foundry, accesible solo para usuarios con rol ADMIN
- Administración de pedidos: módulo en el backend para gestionar pedidos de clientes, accesible solo para usuarios con rol ADMIN.
- Administración de reportes y estadísticas: módulo en el backend para generar informes sobre el uso del sistema, las ventas y el comportamiento de los usuarios, accesible solo para usuarios con rol ADMIN.
- Administración de notificaciones: módulo en el backend para enviar alertas a los administradores sobre eventos importantes, como la baja de stock de un producto o la finalización de una venta, accesible solo para usuarios con rol ADMIN.
- Administración de notificaciones de pedidos: módulo en el backend para enviar alertas a los clientes sobre el estado de sus pedidos, accesible solo para usuarios con rol CUSTOMER y ADMIN.
- Administración de facturación: módulo en el backend para generar facturas y enviarlas por correo electrónico a los clientes, accesible solo para usuarios con rol ADMIN.  
- administración de facturación de pedidos: módulo en el backend para generar facturas de pedidos y enviarlas por correo electrónico a los clientes, accesible solo para usuarios con rol ADMIN.

### Módulos de facturación
- Facturación: módulo en el backend para generar facturas y enviarlas por correo electrónico a los clientes, accesible solo para usuarios con rol ADMIN.
- Facturación de pedidos: módulo en el backend para generar facturas de pedidos y enviarlas por correo electrónico a los clientes, accesible solo para usuarios con rol ADMIN.
- Facturación de productos: módulo en el backend para generar facturas de productos y enviarlas por correo electrónico a los clientes, accesible solo para usuarios con rol ADMIN.
- Módulo de Facturación donde cada cliente puede ver sus facturas y descargarlas en formato PDF, accesible solo para usuarios con rol CUSTOMER. 
- Logistica: módulo en el backend para gestionar envíos y entregas de productos, accesible solo para usuarios con rol ADMIN.
- Inventario: módulo en el backend para gestionar el stock de productos, accesible solo para usuarios con rol ADMIN.

### Modulo de reportes y estadísticas
- Un módulo de reportes y estadísticas que permita generar informes sobre el uso del sistema, las ventas y el comportamiento de los usuarios, accesible solo para usuarios con rol ADMIN.
- Reporte de ventas: módulo en el backend para generar informes sobre las ventas realizadas, accesible solo para usuarios con rol ADMIN y AGENTE DE VENTAS.
- Reporte de productos: módulo en el backend para generar informes sobre los productos disponibles, accesible solo para usuarios con rol ADMIN y LOGISTICA.

## Módulo de notificaciones
- un modulo de notificaciones que permita enviar alertas a los administradores sobre eventos importantes, como la baja de stock de un producto o la finalización de una venta, accesible solo para usuarios con rol ADMIN.
- Un modulo de notificaciones de pedidos que permita enviar alertas a los clientes sobre el estado de sus pedidos, accesible solo para usuarios con rol CUSTOMER y ADMIN.