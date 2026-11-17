# Contrato de API que necesita el frontend

**Ruta base:** todas las rutas empiezan con `/api`. El JSON lleva los campos en español, como `nombre` o `fecha`. La definición completa de los tipos está en [`frontend/src/types/api.ts`](../frontend/src/types/api.ts). Las respuestas simuladas de referencia están en [`frontend/src/mocks/handlers.ts`](../frontend/src/mocks/handlers.ts).

## 1. Reglas generales

- **Autenticación:** el frontend envía `Authorization: Bearer <token>` en todas las peticiones, salvo en el login y los recursos públicos. `GET /api/publico/cursos` no requiere token.
- **Identificadores:** van como **texto** (`"id": "12"`), no como número.
- **Fechas y horas:** `fecha` en formato `YYYY-MM-DD` y horas en `HH:mm`, en hora de Lima. Los momentos exactos van en ISO 8601, por ejemplo `2026-10-12T10:02:00-05:00`.
- **Formato único de error.** Todas las respuestas 4xx deben tener esta forma:

  ```json
  { "code": "CONFLICTO_HORARIO", "message": "Texto para mostrar al usuario", "fields": {}, "details": {} }
  ```

  El frontend muestra `message` tal como llega, así que debe estar en español y ser claro para el usuario. `fields` se usa solo en validaciones: lleva el error de cada campo, con el nombre del campo como clave.

## 2. Roles

Los roles del producto CPPP son administrador (`ADMIN`), instructor (`INSTRUCTOR`)
y agremiado (`AGREMIADO`). HU-35 convierte coordinadores a administradores sin conservar el rol anterior. El seed de desarrollo/pruebas crea los tres roles; en producción, solo el administrador. Las conversiones se realizan mediante HU-35.

- Sin sesión o con token inválido → **401** `NO_AUTENTICADO`.
- Con sesión pero rol incorrecto → **403** `SIN_PERMISO`. El backend debe validar el rol en **cada** ruta; ocultar botones en la interfaz no basta.

## 3. Rutas

| Método | Ruta | Quién | Respuesta OK | Errores |
|---|---|---|---|---|
| POST | `/auth/login` `{email, password}` | público | `200 { token, usuario: {id, nombre, email, rol, cargo} }` | 401 `CREDENCIALES_INVALIDAS` |
| POST | `/auth/logout` | autenticado | `204` | — |
| GET | `/instructores` | administrador | `200 [{id, nombre}]` | — |
| GET | `/clases` | administrador | `200 Clase[]` | 401 `NO_AUTENTICADO` |
| GET | `/clases/:id` | administrador e instructor (solo su clase) | `200 Clase` | 404 `CLASE_NO_EXISTE` |
| POST | `/clases` `ClaseEntrada` | administrador | `201 Clase` | 422 `VALIDACION` (con `fields`), 409 `CONFLICTO_HORARIO` (con `details.claseId`) |
| PUT | `/clases/:id` `ClaseEntrada` | administrador | `200 Clase` | igual que el anterior, más 404 |
| POST | `/clases/:id/cancelar` | administrador | `200 Clase`, con `estado: "CANCELADA"` | 404 |
| GET | `/clases/:id/inscritos` | administrador | `200 [{id, nombre, email}]` | 404 |
| POST | `/clases/:id/inscritos` `{email}` | administrador | `201 Participante` | 422 `VALIDACION` (`fields.email`), 404 `PARTICIPANTE_NO_EXISTE`, 409 `YA_INSCRITO` (con `details.participanteId` y `details.inscritoEn`), 409 `CLASE_CANCELADA` |
| GET | `/clases/:id/asistencia` | administrador | `200 {inscritos, presentes, ausentes, registros: [{participante, estado: "PRESENTE"/"AUSENTE", horaRegistro}]}` | 404 |
| GET | `/instructor/clases` | instructor | `200 Clase[]`: solo sus clases en estado `PROGRAMADA` | 401 |
| GET | `/clases/:id/qr` | administrador o instructor de esa clase | `200 {token, expiraEn, servidorAhora, duracionSegundos}` | 403 `SIN_PERMISO` (clase ajena), 404, 409 `CLASE_CANCELADA` |
| GET | `/participante/clases` | participante | `200 ClaseParticipante[]`: solo las clases en las que está inscrito | 401, 403 |
| POST | `/asistencia/marcar` `{token, claseId?}` | participante | `201 {clase: {id, nombre}, horaRegistro}` | ver tabla de abajo |
| GET | `/health` | público | `200 {ok, api, database, redis}` (**ya existe** en el backend) | — |

**`Clase`:** `{ id, nombre, instructor: {id, nombre}, fecha, horaInicio, horaFin, lugar, inscritos (número), estado: "PROGRAMADA" | "CANCELADA" }`

**`ClaseEntrada`:** `{ nombre, instructorId, fecha, horaInicio, horaFin, lugar }`

**`ClaseParticipante`:** `{ id, nombre, instructor: {id, nombre}, fecha, horaInicio, horaFin, lugar, estado, miAsistencia }`. `miAsistencia` es la fecha-hora ISO de su registro, o `null`. **No** incluye datos de otros participantes.

### Errores de `POST /asistencia/marcar`

El frontend muestra un título y el `message` para cada código; el `message` debe decir qué hacer.

| Caso | Status | `code` |
|---|---|---|
| Token con firma inválida o formato incorrecto | 422 | `QR_INVALIDO` |
| Token vencido (más de 30 s) | 410 | `QR_EXPIRADO` |
| Se escaneó desde una clase (`claseId`) pero el token es de otra | 409 | `QR_OTRA_CLASE` |
| La clase está cancelada | 409 | `CLASE_CANCELADA` |
| El participante no está inscrito en la clase del token | 403 | `NO_INSCRITO` |
| Ya registró asistencia en esa clase | 409 | `ASISTENCIA_YA_REGISTRADA` |

Las pruebas en `frontend/src/mocks/asistencia.test.ts` (`npm test -w frontend`) describen estos casos y pueden servir de guía para las pruebas del backend.

## 4. Reglas de negocio

- **Conflicto de horario:** el mismo instructor no puede tener dos clases `PROGRAMADA` en la misma fecha con horarios que se crucen. Al editar, no se compara la clase consigo misma. El `message` debe nombrar la clase en conflicto con su fecha y hora.
- **Hora de fin:** debe ser mayor que la de inicio. Si no, se responde 422 con el error en `fields.horaFin`.
- **QR rotativo:** cada QR vale 30 segundos. Se firma en el servidor con `QR_SECRET` (HMAC o JWT), va ligado al id de la clase, no contiene datos personales y no debe poder reutilizarse cuando vence. `servidorAhora` es obligatorio porque el frontend lo usa para corregir la diferencia con el reloj del equipo.
- **Contenido del QR:** el frontend dibuja la URL `<frontend>/asistencia/marcar?token=<token>`. Así el participante puede escanearlo con la cámara normal del celular o con el escáner de la aplicación.
- **Anti-duplicado:** la asistencia debe ser única por (clase, participante) con una restricción `UNIQUE` en la base de datos.
- **Clase cancelada:** no acepta inscripciones (409 `CLASE_CANCELADA`) ni genera QR.
- **Sesión expirada:** responder 401 en cualquier ruta protegida hace que el frontend cierre la sesión.

## 5. Diferencias con el backend actual

1. El login y `/auth/me` ya incluyen `usuario` con id texto, `nombre`, `rol` en mayúsculas y `cargo`. Se conserva `user` por compatibilidad. El login devuelve 401 `CREDENCIALES_INVALIDAS` para credenciales incorrectas.
2. Las validaciones Zod devuelven 422 `VALIDACION` con mensajes en español y `fields`. JSON inválido, rutas inexistentes y fallos internos mantienen el formato `{code, message}`. Los detalles internos se registran en el servidor, sin enviarlos al navegador.
3. `/auth/logout` ya existe y devuelve 204 con un token válido. El cliente elimina su sesión; el backend no revoca JWT emitidos. **Todas las rutas de la tabla están implementadas** en el backend: clases e inscritos (HU-04, HU-06), QR rotativo (HU-07, ver [QR](esp/qr.md)), `POST /asistencia/marcar`, `GET /clases/:id/asistencia` y `/participante/clases` (HU-08, HU-09, ver [asistencia](esp/asistencia.md)). La interfaz funciona completa con `VITE_USE_MOCKS=false`.
4. El esquema está versionado en `backend/migraciones/`. HU-35 retira `organizations` y `organization_id` mediante migraciones nuevas y conserva los identificadores y relaciones de negocio. Los roles son administrador, instructor y agremiado. La asistencia conserva la hora de Lima y los bloqueos de clase. Ver [adaptación de roles](esp/rolesCppp.md).
5. La autorización por rol está en el servidor (T-04, ver [permisos](esp/permisos.md)): la matriz `backend/src/plugins/permisos.ts` declara el acceso de cada ruta de la tabla anterior y un hook aplica el guard a todas (401 `NO_AUTENTICADO`, 403 `SIN_PERMISO`). Las rutas aún no implementadas ya validan el rol y responden 501 `NO_IMPLEMENTADO`. Una ruta nueva sin entrada en la matriz impide arrancar el servidor. Un usuario con `active = false` recibe 403 `USUARIO_INACTIVO` al entrar y 401 con un token anterior.

La entrada del administrador está cubierta por las [pruebas reales de Playwright](e2e.md).

## 6. Pendientes por definir juntos

- **Participantes:** según el documento del Sprint 1 inician sesión y se crean por seed. ¿Confirmamos?
- **Política de solapamiento:** el frontend y la simulación aceptan que una clase empiece justo cuando termina otra. Confirmar en el Planning.
- **HTTPS para la demo:** la cámara del celular solo funciona con https. Hay que definir cómo exponer el frontend en la demo.
- **El token del login:** ¿lo dejamos en el encabezado `Authorization` o lo pasamos a una cookie `httpOnly`, que es más segura?

## Cursos y materiales (HU-13)

Contrato, permisos, cuerpos de creación, descarga de PDF, programación de sesiones
presenciales y cálculo del 80 % de asistencia en [cursos](esp/cursos.md).
Los tipos del cliente están en `frontend/src/servicios/cursos.ts`.

## Historial del colegiado (HU-18)

Datos mínimos, cálculo de asistencia y descargas protegidas en [historial](esp/historial.md).

## Catálogo paginado e inscripción básica (HU-14)

Filtros, metadatos, cupos disponibles e inscripción protegida en [catálogo](esp/catalogo.md).
La ruta anterior de lista se conserva; la interfaz consulta `/catalogo/cursos/pagina`.

## Pantallas del Figma pendientes en el backend

El frontend ya tiene estas pantallas con datos simulados. Su contrato completo está en
[pantallas del Figma](esp/pantallas-figma.md). Rutas que faltan en el backend:

- `POST /auth/registro`: crear cuenta de agremiado.
- `PUT /cursos/:id` y `DELETE /cursos/:id/modulos/:moduloId/materiales/:materialId`: editar curso.
- `cursoId` obligatorio en `POST`/`PUT /clases`, y `curso` en `Clase`: las clases como sesiones del curso.
- `GET /cursos/:id/cierre`, `POST /cursos/:id/cerrar` y `GET /cursos/:id/certificados` (SCRUM-171).
- `POST /certificados/:codigo/anular` y `POST /certificados/:codigo/corregir` (SCRUM-171).
- `GET /certificados/:codigo`: verificación pública (SCRUM-138).
- Campos nuevos: `requisitoAsistencia`, `sesiones` y el estado `CERRADO` en los cursos; `requisitoAsistencia` y `pagoPendiente` en cada curso del historial, y `estado` en cada uno de sus certificados.
- `POST /cursos/:id/inscribirme` responde `estado: 'PENDIENTE_PAGO'` si el curso tiene costo.


## Base CPPP: catálogo público y sesiones

`GET /api/publico/cursos` admite los filtros del catálogo paginado: `buscar`,
`modalidad` (`PRESENCIAL`, `VIRTUAL`, `HIBRIDA`), `categoria`, `pagina` (1–100000)
y `tamanoPagina` (1–50, por defecto 6). No requiere sesión. Devuelve
`{ items, total, pagina, tamanoPagina, totalPaginas, categorias }`. Cada item
incluye únicamente id, título, descripción, nombre del instructor, horas,
modalidad, costo, cupos, cupos disponibles, categoría y fechas. Solo publica
cursos publicados del CPPP con fecha final vigente o por confirmar.
No incluye módulos, materiales, inscritos ni identificadores internos de personas.

`POST /api/auth/logout` invalida el token utilizado hasta su expiración. Los
siguientes accesos protegidos con ese token devuelven 401. Otros tokens del mismo
usuario continúan válidos. Cinco fallos de login en 15 minutos bloquean otros
15 minutos: `423 ACCESO_BLOQUEADO` y cabecera `Retry-After`. El quinto fallo ya
responde 423. Un login correcto posterior al bloqueo limpia los fallos.
El límite autenticado por usuario es configurable mediante `limitePeticiones`
(por defecto 300/minuto): `429 LIMITE_PETICIONES` con `Retry-After`.

El contrato usa `AGREMIADO` y se presenta como **Agremiado**.
HU-35 retira el rol coordinador; sus cuentas pasan a administrador.
Consultar [la matriz CPPP](enfoqueCppp.md) para distinguir API real y simulaciones.


## HU-50: registro con DNI

`POST /api/auth/registro` crea un agremiado y devuelve `201` con el mismo contrato
de sesión que el login. DNI/correo duplicados devuelven `409 CUENTA_YA_REGISTRADA`;
los errores por campo usan `422 VALIDACION`. Consulta [el contrato completo](esp/registro.md).


## HU-16: inscripción en línea

`POST /api/cursos/:id/inscribirme` conserva `201` para una nueva inscripción y
`200` para la repetida. El estado persistido es `EN_CURSO` para nuevas gratuitas
y `PENDIENTE_PAGO` para nuevas con costo; `TERMINADO` se conserva en las históricas.
El detalle incluye `estadoInscripcion` y el historial `pagoPendiente`.
Véase [HU-16](esp/inscripcionCurso.md) para cupos, concurrencia y compatibilidad.

## HU-35 · Usuarios y roles del CPPP

Roles del contrato: `ADMIN`, `INSTRUCTOR`, `AGREMIADO`; en la base: `admin`,
`instructor`, `agremiado`. `GET /usuarios` solo para administrador, paginado con
`pagina`, `tamanoPagina` (máximo 50) y `buscar` por nombre/correo. Devuelve
`{ items: [{ id, nombre, email, rol, activo }], total, pagina, tamanoPagina }`.

<<<<<<< Updated upstream
`POST /usuarios` crea una cuenta con `{ nombre, email, rol, activo, password,
motivo }`; `PUT /usuarios/:id` actualiza los mismos campos sin `password`. El rol
se envía en minúsculas. Ambos requieren motivo y registran actor y fecha en
`auditoriaRoles`; la clave inicial requiere ocho caracteres y bcrypt. Devuelven
409 por correo duplicado; editar la propia cuenta no permite quitarse el rol
administrativo ni desactivarla. Agremiados e instructores reciben 403.

La lista de asistencia de sesión admite al administrador y al instructor
asignado. El instructor ajeno recibe 403, incluso en sesiones sin curso.
=======
La emisión de constancias presenciales gratuitas, el PDF privado y la verificación
pública tienen backend persistente. Véase [HU-20](esp/certificados.md).
La consulta pública del código excluye DNI, nota y motivos. El documento completo
y el archivo exigen titular o administrador de su organización.

### HU-34 · Horas acumuladas

El historial devuelve `horasAcumuladas: { total, porAnio: [{ anio, horas }] }` y
`horasLectivas` por certificado. Solo suman los válidos, usando la instantánea del
documento (o las horas del curso para certificados históricos sin instantánea).
El año de emisión corresponde a `America/Lima`. El filtro anual se aplica en la
interfaz; el PDF contiene el total y todos los años. Ver [HU-34](esp/horasAcumuladas.md).
>>>>>>> Stashed changes
# HU-53 — Cobro de cursos

La creación y las respuestas comerciales añaden `modalidadCobro`
(`PREVIO`/`CERTIFICADO`/`GRATUITO`), `plazoPagoMinutos` y `versionCobro`.
PREVIO requiere importe positivo y plazo entero de 1–525600 minutos; CERTIFICADO
importe positivo y plazo nulo; GRATUITO importe cero y plazo nulo. Moneda PEN.

`PATCH /api/cursos/:id/cobro` (ADMIN) recibe esos campos y la versión leída.
Devuelve el curso persistido; 409 si cambió la versión o el curso está cerrado.
`POST /api/cursos/:id/inscribirme` requiere `{versionCobro}` para ofertas pagadas;
si falta o cambió, 409 `COBRO_MODIFICADO`. La respuesta conserva sus estados y
añade `intentoId`, `pagoId` y `venceEn`. Un reintento existente conserva su plazo.
El detalle privado aporta `miInscripcion` (condiciones aceptadas, obligación y
entrega) y `accesoContenido`; sin derecho vigente devuelve módulos vacíos y
rechaza el acceso directo al PDF. Los datos de inscripción/pago no salen en el
catálogo público. CANCELADA indica la reserva vencida, no una deuda pagada.

| Método/ruta | Actor | Cuerpo/resultado |
| --- | --- | --- |
| GET /api/pagos/:id | Propietario o ADMIN | Obligación en céntimos, contexto privado, operaciones/incidencias, medios disponibles; no secretos |
| POST /api/pagos/:id/intentos | Propietario AGREMIADO | `{medio:"IZIPAY" o "CULQI",clave:UUID,token?:string}`; Culqi exige token del entorno; sesión Izipay solo al iniciador |
| POST /api/pagos/:id/efectivo | ADMIN activo | `{referencia:string,importeCentimos:number,fechaRecepcion:"YYYY-MM-DD"}`; importe recibido igual al completo de la orden, fecha no futura y recepción auditada |
| POST /api/pagos/:id/conciliar | ADMIN | `{operacionId:UUID,referencia?:string}` de esta obligación; verifica al proveedor y no crea cargos |
| POST /api/pagos/notificaciones/:proveedor | Público con prueba del proveedor | Izipay: payloadHttp original y signature; Culqi: referencia de evento/cargo que el backend consulta autenticado |

Repetir la misma clave exige misma carga; otra carga o una operación activa devuelve
409. Una repetición Izipay puede recuperar exactamente la sesión original vigente,
cifrada, mientras la obligación siga exigible. Una operación incierta no habilita
otro cobro. `CONCILIACION` significa evidencia conservada sin confirmación aplicable.
401 sin sesión, 403 por propiedad/rol, 404 inexistente, 422 validación/firma/token,
409 conflicto y 503 proveedor no configurado/incierto. Los webhooks tienen límite
de 256 KiB y 120 solicitudes/minuto/IP/proveedor; solicitudes internas de pago 4 KiB.
Las respuestas privadas de pago no se almacenan en caché.

El cierre distingue `{emitidos,retenidos}`. La entrega RETENIDA no dispone de código
ni PDF válido. El historial separa inscripción, `estadoFinanciero`, `estadoEntrega`
y `pagoId`; el pago de constancia no convierte la inscripción en pendiente.
`intentosAnteriores` conserva condiciones, estado y referencia de pago de las
inscripciones anteriores del mismo propietario, también después de reinscribirse.
Más detalles, migración, límites y evidencia: [Cobro de cursos](esp/cobroCursos.md).

## T-25 — Izipay y transferencias bancarias

Para nuevos intentos, `POST /api/pagos/:id/intentos` recibe `medio:"IZIPAY"`.
`CULQI` devuelve 503 `PASARELA_NO_SELECCIONADA`, también cuando sus credenciales
históricas están configuradas. Se conservan sus notificaciones y conciliación;
los clientes deben cambiar de pasarela explícitamente, sin reutilizar tokens Culqi.

`GET /api/pagos/:id` añade `transferencias`, `destinoTransferencia` y
`medios.transferencia`. El destino contiene `{id,banco,titular,cuenta,cci}` y se
conserva para esa obligación desde la primera oferta. Cambiar la configuración
afecta a nuevas obligaciones. Con el flag apagado no se ofrecen destinos nuevos;
uno previamente ofrecido sigue disponible para declarar un abono ya realizado.
La respuesta requiere propietario o ADMIN y usa `Cache-Control: private, no-store`.

| Método/ruta | Actor | Cuerpo y resultado |
| --- | --- | --- |
| POST /api/pagos/:id/transferencias | Propietario AGREMIADO activo | `{destinoId:UUID,clave:UUID,referencia:string,fechaOperacion:"YYYY-MM-DD",voucher:{tipo,contenidoBase64}}`. 201 `{operacionId,estado:"DECLARADO"}`; repetición exacta 200 |
| POST /api/pagos/:id/transferencias/:operacionId/revision | ADMIN activo | Confirmar: `{decision:"CONFIRMAR",referencia,fechaOperacion,importeCentimos,moneda:"PEN",verificado:true}`. Rechazar: `{decision:"RECHAZAR",motivo:string}`. 200 `{estado:"CONFIRMADO" o "RECHAZADO"}` |

La referencia tiene 3–100 caracteres alfanuméricos, espacio, punto, barra o guion;
se normaliza a mayúsculas y espacios simples. La fecha debe existir y no ser futura.
La clave exige la misma carga y el destino debe haberse ofrecido a esa obligación.
La declaración no inicia un cargo ni confirma dinero: guarda evidencia pendiente.
`DECLARADO` es exclusivo de TRANSFERENCIA y admite una declaración por revisar por
obligación. Mientras exista se bloquean nuevos cargos, efectivo y recuperación de
sesión Izipay; la conciliación de operaciones previamente iniciadas se conserva.

ADMIN contrasta el abono real con el destino persistido, el importe congelado,
moneda, referencia y fecha. No hay carga pública de archivos ni confirmación desde
webhooks para medios manuales. Se auditan declaración, decisión, actor y fecha.
La decisión terminal solo admite repetición exacta; cambiarla devuelve 409.
La referencia bancaria canónica se reserva desde la declaración, eliminando espacios,
puntos, barras y guiones. No puede reutilizarse entre obligaciones, aunque cambien
cuenta o fecha, se rechace el voucher o se elimine su archivo por retención.
El destino ajeno devuelve 422; operación ajena 404; permisos 401/403; discrepancias,
clave reutilizada o abono reutilizado 409. Declaración y reposición de voucher tienen
límite de cuerpo de 8 MiB; revisión y efectivo mantienen 4 KiB.

Se pueden conservar declaraciones tardías o de ingresos adicionales a un destino
ya ofrecido. Confirmar un pago tardío conserva la incidencia TARDIO sin recuperar
cupo; un ingreso adicional deja hecho e incidencia para conciliación sin aplicar
otra vez la deuda. No se automatizan devoluciones ni se aceptan pagos parciales.

## HU-32 — Vouchers privados y comprobantes por correo

Las nuevas transferencias exigen `voucher:{tipo:"image/jpeg"|"image/png"|"application/pdf",contenidoBase64:string}`.
Se valida base64 canónico, firma y tamaño máximo de 5 MiB, sin nombre ni ruta
del cliente. No se trata la firma como análisis antivirus. Declaración y archivo
se guardan en una transacción. Se mantienen las declaraciones históricas sin archivo.

| Método/ruta | Actor | Resultado |
| --- | --- | --- |
| GET /api/pagos/:id/transferencias/:operacionId/voucher | Propietario o ADMIN | Binario adjunto privado con MIME conocido, no-store, nosniff y CSP sandbox; 404 si no pertenece al pago, 410 al vencer/eliminarse |
| PUT /api/pagos/:id/transferencias/:operacionId/voucher | Propietario AGREMIADO activo | `{clave:UUID,version:number,voucher:{tipo,contenidoBase64}}`. 200 `{voucherId}`. Repone únicamente el último archivo vencido de un trámite DECLARADO; conserva operación, número e historial. 409 si no está disponible |

`GET /api/pagos/:id` añade a cada transferencia `voucher` (o null histórico):
`{id,version,tipo,tamano,hash,eliminarEn,eliminadoEn,disponible}`. No incluye binario.
También aporta `notificaciones:[{id,tipo,estado,intentos,enviadoEn,ultimoError}]`;
tipos COMPROBANTE/RECHAZO, estados PENDIENTE/ENVIANDO/ENVIADO. No expone destinatarios,
contenido del correo ni credenciales. Las pantallas siguen consultando el correo
pendiente incluso después de confirmar el dinero.

La aprobación exige archivo vigente cuando la declaración tiene voucher; conserva
la revisión de declaraciones históricas sin archivo. Confirmación y evento de correo
son atómicos. SMTP entrega un PDF de recepción; rechazo envía el motivo en texto.
El fallo SMTP no revierte la decisión financiera. ENVIADO indica aceptación SMTP,
sin acreditar lectura o llegada a bandeja de entrada. No es una factura tributaria.

**Adaptación incompatible:** clientes previos deben enviar voucher en nuevas
transferencias e importe/fecha en efectivo. Las claves de transferencia incluyen
hash y tipo del archivo; repetir clave con otra carga devuelve 409. El efectivo
repetido conserva los datos originales y rechaza cambios en importe/fecha.

Operación, configuración, retención y publicación manual:
[Pago por transferencia y efectivo](esp/pagosTransferenciaEfectivo.md).

## HU-26 — Sesiones virtuales seguras

Las rutas de reuniones existentes se describen en [reuniones.md](reuniones.md).
Cambios y rutas nuevas:

| Método/ruta | Actor | Resultado |
| --- | --- | --- |
| POST /api/reuniones | ADMIN o INSTRUCTOR asignado a la sesión | 201. Otro instructor o colegiado: 403. La pantalla queda restringida por defecto y el mínimo de asistencia en 70 % |
| PATCH /api/reuniones/:id/politicas | ADMIN o INSTRUCTOR asignado | `{camaraPermitida,microfonoPermitido,pantallaPermitida,manoPermitida,porcentajeMinimo:1..100,grabacionPrevista}` estricto; 200 con la reunión. 409 si está cancelada o finalizada, o si cambia `grabacionPrevista` después de iniciar. Deja de responder 422 a las restricciones |
| POST /api/reuniones/:id/credencial | Instructor, ADMIN o inscrito con acceso | Cuerpo opcional `{aceptaGrabacion?:boolean}`. El token del colegiado lleva `context.user.lobby=true` (sala de espera). Con grabación prevista, 422 `AVISO_GRABACION_PENDIENTE` hasta aceptar; la aceptación se registra con fecha |
| POST /api/reuniones/:id/participantes/:usuario/retirar | ADMIN o INSTRUCTOR asignado | 200 `{accesoRevocado:true}`; registra `retiradoEn`. La sala del moderador cierra las conexiones activas |
| POST /api/reuniones/:id/finalizar | ADMIN o INSTRUCTOR asignado | Fija `finalizadaEn`, cierra conexiones abiertas y registra la asistencia virtual en la misma transacción |
| GET /api/reuniones/:id/asistencia | ADMIN o INSTRUCTOR asignado | 409 antes de finalizar. 200 `{porcentajeMinimo,iniciadaEn,finalizadaEn,resultados:[{usuarioIdentificador,nombre,segundosConectados,porcentaje,cuenta,expulsado}]}` |
| POST /api/jitsi/events/occupant/joined, /occupant/left, /room/created, /room/destroyed | Prosody (`event_sync`), sin sesión de usuario | `Authorization: Bearer <jitsiEventosSecreto>`; 401 si no coincide, 503 sin secreto configurado, 422 con cuerpo inválido. Cuerpo máximo 16 KiB. Idempotente por reunión y `occupant_jid`; ignora salas desconocidas o no iniciadas |

`GET /api/reuniones/:id` añade `manoPermitida`, `porcentajeMinimo`,
`grabacionPrevista`, `iniciadaEn` y `finalizadaEn`. Una asistencia virtual que alcanza
el mínimo se guarda en `attendances` con `origen='VIRTUAL'` y cuenta para el 80 %
del certificado; una asistencia QR previa se conserva. Detalle y evidencia:
[sesiones virtuales seguras](esp/sesionesVirtuales.md).

## HU-36 — Modalidad por sesión y cursos híbridos

| Método/ruta | Cambio |
| --- | --- |
| POST /api/cursos/:id/sesiones, POST /api/clases, PUT /api/clases/:id | Campo opcional `modalidad`: `PRESENCIAL`, `VIRTUAL` o `AMBAS` (otro valor → 422). Sin él: `PRESENCIAL` al crear y la actual al editar. `lugar` es obligatorio salvo en `VIRTUAL`, que guarda «Aula virtual». Recalculan la modalidad del curso y sincronizan su sala en la misma transacción |
| POST /api/clases/:id/cancelar | Recalcula el curso y cancela la sala aún programada |
| POST /api/cursos/:id/sesiones | 409 `CURSO_GRABADO` si el curso es grabado |
| POST /api/cursos, GET /api/catalogo/cursos/pagina | `modalidad` admite `GRABADO` (alta y filtro) |
| GET /api/cursos/:id | `modalidad` calculada: todas presenciales → `PRESENCIAL`; todas virtuales → `VIRTUAL`; mezcla o «ambas» → `HIBRIDA`; sin sesiones programadas, la elegida al crear. Cada sesión trae `modalidad` y `reunion: {identificador,estado} \| null` (solo para ADMIN, instructor asignado o colegiado con acceso al curso) |
| GET /api/clases/:id/qr, POST /api/asistencia/marcar | 409 `SESION_VIRTUAL` en sesiones solo virtuales |
| POST /api/reuniones | 409 `SESION_PRESENCIAL` para sesiones presenciales |
| Cierre y constancias | Cursos `PRESENCIAL`, `VIRTUAL` e `HIBRIDA`; `GRABADO` → 409 `CURSO_GRABADO` |

Las respuestas de clases añaden `modalidad`. El backend no tiene edición general del curso
(`PUT /api/cursos/:id` sigue pendiente): la modalidad planificada se fija al crear; la demo
rechaza con 422 `MODALIDAD_CALCULADA` cambiarla a mano cuando hay sesiones programadas.

## HU-39 — QR personal y asistencia en la puerta

Contrato que usa el frontend (SCRUM-207, diseño Figma «S3 · SCRUM-205»). Hoy lo responde
la simulación (`frontend/src/mocks/asistenciaPuerta.ts`); sus pruebas en
`asistenciaPuerta.test.ts` son la especificación ejecutable para el backend (SCRUM-206).

**Quién toma la asistencia:** mientras el CPPP no confirme el rol de encargado,
pueden hacerlo el administrador y el instructor asignado a la sesión. El agremiado
y el instructor ajeno reciben `403 SIN_PERMISO`.

| Método y ruta | Rol | Respuesta |
|---|---|---|
| `GET /api/participante/mi-qr` | Agremiado | `200 { token, nombre, dniParcial, habilitado, proximaSesion }` |
| `GET /api/participante/mi-qr/pdf` | Agremiado | `200 application/pdf` con el QR, nombre y DNI parcial |
| `GET /api/clases/:id/asistencia/puerta?dni=` | Admin, instructor asignado | `200 { resultados: [{ participante, horaRegistro }] }` |
| `POST /api/clases/:id/asistencia/puerta` | Admin, instructor asignado | `201 { participante, horaRegistro, metodo }` |
| `DELETE /api/clases/:id/asistencia/puerta/:participanteId` | Admin, instructor asignado | `204` («Deshacer este registro») |

- `token` es el contenido del QR: firmado (HMAC) y **permanente**, sin DNI ni otros
  datos personales. El mismo agremiado recibe siempre el mismo token.
- `participante` es `{ id, nombre, dniParcial }`. `dniParcial` muestra solo los
  **4 últimos dígitos** con el formato `•••• 5678`; el DNI completo nunca sale en estas respuestas.
- `habilitado` indica si el colegiado está habilitado en el CPPP (etiqueta verde de «Mi QR»).
- `proximaSesion` es `{ id, titulo, fecha, horaInicio, horaFin, lugar }` de la próxima
  sesión presencial programada en la que está inscrito, o `null`. `titulo` es el del curso.
- La búsqueda recibe de **4 a 8 dígitos** y devuelve los **inscritos de la sesión** cuyo DNI
  **empieza** con ellos (`horaRegistro` es `null` si aún no tienen asistencia). No registra nada.
  Quien no está inscrito no aparece: la pantalla muestra «No encontramos ese DNI entre los inscritos».
- El cuerpo del `POST` lleva **uno** de dos campos: `{ token }` (escaneo, `metodo: "QR"`)
  o `{ participanteId }` (elegido en la búsqueda, `metodo: "DNI"`).
- `GET /clases/:id/asistencia` añade `metodo: "QR" | "DNI" | null` en cada registro, para el
  panel «Últimos registros» (el QR rotatorio del instructor cuenta como `QR`).

Errores (formato común `{ code, message, details? }`):

| Código | HTTP | Cuándo |
|---|---|---|
| `QR_PERSONAL_INVALIDO` | 422 | Firma incorrecta, token alterado o QR de otro sistema |
| `VALIDACION` | 422 | DNI con menos de 4 o más de 8 dígitos, o cuerpo sin `token` ni `participanteId` |
| `PARTICIPANTE_NO_EXISTE` | 404 | `participanteId` desconocido |
| `NO_INSCRITO` | 409 | No está inscrito en el curso de la sesión. `details.participante` |
| `ASISTENCIA_YA_REGISTRADA` | 409 | Ya tenía asistencia; no se duplica. `details.participante`, `details.horaRegistro` |
| `ASISTENCIA_NO_REGISTRADA` | 404 | `DELETE` sobre alguien sin asistencia en la sesión |
| `SESION_VIRTUAL` | 409 | La sesión es solo virtual |
| `CLASE_CANCELADA` | 409 | La sesión está cancelada |

El registro debe ser idempotente ante dos lecturas simultáneas del mismo QR
(restricción única por sesión y agremiado). Conviene auditar quién deshace un registro.
La lista `GET /clases/:id/asistencia` refleja estas marcas como `PRESENTE`, igual que las del QR rotatorio.

## SCRUM-202 — «Programar sesión» con modalidad, lugar y sala (HU-36, Figma S3 6.1–6.4)

Pantallas: `/admin/cursos/:id/sesiones` (lista con «Editar») y
`/admin/cursos/:id/sesiones/nueva` o `/:sesionId/editar` (formulario). La simulación está en
`frontend/src/mocks/cursos.ts` y su prueba en `mocks/sesionesCurso.test.ts`.

**Hoy ya funciona con el backend actual:** el frontend sigue enviando `nombre` («Sesión N»),
`fecha`, `horaInicio`, `horaFin`, `modalidad` y `lugar` (`"<aula>, <sede>"`, vacío si es virtual).
Los campos nuevos son **opcionales**; el backend actual los ignora porque su esquema no es estricto.

| Método y ruta | Cambio pedido |
|---|---|
| `POST /api/cursos/:id/sesiones` | Aceptar y guardar los campos nuevos de la tabla de abajo |
| `PUT /api/clases/:id` | Igual. El frontend edita la sesión de un curso con esta ruta, enviando además `cursoId` e `instructorId` (el del curso) |
| `GET /api/cursos/:id` | Cada elemento de `sesiones` devuelve los campos nuevos que tenga guardados |

| Campo | Tipo | Cuándo se envía | Regla |
|---|---|---|---|
| `sede` | texto ≤ 120 | `PRESENCIAL` y `AMBAS` | Una de las sedes del CPPP (hoy la lista está fija en `paginas/cursos/sesiones/reglasSesion.ts`) |
| `aula` | texto ≤ 100 | `PRESENCIAL` y `AMBAS` | Aula o referencia, obligatoria si hay sede |
| `encargadoId` | id de usuario | `PRESENCIAL` y `AMBAS` | Quien registra la asistencia en la puerta (HU-39). Por defecto, el instructor del curso. La lista sale de `GET /api/cursos/instructores` |
| `qrRotatorio` | booleano | `PRESENCIAL` y `AMBAS` | `true`: también vale el QR rotatorio que proyecta el instructor |
| `sala` | objeto | `VIRTUAL` y `AMBAS` | `{ grabacionPrevista, pantallaPermitida, microfonoPermitido, manoPermitida, porcentajeMinimo: 1..100 }`, con las mismas claves de `PATCH /api/reuniones/:id/politicas`. Al crear la sala de la sesión se usan estos valores |

- Una sesión `VIRTUAL` no guarda `sede`, `aula`, `encargadoId` ni `qrRotatorio`; una `PRESENCIAL` no guarda `sala`.
- Valores por defecto de `sala` (HU-26): sin grabación, sin compartir pantalla, sin micrófono, mano levantada permitida, 70 %.
- Datos inválidos → `422 VALIDACION` con `fields` por campo, como hoy.

**Pendiente de definir con el equipo:** si el encargado puede ser un usuario que no es instructor
(hoy solo se ofrecen instructores), y si las sedes deben venir de una tabla (`GET /api/sedes`).
