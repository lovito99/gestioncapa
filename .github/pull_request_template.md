## Qué cambia

<!-- Resumen breve y por qué. Enlaza la especificación (docs/esp/...) y los IDs afectados. -->

Criterios: <!-- p. ej. CFG-01, AMB-02 -->

## Cómo se probó

- [ ] `npm run verificar` pasa en local (typecheck, build y pruebas unitarias)
- [ ] Si toca la base de datos o el seed: `npm run test:integracion` con `docker compose up -d --wait`
- [ ] Si toca pantallas o la API: `npm run e2e` / `npm run e2e:real`

## SDD / BDD / TDD

- [ ] El criterio está escrito en `docs/esp/` (Dado / Cuando / Entonces) antes del cambio
- [ ] La prueba lleva el ID del criterio en su título
- [ ] La prueba falló por el comportamiento esperado antes de implementar (rojo → verde)

## Revisión

- [ ] Sin secretos reales en el código ni en `.env.example`
- [ ] README o docs actualizados si cambia cómo se levanta el entorno

> La integración a `main` requiere la verificación «Tipos, build y pruebas» en verde
> y la aprobación de otro integrante.
