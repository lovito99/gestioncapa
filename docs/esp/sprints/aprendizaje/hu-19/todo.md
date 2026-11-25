# HU-19 · Seguimiento

[Especificación](SPEC.md) · [Plan de implementación](plan.md#hu-19--plan-de-implementación).

- [x] Contrastar la historia con el código y registrar nueve criterios verificables.
- [x] Consultar repositorio, Astryx, npm, GitHub público, MCP y skills.
- [x] Registrar decisiones de reutilización y tareas con dependencias.
- [x] Aprobación de implementación recibida en la conversación.

## Autoría y política

- [x] T1 · Modalidad real en PDF. Verificar participación, QR y descarga histórica (HU19-09).
- [x] T2 · Política por curso. Verificar 14/2, valores anteriores y acceso de administrador (HU19-02).
- [x] T3 · Borrador. Probar autoría y aislamiento por curso e instructor (HU19-01).
- [x] T4 · Publicación. Probar clave única, salida única, política y lecciones fijadas (HU19-01/02/05).
- [x] Punto de verificación 1. Pasan los casos de API y PDF iniciales.

## Avance e intentos

- [x] T5 · Editor y configuración. Probar flujos del instructor y administrador en Vitest (HU19-01/02/05).
- [x] T6 · Avance persistente. Probar pertenencia, reintentos y desbloqueo (HU19-05).
- [x] T7 · Lectura de cuestionario. Verificar permiso, estado y ausencia de clave en la API (HU19-03/05).
- [x] T8 · Entrega y calificación. Probar nota, mejor resultado, saldo y concurrencia (HU19-03/04/06).
- [x] Punto de verificación 2. Pasan autoría, desbloqueo y límite ante dos solicitudes.

## Rendición y certificación

- [x] T9 · Aula y rendición. Probar acceso real, progreso y estado final en la interfaz (HU19-03/04/05/06).
- [x] T10 · Elegibilidad. Probar grabado por inscripción y cierre para cursos con sesiones (HU19-06/07).
- [x] T11 · Emisión. Probar mejor nota, PDF, QR, retención y liberación (HU19-07/08/09).
- [x] Punto de verificación 3. Pasan el flujo de aprobación y las regresiones HU-20, HU-36 y HU-53.
- [x] T12 · «Mis certificados». Probar listado, vista y descarga privada (HU19-08).
- [x] T13 · E2E real, revisión de calidad y seguridad, documentación y preparación de entrega.
- [x] Punto de verificación 4. Registrar pruebas, tipos, lint, seguridad y Definition of Done.
- [x] Ensayar migraciones 0041–0043 y el arranque del backend anterior en una base aislada.
- [ ] Build manual y revisión final del usuario.

## Evidencia de entrega

| Incremento | Regresión y verificación | Summary de commit sugerido |
| --- | --- | --- |
| T1 | Rojo por modalidad fija. Verde para los cuatro textos de modalidad. | `fix: mostrar la modalidad real en los PDF` |
| T2 | Rojo por ruta ausente. Verde para valores predeterminados, nota histórica y rol. | `feat: configurar nota mínima e intentos por curso` |
| T3 | Rojo por ruta ausente. Verde para crear, editar y consultar con el instructor asignado. | `feat: guardar borradores de evaluaciones por curso` |
| T4 | Rojo por publicación ausente. Verde para publicar, validar lecciones y conservar la política. | `feat: publicar evaluaciones con política fija` |
| T5 | Pruebas de formulario y editor en rojo y verde. Chromium verificó la política y la autoría. | `feat: gestionar evaluaciones desde la ficha del curso` |
| T6 | Rojo por falta de avance persistente. Verde para pertenencia, reintentos y desbloqueo. | `feat: registrar el avance de lecciones grabadas` |
| T7 | Rojo por consulta ausente. Verde para proyección sin claves, acceso y rechazo tras revocación. | `feat: servir cuestionarios sin revelar sus claves` |
| T8 | Rojo por entrega ausente. Verde para nota, límite, concurrencia y repetición idempotente. | `feat: calificar intentos y conservar la mejor nota` |
| T9 | Pruebas de aula y rendición en rojo y verde. Chromium verificó recarga y recuperación de un envío sin confirmación. | `feat: rendir evaluaciones y consultar resultados` |
| T10 | Rojo por regla de aprobación ausente. Verde para avance, nota, asistencia y evaluación individual. | `feat: evaluar inscripciones para certificar la aprobación` |
| T11 | Rojo por título y nota ausentes. Verde para emisión, retención, corrección y QR. | `feat: emitir certificados de aprobación con nota` |
| T12 | Rojo por falta de listado y nota. Verde para «Mis certificados», descarga y privacidad. | `feat: mostrar los certificados privados del colegiado` |
| T13 | Playwright real recorrió la autoría, notas de 10 y 20, emisión, descarga y verificación anónima. | `test: validar de extremo a extremo las evaluaciones` |

- `npm test`: 545 backend, 183 Vitest y 7 del servidor frontend. Tras el
  ajuste final de privacidad y los casos nuevos de concurrencia y pago previo,
  pasaron 22 pruebas focales frontend y 12 integraciones de HU-19.
- Integración completa en PostgreSQL y Redis aislados: 415 pruebas aprobadas.
  La resolución de `tsx` para un subproceso que parte de la raíz usó un
  preludio temporal, porque el entorno local tiene `tsx` en el workspace backend.
- Typescript de ambos workspaces y de Playwright aprobado. Lint frontend
  aprobado con avisos previos en `pdfTexto.ts` y `CursosPagina.tsx`.
- Playwright real HU-19 aprobado. Regresión demo del aula grabada aprobada en
  escritorio y móvil. Se inspeccionaron modalidad y nota en el PDF y se
  decodificó el destino del QR.
- Revisión de permisos, proyecciones, caché, validación, SQL parametrizado,
  concurrencia, pagos y datos privados contra Definition of Done y Security
  Checklist. Se corrigió el estado de la interfaz cuando se revoca el acceso.
  `npm audit --omit=dev` devolvió cero avisos sobre el lockfile local. El
  repositorio no versiona un lockfile autoritativo.
- Base local `v3.1.0.0.1`. Versión funcional propuesta `v3.2.0.0.0`.
  Las operaciones de Git, el build y la aprobación de una emisión oficial
  con firma institucional quedan pendientes.

## Retorno de aplicación ensayado

En una base temporal con la migración 0043 aplicada se inició el backend de
`81270ca` conservando los archivos SQL 0041–0043. El servicio respondió 200
en `/api/health`. Un rollback de aplicación debe conservar esos SQL, porque
la verificación de arranque contrasta cada migración aplicada con su archivo.
Esto preserva intentos, avance y certificados. Verificar salud, historial y
descarga después de restaurar la versión anterior. Durante una publicación,
seguir el estado de las rutas de rendición, los conflictos de negocio y la
entrega de certificados desde el registro operativo sin incluir claves ni notas.
