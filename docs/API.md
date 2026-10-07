# Contrato de API que necesita el frontend

**Ruta base:** todas las rutas empiezan con `/api`. El JSON lleva los campos en español, como `nombre` o `fecha`. La definición completa de los tipos está en [`frontend/src/types/api.ts`](../frontend/src/types/api.ts). Las respuestas simuladas de referencia están en [`frontend/src/mocks/handlers.ts`](../frontend/src/mocks/handlers.ts).

## 1. Reglas generales

- **Autenticación:** el frontend envía `Authorization: Bearer <token>` en todas las peticiones, salvo en el login.
- **Identificadores:** van como **texto** (`"id": "12"`), no como número.
- **Fechas y horas:** `fecha` en formato `YYYY-MM-DD` y horas en `HH:mm`, en hora de Lima. Los momentos exactos van en ISO 8601, por ejemplo `2026-10-12T10:02:00-05:00`.
- **Formato único de error.** Todas las respuestas 4xx deben tener esta forma:

  ```json
  { "code": "CONFLICTO_HORARIO", "message": "Texto para mostrar al usuario", "fields": {}, "details": {} }
  ```

  El frontend muestra `message` tal como llega, así que debe estar en español y ser claro para el usuario. `fields` se usa solo en validaciones: lleva el error de cada campo, con el nombre del campo como clave.

## 2. Roles

Hay cuatro roles: `ADMIN`, `COORDINADOR`, `INSTRUCTOR` y `PARTICIPANTE`. El seed crea usuarios de los cuatro (en producción, solo `admin`).

- Sin sesión o con token inválido → **401** `NO_AUTENTICADO`.
- Con sesión pero rol incorrecto → **403** `SIN_PERMISO`. El backend debe validar el rol en **cada** ruta; ocultar botones en la interfaz no basta.

## 3. Rutas

| Método | Ruta | Quién | Respuesta OK | Errores |
|---|---|---|---|---|
| POST | `/auth/login` `{email, password}` | público | `200 { token, usuario: {id, nombre, email, rol, cargo} }` | 401 `CREDENCIALES_INVALIDAS` |
| POST | `/auth/logout` | autenticado | `204` | — |
| GET | `/instructores` | coordinador | `200 [{id, nombre}]` | — |
| GET | `/clases` | coordinador | `200 Clase[]` | 401 `NO_AUTENTICADO` |
| GET | `/clases/:id` | ambos | `200 Clase` | 404 `CLASE_NO_EXISTE` |
| POST | `/clases` `ClaseEntrada` | coordinador | `201 Clase` | 422 `VALIDACION` (con `fields`), 409 `CONFLICTO_HORARIO` (con `details.claseId`) |
| PUT | `/clases/:id` `ClaseEntrada` | coordinador | `200 Clase` | igual que el anterior, más 404 |
| POST | `/clases/:id/cancelar` | coordinador | `200 Clase`, con `estado: "CANCELADA"` | 404 |
| GET | `/clases/:id/inscritos` | coordinador | `200 [{id, nombre, email}]` | 404 |
| POST | `/clases/:id/inscritos` `{email}` | coordinador | `201 Participante` | 404 `PARTICIPANTE_NO_EXISTE`, 409 `YA_INSCRITO` |
| GET | `/clases/:id/asistencia` | coordinador | `200 {inscritos, presentes, ausentes, registros: [{participante, estado: "PRESENTE"/"AUSENTE", horaRegistro}]}` | 404 |
| GET | `/instructor/clases` | instructor | `200 Clase[]`: solo sus clases en estado `PROGRAMADA` | 401 |
| GET | `/clases/:id/qr` | instructor de esa clase | `200 {token, expiraEn, servidorAhora, duracionSegundos}` | 403 `SIN_PERMISO` (clase ajena), 404, 409 `CLASE_CANCELADA` |
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
2. Los demás errores todavía salen en el formato propio de Fastify (`statusCode`, `error`, `message`). Falta normalizarlos al formato del punto 1 de este documento.
3. `/auth/logout` ya existe y devuelve 204 con un token válido. El cliente elimina su sesión; el backend no revoca JWT emitidos. Ya existen las rutas de instructores, clases e inscritos (HU-04, ver [programar](esp/programar.md)); `GET /clases/:id/qr` valida la clase (404/403/409) y responde 501 hasta implementar el QR. Faltan asistencia, QR, `/instructor/clases` y `/participante/clases`.
4. Existen las tablas `clases` (fecha y horas locales de Lima, sin zona) e `inscripciones`; falta `asistencias`. El seed crea un usuario `COORDINADOR`, uno `INSTRUCTOR` y dos `PARTICIPANTE` fuera de producción (ver [calidad](esp/calidad.md), AMB-02).
5. La autorización por rol está en el servidor (T-04, ver [permisos](esp/permisos.md)): la matriz `backend/src/plugins/permisos.ts` declara el acceso de cada ruta de la tabla anterior y un hook aplica el guard a todas (401 `NO_AUTENTICADO`, 403 `SIN_PERMISO`). Las rutas aún no implementadas ya validan el rol y responden 501 `NO_IMPLEMENTADO`. Una ruta nueva sin entrada en la matriz impide arrancar el servidor. Un usuario con `active = false` recibe 403 `USUARIO_INACTIVO` al entrar y 401 con un token anterior.

La entrada del administrador está cubierta por las [pruebas reales de Playwright](e2e.md).

## 6. Pendientes por definir juntos

- **Participantes:** según el documento del Sprint 1 inician sesión y se crean por seed. ¿Confirmamos?
- **Política de solapamiento:** el frontend y la simulación aceptan que una clase empiece justo cuando termina otra. Confirmar en el Planning.
- **HTTPS para la demo:** la cámara del celular solo funciona con https. Hay que definir cómo exponer el frontend en la demo.
- **El token del login:** ¿lo dejamos en el encabezado `Authorization` o lo pasamos a una cookie `httpOnly`, que es más segura?
