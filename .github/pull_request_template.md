## Qué cambia

Jira: <!-- Clave real, por ejemplo SCRUM-123; incluirla también en el título o la rama. -->

<!-- Resumen breve y por qué. Enlaza la especificación (docs/esp/...) y los IDs afectados. -->

Criterios: <!-- p. ej. CFG-01, AMB-02 -->

## Cómo se probó

- [ ] `npm run typecheck` y `npm test` pasan en local
- [ ] Build ejecutado manualmente por el autor: `npm run build`
- [ ] Si toca la base de datos o el seed: `npm run test:integracion` con `docker compose up -d --wait`
- [ ] Si toca pantallas o la API: `npm run e2e` / `npm run e2e:real`

## SDD / BDD / TDD

- [ ] El criterio está escrito en `docs/esp/` (Dado / Cuando / Entonces) antes del cambio
- [ ] La prueba lleva el ID del criterio en su título
- [ ] La prueba falló por el comportamiento esperado antes de implementar (rojo → verde)

## Revisión

- [ ] Otro integrante con permisos de escritura revisó y registró **Approve** en GitHub
- [ ] Los cuatro checks obligatorios están en verde para el último commit
- [ ] Conversaciones resueltas; nueva aprobación si hubo cambios posteriores
- [ ] Sin secretos reales en el código ni en `.env.example`
- [ ] README o docs actualizados si cambia cómo se levanta el entorno

Enlace a la revisión: <!-- URL de la revisión publicada en este PR; un comentario no sustituye Approve. -->

> Integrar solo con los checks «Clave Jira», «Tipos, build y pruebas»,
> «Entorno con Docker Compose» y «E2E demo y real» en verde y la aprobación
> de otro integrante. Configuración y evidencia: [guía de calidad](../docs/calidad.md).
