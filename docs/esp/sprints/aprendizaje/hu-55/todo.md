# HU-55 · Seguimiento

[Especificación](SPEC.md) · [Plan](plan.md) · [Sprint Aprendizaje](../sprint.yml)

## Fase de especificación y planificación

- [x] Revisar el flujo de avance de HU-17, de salida de HU-19 y de lecciones de HU-37.
- [x] Definir casos de aceptación, supuesto sobre YouTube y límites de acceso.
- [x] Consultar repositorio, Astryx, npm, GitHub, inventario MCP y skills locales.
- [x] Documentar capacidades, decisiones de reutilización, canales no disponibles y dependencias del trabajo.
- [x] Aprobación del alcance y la planificación.

## Implementación y revisión

- [x] T1 · Lista en orden con candado, duración y título de la lección requerida.
- [x] T2 · Consulta individual con 403 y proyecciones de fuentes restringidas.
- [x] T3 · Misma autorización en reproducción y progreso.
- [x] T4 · Umbral del 90 %, recarga, enlace interno y autorización con lista anterior.
- [x] T5 · Salida oficial bloqueada hasta completar las lecciones requeridas.
- [x] T6 · Regresión completa, cuatro recorridos de Chromium y revisión de calidad y seguridad.
- [x] Mantener las pruebas y la fixture nuevas en la exclusión local de Git.
- [ ] El usuario prepara los commits con los mensajes del plan o con el resumen de la entrega completa.
- [ ] Build manual por el usuario antes de la entrega funcional.

## Evidencia de especificación y planificación

- Backend: `node --import tsx --test test/arquitectura.test.ts test/certificadosReglas.test.ts`,
  desde `backend`, 32 pruebas existentes aprobadas.
- Frontend: `npm exec --offline -w frontend -- vitest run src/paginas/cursos/evaluaciones/evaluaciones.test.tsx src/paginas/cursos/evaluaciones/rendicion.test.tsx`,
  6 pruebas existentes aprobadas en 2 archivos.
- Documentación: manifiesto YAML válido, 18 enlaces locales comprobados,
  5 criterios vinculados a 6 tareas y `git diff --check` sin observaciones.
- Esas pruebas establecen una línea base, antes de implementar la historia.
  El build no aplica al cambio documental.

## Evidencia de implementación

| Tarea | Rojo observado | Verde y revisión |
| --- | --- | --- |
| T1 | El resumen carecía de `bloqueo` y la fila permitía abrir la lección posterior. | PostgreSQL y Vitest comprobaron orden entre módulos, primer requisito pendiente y fecha histórica conservada. |
| T2 | La consulta individual devolvía 404 porque faltaba la ruta. | PostgreSQL comprobó 403 con el requisito y sin fuentes, ausencia de fuentes en proyecciones del alumno y conservación de la vista del instructor. |
| T3 | La reproducción de una lección bloqueada iniciaba una sesión. | Inicio y reporte bloqueados devuelven 403 sin registrar sesión ni progreso. |
| T4 | Playwright no encontraba una consulta de lección al abrir el enlace directo. Vitest también detectó que el listado anterior impedía abrir una lección recién autorizada. | PostgreSQL comprobó el límite exacto de 1799/2000 y 1800/2000 ms, incluida una consulta simultánea. Vitest verificó que el detalle autorizado prevalece. Chromium verificó el acceso por enlace, la apertura con teclado y la recarga. |
| T5 | El cuestionario se mostraba disponible al completar solo el requisito de la lista publicada. El reenvío histórico inicialmente devolvía 409. | PostgreSQL verificó el bloqueo en listado, detalle e intento nuevo, su levantamiento tras la última lección y la recuperación idempotente de un resultado anterior. |

La revisión aplicó `definition-of-done.md` y `security-checklist.md`.
Incluyó autenticación e inscripción, pertenencia del material al curso,
consulta de otro titular, caché privada, campos divulgados, transacciones
y ausencia de efectos en solicitudes rechazadas. Se añadieron verificaciones
para los hallazgos de duración, estado anterior de la lista y reenvío histórico.
`npm audit --audit-level=high` informó cero vulnerabilidades.

- `npm run typecheck` pasó en backend y frontend.
- `npm test` pasó con 650 pruebas de backend, 195 de frontend y 7 del
  servidor frontend.
- La suite completa de integración pasó 489/489 con PostgreSQL y Redis.
  Se ejecutó en una base nueva y con resolución local del `tsx` instalado
  en `backend`. Eso permitió que el subproceso de la prueba HU53-07, que
  arranca en la raíz, encontrara esa dependencia sin modificar el repositorio.
- Chromium pasó cuatro recorridos en `npm run e2e:real`: HU-17, HU-19,
  HU-37 y HU-55. HU-55 reprodujo material de prueba con backend real. HU-37
  usó el proveedor simulado de YouTube de `e2e/ayud/youtubeE2e.mjs`.
- `npm run lint -w frontend` terminó con dos avisos preexistentes en
  `pdfTexto.ts` y `CursosPagina.tsx`.

Para publicar, ejecutar el build manual, preparar los commits y coordinar la
entrega de backend y frontend. Validar en el entorno de verificación un curso
medido con dos lecciones y salida publicada. Ante una reversión, volver ambas
piezas a la versión previa para restaurar el contrato de listados
conservando el avance y los intentos persistidos.
