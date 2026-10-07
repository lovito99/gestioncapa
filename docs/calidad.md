# Calidad antes de integrar

Especificación: [docs/esp/calidad.md](esp/calidad.md) (criterios CAL, CFG y AMB).

## Comandos

| Comando | Qué hace | Servicios |
|---|---|---|
| `npm run verificar` | typecheck → build → pruebas unitarias (se detiene en el primer fallo) | No |
| `npm test` | Pruebas unitarias de backend (`node:test`) y frontend (Vitest) | No |
| `npm run test:integracion` | Seed y login de cada rol contra Postgres y Redis reales | Sí |
| `npm run e2e` / `npm run e2e:real` | Recorridos en navegador ([guía](e2e.md)) | Real: sí |

Las pruebas del backend están en `backend/test/`. Las de `backend/test/integracion/`
necesitan `docker compose up -d --wait` y un `backend/.env` válido.

## En cada Pull Request

`.github/workflows/calidad.yml` ejecuta dos jobs:

- **Tipos, build y pruebas** (CAL-01): `npm run typecheck`, `npm run build` y `npm test`.
- **Entorno con Docker Compose** (AMB-01…03): repite los pasos del README de un
  integrante nuevo: `docker compose up -d --wait`, `npm run env:init`, `migrate`,
  `seed` dos veces y `npm run test:integracion`.

`e2e.yml` sigue ejecutando las suites de Playwright.

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
