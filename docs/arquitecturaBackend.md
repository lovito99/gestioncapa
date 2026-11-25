# Arquitectura del backend por capas

El backend separa sus responsabilidades en **carpetas globales por capa** dentro de
`backend/src`, con una subcarpeta por componente, siguiendo MVC y SOLID. La decisión
y sus alternativas están en [ADR-002](decisions/002-capasBackend.md); la
especificación, en la sección T-26 de [SPEC.md](../SPEC.md).

En una API JSON, el **modelo** son las entidades, los servicios y los repositorios;
la **vista**, la forma JSON de la respuesta (DTO de salida); y el **controlador**,
los manejadores de Fastify. `routes/` registra cada controlador y compone sus
dependencias.

## Estructura

```
backend/src/
  controllers/<componente>/   HTTP: lee la solicitud, valida con el DTO, llama al servicio y responde
  dto/<componente>/           esquemas Zod de entrada, tipos inferidos y forma de salida
  services/<componente>/      reglas y casos de uso; reciben sus dependencias por parámetro
  repositories/<componente>/  SQL con pg y Redis, sin reglas de presentación ni Fastify
  entities/<componente>/      tipos de dominio y cálculos puros, sin dependencias
  providers/<componente>/     integraciones externas: SMTP, JWT de Jitsi, pasarelas, PDF, imágenes
  routes/<componente>.routes.ts  raíz de composición: repositorio → servicio → controlador
  plugins/                    autorización, permisos, errores, HTTP y acceso a sesiones
  shared/                     base de datos, transacción, errores de aplicación, validación, Redis, PDF
  config/                     variables de entorno validadas
  seeds/                      datos de demostración (no forman parte de la ejecución)
  jobs/                       procesos periódicos de cobro, correo y constancias
  scripts/                    comandos de mantenimiento (migraciones, seed, demos E2E)
```

Componentes: `asistencia`, `auth`, `certificados`, `clases`, `cursos`, `health`,
`historial`, `jitsi`, `notificaciones`, `pagos`, `pendientes`, `qr`, `reuniones`,
`usuarios`. No todos necesitan todas las capas: `qr` solo tiene servicio y entidad;
`pendientes`, solo controlador.

Nombres: carpetas de capa en inglés; archivos en `camelCase` sin guiones bajos
(`usuariosController.ts`, `usuarioDto.ts`, `usuariosService.ts`,
`usuariosRepository.ts`, `usuario.ts`). Funciones, variables y mensajes en español.
Las columnas SQL conservan su nombre y se convierten con alias.

## Reglas de dependencia

`backend/test/arquitectura.test.ts` comprueba estas reglas en cada componente
(`npm test -w backend`).

| Capa | Puede importar | No puede importar |
|---|---|---|
| controllers | `fastify`, dto, services, entities, shared, tipos de plugins | repositories, providers, `pg`, `shared/database`, config |
| services | entities, dto, otros services, shared (salvo database), módulos `node:`; solo tipos de repositories, providers y plugins | paquetes externos, `fastify`, `pg`, `shared/database`, config, routes |
| repositories | `pg`, módulos `node:`, `shared/database`, shared, entities, otros repositories | `fastify`, services, controllers, dto, providers, config |
| dto | `zod`, entities, otros dto, shared (salvo database) | todo lo demás |
| entities | solo tipos de otras entidades | todo lo demás |
| providers | paquetes externos (salvo `fastify` y `pg`), entities, providers, shared (salvo database) | services, repositories, controllers, dto, config |

Solo `routes/` conoce `env`, el pool y las implementaciones concretas. Cuando una
configuración puede cambiar en ejecución, se pasa el objeto `env` (no una copia)
y el servicio lo lee en cada uso.

## Piezas comunes

- `shared/errorAplicacion.ts`: `ErrorAplicacion(status, code, message, extra)` se
  responde como `{ code, message, ...extra }`; `errorDeEstado(status)` produce la
  respuesta uniforme de ese estado (por ejemplo, 409 `ESTADO_NO_PERMITIDO`).
- `shared/errorPago.ts`: `ErrorPago` hereda de `ErrorAplicacion` y conserva `statusCode`.
- `shared/transaccion.ts`: `conTransaccion(pool, operacion)` confirma, revierte y
  siempre libera el cliente.
- `shared/database.ts`: `pool`, `Consultor` (pool o cliente en transacción) y
  `esViolacionUnica` para traducir el error 23505.

Las operaciones que deben comprobar invariantes bajo bloqueo (inscripción, cobro,
transferencias, emisión de constancias) se ejecutan en una transacción abierta por
el repositorio; el servicio decide las reglas y el repositorio solo consulta y escribe.

## Cómo aplica SOLID

- **Responsabilidad única:** HTTP, regla, SQL, integración externa y forma de datos viven en capas distintas.
- **Abierto/cerrado:** un componente nuevo se añade con sus carpetas, su `routes/<componente>.routes.ts` y una línea en `app.ts`.
- **Sustitución de Liskov:** los repositorios en memoria de las pruebas cumplen el mismo tipo que los reales.
- **Segregación de interfaces:** cada repositorio expone las operaciones de su componente; las que requieren transacción se agrupan aparte.
- **Inversión de dependencias:** los servicios dependen de tipos y reciben las implementaciones en `crearXService(deps)`.

## Plantilla para un componente nuevo

1. Añade el nombre a `componentesEnCapas` en `backend/test/arquitectura.test.ts`.
2. Define `entities/<c>/` y `dto/<c>/`.
3. Escribe la prueba unitaria del servicio con un repositorio en memoria y comprueba que falla.
4. Implementa `repositories/<c>/` y `services/<c>/` (`crearXService({ repositorio, ... })`).
5. Escribe `controllers/<c>/` (`xController(servicio): FastifyPluginAsync`) y `routes/<c>.routes.ts`.
6. Registra el componente en `app.ts` y cada ruta en `plugins/permisos.ts`.
7. Añade su prueba de integración en `backend/test/integracion/`.

```ts
// services/ejemplo/ejemploService.ts
export function crearEjemploService({ repositorio }: { repositorio: EjemploRepository }) {
  return {
    async obtener(id: number) {
      const ejemplo = await repositorio.obtener(id);
      if (!ejemplo) throw new ErrorAplicacion(404, "EJEMPLO_NO_EXISTE", "El ejemplo no existe.");
      return ejemplo;
    }
  };
}

// routes/ejemplo.routes.ts
export const registrarEjemplo = ejemploController(crearEjemploService({ repositorio: crearEjemploRepository(pool) }));
```

## Pendiente

- Valorar `dependency-cruiser` para detectar ciclos en todo el backend (requiere autorización para instalarlo).
- `findUserById` devuelve el id de pg como texto aunque su tipo diga number; corregirlo cambia `/api/auth/me` y requiere su propia tarea.
- Los artefactos de `.archify/` citan rutas anteriores a esta estructura.
