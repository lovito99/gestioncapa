# Especificación: T-04 autorización por rol en el servidor

## Tarea

Validar en el backend el rol del usuario en cada ruta protegida. Ocultar botones
en la interfaz no reemplaza esta validación.

## Alcance y decisiones

- **Matriz única.** `backend/src/plugins/permisos.ts` declara cada ruta del
  [contrato](../API.md) con su acceso: `publico`, `autenticado` o una lista de
  roles. Es la única fuente de verdad: coincide con `exigirRol` de la simulación MSW.
- **Guard automático.** Un hook `onRoute` aplica el guard según la matriz a toda
  ruta que se registre. Ningún módulo tiene que acordarse de declararlo.
- **Rutas sin permiso.** Si se registra una ruta que no está en la matriz, el
  servidor **no arranca** y el error nombra la ruta. No hay rutas abiertas por omisión.
- **Rutas pendientes.** Las rutas del contrato que aún no tienen implementación
  quedan registradas: validan sesión y rol, y después responden 501
  `NO_IMPLEMENTADO`. Al implementar una ruta, su registro real reemplaza al pendiente.
- **Orden.** El guard corre en `preHandler`, antes del handler: un 401 o 403 nunca
  ejecuta la lógica de la ruta, así que no puede modificar datos.
- **Semillas.** Los 4 roles ya se siembran (AMB-02 en [calidad](calidad.md)).

| Método | Ruta (`/api`) | Acceso | Crítica |
|---|---|---|---|
| POST | `/auth/login` | público | |
| POST | `/auth/logout` | autenticado | |
| GET | `/auth/me` | autenticado | |
| GET | `/health` | público | |
| GET | `/instructores` | administrador, coordinador | |
| GET | `/clases` | administrador, coordinador | |
| GET | `/clases/:id` | administrador, coordinador, instructor | |
| POST | `/clases` | administrador, coordinador | sí |
| PUT | `/clases/:id` | administrador, coordinador | sí |
| POST | `/clases/:id/cancelar` | administrador, coordinador | sí |
| GET | `/clases/:id/inscritos` | administrador, coordinador | |
| POST | `/clases/:id/inscritos` | administrador, coordinador | sí |
| GET | `/clases/:id/asistencia` | administrador, coordinador | |
| GET | `/instructor/clases` | instructor | |
| GET | `/clases/:id/qr` | administrador o instructor de esa clase | sí |
| GET | `/participante/clases` | participante | |
| POST | `/asistencia/marcar` | participante | sí |

`GET /health` (fuera de `/api`) también es público. El administrador puede
gestionar clases, inscripciones y asistencia, y generar QR de cualquier clase
programada. Las rutas personales del instructor y participante siguen reservadas
a esos roles; el instructor solo puede generar QR de sus propias clases.

## Criterios de aceptación

```gherkin
# language: es
Característica: Autorización por rol en cada ruta del servidor

  Escenario: PER-01 Toda ruta tiene un permiso declarado
    Dado una ruta registrada que no figura en la matriz de permisos
    Cuando el servidor arranca
    Entonces falla con un error que nombra el método y la ruta

  Escenario: PER-02 Sin sesión
    Dado cualquier ruta protegida de la matriz
    Cuando se llama sin token
    Entonces responde 401 NO_AUTENTICADO

  Escenario: PER-03 Rol incorrecto
    Dado cada rol (admin, coordinador, instructor, participante)
    Cuando llama a una ruta que no incluye su rol
    Entonces responde 403 SIN_PERMISO

  Escenario: PER-04 Rol permitido
    Dado un rol incluido en la ruta
    Cuando la llama con token válido
    Entonces el guard lo deja pasar (501 NO_IMPLEMENTADO si la ruta está pendiente)

  Escenario: PER-05 Un 403 no modifica datos
    Dado un participante autenticado
    Cuando llama a POST /api/clases, reservado al administrador y coordinador
    Entonces responde 403 SIN_PERMISO
    Y el handler de la ruta no se ejecuta

  Escenario: PER-06 Rutas públicas
    Cuando se llama sin token a /api/health o /api/auth/login
    Entonces no se exige sesión

  Escenario: PER-07 Con la base real y los usuarios del seed
    Dado los 4 usuarios del seed autenticados en el servidor real
    Cuando cada uno llama a cada acción crítica
    Entonces solo el rol permitido pasa el guard y los demás reciben 403
    Y sin token todas responden 401
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| PER-01…06 | Unitaria (Fastify `inject`, sin base) | `backend/test/permisos.test.ts` |
| PER-07 | Integración (Postgres y Redis) | `backend/test/integracion/permisos.test.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas, la suite falló porque no
existían la matriz (`permisos.ts`), el hook `registrarAutorizacion` ni las rutas
pendientes. Antes del cambio, las acciones críticas respondían 404 a cualquier
rol, incluso sin token: no había ruta y, por tanto, tampoco validación.

**Verde.** Unitarias del backend: 93/93 (PER-01…06 recorren las 18 rutas de la
matriz con los 4 roles y sin token). Integración contra una copia aislada de
Docker Compose: 40/40 (PER-07: 7 acciones críticas × 4 roles del seed + sin
token, más ROL y AMB). Regresión: E2E real 11/11.

## Cómo implementar una ruta nueva

1. Si no está en la matriz, agrégala en `backend/src/plugins/permisos.ts` con su
   acceso (y `critica: true` si modifica datos). Las pruebas PER la cubren solas.
2. Regístrala en su módulo sin declarar guard: el hook lo aplica.
3. Su registro reemplaza al pendiente; el usuario autenticado llega en `request.usuario`.
