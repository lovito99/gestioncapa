# Especificación: acceso por rol y sesión

## Historia

Como usuario del sistema (coordinador, instructor, participante o administrador),
quiero acceder únicamente a las opciones de mi rol, para operar de forma segura
sin ver ni modificar lo que no me corresponde.

## Alcance y decisiones

- **Ver** (cliente): cada rol llega a su inicio y solo ve sus acciones. Ocultar
  botones no basta para la seguridad: es una ayuda de interfaz.
- **Modificar** (servidor): el backend autoriza cada ruta protegida con un guard
  común. Sin sesión válida responde 401 `NO_AUTENTICADO`; con otro rol, 403
  `SIN_PERMISO`. Hoy lo usan `/api/auth/me` y `/api/auth/logout`; toda ruta nueva
  de clases, inscripciones o asistencia debe declararlo.
- **Usuario activo**: la tabla `users` tiene `active` (por defecto `true`). Un
  usuario inactivo no puede iniciar sesión (403 `USUARIO_INACTIVO`, solo si la
  contraseña es correcta, para no revelar cuentas) y su token deja de servir en
  el siguiente request, aunque no haya expirado: el guard lee el usuario de la base.
- **Token expirado**: el cliente lee `exp` del JWT antes de mostrar una ruta
  protegida. Si venció, cierra la sesión local, lleva al login, conserva el destino
  y muestra «Tu sesión expiró». Los tokens del modo demo (`demo-<id>`) no son JWT y
  no expiran.
- **Token ausente**: si falta el token aunque quede el usuario en la pestaña, se
  trata como sesión expirada.
- **401 del servidor** (token revocado, firmado con otro secreto o usuario
  inactivo): el cliente cierra la sesión y vuelve al login con el mismo aviso. Un
  401 al cerrar sesión no muestra el aviso.

## Criterios de aceptación

```gherkin
# language: es
Característica: Acceso únicamente a las opciones del rol

  Esquema del escenario: ROL-01 Cada rol ve solo sus opciones
    Dado un <rol> activo con credenciales válidas
    Cuando inicia sesión
    Entonces llega a <inicio> y ve "<opción propia>"
    Y no ve las opciones de los otros roles

    Ejemplos:
      | rol          | inicio                | opción propia          |
      | coordinador  | /coordinador/clases   | Nueva clase            |
      | instructor   | /instructor/clases    | Mostrar QR             |
      | participante | /participante/clases  | Registrar asistencia   |
      | admin        | /admin                | Estado del sistema     |

  Escenario: ROL-02 Login real de cada rol
    Dado los usuarios del seed en la base real
    Cuando cada uno inicia sesión en el navegador
    Entonces llega al inicio de su rol y el encabezado muestra su cargo

  Escenario: ROL-03 Usuario inactivo
    Dado un usuario con active = false y contraseña correcta
    Cuando inicia sesión
    Entonces recibe 403 USUARIO_INACTIVO y no obtiene token

  Escenario: ROL-04 Usuario desactivado con token vigente
    Dado un usuario con un token emitido que luego es desactivado
    Cuando llama a una ruta protegida
    Entonces recibe 401 NO_AUTENTICADO

Característica: Autorización en el servidor

  Escenario: API-01 Sin token
    Cuando se llama a una ruta protegida sin Authorization
    Entonces responde 401 NO_AUTENTICADO

  Escenario: API-02 Token expirado o con otra firma
    Cuando se llama con un token expirado o firmado con otro secreto
    Entonces responde 401 NO_AUTENTICADO

  Escenario: API-03 Rol incorrecto
    Dado un participante con token válido
    Cuando llama a una ruta solo para coordinadores
    Entonces responde 403 SIN_PERMISO

  Escenario: API-04 Rol correcto
    Dado un coordinador con token válido
    Cuando llama a una ruta para coordinadores
    Entonces responde 200 y la ruta recibe el usuario autenticado

Característica: Sesión expirada o ausente en el cliente

  Escenario: SES-01 Detectar expiración del token
    Dado un JWT cuyo exp ya pasó, o un token ausente
    Cuando se evalúa la sesión
    Entonces se considera expirada
    Y un token demo sin formato JWT se considera vigente

  Escenario: SES-02 Token ausente
    Dado un usuario conectado cuya pestaña perdió el token
    Cuando abre una ruta protegida
    Entonces vuelve al login con el aviso «Tu sesión expiró»

  Escenario: SES-03 Token expirado
    Dado un administrador conectado con el backend real
    Cuando pasa la expiración del JWT y abre una ruta protegida
    Entonces vuelve al login con el aviso, sin ver el contenido protegido
    Y el destino se conserva para después del login

  Escenario: SES-04 El servidor rechaza el token
    Dado un usuario conectado con un token que el servidor ya no acepta
    Cuando la pantalla consulta la API y recibe 401
    Entonces vuelve al login con el aviso «Tu sesión expiró»
```

RUT-01 y RUT-02 ([entrada.md](entrada.md)) siguen cubriendo «sin sesión → login»
y «otro rol → su propio inicio».

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| ROL-01 | E2E demo (escritorio y móvil) | `e2e/prb/demo/roles.spec.ts` |
| ROL-02 | E2E real | `e2e/prb/real/roles.spec.ts` |
| ROL-03, ROL-04 | Integración | `backend/test/integracion/roles.test.ts` |
| API-01…04 | Unitaria | `backend/test/autorizacion.test.ts` |
| SES-01 | Unitaria | `frontend/src/lib/token.test.ts` |
| SES-02 | E2E demo | `e2e/prb/demo/roles.spec.ts` |
| SES-03 | E2E real | `e2e/prb/real/roles.spec.ts` |
| SES-04 | E2E real | `e2e/prb/real/roles.spec.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas, antes de cambiar producción:

- SES-03 y SES-04 fallaron por el defecto real: con el JWT vencido o rechazado por
  el servidor, el administrador seguía en `/admin` (el cliente no leía `exp` y
  `/api/health` es pública, así que nunca llegaba un 401).
- SES-02 llegó al login de rebote (401 de MSW) pero sin el aviso «Tu sesión expiró».
- ROL-02 falló para coordinador, instructor y participante: no existían en la base E2E.
- API-01…04 y SES-01 fallaron porque `crearGuard` y `tokenExpirado` no existían.
- ROL-01 pasó desde el inicio (8/8): el frontend ya mostraba solo las opciones de
  cada rol. Queda como prueba de regresión, no como TDD.
- ROL-03 y ROL-04 se escribieron antes de la columna `active`, pero su primera
  ejecución fue ya con la implementación: no se registró su rojo.

**Verde.** Guard `crearGuard` en el backend, columna `active`, `tokenExpirado` y
verificación con `/auth/me` en el cliente. Resultado: backend 19/19 unitarias y
9/9 de integración; frontend 17/17; E2E demo 84/84 (escritorio y móvil); E2E real 11/11.
