# ADR-002: Capas globales con carpetas por componente en el backend

## Estado

**Aceptada** por el usuario el 24/11/2026 (T-26). Aplicada a los 15 componentes del
backend. Sustituye la primera versión de esta decisión (capas dentro de cada
módulo), que el usuario cambió ese mismo día tras ver los pilotos.

## Contexto

Los módulos del backend mezclaban responsabilidades: había SQL y transacciones en
las rutas (`usuarios.rutas.ts` tenía 20 consultas), consultas en los servicios y
reglas en los repositorios. Además había cinco ayudantes de transacción duplicados,
cuatro clases de error equivalentes, nombres mezclados (`rutas`/`routes`,
`servicio`/`service`) y ciclos entre `cursos`, `clases` y `pagos`. Como cada módulo
importaba el `pool` global, ninguna regla podía probarse sin PostgreSQL.

## Decisión

- Carpetas globales por capa en `backend/src` (`controllers`, `dto`, `services`,
  `repositories`, `entities` y, para integraciones externas, `providers`), cada
  una con una subcarpeta por componente. Carpetas en inglés y código en español.
- `routes/<componente>.routes.ts` registra el controlador y compone sus dependencias.
- Inyección de dependencias con funciones fábrica (`crearXService(deps)`), sin
  contenedor ni decoradores.
- Los rechazos de reglas se lanzan como `ErrorAplicacion` y los responde el
  manejador global; `ErrorPago` hereda de él y `ErrorCertificado` y `ErrorHistorial`
  desaparecen.
- Las reglas de dependencia se verifican con una prueba `node:test` sin dependencias nuevas.

## Alternativas descartadas

- **Capas dentro de cada módulo** (`modules/<m>/{controllers,…}`): fue la primera
  versión. El usuario prefirió ver cada capa reunida en una sola carpeta global.
- **`awilix` / `@fastify/awilix`** (MIT): para este tamaño, la composición explícita
  es más legible y no añade paquetes.
- **`inversify` / `tsyringe`**: requieren decoradores y `reflect-metadata`.
- **`fastify-type-provider-zod`**: cambia el formato de los errores de validación
  y rompería el contrato `422 VALIDACION`.
- **`@fastify/autoload`**: haría implícito el orden de registro del que depende `app.ts`.
- **`dependency-cruiser`** (MIT, 18 dependencias): queda propuesto, con autorización
  previa, para detectar ciclos en todo el backend.

## Consecuencias

- Los servicios tienen pruebas unitarias con repositorios en memoria; las pruebas
  de integración existentes verificaron que el contrato HTTP no cambió.
- Los rechazos pasan por el manejador global, que añade una línea de registro
  `info` con el código de la regla (antes algunas rutas respondían sin registrarlo).
- Las operaciones con invariantes bajo bloqueo siguen siendo una transacción del
  repositorio; el servicio decide y el repositorio consulta y escribe.
- Las semillas de demostración viven en `src/seeds/` y los procesos periódicos en `src/jobs/`.
