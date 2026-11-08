# Calidad antes de integrar

Especificación: [docs/esp/calidad.md](esp/calidad.md) (criterios CAL, CFG y AMB).

## Comandos

| Comando | Qué hace | Servicios |
|---|---|---|
| `npm run verificar` | typecheck → build → pruebas unitarias (se detiene en el primer fallo) | No |
| `npm test` | Pruebas unitarias de backend (`node:test`) y frontend (Vitest) | No |
| `npm run test:integracion` | Roles, clases, inscripciones, asistencia y migraciones contra Postgres y Redis reales | Sí |
| `npm run test:cobertura` | Cobertura de asistencia: mínimo 60 % de líneas, ramas y funciones | Sí |
| `npm run e2e` / `npm run e2e:real` | Recorridos en navegador ([guía](e2e.md)) | Real: sí |

Las pruebas del backend están en `backend/test/`. Las de `backend/test/integracion/`
necesitan `docker compose up -d --wait` y un `backend/.env` válido.

La compilación local se ejecuta manualmente. Las comprobaciones de tipos y
pruebas pueden ejecutarse por separado; `npm run verificar` también compila,
por lo que no debe usarse cuando se desea dejar ese paso manual.

## En cada Pull Request

`.github/workflows/calidad.yml` ejecuta dos jobs:

- **Tipos, build y pruebas** (CAL-01): `npm run typecheck`, `npm run build` y `npm test`.
- **Entorno con Docker Compose** (AMB-01…03): repite los pasos del README de un
  integrante nuevo: `docker compose up -d --wait`, `npm run env:init`, `migrate`,
  `seed` dos veces, `npm run test:integracion` y `npm run test:cobertura`.

`e2e.yml` ejecuta las suites de Playwright en el job **E2E demo y real**.

El job **Clave Jira** valida que el título o la rama del PR contenga una clave
como `SCRUM-123`. Se vuelve a ejecutar al editar el PR, incluso sin commits
nuevos. No verifica la existencia de la incidencia en Jira. La clave real de
T-20 debe confirmarse en Jira; `T-20` es el identificador de esta tarea y no
se presupone que sea la clave del proyecto. No reutilizar `SCRUM-103`: esta
tarea reemplaza esa subtarea.

Los tres jobs de pruebas instalan dependencias con
`npm install --include=dev --include=optional --package-lock=false`, ya que el
proyecto no versiona `package-lock.json`. En `actions/setup-node` se establece
`package-manager-cache: false` y no se configura `cache: npm`: la caché necesita
un lockfile para calcular su clave. `npm ci` también necesita un lockfile y no
debe usarse con esta convención. Sin un lockfile versionado, las versiones
resueltas pueden variar dentro de los rangos de `package.json`.

La anotación `Dependencies lock file is not found` indica un fallo en la
preparación de Node, antes de ejecutar tipos, build o pruebas. Tras subir los
workflows corregidos a la rama del PR, debe ejecutarse el nuevo commit. Repetir
el job de un commit anterior vuelve a utilizar el workflow anterior.

## Revisión obligatoria (configuración única del repositorio)

La protección se configura en GitHub; guardar los workflows no la activa.
En [Settings → Branches](https://github.com/lovito99/gestioncapa/settings/branches),
un administrador debe crear o actualizar la regla clásica para el patrón exacto
`main` (no confundirla con un ruleset):

1. Activar **Require a pull request before merging**, con **1** aprobación.
2. Activar **Dismiss stale pull request approvals when new commits are pushed**.
3. Activar **Require status checks to pass before merging** y **Require branches
   to be up to date before merging**. Seleccionar los cuatro checks:
   **Clave Jira**, **Tipos, build y pruebas**, **Entorno con Docker Compose** y
   **E2E demo y real**, procedentes de GitHub Actions.
4. Activar **Require conversation resolution before merging** y **Do not allow
   bypassing the above settings**, también para administradores.
5. Mantener desactivados **Allow force pushes** y **Allow deletions**. No habilitar
   actores autorizados a omitir los PR ni excepciones de bypass.

Los checks deben haber aparecido en una ejecución reciente para poder
seleccionarlos. Publicar primero la rama de esta tarea y abrir el PR manualmente;
comprobar los nombres que muestra GitHub antes de guardar la regla. No fusionar
ese PR hasta activar la protección y conseguir la aprobación humana.

La aprobación debe publicarla otro integrante con permisos de escritura desde
**Files changed → Review changes → Approve → Submit review**. Un comentario,
una casilla marcada o una revisión de bot no sustituyen esa aprobación. Si hay
cambios posteriores, repetir la revisión. La plantilla del PR solicita el enlace
a la revisión; la regla de GitHub es la que impide integrar sin ella.

Referencia: [protección de ramas de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Diagnóstico y evidencia de T-20

Objetivo: todos los cambios a `main` mediante PR, aprobación de otro integrante,
clave Jira en título o rama y workflows Calidad y Pruebas E2E en verde.
Reemplaza a la subtarea SCRUM-103. Estimación pendiente de Planning Poker.

Consulta pública realizada el 7 de noviembre de 2026:

- La API de `branches/main` informó `protected: false`. No se ha activado la
  protección desde esta tarea; la consulta de su configuración devolvió `401`
  sin autenticación de administrador.
- Ambos workflows ya tenían `pull_request` sin filtros de rutas o ramas.
- [Calidad 42435380416](https://github.com/lovito99/gestioncapa/actions/runs/42435380416)
  y [E2E 42435380406](https://github.com/lovito99/gestioncapa/actions/runs/42435380406)
  registraban `success`; son antecedentes, no validación de estos cambios.
- [Calidad 42438264586](https://github.com/lovito99/gestioncapa/actions/runs/42438264586)
  falló en **Pruebas de integración del seed**, después de instalar dependencias
  y arrancar servicios. No es `startup_failure`. Revisar ese log antes de
  integrar; no omitir las pruebas ni reducir los checks para obtener verde.
- Las revisiones consultadas de los PR #22 y #23 eran comentarios de bot;
  no acreditan aprobación de otro integrante.

Para cerrar T-20, adjuntar a Jira evidencia real del PR que publique estos cambios:

- Captura de la regla guardada para `main`, con aprobación, cuatro checks y
  prohibición de bypass visibles. Verificar de nuevo `protected: true`.
- URL del PR con la clave Jira real en el título o rama y URL de la revisión
  **Approved** de otro integrante, válida para el último cambio.
- Enlaces a las ejecuciones de `calidad.yml` y `e2e.yml` del último commit del PR,
  ambas con conclusión `success`, con todos los jobs de pruebas ejecutados.
- Build local ejecutado manualmente por el autor y estimación de Planning Poker.

No marcar estos puntos como completados con enlaces a PR antiguos ni con una
captura de una regla todavía sin guardar. Si una ejecución indica
`startup_failure`, revisar el diagnóstico de la ejecución y de la check suite:
[referencia de estados](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/reference/status-checks).
Ese estado indica un fallo al iniciar la suite, no una prueba fallida; no permite
atribuir una causa concreta sin las anotaciones o logs correspondientes.
