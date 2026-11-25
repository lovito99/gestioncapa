# HU-41 · Iniciar sesión con Google

**Estado** Implementada. Verificación con Google y SMTP de destino pendiente. **Referencia** SCRUM-152 según la rama
local. Sprint Acceso, nombre provisional y número por asignar.

## Objetivo y alcance

Una persona con rol de agremiado puede acceder con Google sin memorizar otra
contraseña. Si todavía carece de cuenta, completa el alta por DNI y recibe
el rol de agremiado. Cada ingreso genera una sesión de GestionCapa que se
cierra y revoca con HU-02.

| Capacidad | Resultado observable | Base |
|---|---|---|
| Identidad de Google | Autenticar el intento y verificar el identificador y el correo del proveedor. | Fastify, Redis, Node y `jose`. |
| Acceso y vinculación | Entrar en la cuenta local correcta y aplicar el rol y la actividad actuales. | Identidad verificada y cuentas de GestionCapa. |
| Alta y continuidad | Completar el formulario por DNI cuando corresponda y continuar al catálogo o al inicio. | Identidad verificada, registro vigente y navegación HU-22. |
| Sesión | Emitir una sesión propia y revocarla al cerrar. | HU-02, compartida por los dos recorridos. |

## Diagnóstico del repositorio

| Área | Disponible | Brecha |
|---|---|---|
| Login y sesión | `POST /api/auth/login`, `/me` y `/logout`, firma JWT con identificador por sesión y revocación Redis. El guard relee usuario activo y rol de PostgreSQL. | Faltan verificación de Google y vínculo persistente. El rol visible del frontend viene de la respuesta local, igual que hoy. [Controlador](../../../../../backend/src/controllers/auth/authController.ts) · [Servicio](../../../../../backend/src/services/auth/authService.ts) |
| Registro | Zod valida DNI de ocho dígitos, nombres, apellidos, correo, celular, contraseña y privacidad. El repositorio usa correo normalizado y DNI únicos, rol fijo `agremiado` y auditoría transaccional. | `password_hash` es obligatorio. El registro actual impide duplicados, pero el DNI de alta se declara y no acredita por sí solo identidad institucional. [DTO](../../../../../backend/src/dto/auth/authDto.ts) · [Persistencia](../../../../../backend/src/repositories/auth/usuariosAuthRepository.ts) |
| Interfaz | `LoginPagina`, `RegistroPagina`, componentes de formularios, `useLogin`, `useRegistro` y `AuthContext`. `retornoCurso` ya limita la selección de curso y maneja navegación local. | Faltan el botón, la continuación segura y la variante de registro con correo fijado por el servidor. [Login](../../../../../frontend/src/paginas/LoginPagina.tsx) · [Registro](../../../../../frontend/src/paginas/RegistroPagina.tsx) · [Retorno](../../../../../frontend/src/lib/retornoCurso.ts) |
| Infraestructura | Vite y Express proyectan `/api` en el origen del frontend. Fastify registra rutas de forma explícita. Redis sirve para límites y revocación. Existe transporte SMTP para avisos y recuperación asistida por el CPPP. | Falta comprobar `Set-Cookie` y `Location` por el proxy de destino. Los logs pueden incluir la consulta del callback. SMTP todavía carece de un flujo de prueba de correo para acceso. [Proxy](../../../../../frontend/servidor.js) · [HTTP](../../../../../backend/src/plugins/http.ts) · [Recuperación](../../../../../frontend/src/paginas/RecuperarPagina.tsx) |

## Políticas propuestas para aprobación

1. **Cuenta existente.** Buscar primero el vínculo único por emisor normalizado
   y `sub`. Si existe, el agremiado activo entra directamente. Para vincular
   por primera vez una cuenta local cuyo correo coincide, pedir una vez la
   contraseña de GestionCapa dentro del flujo, con los límites de HU-02.
   El alta local actual permite declarar un correo sin acreditar su control;
   por eso incluso un Gmail válido acredita el control actual del buzón, pero
   no acredita que su titular creó la cuenta local ni que eligió su DNI.
   La coincidencia de correo identifica la cuenta que se debe confirmar.
   Si el usuario carece de la contraseña, se le dirige a la recuperación
   asistida vigente. Para correo externo, primero comprobar el control
   actual del buzón antes de ofrecer registro o vinculación. En una
   coincidencia externa también se pide la contraseña local una vez.
   Esta confirmación se realiza una sola vez. El correo posterior de
   Google no modifica ni reasigna la cuenta vinculada.
   [Reglas de Google sobre autoridad del correo](https://developers.google.com/identity/sign-in/web/backend-auth)
2. **Roles.** HU-41 se propone para `AGREMIADO`. Los perfiles de instructor y
   administrador conservan su acceso con contraseña. La emisión y el guard
   de sesión de Google aplican esa política con el rol actual de base de datos.
   Una promoción o desactivación no concede permisos a una sesión Google
   anterior. Un marcador firmado de origen de sesión, ausente en los JWT
   previos, permite distinguirla. El cierre valida exclusivamente el JWT
   local firmado y vigente como credencial de revocación. Conserva el
   cierre para usuarios inactivos o con rol cambiado y confirma la salida
   después de persistir la revocación. Si Redis falla, el cliente distingue la
   limpieza local de una revocación pendiente.
3. **Correo desconocido.** La persona ve el registro y conserva el correo ya
   comprobado, de solo lectura. Completa DNI, nombres, apellidos, celular y
   aceptación de privacidad. Con correo de terceros para el que Google no es
   autoridad, el alta exige un código de un solo uso enviado por GestionCapa al
   mismo correo mediante el transporte existente. El código se liga al
   navegador, emisor, sujeto, correo e intento, y se almacena de forma
   protegida. Tiene caducidad y límites de envío y validación por intento,
   destinatario e IP efectiva. Un reenvío invalida el código anterior. Si SMTP está
   indisponible, el flujo informa que no puede verificar ese correo y permite
   volver al login o pedir ayuda. Se mantiene el alta habitual con contraseña como
   un flujo distinto. El alta por Google crea cuenta, vínculo y auditoría en
   una transacción. El DNI o correo ya ocupado devuelve conflicto y orienta al
   acceso o soporte institucional, sin ofrecer una fusión.
4. **Sin contraseña nueva para Google.** Una cuenta creada por Google tiene
   `password_hash` nulo. El login por contraseña responde con su error habitual
   ante ese caso. La migración es aditiva salvo relajar la nulabilidad. El
   retorno operativo tras crear esas cuentas requiere un backend compatible
   con hashes nulos, aun con Google apagado. La verificación institucional del
   padrón conserva sus reglas y no se infiere del DNI declarado.
5. **Transporte.** Usar código de autorización de OpenID Connect, secreto
   solo en backend, endpoints de Google fijos, HTTPS y los permisos
   `openid email`. Asegurar `state`, `nonce` y PKCE S256 por intento y asociar
   el intento Redis a una cookie opaca host-only `HttpOnly; Secure; SameSite=Lax`
   en el origen del frontend. Verificar la cookie antes de consumir el estado
   de modo atómico. Definir como vigente el intento más reciente en un mismo
   navegador y gestionar el anterior como vencido. La continuación verifica
   el identificador de correlación de esa pestaña, la cookie y el estado
   Redis. Un retorno anterior no sustituye ni limpia el intento vigente.
   Validar firma RS256 con JWKS, emisor, audiencia, `azp`
   cuando corresponda, tiempo, `sub`, `nonce` y correo verificado.
   La audiencia corresponde únicamente al cliente web configurado. Conservar
   temporalmente solo los datos necesarios para completar la operación.
   [Google OIDC](https://developers.google.com/identity/openid-connect/reference) · [Metadatos y S256](https://accounts.google.com/.well-known/openid-configuration) · [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)
6. **Continuación y salida.** El callback valida el intento, cambia de URL con
   303 y deja una continuación opaca de uso único en cookie. Una petición POST
   con origen esperado devuelve el `LoginRespuesta` habitual o el estado
   pendiente para registro o verificación. Un intercambio repetido no vuelve a
   emitir sesión. En la continuación por registro o prueba de cuenta, validar
   las transiciones y consumir el intento al completar. Un reintento de
   formulario válido conserva el mismo contexto hasta la caducidad.
   Si la cancelación gana la transición en Redis, no se inicia la escritura.
   Si la confirmación gana, el backend acota el plazo de PostgreSQL y la
   cancelación responde que la operación está en curso. Una
   continuación que llega con otra sesión local activa no la sustituye
   silenciosamente. Cancelar o cerrar retira el contexto local de esa
   pestaña. Un retorno vencido muestra el aviso sin consumir otro intento. Conservar, como máximo,
   el identificador de curso válido y el destino local permitido. Un callback
   cancelado, vencido o fallido muestra un aviso y permite reintentar. La salida
   revoca el JWT de GestionCapa y limpia estado local y caché. La sesión abierta
   en el sitio de Google es independiente.

## Criterios de aceptación

| ID | Dado, cuando, entonces |
|---|---|
| HU41-01 | Dado un agremiado activo con Google vinculado, entra directamente en su misma cuenta y con su rol local. Si solo coincide el correo, confirma la contraseña local una vez y los ingresos siguientes son directos. Conserva un curso válido del que venía. |
| HU41-02 | Dado un Google válido con correo desconocido, cuando vuelve a GestionCapa, se le muestra el registro con el correo fijado y se le pide DNI. La cuenta y la sesión aparecen solo después de validar los datos y la prueba de correo cuando corresponda. |
| HU41-03 | Dado un usuario que entró con Google, cuando cierra sesión, la misma credencial de GestionCapa devuelve 401 en `/api/auth/me` y el cliente vuelve a acceso público. Otras sesiones vigentes conservan su identidad. |
| HU41-04 | Dado un intento vencido, repetido, cruzado de navegador, con firma o claims inválidos, o cancelado, el sistema devuelve un error recuperable sin crear sesión, vínculo ni cuenta. |
| HU41-05 | Una coincidencia de correo sin vínculo, incluido Gmail, exige confirmar la cuenta local. Para correo externo, la prueba de buzón previo al registro o vínculo también es obligatoria. Una cuenta inactiva o privilegiada, un vínculo que pertenece a otra cuenta o un DNI duplicado bloquean el acceso o el alta según corresponda. Un conflicto no altera roles, identificación ni datos de otro usuario. |
| HU41-06 | Dado que Google está apagado o indisponible, el login habitual por contraseña queda operativo. Cuando se reactiva, el botón aparece sin recompilar si el estado servido por la API cambia. |

## Contratos y límites de implementación

- Mantener las capas `routes → controllers → services → repositories/providers`
  y la matriz de permisos. Para el acceso por Google, separar las operaciones
  HTTP de inicio y retorno, consumo, confirmación de vínculo y alta. Los POST
  de continuación validan origen, estado y cuerpo. Usar respuestas privadas
  `Cache-Control: no-store`, política de referencia restrictiva y límites por
  IP o intento. Registrar resultado y latencia, omitiendo cuerpo, query del
  callback, cookies, tokens, contraseña, correo y DNI en logs/trazas del flujo
  y de sus proxies. Solo se conserva el vínculo de identidad de largo plazo.
- Usar una migración versionada para la identidad externa, con unicidad por
  emisor y `sub`, y como máximo una identidad Google por cuenta. PostgreSQL
  arbitra carreras entre dos intentos y entre altas Google y habituales. La
  vinculación revalida identidad de la cuenta, rol y actividad al confirmar.
  El marcador de sesión y las credenciales Google permanecen separados.
- Conservar la forma de respuesta de HU-02, el catálogo y registro habitual.
  Fuera de alcance quedan otros proveedores, Google Calendar/YouTube API,
  sincronización de perfiles, fusión de cuentas y autenticación privilegiada
  por Google. El cliente de YouTube de HU-37 tiene un propósito separado.
- Escribir TypeScript por las convenciones de `AGENTS.md`. Aplicar TDD e
  implementación incremental tras aprobación. Las pruebas nuevas quedan
  locales. El usuario ejecuta builds, commits y publicación. Cualquier
  dependencia nueva requiere autorización antes de instalar.

## Verificación prevista

| Alcance | Comprobación |
|---|---|
| Servicios de auth, puertos y contratos | `npm test -w backend` y `npm test -w frontend`. |
| Datos, carreras y sesión | `NODE_ENV=test npm run test:integracion` en PostgreSQL y Redis aislados. Usar claves y proveedor de prueba local para validar JWT sin cuentas reales. |
| UI y proxy | `npm run e2e:real` con proveedor simulado y `npm run test:servidor -w frontend`; validar teclado, 360 px, retorno, cancelación y logout. |
| Tipos y estilo | `npm run typecheck`, `npm run e2e:tipos`, `npm run lint -w frontend`. |
| Preproducción | Prueba autorizada en HTTPS con cliente Google de pruebas, comprobación SMTP para el caso externo y build manual `npm run build`. |

## Soluciones existentes

Búsqueda del 25/11/2026. Canales consultados: `frontend/src`, `backend/src`,
Astryx `search`, `component` y plantillas sin scaffolding, npm, GitHub y su API
pública, documentación primaria de Google y del IETF, inventario MCP y skills
instaladas. `gh` y búsqueda autenticada de código de GitHub no estaban
disponibles. No figuraban conectores para Google Identity, Context7 ni Chrome
DevTools. Figma figuraba en herramientas, pero la historia carece de referencia
de diseño concreta y la consulta fue por Astryx y la interfaz local. No se
consultó una consola privada de Google Cloud ni se pidió una credencial.

| Capacidad | Evidencia de búsqueda | Decisión |
|---|---|---|
| Protocolo y validación de identidad | El repositorio usa `jose` en Jitsi. `jose` 6.2.18 en npm, MIT, 18/11/2026, cero dependencias directas. `openid-client` 6.9.1, MIT, 20/11, depende de `jose` y `oauth4webapi`; `oauth4webapi` 3.8.9, MIT, 20/11, cero dependencias. `google-auth-library` 11.3.4, Apache-2.0, 09/11, seis dependencias, con repositorio activo en Google Cloud. `@fastify/oauth2` 8.3.2, MIT, 19/10, tres dependencias y requiere resolver aparte la validación del ID token. [jose](https://github.com/panva/jose) · [openid-client](https://github.com/panva/openid-client) · [oauth4webapi](https://github.com/panva/oauth4webapi) · [Google Auth](https://github.com/googleapis/google-cloud-node/tree/main/core/packages/google-auth-library-nodejs) · [Fastify OAuth2](https://github.com/fastify/fastify-oauth2) | **Componer** protocolo documentado con Node, `fetch`, Zod y `jose` instalado. La firma y el juego de claves usan la biblioteca existente. Mantener `openid-client` como alternativa si cambia el alcance a más proveedores. |
| Estado de intento y cookies | Redis 8 e `ioredis` ya respaldan límites y revocación. Redis ofrece consumo atómico. `@fastify/cookie` 11.1.5, MIT, con actividad en octubre de 2026, dos dependencias directas. El flujo requiere pocas cookies con nombres fijos y valores opacos acotados. [Redis GETDEL](https://redis.io/docs/latest/commands/getdel/) · [Fastify Cookie](https://github.com/fastify/fastify-cookie) | **Componer** Redis y cabeceras HTTP de Fastify. Aislar el manejo de estas cookies y cubrir serialización, expiración, proxy y origen en pruebas. |
| Vínculo local, DNI y prueba de correo | PostgreSQL y Zod cubren restricciones y validación. Zod 4.6.7, MIT, actividad en octubre de 2026 y sin dependencias directas. Los índices, auditoría y comprobación de contraseña son locales. Nodemailer 10.6.1 en npm, MIT-0, actividad en noviembre, cero dependencias directas. El repositorio ya usa Nodemailer y transporte SMTP. [Zod](https://github.com/colinhacks/zod) · [Nodemailer](https://github.com/nodemailer/nodemailer) | **Extender** el registro y los controles de HU-02 y **componer** la prueba de correo con Redis y SMTP existentes en el caso externo. Crear el vínculo local en PostgreSQL con reglas propias de GestionCapa. |
| Interfaz de acceso y alta | Astryx CLI y Core 0.7.16 ofrecieron `login-card`, `login-sso`, `Button`, `TextInput` y `Banner`. Core 0.7.17, MIT, actividad en noviembre, añade `intl-messageformat` y pares React y StyleX. `@react-oauth/google` 0.13.5, MIT, abril de 2026, sin directas y con React y React DOM como pares; usa el SDK GIS en navegador. [Astryx](https://github.com/meta/astryx) · [React OAuth](https://github.com/MomenSherif/react-oauth) · [Marca de Google](https://developers.google.com/identity/branding-guidelines) | **Extender** las pantallas y componentes locales. Tomar de `login-card` la ubicación de la acción y adoptar el recurso oficial de marca. La redirección de servidor evita incorporar el SDK de navegador. |
| Sesión, revocación y pruebas | Fastify JWT, Redis, `AuthContext`, `inicioPorRol`, `retornoCurso` y `/api/auth/logout` ya cubren las sesiones. `node:test`, Vitest (MIT) y Playwright (Apache-2.0) forman el stack vigente. Las skills de API, seguridad y TDD aportan los criterios de revisión. [Fastify JWT](https://github.com/fastify/fastify-jwt) · [Playwright](https://github.com/microsoft/playwright) | **Adoptar** la emisión, cierre, navegación y pruebas existentes y **extender** la comprobación de rol de las sesiones Google. |

La propuesta usa las dependencias instaladas. La prueba con Google real depende
de que el equipo aporte un cliente web de pruebas con el callback autorizado.
[Plan](plan.md) · [Seguimiento](todo.md)
