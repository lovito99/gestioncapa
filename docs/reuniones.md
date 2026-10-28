# Reuniones virtuales con Jitsi

La aplicación conserva Fastify, PostgreSQL mediante `pg`, Redis y React. Las
reuniones se vinculan con las clases y las inscripciones existentes; no se
reescriben usuarios, autenticación ni asistencia QR.

## Rutas y carpetas

| Ruta | Contenido |
| --- | --- |
| `backend/src/modules/reuniones` | Validación, persistencia y API de negocio |
| `backend/src/modules/jitsi` | Firma de credenciales Jitsi |
| `backend/migraciones/0005-reunionesVirtuales.sql` | Reuniones, participantes y outbox |
| `frontend/src/paginas/reuniones` | Listado, creación y sala propia |
| `frontend/src/servicios/salaJitsi.ts` | Conexión y pistas de lib-jitsi-meet |
| `infraestructura/jitsi/servidor` | Distribución oficial Docker descargada |
| `infraestructura/jitsi/biblioteca` | Código oficial lib-jitsi-meet descargado para consulta |
| `infraestructura/jitsi/configuracion` | Configuración privada y almacenamiento Docker |

Los archivos nuevos propios usan nombres completos en camelCase, sin guiones
bajos. Las variables y archivos oficiales de Jitsi conservan sus nombres para
que Docker pueda interpretarlos. Las distribuciones y secretos están ignorados
por Git. `version.json` registra versión, origen, checksum y revisión de biblioteca.
La sala carga la biblioteca compilada desde el servidor Jitsi para que coincida
con su versión; no compila el clon de consulta.

## Preparación

```bash
# Solo si no existen las carpetas de distribución:
python3 infraestructura/jitsi/descargar.py

npm install
npm run bd:migrate
# Requiere backend/.env existente; genera un secreto exclusivo y claves internas.
node infraestructura/jitsi/preparar.mjs --local # desarrollo HTTP en localhost:8000
# O, para producción:
node infraestructura/jitsi/preparar.mjs meet.empresa.pe
```

El preparador conserva un `.env` existente de Jitsi y no rota secretos existentes.
Habilita `jitsiHabilitado`, `jitsiDominio`, `jitsiDireccion`, `jitsiAplicacion` y
`jitsiSecreto` en backend/.env. El backend valida estos valores al arrancar y
rechaza reutilizar secretos de sesión o QR. Sin configuración, Jitsi permanece
deshabilitado y las credenciales responden 503.

Para producción, antes de iniciar Docker:

1. Configura DNS y un certificado HTTPS de confianza para tu dominio. El puerto
   inicial es 8443; `jitsiDireccion` y `PUBLIC_URL` deben coincidir. Con un proxy
   HTTPS en 443 cambia ambos a `https://meet.empresa.pe`.
2. Revisa `JVB_ADVERTISE_IPS` con la IP alcanzable y permite UDP 10000. La IP
   pública y el certificado dependen de tu servidor y no se inventan al instalar.
3. Los directorios `storage/*` y `tmp/*` requieren permisos de escritura para
   uid/gid 1000, como indica la guía de esta versión. Ajusta propietario/permisos
   según tu usuario de Docker.
4. Conserva `ENABLE_AUTH=1`, `AUTH_TYPE=jwt`, `ENABLE_GUESTS=0`,
   `JWT_ALLOW_EMPTY=0`. No publiques el secreto en el frontend.

```bash
cd infraestructura/jitsi/servidor
docker compose up -d
# Desde la raíz, después de revisar la configuración:
npm run dev
```

El despliegue audiovisual no se inicia automáticamente al descargar archivos.
En este entorno se preparó el modo local y se inició con Docker: `http://localhost:8000`.
El puerto de diagnóstico de JVB se publica en `127.0.0.1:18080` para no ocupar el 8080 del backend.
El modo producción se prepara en su propio despliegue; el preparador no sobrescribe el entorno local existente.
Consulta la [guía oficial Docker](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/).

## Uso

Abre `/reuniones` con cualquier usuario autenticado. Administrador o coordinador
crea la reunión indicando el identificador de una clase de su organización,
título y horario. HTTP se admite únicamente para localhost en desarrollo; NODE_ENV=production exige HTTPS.
Las fechas del formulario usan la zona de tu dispositivo y se
envían con zona explícita. El instructor asignado o el gestor puede iniciarla.
El participante inscrito entra mediante `/reuniones/:identificador`.

Al entrar aparece un diálogo para habilitar micrófono y cámara o entrar sin dispositivos.
La solicitud de permisos la realiza el navegador, no el backend. Los permisos ya
concedidos no generan una nueva pregunta; los bloqueados se restablecen desde los
permisos del sitio. Los botones de micrófono y cámara permiten reintentar la
activación si no se abrieron al ingresar.

La cámara y el micrófono requieren HTTPS (o localhost por HTTP) y permisos del navegador. Se muestran
pistas locales y remotas; salir elimina las pistas y desconecta. Esta conexión
es audiovisual directa con Jitsi, no a través de WebSockets de negocio.

## API

Todas las rutas requieren JWT de la aplicación. Los controles de objeto se
aplican además del rol: misma organización, instructor asignado o inscripción
vigente; los retirados no reciben nuevas credenciales.

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/reuniones` | Listar reuniones autorizadas |
| POST | `/api/reuniones` | Crear para una clase |
| GET | `/api/reuniones/:identificador` | Consultar |
| PATCH | `/api/reuniones/:identificador` | Cambiar título y horario estando programada |
| POST | `/api/reuniones/:identificador/iniciar` | Iniciar |
| POST | `/api/reuniones/:identificador/cancelar` | Cancelar |
| POST | `/api/reuniones/:identificador/finalizar` | Finalizar estado de negocio |
| POST | `/api/reuniones/:identificador/credencial` | Emitir JWT Jitsi, cinco minutos y una sala |
| GET | `/api/reuniones/:identificador/participantes` | Consultar instructor e inscritos vigentes |
| PATCH | `/api/reuniones/:identificador/politicas` | Validar políticas admitidas |
| POST | `/api/reuniones/:identificador/participantes/:usuarioIdentificador/retirar` | Revocar futuras credenciales |

Crear recibe `claseIdentificador`, `titulo`, `inicioProgramado`, `finProgramado`.
Editar recibe título, inicio y fin completos. Las transiciones usan transacción,
bloqueo de fila y son idempotentes al repetir el mismo estado. Crear una reunión
es una operación nueva por petición: no se debe reintentar sin consultar su resultado.

## Alcance y conexiones pendientes

- Finalizar y retirar revocan futuras credenciales; no expulsan conexiones activas.
  La expiración del JWT tampoco termina la llamada existente.
- Los JWT asignan `context.user.moderator` desde los permisos de negocio:
  gestor de la organización o instructor asignado. Prosody aplica la afiliación
  con `token_affiliation`; Jicofo no promueve asistentes autenticados automáticamente.
- La moderación de cámara, micrófono y pantalla se configura en Opciones durante
  la conferencia. El endpoint REST de políticas no aplica estos cambios a Jitsi
  y mantiene su rechazo de restricciones no implementadas, incluido el lobby.
- Las invitaciones quedan en una outbox persistente dentro de la transacción de
  creación. No hay worker ni envío de correo/WhatsApp sin proveedores configurados.
- No se marca asistencia por solicitar una credencial. Falta conectar eventos
  verificables del servidor para calcular entradas, salidas y reconexiones.
- Pagos, grabación con Jibri, evaluaciones, certificados y WebSockets de negocio
  son siguientes etapas de la propuesta; no están implementados por este módulo.
- El flujo audiovisual entre dos dispositivos requiere validación contra el
  dominio HTTPS desplegado; las pruebas API no sustituyen esa comprobación.

## Verificación

```bash
npm run typecheck
npm run build
npm test
npm run test:integracion # PostgreSQL y Redis locales disponibles
```

Las pruebas verifican firma y alcance del JWT, horarios, autorización y el flujo
crear/iniciar/entrar/retirar/finalizar con PostgreSQL real.

## Prueba básica con reuniones programadas

Desde la raíz del proyecto:

```bash
npm run bd:migrate
npm run bd:seed
npm run dev
```

`bd:migrate` y `bd:seed` también funcionan dentro de `backend/`. Los comandos
anteriores `migrate` y `seed` se conservan por compatibilidad.

Fuera de producción, el seed carga estas reuniones en estado `programada`:

| Reunión | Instructor | Participantes |
| --- | --- | --- |
| Demo · Reunión de atención al cliente | Lucía Paredes | María y Luz |
| Demo · Reunión de primeros auxilios | Carlos Mendoza | María y Luz |
| Demo · Reunión de manejo de extintores | Carlos Mendoza | María y Luz |

Las fechas y horas se toman de las clases demo, con zona `America/Lima`.
Cada reunión incluye tres participantes autorizados y tres invitaciones en la
outbox; el seed no envía mensajes. Repetirlo conserva identificadores, salas,
horarios, estados, participantes retirados e invitaciones procesadas. No vuelve
a programar reuniones vencidas ni reabre las canceladas. En producción no carga
clases, usuarios ni reuniones demo: solo asegura el administrador.

1. Abre `http://localhost:5173/reuniones` con
   `ana.torres@organizacion.pe` / `demo123` para ver las tres reuniones.
2. Pulsa **Iniciar** en una reunión cuyo horario de fin aún no haya pasado.
   También puedes iniciarla con su instructor asignado:
   `carlos.mendoza@organizacion.pe` o `lucia.paredes@organizacion.pe`, clave `demo123`.
3. En otra ventana de incógnito entra con `maria.quispe@demo.pe` / `demo123`,
   abre **Reuniones virtuales** y pulsa **Entrar a la sala**.
4. Con Jitsi local activo en `http://localhost:8000`, permite cámara y micrófono.
   Salir libera los dispositivos. **Cerrar acceso a reunión** bloquea nuevas
   credenciales; no desconecta llamadas que ya estén activas.

Pruebas de persistencia, idempotencia, producción y permisos del flujo:

```bash
cd backend
node --import tsx --test --test-concurrency=1 test/integracion/datos-seed.test.ts test/integracion/reuniones.test.ts
```

## Controles de la sala personalizada

La sala incluye controles de micrófono y cámara, compartir/detener pantalla simultáneamente con la cámara,
mano levantada, chat para todos, selección de cámara y micrófono, copiar enlace,
pantalla completa y salida. Los controles se habilitan tras conectar y muestran
el estado de las pistas de Jitsi. Cancelar el selector de pantalla conserva la
cámara; detener la compartición elimina únicamente la pista de pantalla. La cámara y su selector siguen disponibles mientras se comparte. Cambiar de micrófono
conserva el silencio. Salir libera los dispositivos incluso si falla la red.

El panel **Personas** muestra las conexiones actuales, sus nombres, mano levantada
y estado audiovisual. Para administrador, coordinador e instructor autorizado,
compara las identidades de JWT recibidas desde Jitsi con el instructor e inscritos
que devuelve la API. **Sin conexión detectada** indica que no se ve esa cuenta
en la sala en este momento; no significa que nunca entró ni acredita una falta.
Si Jitsi no proporciona una identidad, se avisa en lugar de asociarla por nombre.
La lista de inscritos se actualiza cada treinta segundos; la presencia cambia con
los eventos de entrada y salida de Jitsi. Varias conexiones de una cuenta no la
hacen aparecer como ausente.

El chat utiliza los mensajes de Jitsi y renderiza texto, sin interpretar HTML.
La interfaz conserva hasta doscientos mensajes recibidos durante la sesión y no
guarda un historial en PostgreSQL. Compartir el enlace mantiene el requisito de
sesión e inscripción; el enlace no contiene una credencial audiovisual.

Pruebas de los controles con eventos y dispositivos simulados:

```bash
npm test -w frontend
```

Los controles propios y la moderación de asistentes se describen abajo. La
asistencia histórica verificable sigue pendiente de integración de eventos del servidor.

### Identidad de participantes en Jitsi

El preparador configura `XMPP_MODULES=presence_identity`. Este módulo oficial de
Prosody añade a la presencia los datos de `context.user` del JWT validado. La
comparación de inscritos usa su `id`, sin confiar en el nombre elegido por el
cliente. En este entorno se habilitó también en caliente, conservando las llamadas.

Si tu servidor se preparó antes de este cambio, añade `presence_identity` a la
lista `XMPP_MODULES` de su `.env`, conservando los módulos existentes. Después
aplica el entorno con `docker compose up -d` durante una ventana de mantenimiento.
Para habilitarlo en caliente en la instalación local ya iniciada:

```bash
docker compose -f infraestructura/jitsi/servidor/docker-compose.yml exec -T prosody prosodyctl --config /run/prosody/config/prosody.cfg.lua shell module load presence_identity localhost
```

En producción, reemplaza `localhost` por el dominio XMPP configurado. Las
conexiones antiguas pueden necesitar volver a entrar para publicar su identidad.

Verificación local de esta implementación: dos sesiones de Chromium conectadas a
Jitsi con dispositivos audiovisuales de prueba, envío de chat entre sesiones,
mano levantada, comparación de inscritos usando identidad de JWT, captura de
pantalla y controles de cámara. Se eliminaron las reuniones temporales al
terminar. Esta comprobación local no sustituye probar HTTPS y red en producción.

### Compatibilidad de metadatos ICE

`compatibilidadJitsi.ts` normaliza `services: {}` a `services: []` antes de que
el receptor STUN/TURN del SDK lo procese. En `stable-11248-2`, Prosody puede
serializar su lista Lua vacía como un objeto JSON; lib-jitsi-meet entonces intenta
interpretar los metadatos como XML y registra `querySelectorAll is not a function`.
Las respuestas XML y las listas con credenciales STUN/TURN se conservan.

El adaptador se instala una vez por receptor al establecer la conexión, antes de
unirse a la conferencia. El acceso interno a `_xmpp.connection.jingle` queda
encapsulado y debe revisarse al actualizar Jitsi. No se modifica la distribución
oficial ni se silencian errores del receptor. Las pruebas cubren XML, credenciales,
metadatos vacíos, contexto, retorno y errores del SDK. Se verificó con dos sesiones
reales de Chromium contra el Jitsi local, incluyendo cámara y pantalla simultáneas,
sin el error de metadatos.

### Distribución al compartir pantalla

Al recibir una pista de pantalla, local o remota, el escenario le da el área
principal y coloca las cámaras en una columna lateral de miniaturas, incluida
la de quien comparte. En móvil, las miniaturas forman una franja horizontal bajo
la pantalla. Al dejar de recibir pantallas vuelve automáticamente la cuadrícula
de cámaras. Esta distribución no modifica el envío de vídeo ni los controles.

La ruta de sala usa su propio diseño de alto completo (`100dvh`), con encabezado
compacto y controles siempre visibles. El panel lateral permanece cerrado al
entrar; los botones **Personas**, **Chat** y **Opciones** lo abren y cierran. La
pantalla compartida usa el alto restante automáticamente. En móvil, el panel se
superpone al escenario y las cámaras se muestran debajo de la pantalla. El vídeo
conserva sus proporciones para no recortar textos o diapositivas compartidas.

## Controles seleccionados, manos y reacciones

Los controles activos se resaltan en dorado y exponen `aria-pressed`. La mano
levantada publica un instante mediante la presencia de Jitsi. Las sesiones
ordenan por ese instante y usan el identificador de conexión para resolver
empates. Levantar la mano después de bajarla coloca a la persona al final; al
salir o bajar la mano se recalculan los números. Las señales antiguas `true`, sin
instante, se colocan al final. Es un orden de intervención basado en las señales
compartidas, no un registro de asistencia ni una cola transaccional del backend.

La cola y los números de manos levantadas se muestran únicamente en el panel
lateral Personas. El escenario y las cámaras no muestran avisos ni números de manos.

Reacciones permite enviar 👍, 👏, ❤️, 😂, 🎉 y 😮 mediante mensajes JSON de Jitsi.
Se muestran temporalmente con el nombre del remitente de la conferencia. No se
confía en nombres enviados en el contenido. Hay validación, deduplicación y
límites de frecuencia; no se guardan reacciones en PostgreSQL.

## Permisos audiovisuales de asistentes

En **Opciones → Permisos de los asistentes**, el anfitrión elige para cada medio:

- **Permitir a todos**: el participante puede activarlo por sí mismo.
- **Levantar mano y autorizar**: se bloquea la activación; el anfitrión concede
  permiso desde **Personas**, después de que el asistente levante la mano.

Micrófono, cámara y pantalla tienen autorizaciones independientes. El anfitrión
puede retirarlas desde Personas, incluso si la mano ya se bajó. Autorizar no
enciende el dispositivo: el asistente decide activarlo. Activar una restricción
silencia las transmisiones actuales de asistentes y condiciona nuevas activaciones.
El estado de la interfaz se actualiza mediante confirmaciones nativas de Jitsi;
si no hay confirmación se informa el error. El anfitrión conserva sus controles.

La configuración y las autorizaciones viven en la conferencia de Jitsi activa;
no se guardan como políticas de programación en PostgreSQL. Volver a entrar
puede requerir una autorización nueva para la nueva conexión.

### Configuración necesaria del servidor

El preparador incluye:

```dotenv
ENABLE_AUTH=1
AUTH_TYPE=jwt
ENABLE_GUESTS=0
JWT_ALLOW_EMPTY=0
XMPP_MODULES=presence_identity
XMPP_MUC_MODULES=token_affiliation
ENABLE_AV_MODERATION=1
ENABLE_AUTO_OWNER=0
JICOFO_ENABLE_AUTH=0
ENABLE_MODERATOR_CHECKS=1
```

`JICOFO_ENABLE_AUTH=0` deja la asignación de moderadores a la afiliación de
Prosody derivada del JWT. La autenticación de acceso continúa activa en Prosody;
no debe deshabilitarse `ENABLE_AUTH` ni habilitar invitados. Combina los módulos
con los que ya existan en tu instalación. En un despliegue anterior, aplica los
cambios con `docker compose up -d` y vuelve a entrar a las salas para recibir
las credenciales y afiliaciones nuevas. El módulo de afiliaciones se habilitó
en caliente en este entorno y se reinició Jicofo con su nueva configuración.

La conexión BOSH incluye el nombre de sala en `?room=` para que Prosody pueda
validar los comandos de moderación. Se deshabilita P2P en la sala propia para
que audio, cámara y pantalla pasen por Jitsi Videobridge y sus restricciones.
La moderación usa `enableAVModeration`, `avModerationApprove` y
`avModerationReject`, con validación del rol de moderador por Prosody.

## Presentación y nivel de micrófono

Los estilos de sala se concentran en
`frontend/src/paginas/reuniones/sala.css`, sin duplicar reglas en `index.css`.
Las reacciones recorren distintas posiciones de la ventana durante cinco
segundos, también al activar pantalla completa. Su capa no intercepta pulsaciones
y respeta la preferencia de movimiento reducido.

El botón del micrófono muestra cinco barras de intensidad a partir de los niveles
locales de audio emitidos por Jitsi, limitados a unas doce actualizaciones por
segundo. En Opciones aparece además un medidor accesible y el estado «Captando
audio», «Sin sonido detectado» o «Micrófono silenciado». Silenciar, desconectar o
salir reinicia el indicador; si dejan de llegar muestras, se limpia a los 400 ms.
Este indicador representa amplitud sonora: no reconoce palabras ni distingue la
voz de otros sonidos, y no crea grabaciones ni abre una captura adicional.
