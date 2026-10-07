# Especificación: calidad, configuración y entorno local

## Alcance y decisiones

Objetivo: compilar, revisar y ejecutar pruebas de forma repetible para detectar
defectos antes de la demo, y garantizar que cualquier integrante puede levantar
el entorno.

- **SDD**: este archivo define el comportamiento antes de cambiar producción.
- **BDD**: cada criterio se escribe como escenario Gherkin (Dado / Cuando /
  Entonces). El ID del escenario aparece en el título de su prueba.
- **TDD**: cada escenario automatizable tiene una prueba que se ejecutó primero
  en rojo y luego en verde (ver «Ciclo aplicado»).

Decisiones:

- Son **requeridas** (sin valor por defecto) las variables que conectan con
  servicios o protegen datos: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
  `REDIS_URL`, `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. El resto conserva
  valores por defecto seguros (`PORT`, `HOST`, `LOG_LEVEL`, `TZ`…).
- Un **valor de ejemplo** es un marcador que contiene `CAMBIA` (sin distinguir
  mayúsculas), como los de `backend/.env.example`. Se rechaza en cualquier
  entorno. Las credenciales locales de Postgres y Redis no son marcadores: son
  los valores reales del `docker-compose.yml` de desarrollo.
- Una variable vacía (`JWT_SECRET=`) cuenta como ausente.
- Los usuarios demo (coordinador, instructor y participantes, clave `demo123`)
  solo se siembran fuera de `production`. En producción el seed crea únicamente
  el administrador de `ADMIN_EMAIL`.
- La revisión de otro integrante se exige con la protección de rama de GitHub
  (1 aprobación + verificación «Calidad» obligatoria). Es una configuración del
  repositorio, no de código: ver `docs/calidad.md`.

## Criterios de aceptación

```gherkin
# language: es
Característica: Calidad repetible antes de integrar

  Escenario: CAL-01 Un Pull Request solo se integra con tipos, build y revisión correctos
    Dado un cambio que abre un Pull Request hacia main
    Cuando GitHub Actions ejecuta "npm run typecheck" y "npm run build"
    Entonces ambos pasan sin errores
    Y las pruebas unitarias de backend y frontend pasan
    Y otro integrante aprobó el código antes de integrarlo

  Escenario: CAL-02 La misma verificación se repite en local
    Dado un integrante con las dependencias instaladas
    Cuando ejecuta "npm run verificar"
    Entonces se ejecutan typecheck, build y pruebas unitarias en ese orden
    Y el comando falla si cualquiera de ellos falla

Característica: Configuración validada al arrancar

  Escenario: CFG-01 Variable requerida ausente
    Dado que falta JWT_SECRET en el entorno
    Cuando el servidor intenta arrancar
    Entonces termina con código 1 antes de abrir el puerto
    Y el mensaje nombra "JWT_SECRET" e indica que falta

  Escenario: CFG-02 Variable requerida con el valor de ejemplo
    Dado que ADMIN_PASSWORD contiene el marcador de .env.example
    Cuando se valida la configuración
    Entonces falla indicando que "ADMIN_PASSWORD" tiene el valor de ejemplo

  Escenario: CFG-03 Variable vacía
    Dado que DB_PASSWORD está definida pero vacía
    Cuando se valida la configuración
    Entonces falla indicando que "DB_PASSWORD" falta

  Escenario: CFG-04 Varios problemas a la vez
    Dado que faltan varias variables y otra tiene formato inválido
    Cuando se valida la configuración
    Entonces el mensaje lista todas las variables con problemas, una por línea
    Y no muestra los valores de los secretos

  Escenario: CFG-05 Configuración completa
    Dado un entorno con todas las variables requeridas y valores propios
    Cuando se valida la configuración
    Entonces devuelve la configuración tipada con los valores por defecto aplicados

  Escenario: CFG-06 Generar un .env local sin marcadores
    Dado un integrante sin backend/.env
    Cuando ejecuta "npm run env:init"
    Entonces se crea backend/.env a partir de .env.example
    Y JWT_SECRET y ADMIN_PASSWORD reciben valores aleatorios válidos
    Y si backend/.env ya existía no se sobrescribe

Característica: Entorno local reproducible

  Escenario: AMB-01 Servicios con Docker Compose
    Dado un integrante nuevo que clonó el repositorio y siguió el README
    Cuando ejecuta "docker compose up -d --wait"
    Entonces PostgreSQL 17 y Redis 8 quedan saludables

  Escenario: AMB-02 Seed de usuarios
    Dado los servicios de Docker Compose activos y backend/.env generado
    Cuando ejecuta "npm run migrate" y "npm run seed"
    Entonces existen el administrador y un usuario por cada rol del Sprint 1
    Y cada uno puede autenticarse en /api/auth/login con su rol

  Escenario: AMB-03 Seed idempotente
    Dado que el seed ya se ejecutó
    Cuando se ejecuta otra vez
    Entonces termina sin error y no duplica usuarios

  Escenario: AMB-04 Producción no recibe usuarios demo
    Dado NODE_ENV=production
    Cuando se calculan los usuarios del seed
    Entonces solo se incluye el administrador
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| CAL-01 | CI | `.github/workflows/calidad.yml` + protección de rama |
| CAL-02 | Script | `npm run verificar` (raíz) |
| CFG-01 | Proceso | `backend/test/arranque.test.ts` |
| CFG-02…05 | Unitaria | `backend/test/env.test.ts` |
| CFG-06 | Unitaria | `backend/test/env-init.test.ts` |
| AMB-01 | CI | job `entorno` de `.github/workflows/calidad.yml` |
| AMB-02, AMB-03 | Integración | `backend/test/integracion/seed.test.ts` |
| AMB-04 | Unitaria | `backend/test/usuarios-seed.test.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Se escribieron este archivo y las pruebas antes de cambiar producción.
CFG-01 falló por el defecto real: sin `JWT_SECRET` el servidor usaba el valor por
defecto, seguía arrancando y terminaba con un error ajeno de Redis
(`NOAUTH Authentication required`), sin nombrar la variable. Las pruebas de
CFG-02…06 y AMB-02…04 fallaron porque `parseEnv`, `generarEnv` y `usuariosSeed`
no existían. Un primer intento de CFG-01 falló por no encontrar `tsx` desde la
carpeta temporal; se corrigió la prueba para que el rojo fuera por comportamiento.

**Verde.** Se separó la validación en `env.schema.ts` (pura, probada) y la carga en
`env.ts` (imprime y sale con código 1). Tras ajustar el mensaje de «falta» de Zod 4:
13/13 unitarias en verde. AMB-01…03 se ejecutaron contra una copia aislada de
`docker-compose.yml` (PostgreSQL 17.10, Redis 8.10): 6/6 de integración en verde,
con el seed ejecutado dos veces. Regresión: `npm run verificar` y `npm run e2e:real`
(5/5) en verde.
