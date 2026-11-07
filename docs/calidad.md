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

`e2e.yml` sigue ejecutando las suites de Playwright.

Los tres jobs instalan dependencias con
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

El código no puede obligar a que otra persona revise: lo hace la protección de
rama de GitHub. Un administrador del repositorio la activa una vez en
**Settings → Branches → Add branch ruleset** (o *Add rule*) para `main`:

1. *Require a pull request before merging* → *Required approvals*: **1**.
2. *Dismiss stale pull request approvals when new commits are pushed*.
3. *Require status checks to pass* → añadir **Tipos, build y pruebas** y
   **Entorno con Docker Compose** (aparecen tras la primera ejecución del workflow).
4. *Do not allow bypassing the above settings* si también aplica a administradores.

Con la CLI de GitHub (requiere permisos de administrador):

```bash
gh api -X PUT repos/lovito99/gestioncapa/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Tipos, build y pruebas", "Entorno con Docker Compose"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null
}
EOF
```

La plantilla `.github/pull_request_template.md` recuerda al autor y al revisor
la lista de comprobación (criterio en `docs/esp/`, prueba con ID, rojo → verde).
