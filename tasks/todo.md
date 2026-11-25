# Seguimiento CPPP

## Etapa 1
- [x] Identidad: título e insignia de la pestaña, rol visible Agremiado, documentación institucional.
- [x] Catálogo público paginado: solo publicados de la organización CPPP configurada, sin materiales ni datos de inscritos.
- [x] Revocación del token al salir, conservando otras sesiones del mismo usuario.
- [x] Bloqueo de 15 minutos tras cinco accesos fallidos y límite de peticiones por usuario.
- [x] Pruebas de API, permisos y navegador Chromium; tipos y documentación.
- [ ] Build: ejecución manual por el usuario.

## Etapas siguientes
- [ ] Etapa 2: padrón, recuperación, perfiles, usuarios y sedes.
- [ ] Etapa 3: formación, categorías, reprogramación y notificaciones.
- [ ] Etapa 4: aprendizaje y evaluaciones.
- [ ] Etapa 5: pagos y comprobantes.
- [ ] Etapa 6: certificación y auditoría.
- [ ] Etapa 7: videoconferencia propia y asistencia virtual.
- [ ] Etapa 8: consulta, reportes y operación.

No se cambia el estado de una etapa por tener únicamente una pantalla demo.

## Evidencia de esta entrega

- Tipos de backend/frontend aprobados; sin ejecutar build.
- 255 pruebas unitarias backend y 55 frontend, más 3 del servidor frontend.
- 215 pruebas de integración aprobadas en una base temporal aislada.
- 29 recorridos Chromium: catálogo público (dos a 360 px y uno con backend real), acceso y navegación.
- Mutación comprobada: cambiar el bloqueo al sexto fallo hace fallar la prueba.
- Lint frontend: sin errores, con dos advertencias preexistentes (regex en pdfTexto y estado en efecto del catálogo).
- Pendientes: build manual, revisión humana del PR y matriz completa de navegadores.


## T-23: adaptación y evidencia

- [x] Documentar cambio de enfoque, vocabulario y compatibilidad del Sprint 1.
- [x] Corregir el mapa de la portada pública y los nombres visibles de roles en documentación vigente.
- [x] Registrar prioridades de los sprints 2 y 3 sin inventar fechas o puntos.
- [x] Distinguir integración real, demostración y evidencia externa pendiente.
- [ ] Validar correspondencia del original Figma con la copia usada por el frontend.
- [ ] Adjuntar evidencia del backlog y Planning Poker del Lab 5.
- [x] Incorporar reglas HU-20 v2 delegadas al equipo; firmas oficiales pendientes.

Esta entrega de T-23 modifica documentación; las pruebas de la etapa 1 registradas
arriba corresponden a la entrega anterior, no se atribuyen a nuevas funciones.


Verificación documental de T-23: 55 enlaces locales comprobados, referencias a
código/pruebas existentes y alcance de sprints revisados; `git diff --check` sin
errores. No se ejecutaron pruebas funcionales nuevas ni build porque todos los
cambios de esta entrega son Markdown. No se modificaron versiones ni Git.


## HU-50

- [x] Registro persistente, rol fijado por servidor, unicidad, bcrypt y auditoría atómica.
- [x] Validación en español, conservación de datos y recuperación asistida.
- [x] Formulario y flujo demo/real a 360 px con teclados numéricos.
- [ ] Aplicar migraciones en el entorno de entrega y ejecutar build manual.

La recuperación automática por correo, el padrón y el docente externo quedan fuera
de esta entrega.


## HU-16

- [x] Confirmación gratuita y reserva pagada persistente, sin duplicados ni exceso de cupos.
- [x] Estado consistente en detalle, Mis cursos, historial y PDF.
- [x] Conservar inscripción manual y estados históricos.
- [ ] Migración 0012 y build en el entorno de entrega: ejecución manual.

HU-33 y HU-32 quedan fuera de esta entrega.

## HU-35 · Roles y entidad única del CPPP

<<<<<<< Updated upstream
- [x] Roles administrador, instructor y agremiado en API, interfaz y demo.
- [x] Migraciones nuevas de roles y retirada de multiorganización conservando relaciones.
- [x] Instructor asignado consulta asistencia; otros instructores reciben 403.
- [x] Gestión administrativa de usuarios con bcrypt, cambios de rol y auditoría.
- [x] Correos CPPP y sustitución de sesión/reunión de extintores.
- [x] Tipos, 329 pruebas unitarias, 239 integraciones y recorridos reales de roles/usuarios verificados.
- [ ] Respaldo/restauración, build, migración y Git/PR manuales en el entorno de entrega.
=======
## HU-20 (Sprint 2, demostración)

- [x] Emisión presencial por 80 %, cierre transaccional y código estable.
- [x] PDF con logo, DNI oculto, QR, fuentes locales y firmas genéricas identificadas.
- [x] Verificación pública mínima; documento/archivo solo para titular o administrador.
- [x] Excepción, anulación y corrección con actor, fecha y motivo auditados.
- [x] Recorrido real a 360 px y contraste del QR renderizado en PDF.
- [ ] Migración 0013 y build del entorno de entrega: ejecución manual.
- [ ] Firmas auténticas y plantilla oficial; reglas de los sprints 3–5.

## HU-34 · Horas acumuladas

- [x] Total de certificados válidos con horas de la instantánea y compatibilidad histórica.
- [x] Exclusión de anulados/reemplazados y desglose por año de emisión en Lima.
- [x] Historial con todos los años por defecto, filtro anual y mensaje de cero horas.
- [x] Resumen PDF con total y desglose anual; pruebas unitarias, API y navegador.
- [ ] Build y entrega Git/PR manual del usuario.
>>>>>>> Stashed changes
<<<<<<< Updated upstream
=======

---

## T-20: main protegida, CI por PR y revisión registrada

Estado: **especificación y plan propuestos; implementación pendiente de aprobación**.
Fecha: 14/11/2026. [Especificación](../SPEC.md) · [Plan](plan.md), sección T-20.
Destino confirmado: `lovito99/gestioncapa` (`upstream`).
Se añade esta sección con autorización del usuario, conservando íntegros los
pendientes CPPP y marcadores de conflicto anteriores.

### Preparación de esta entrega documental

- [x] Revisar AGENTS.md, scripts, workflows, plantilla, guías e historial local.
- [x] Confirmar destino central y permiso para añadir secciones a los planes existentes.
- [x] Consultar protección, ejecuciones y revisiones actuales mediante GET públicos.
- [x] Identificar que falla E2E real; no atribuirle una causa todavía no demostrada.
- [x] Definir T20-01…08, responsabilidades, límites, dependencias y verificaciones.
- [x] Guardar SPEC.md y las secciones T-20 de plan.md y todo.md.
- [ ] Obtener aprobación del usuario antes de implementar.

### Ejecución posterior a aprobación

- [ ] **T20-P1 — Diagnóstico reproducible** (S; depende de aprobación).
  - Aceptación: prueba concreta, fallo esperado y causa raíz documentados.
  - Verificación: log/informe y comando enfocado; rojo por el defecto, no por servicios caídos.
  - Archivos: prueba identificada en `e2e/prb/real/`, si requiere precisión; `docs/evidenciaT20.md`.
  - Precisar archivos de P2 antes de modificar su implementación.
- [ ] **T20-P2 — Corrección mínima** (M; depende de P1).
  - Aceptación: regresión roja antes del arreglo, verde después, limpieza acotada sin cambiar comportamiento.
  - Verificación: prueba enfocada, tipos, unitarias y E2E demo/real; integración y cobertura si aplican.
  - Archivos: máximo cuatro, identificados por P1; sin ampliación silenciosa de alcance.
  - Entregar mensaje de commit al usuario; el agente no lo ejecuta.
- [ ] **Control A — Causa y regresión**: evidencia rojo/verde, alcance revisado y suites afectadas satisfactorias.
- [ ] **T20-P3 — Contrato CI/Jira** (M; depende de P2).
  - Aceptación: eventos de PR, clave en rama o título y cuatro checks reales, con permisos mínimos.
  - Verificación: YAML/Actions, entradas/salidas del validador y eventos/Checks del PR.
  - Archivos: dos workflows, evidencia y test solo si cambia lógica; no reescribir lo que ya cumple.
- [ ] **T20-P4 — Guías coherentes** (M; depende de P3).
  - Aceptación: nombres de checks, revisión humana, instalación y evidencias sin contradicciones.
  - Verificación: comparación con scripts/workflows, enlaces y diff documental.
  - Archivos: `docs/calidad.md`, `docs/esp/calidad.md`, `docs/e2e.md`, `README.md` y plantilla existente del PR.
- [ ] **Control B — Listo para PR manual**: comprobaciones aplicables, build ejecutado por el usuario y PR nuevo al central con clave confirmada.
- [ ] **T20-P5 — Protección efectiva** (S; depende de Control B y checks recientes).
  - Aceptación: regla `main` guardada, PR + 1 aprobación, cuatro checks y sin bypass.
  - Verificación: captura/configuración efectiva y merge bloqueado sin aprobación o con checks fallidos; sin push de prueba.
  - Responsable: administrador humano. Registro: `docs/evidenciaT20.md`.
- [ ] **T20-P6 — Revisión y evidencia final** (S; depende de P5).
  - Aceptación: Approve humano vigente y cuatro checks success para el último estado del PR.
  - Verificación: enlaces, SHAs, captura y T20-01…08; revisión de calidad, seguridad y preparación de entrega.
  - Archivos: `docs/evidenciaT20.md` y esta sección de seguimiento.
  - Si cambia el PR al registrar evidencia, repetir checks y renovar la aprobación.
- [ ] **Control C — Cierre**: criterios y Definition of Done acreditados; límites y pendientes informados antes de decidir merge manual.

### Evidencias y decisiones todavía pendientes

- [ ] Confirmar en Jira si `SCRUM-118` es la clave real de T-20.
- [ ] Identificar administrador y revisor humano con escritura, distinto del autor.
- [ ] Diagnosticar la causa del fallo E2E real y registrar su prueba de regresión.
- [ ] Resolver o aceptar expresamente los riesgos de dependencias, scripts y ausencia de lockfile versionado.
- [ ] Aportar build local ejecutado manualmente por el usuario tras la implementación.
- [ ] Captura de la regla guardada para `main` central y protección efectiva.
- [ ] URL del nuevo PR y de la aprobación humana vigente.
- [ ] URLs de Calidad y E2E satisfactorias, con fecha y SHAs del estado aceptado.
- [ ] Registrar Planning Poker cuando el equipo aporte su estimación.
- [ ] Revisar `~/.agents/agent-skills/references/definition-of-done.md` y `security-checklist.md` sobre el resultado implementado, sin declarar aprobados controles pendientes.

Esta fase solo añade documentación; no ejecuta pruebas funcionales, build,
operaciones Git de escritura ni cambios de configuración en GitHub. Las
ejecuciones consultadas son antecedentes remotos. No hay commits nuevos del
agente ni versión publicada; propuesta documental: Interno, `v2.0.0.1.1`
desde la base local comprobada `v2.0.0.1.0`, según VERSIONING.md.

---

## HU-22: catálogo público y retorno al curso

Estado: **especificación y plan propuestos; implementación pendiente de aprobación**.
Fecha: 14/11/2026. [Especificación HU-22](../SPEC.md#especificación-hu-22-catálogo-público-y-retorno-al-curso)
· [Plan HU-22](plan.md#hu-22-catálogo-público-acceso-y-retorno-al-curso).
Se conserva el contenido CPPP/T-20 previo y sus pendientes independientes.

### Preparación documental

- [x] Revisar portada pública, API, vigencia, tarjetas, login/registro y HU-16/HU-20.
- [x] Detectar pérdida de curso en login/alta y ausencia del enlace de constancias.
- [x] Confirmar alcance de reserva frente a cobro real, privacidad y cuenta participante.
- [x] Definir contrato del parámetro `curso` y criterios HU22-01…10.
- [x] Añadir especificación, dependencias, tareas y verificaciones sin implementar.
- [ ] Obtener aprobación del usuario antes de escribir código o pruebas nuevas.

### Incrementos posteriores a aprobación

- [ ] **HU22-P1 — Retorno seguro desde login** (M; depende de aprobación).
  - Aceptación: HU22-05/09, ID validado, error/recarga y compatibilidad QR/inicio por rol.
  - Verificar: Vitest de retorno y Playwright HU22-05/09, primero rojo y después verde.
  - Archivos: ayudante/test `retornoCurso`, LoginPagina y E2E demo público; cuatro en total.
- [ ] **HU22-P2 — Registro con selección** (M; depende de P1).
  - Aceptación: HU22-06, alta y cambio login/registro sin perder curso; registro directo conserva catálogo.
  - Verificar: casos HU22-06 demo/real antes y después; regresión HU-50 sin selección.
  - Archivos: RegistroPagina, ayudante de registro y dos suites de registro; cuatro en total.
- [ ] **Control A**: retorno validado, compatibilidad, pruebas registradas y mensajes para commits manuales.
- [ ] **HU22-P3 — Inscribirme en el catálogo público** (M; depende de P1–P2).
  - Aceptación: HU22-01/02/04/07, selección correcta y confirmación explícita gratuita o reserva pendiente.
  - Verificar: recorrido completo demo/real; sin POST al autenticar ni cobro simulado.
  - Archivos: CursosPagina, dos suites públicas y ayudante compartido solo si se necesita; máximo cuatro.
- [ ] **HU22-P4 — Consultar constancias** (M; después de P3).
  - Aceptación: HU22-08/10, enlace anónimo a HU-20 y encabezado usable en móvil/teclado.
  - Verificar: enlace ausente en rojo, después acceso a `/verificar` y códigos de prueba; web institucional conservada.
  - Archivos: Encabezado y dos suites públicas; tres en total.
- [ ] **Control B**: recorrido público completo, privacidad, constancias y estados visibles verificados en navegador.
- [ ] **HU22-P5 — Regresión, limpieza y revisión** (M; depende de P1–P4).
  - Aceptación: HU22-03/09/10 y regresión; limpieza limitada a código tocado.
  - Verificar: unitarias, tipos, lint, API aislada y Playwright; causa raíz antes de arreglar fallos.
  - Revisar Definition of Done y security-checklist sin ocultar riesgos de sesión/dependencias previos.
  - Máximo cinco archivos de corrección/revisión; dividir antes si aparece más alcance.
- [ ] **HU22-P6 — Documentación y entrega** (M; depende de P5).
  - Aceptación: contrato y evidencia reales, pendientes explícitos y mensajes/versionado manuales.
  - Verificar: enlaces y diff; build solo por el usuario. No publicar ni hacer push.
  - Archivos: guía pública propuesta, rutas y secciones HU-22 de SPEC/plan/todo; cinco en total.
- [ ] **Control C**: aceptación, build manual, CI, revisión humana y subdominio real comprobados antes de decidir publicar.

### Evidencia pendiente

- [ ] Rojo → verde de cada comportamiento nuevo o defecto corregido.
- [ ] Acceso y alta desde tarjeta, error/recarga y retorno al curso elegido en demo y real.
- [ ] Inscripción solo tras confirmación, estados gratuito/PENDIENTE_PAGO y ausencia de duplicados.
- [ ] API sin datos privados; detalle/materiales protegidos; sin escalado a instructor.
- [ ] Parámetros manipulados y compatibilidad de QR/inicios por rol.
- [ ] Constancias sin sesión y enlace institucional desde el encabezado.
- [ ] Teclado, foco, consola/red y anchos 320/360/768/1024/1440.
- [ ] Resultado de tipos, lint, unitarias, integración aislada y suites Playwright.
- [ ] Resultado del build ejecutado manualmente por el usuario tras implementar.
- [ ] Revisión de las dos referencias en `~/.agents/agent-skills/references/` y riesgos pendientes registrados.
- [ ] Evidencia de CI, revisión humana y rutas/HTTPS del subdominio; publicación fuera de esta fase.

No se han ejecutado pruebas funcionales, builds ni operaciones Git de escritura
en esta entrega documental. Los resultados previos de otras secciones no se
atribuyen a HU-22. Sin commits nuevos del agente ni versión publicada;
clasificación documental Interno y propuesta condicional `v2.0.0.1.1` desde
`v2.0.0.1.0`, sin asignar incrementos por cada tarea.
>>>>>>> Stashed changes

---

## T-20: main protegida, CI por PR y revisión registrada

Estado: **especificación y plan propuestos; implementación pendiente de aprobación**.
Fecha: 14/11/2026. [Especificación](../SPEC.md) · [Plan](plan.md), sección T-20.
Destino confirmado: `lovito99/gestioncapa` (`upstream`).
Se añade esta sección con autorización del usuario, conservando íntegros los
pendientes CPPP y marcadores de conflicto anteriores.

### Preparación de esta entrega documental

- [x] Revisar AGENTS.md, scripts, workflows, plantilla, guías e historial local.
- [x] Confirmar destino central y permiso para añadir secciones a los planes existentes.
- [x] Consultar protección, ejecuciones y revisiones actuales mediante GET públicos.
- [x] Identificar que falla E2E real; no atribuirle una causa todavía no demostrada.
- [x] Definir T20-01…08, responsabilidades, límites, dependencias y verificaciones.
- [x] Guardar SPEC.md y las secciones T-20 de plan.md y todo.md.
- [ ] Obtener aprobación del usuario antes de implementar.

### Ejecución posterior a aprobación

- [ ] **T20-P1 — Diagnóstico reproducible** (S; depende de aprobación).
  - Aceptación: prueba concreta, fallo esperado y causa raíz documentados.
  - Verificación: log/informe y comando enfocado; rojo por el defecto, no por servicios caídos.
  - Archivos: prueba identificada en `e2e/prb/real/`, si requiere precisión; `docs/evidenciaT20.md`.
  - Precisar archivos de P2 antes de modificar su implementación.
- [ ] **T20-P2 — Corrección mínima** (M; depende de P1).
  - Aceptación: regresión roja antes del arreglo, verde después, limpieza acotada sin cambiar comportamiento.
  - Verificación: prueba enfocada, tipos, unitarias y E2E demo/real; integración y cobertura si aplican.
  - Archivos: máximo cuatro, identificados por P1; sin ampliación silenciosa de alcance.
  - Entregar mensaje de commit al usuario; el agente no lo ejecuta.
- [ ] **Control A — Causa y regresión**: evidencia rojo/verde, alcance revisado y suites afectadas satisfactorias.
- [ ] **T20-P3 — Contrato CI/Jira** (M; depende de P2).
  - Aceptación: eventos de PR, clave en rama o título y cuatro checks reales, con permisos mínimos.
  - Verificación: YAML/Actions, entradas/salidas del validador y eventos/Checks del PR.
  - Archivos: dos workflows, evidencia y test solo si cambia lógica; no reescribir lo que ya cumple.
- [ ] **T20-P4 — Guías coherentes** (M; depende de P3).
  - Aceptación: nombres de checks, revisión humana, instalación y evidencias sin contradicciones.
  - Verificación: comparación con scripts/workflows, enlaces y diff documental.
  - Archivos: `docs/calidad.md`, `docs/esp/calidad.md`, `docs/e2e.md`, `README.md` y plantilla existente del PR.
- [ ] **Control B — Listo para PR manual**: comprobaciones aplicables, build ejecutado por el usuario y PR nuevo al central con clave confirmada.
- [ ] **T20-P5 — Protección efectiva** (S; depende de Control B y checks recientes).
  - Aceptación: regla `main` guardada, PR + 1 aprobación, cuatro checks y sin bypass.
  - Verificación: captura/configuración efectiva y merge bloqueado sin aprobación o con checks fallidos; sin push de prueba.
  - Responsable: administrador humano. Registro: `docs/evidenciaT20.md`.
- [ ] **T20-P6 — Revisión y evidencia final** (S; depende de P5).
  - Aceptación: Approve humano vigente y cuatro checks success para el último estado del PR.
  - Verificación: enlaces, SHAs, captura y T20-01…08; revisión de calidad, seguridad y preparación de entrega.
  - Archivos: `docs/evidenciaT20.md` y esta sección de seguimiento.
  - Si cambia el PR al registrar evidencia, repetir checks y renovar la aprobación.
- [ ] **Control C — Cierre**: criterios y Definition of Done acreditados; límites y pendientes informados antes de decidir merge manual.

### Evidencias y decisiones todavía pendientes

- [ ] Confirmar en Jira si `SCRUM-118` es la clave real de T-20.
- [ ] Identificar administrador y revisor humano con escritura, distinto del autor.
- [ ] Diagnosticar la causa del fallo E2E real y registrar su prueba de regresión.
- [ ] Resolver o aceptar expresamente los riesgos de dependencias, scripts y ausencia de lockfile versionado.
- [ ] Aportar build local ejecutado manualmente por el usuario tras la implementación.
- [ ] Captura de la regla guardada para `main` central y protección efectiva.
- [ ] URL del nuevo PR y de la aprobación humana vigente.
- [ ] URLs de Calidad y E2E satisfactorias, con fecha y SHAs del estado aceptado.
- [ ] Registrar Planning Poker cuando el equipo aporte su estimación.
- [ ] Revisar `~/.agents/agent-skills/references/definition-of-done.md` y `security-checklist.md` sobre el resultado implementado, sin declarar aprobados controles pendientes.

Esta fase solo añade documentación; no ejecuta pruebas funcionales, build,
operaciones Git de escritura ni cambios de configuración en GitHub. Las
ejecuciones consultadas son antecedentes remotos. No hay commits nuevos del
agente ni versión publicada; propuesta documental: Interno, `v2.0.0.1.1`
desde la base local comprobada `v2.0.0.1.0`, según VERSIONING.md.

---

# Tareas HU-53: Modalidad de cobro por curso

## Estado y reglas de ejecución

Implementación autorizada el 15/11/2026. [Especificación](../SPEC.md#hu-53-modalidad-de-cobro-por-curso)
y [plan](plan.md#plan-hu-53-modalidad-de-cobro-por-curso) conservan los cuatro bloques
aprobados. Los estados de abajo diferencian implementación local de la evidencia
externa pendiente; la guía operativa registra los comandos y resultados finales.

Se preserva todo el contenido anterior, incluidos conflictos y duplicaciones previos.
Los archivos y comandos del desglose inicial eran **propuestos**; las pruebas se
consolidaron en `cobroCurso.test.ts` y `pagosCurso.test.ts`. El inventario final
está en `docs/esp/cobroCursos.md`. Las migraciones nuevas se numerarán al ejecutar cada tarea,
comprobando entonces el último número; no se editan migraciones históricas.

Por incremento: prueba RED por comportamiento ausente, implementación mínima,
GREEN, simplificación y evidencia. Si un fallo no es el esperado, diagnosticar su
causa raíz antes de corregir. Mantener cada tramo en aproximadamente cinco archivos
como máximo, incluidos tests; dividirlo si supera ese alcance. No eliminar pruebas,
añadir skips ni rebajar controles. El usuario realiza los commits manualmente;
preparar un mensaje por incremento verificado, sin ejecutar operaciones Git de escritura.

### H53-P01 — Validar política de cobro

- [x] Validar PREVIO/CERTIFICADO/GRATUITO, importe exacto y plazo coherentes; rechazar entradas fuera de rango. AC: HU53-01.
- Dependencias: ninguna. Alcance: S/M, hasta 3 archivos.
- Archivos: `backend/src/modules/cursos/cursos.cobro.ts`, `cursos.validacion.ts` del mismo módulo y `backend/test/politicaCobro.test.ts`.
- Verificar: `node --import tsx --test backend/test/politicaCobro.test.ts`; comprobar RED/GREEN con combinaciones válidas, ausencia, decimales y límites.

### H53-P02 — Crear curso con condiciones persistidas

- [x] Guardar y consultar política/versión en la creación real; mantener transición compatible del esquema y rechazo de configuración incoherente. AC: HU53-01.
- Dependencias: P01. Alcance: M, hasta 4 archivos.
- Archivos: nueva migración de política en `backend/migraciones/`, `backend/src/modules/cursos/cursos.repositorio.ts`, `cursos.rutas.ts` y `backend/test/integracion/cursos.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cursos.test.ts` en BD aislada; consultar después de reiniciar, roles y compatibilidad.

### H53-P03 — Crear desde formulario administrativo

- [x] ADMIN elige modalidad, monto y plazo; muestra errores del servidor y guarda las tres modalidades sin depender de MSW. AC: HU53-01.
- Dependencias: P02. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/paginas/cursos/CobroCursoFormulario.tsx`, `CursoFormPagina.tsx` y `CobroCursoFormulario.test.tsx` de esa carpeta, `frontend/src/servicios/cursos.ts`, `frontend/src/mocks/cursos.ts`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/cursos/CobroCursoFormulario.test.tsx`; recorrer creación en navegador contra API real con teclado.

### Checkpoint H53-C01 — Tras P01–P03

- [ ] Evidencia RED/GREEN y creación real de cada modalidad; sin regresión relevante. Revisión humana antes de continuar; build solo manual del usuario.

### H53-P04 — Editar condiciones futuras por API

- [x] PATCH real solo para ADMIN, con versión y rechazo en curso cerrado; no cambia snapshots anteriores ni otros campos del curso. AC: HU53-02.
- Dependencias: P02. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/modules/cursos/cursos.repositorio.ts`, `cursos.rutas.ts`, `cursos.validacion.ts`, `backend/src/plugins/permisos.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; 401/403, conflicto de versión y datos conservados.

### H53-P05 — Editar cobro desde administración

- [x] Control «Guardar condiciones de cobro» usa PATCH y vuelve a consultar lo persistido; no aparenta guardar metadatos mediante el PUT faltante. AC: HU53-02.
- Dependencias: P03, P04. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/paginas/cursos/CursoFormPagina.tsx`, `CobroCursoFormulario.tsx` y `CobroCursoFormulario.test.tsx`, `frontend/src/servicios/cursos.ts`, `frontend/src/mocks/cursos.ts`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/cursos/CobroCursoFormulario.test.tsx`; editar, recargar y observar conflicto cuando otro administrador modifica la versión.

### H53-P06 — Mostrar condiciones antes de inscribirse

- [x] Catálogo público/privado y detalle muestran modalidad, importe y plazo; CERTIFICADO no se presenta como totalmente gratuito ni filtra datos privados. AC: HU53-03.
- Dependencias: P03, P05. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/paginas/cursos/CursosPagina.tsx`, `DetalleCursoPagina.tsx`, `formatoCurso.ts`, `formatoCurso.test.ts` y `e2e/prb/real/cobroCatalogo.spec.ts`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/cursos/formatoCurso.test.ts` y `npm run e2e:real -- cobroCurso.spec.ts`; revisar respuesta pública y vista móvil.

### Checkpoint H53-C02 — Tras P04–P06

- [ ] Crear, editar cobro y consultar oferta contra API real; edición no altera datos previos y no filtra información. Revisión humana; build manual pendiente.

### H53-P07 — Registrar obligaciones e idempotencia duradera

- [x] Persistir condiciones financieras y hechos únicos; aceptar solo importes del servidor y excluir intentos externos concurrentes por obligación. AC: HU53-07, HU53-08.
- Dependencias: P02. Alcance: M, hasta 4 archivos.
- Archivos: nueva migración financiera, `backend/src/modules/pagos/pagos.modelo.ts`, `pagos.repositorio.ts` y `backend/test/integracion/pagosCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/pagosCurso.test.ts`; duplicados, claves reutilizadas con otra carga y carreras en BD real.
- Límite: la referencia al intento es opaca para pagos; P13 incorpora la relación de inscripción. No escribir obligaciones de usuarios reales antes de completar esa relación.

### H53-P08 — Consultar e iniciar pagos con autorización

- [x] Propietario/ADMIN consultan lo permitido; solo propietario inicia checkout; proveedor no configurado falla explícitamente sin simular un cobro. AC: HU53-07, HU53-08.
- Dependencias: P07. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/modules/pagos/pagos.rutas.ts`, `pagos.servicio.ts`, `backend/src/app.ts`, `backend/src/plugins/permisos.ts`, `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; IDOR, roles, proveedor permitido, cuerpo/tamaño e idempotencia.
- Límite: conservar la obligación antes de la llamada y centralizar resultados verificables; no habilitar medios sin adaptador configurado.

### H53-P09 — Integrar verificación backend de Izipay

- [ ] Usar contrato oficial del producto contratado y generar sesión en backend; verificar IPN/firma, comercio, entorno, correlación e importe antes de confirmar. AC: HU53-04, HU53-08.
- Dependencias: P08 y cuenta/producto/credenciales sandbox de Izipay. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/modules/pagos/izipay.ts`, `pagos.servicio.ts`, `backend/src/config/env.schema.ts`, ejemplo de entorno backend existente y `backend/test/izipay.test.ts`.
- Verificar: `node --import tsx --test backend/test/izipay.test.ts` con contratos anonimizados; comprobar sesión real sandbox y conservar referencia sin secretos. Cobro completo se verifica en P18/P27.
- Límite: mocks no completan HU53-04; producto o consulta de operación no verificados dejan el medio sin habilitar.

### Checkpoint H53-C03 — Tras P07–P09

- [ ] Libro financiero/propiedad/idempotencia probados; producto Izipay y sesión sandbox reales acreditados. Registrar faltantes de comercio sin marcarlo aprobado. Revisión humana; build manual pendiente.

### H53-P10 — Integrar verificación backend de Culqi

- [ ] Consultar recurso/cargo por API autenticada y verificar condiciones; webhook o token aislado no confirma. AC: HU53-05, HU53-08.
- Dependencias: P08 y cuenta/producto/credenciales sandbox de Culqi. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/modules/pagos/culqi.ts`, `pagos.servicio.ts`, `backend/src/config/env.schema.ts`, ejemplo de entorno backend existente y `backend/test/culqi.test.ts`.
- Verificar: `node --import tsx --test backend/test/culqi.test.ts` con contratos anonimizados; consultar recurso real de sandbox sin exponer llaves. Cobro completo en P19/P27.
- Límite: no inventar HMAC ni permitir importes fuera de los límites del producto.

### H53-P11 — Registrar efectivo real y auditado

- [x] ADMIN registra monto completo y referencia única; impedir autoconfirmación, duplicación y conflicto con intento externo activo/incierto. AC: HU53-06, HU53-07.
- Dependencias: P08. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/modules/pagos/pagos.rutas.ts`, `pagos.modelo.ts`, `pagos.repositorio.ts`, `backend/src/plugins/permisos.ts` y `backend/test/integracion/pagosCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/pagosCurso.test.ts`; actor inactivo/ajeno, repetición, fecha del servidor y carrera con pasarela.

### H53-P12 — Recuperar operaciones financieras interrumpidas

- [x] Reanudar verificación y efectos tras caída; un timeout no permite otro cobro; conservar pagos tardíos/dobles como incidencias auditables. AC: HU53-07, HU53-13.
- Dependencias: P09, P10, P11. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/modules/pagos/pagos.procesador.ts`, `pagos.repositorio.ts`, `pagos.servicio.ts`, `backend/src/server.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; inyectar caída antes/después de persistir y procesar con dos instancias.
- Límite: no confirmar a partir del retorno del navegador; comprobar recuperación ante proveedor caído y eventos fuera de orden.

### Checkpoint H53-C04 — Tras P10–P12

- [ ] Ambos contratos backend y efectivo verificados; se recupera una operación incierta sin segundo cobro. No habilitar producción. Revisión humana; build manual pendiente.

### H53-P13 — Inscribir con condiciones congeladas

- [x] Crear intento estable y snapshot; PREVIO reserva pendiente, CERTIFICADO/GRATUITO confirman; reintento no extiende plazo ni sustituye condiciones. AC: HU53-02, HU53-09, HU53-12, HU53-17.
- Dependencias: P06, P07, P12. Alcance: M, hasta 5 archivos.
- Archivos: nueva migración de intentos/snapshots, `backend/src/modules/cursos/cursos.repositorio.ts`, `cursos.rutas.ts`, `backend/src/modules/pagos/pagos.repositorio.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; edición entre lectura e inscripción, réplica de solicitud y última plaza.
- Límite: relacionar obligaciones con el intento y no inferir pagos históricos; completar relaciones/constraints antes de activar escrituras.

### H53-P14 — Vencer reservas y liberar cupos

- [x] Bloquear desde el instante de vencimiento, cancelar en hasta 60 s operativo y permitir nuevo intento sin perder historial ni exceder cupos. AC: HU53-11, HU53-12, HU53-13.
- Dependencias: P13. Alcance: M, hasta 4 archivos.
- Archivos: `backend/src/modules/cursos/inscripciones.vencimiento.ts`, `cursos.repositorio.ts`, `backend/src/server.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; reloj en límite, espera por lock, proceso detenido/reiniciado, dos instancias y pago tardío.
- Límite: cupo efectivo excluye vencidos aunque el procesador se atrase; la conciliación de pagos no reactiva automáticamente.

### H53-P15 — Restringir contenidos y descargas en servidor

- [x] Resumen comercial permanece accesible; sin derecho no devolver URLs privadas ni PDF; ADMIN e instructor asignado conservan su gestión. AC: HU53-10.
- Dependencias: P13, P14. Alcance: M, hasta 4 archivos.
- Archivos: `backend/src/modules/cursos/cursos.acceso.ts`, `cursos.repositorio.ts`, `cursos.rutas.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; pendiente, vencida, confirmada, propietario ajeno y acceso directo a descarga.

### Checkpoint H53-C05 — Tras P13–P15

- [ ] Reserva, activación, expiración y última plaza funcionan contra BD real; descarga directa y URLs privadas quedan protegidas. Revisión humana; build manual pendiente.

### H53-P16 — Aplicar cobro a asistencia y clases vinculadas

- [x] Inscripción manual de clase no elude la política; asistencia revalida derecho al escribir y usa orden de locks compatible; clases independientes siguen funcionando. AC: HU53-10, HU53-12.
- Dependencias: P15. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/modules/asistencia/asistencia.service.ts`, `asistencia.repositorio.ts`, `backend/src/modules/clases/clases.repositorio.ts`, `backend/src/modules/cursos/sesiones.repositorio.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts` y `npm run test:cobertura`; probar asistencia concurrente con expiración sin deadlock ni asistencia impaga.

### H53-P17 — Restringir reuniones del curso

- [x] Participante sin derecho no obtiene credenciales ni enlaces de entrada; gestión por roles y reuniones independientes conservan sus permisos. AC: HU53-10.
- Dependencias: P15. Alcance: M, hasta 3 archivos.
- Archivos: `backend/src/modules/reuniones/reuniones.repositorio.ts`, `reuniones.rutas.ts` y `backend/test/integracion/reuniones.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/reuniones.test.ts`; consultar/credencial pendiente, vencida y confirmada, sin confiar en fila de clase manual.

### H53-P18 — Completar checkout Izipay del participante

- [ ] Propietario paga mediante SDK/flujo oficial y vuelve a su curso; interfaz consulta confirmación del servidor y muestra plazo/error/conciliación sin afirmar pago por callback visual. AC: HU53-04, HU53-09, HU53-12.
- Dependencias: P09, P12, P13. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/servicios/izipay.ts`, `pagos.ts`, `frontend/src/paginas/cursos/DetalleCursoPagina.tsx`, `frontend/src/mocks/pagos.ts` y `frontend/src/paginas/cursos/PagoCurso.test.tsx`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/cursos/PagoCurso.test.tsx` y recorrido real en sandbox Izipay con credenciales por canal seguro; evidencia sin PAN/CVV/tokens.

### Checkpoint H53-C06 — Tras P16–P18

- [ ] Izipay sandbox confirma inscripción y permite acceso; antes del pago no hay contenidos/asistencia/reunión. Mantener marca demo de constancias. Revisión humana; build manual pendiente.

### H53-P19 — Completar checkout Culqi del participante

- [ ] Propietario paga mediante flujo oficial; rechazo y timeout permiten recuperación segura, sin alternar medio mientras el resultado sea incierto. AC: HU53-05, HU53-07.
- Dependencias: P10, P18. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/servicios/culqi.ts`, `pagos.ts`, `frontend/src/paginas/cursos/DetalleCursoPagina.tsx`, `frontend/src/mocks/pagos.ts` y `frontend/src/paginas/cursos/PagoCurso.test.tsx`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/cursos/PagoCurso.test.tsx` y recorrido real sandbox Culqi, incluyendo rechazo y confirmación autenticada; no usar dinero real.

### H53-P20 — Ofrecer recepción de efectivo en administración

- [x] ADMIN registra recepción y consulta comprobante interno; error o repetición no muestra éxito ficticio ni altera otras obligaciones. AC: HU53-06.
- Dependencias: P11, P13. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/paginas/pagos/EfectivoPagina.tsx`, `EfectivoPagina.test.tsx`, `frontend/src/rutas.tsx`, `frontend/src/servicios/pagos.ts` y `frontend/src/mocks/pagos.ts`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/pagos/EfectivoPagina.test.tsx`; recorrido real ADMIN/participante, referencia repetida y conflicto con pasarela.

### H53-P21 — Separar deuda e inscripción en historial API

- [x] Consultar inscripción, obligación y entrega de manera independiente; conservar historia de intentos cancelados y excluir datos financieros ajenos. AC: HU53-18.
- Dependencias: P13, P14. Alcance: M, hasta 3 archivos.
- Archivos: `backend/src/modules/historial/historial.repositorio.ts`, `historial.modelo.ts` y `backend/test/integracion/historial.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/historial.test.ts`; confirmado con deuda de constancia, gratuito exento y cancelado con pago tardío.

### Checkpoint H53-C07 — Tras P19–P21

- [ ] Ambos checkouts y efectivo acreditan estados reales; historial distingue deuda de reserva y no filtra información. Revisión humana; build manual pendiente.

### H53-P22 — Mostrar avance financiero al participante

- [x] Mis cursos e historial distinguen PENDIENTE_PAGO, cancelación, deuda de constancia y exención; nunca muestran EXENTO como transacción pagada. AC: HU53-18.
- Dependencias: P18, P19, P21. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/paginas/participante/MisCursosPagina.tsx`, `frontend/src/paginas/historial/HistorialPagina.tsx`, `frontend/src/servicios/historial.ts`, `frontend/src/mocks/historial.ts` y `frontend/src/paginas/historial/HistorialCobro.test.tsx`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/historial/HistorialCobro.test.tsx`; confirmar mensajes y navegación a la obligación correcta de cada intento.

### H53-P23 — Registrar elegibilidad y retener sin emitir

- [x] Cierre guarda elegibilidad de CERTIFICADO y deuda sin PDF/código válido/horas certificadas; gratuito y PREVIO pagado emiten conforme al alcance académico existente. AC: HU53-14, HU53-16, HU53-17.
- Dependencias: P12, P13, P16. Alcance: M, hasta 5 archivos.
- Archivos: nueva migración de entrega/elegibilidad, `backend/src/modules/certificados/certificados.repositorio.ts`, `certificados.modelo.ts`, `backend/src/modules/pagos/pagos.repositorio.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; elegible/no elegible, excepción académica, pendiente/cancelado y cierre fuera de plazo.
- Límite: no ampliar a evaluación virtual/exámenes ni inferir cumplimiento a partir del pago.

### H53-P24 — Emitir tras pago de constancia retenida

- [x] Consumir hecho verificado y emitir una sola vez desde snapshot de elegibilidad, después del cierre; cubrir descarga alternativa/historial y no generar segundo cobro. AC: HU53-15, HU53-16, HU53-17.
- Dependencias: P23. Alcance: M, hasta 5 archivos.
- Archivos: `backend/src/cobro.procesos.ts`, `certificados.repositorio.ts`, `backend/src/modules/historial/historial.repositorio.ts`, `backend/src/server.ts` y `backend/test/integracion/cobroCurso.test.ts`.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/cobroCurso.test.ts`; pago tras ventana de cierre, reinicio durante emisión y eventos repetidos.
- Límite: conservar VALIDO/ANULADO/REEMPLAZADO, restricciones de corrección y marca demo; pagos no importa certificados.

### Checkpoint H53-C08 — Tras P22–P24

- [ ] Tres modalidades completas en inscripción y constancias; retención imposible de eludir y pago posterior al cierre libera sin duplicar. Revisión humana; build manual pendiente.

### H53-P25 — Mostrar retención y entrega en constancias

- [x] Cierre/gestión y vista del propietario muestran deuda o documento entregable; no habilitar descarga retenida ni botón de pago sin elegibilidad. AC: HU53-14, HU53-18.
- Dependencias: P22, P24. Alcance: M, hasta 5 archivos.
- Archivos: `frontend/src/servicios/certificados.ts`, `frontend/src/paginas/cursos/cierre/CerrarCursoPagina.tsx`, `CertificadosCursoPagina.tsx`, `frontend/src/paginas/certificados/CertificadoPagina.tsx` y `frontend/src/paginas/certificados/CertificadoCobro.test.tsx`.
- Verificar: `npm exec -w frontend -- vitest run src/paginas/certificados/CertificadoCobro.test.tsx`; constancia retenida y posteriormente liberada, con enlace de pago del propietario.

### H53-P26 — Ensayar migración histórica y recuperación

- [ ] Inventariar y regularizar sin pagos/plazos inventados; backfill reanudable preserva derechos/documentos y recuperación no pierde hechos financieros. AC: HU53-19.
- Dependencias: P14, P24 y acuerdo aprobado para pendientes antiguas. Alcance: M, hasta 4 archivos.
- Archivos: `backend/src/scripts/inventarioCobro.ts`, `backend/test/integracion/migracionCobro.test.ts`, `docs/esp/cobroCursos.md` y migración adicional solo si la regularización la exige.
- Verificar: `node --import tsx --test --test-concurrency=1 backend/test/integracion/migracionCobro.test.ts`; copia aislada con datos legados, conteos, reinicio, restauración sin operaciones posteriores y recuperación compatible hacia adelante.
- Límite: no existe comando genérico rollback; probar procedimiento específico y no correr el script sobre BD real sin aprobación.

### H53-P27 — Acreditar recorridos reales y ambos sandboxes

- [ ] Matriz de veinte criterios con evidencia real y negativa: oferta→inscripción→pago/acceso→constancia; ambas pasarelas y efectivo. AC: HU53-01 a HU53-20.
- Dependencias: P17, P19, P20, P25, P26 y configuración sandbox/HTTPS. Alcance: M, hasta 5 archivos.
- Archivos: `e2e/prb/real/cobroCurso.spec.ts`, `cobroConstancia.spec.ts` y `cobroPasarelas.spec.ts`, configuración sandbox dedicada `playwright.pagos.config.ts` y `docs/esp/cobroCursos.md`.
- Verificar: `npm run e2e:real -- cobroCurso.spec.ts` en entorno aislado; `npm exec -- playwright test --config playwright.pagos.config.ts` solo con proveedores en sandbox y configuración aprobada.
- Límite: documentar comando/preparación exactos de la nueva suite; falta de credenciales no equivale a prueba aprobada ni se oculta con skip.

### Checkpoint H53-C09 — Tras P25–P27

- [ ] Veinte criterios trazados a evidencia y ambos sandboxes completos; histórico preservado y recuperación ensayada. Revisar resultados con humano; build manual aún pendiente si no hay evidencia aportada.

### H53-P28 — Simplificar y revisar calidad/seguridad

- [x] Simplificar solo lo tocado sin cambio de comportamiento; revisar corrección, seguridad, rendimiento, legibilidad/mantenimiento y ambas listas de referencia con evidencia o pendientes explícitos. AC: HU53-08, HU53-20.
- Dependencias: P27. Alcance: S/M; máximo 5 archivos por corrección, subdividir los hallazgos independientes.
- Archivos: `docs/esp/cobroCursos.md` y únicamente archivos del incremento que requieran corrección; no refactor ajeno.
- Verificar: `npm test`, `npm run test:integracion`, `npm run test:cobertura`, `npm run typecheck -w backend`, `npm exec -w frontend -- tsc -p tsconfig.app.json --noEmit`, `npm exec -w frontend -- tsc -p tsconfig.node.json --noEmit`, `npm run e2e:tipos`, `npm run lint -w frontend` y `git diff --check`.
- Revisar `~/.agents/agent-skills/references/definition-of-done.md` y `~/.agents/agent-skills/references/security-checklist.md`, secretos/IDOR/replay/firma/importe/CSP/retención y dependencias. Diagnosticar discrepancias, incluida ausencia de lockfile; no silenciarlas.

### H53-P29 — Preparar entrega sin publicar

- [ ] Entregar trazabilidad, resultados, pendientes, mensajes manuales de commit/versión y guía de activación/observación/recuperación; no declarar producción lista sin evidencia. AC: HU53-19, HU53-20.
- Dependencias: P28, revisión humana y evidencia de build manual del usuario. Alcance: M, hasta 5 documentos.
- Archivos: `docs/esp/cobroCursos.md`, `docs/API.md`, `docs/enfoqueCppp.md` y secciones HU-53 de `tasks/plan.md` / `tasks/todo.md`.
- Verificar: `git diff --check`; revisión manual de API, pruebas/evidencias, cuentas de comercio, callbacks HTTPS, secretos, límites, responsables de conciliación y alertas.
- Pendientes manuales: usuario ejecuta `npm run build`, operaciones Git y PR; aprobación y activación de producción separadas. Sin push, publicación, etiquetas ni cambios de versión por el agente.

### Checkpoint H53-C10 — Tras P28–P29

- [ ] Definition of Done y Security Checklist verificadas contra el resultado, evidencia de build aportada, revisión humana y faltantes de lanzamiento declarados. Detenerse sin publicar.

## Estado de la entrega de código

Implementación local verificada contra API/BD y navegador reales. No se crearon commits ni etiquetas;
no se ejecutó build. Se preservan los conflictos y duplicaciones anteriores por
instrucción del usuario. Planning Poker, cuentas/productos de comercio y sandboxes,
regularización histórica de condiciones desconocidas, revisión humana y build manual
son pendientes explícitos. La versión funcional condicional propuesta sustituye
a la documental: `v3.0.0.0.0` desde `v2.0.0.1.0`; no se asigna por cada tarea.


## Evidencia por tramo y pendientes reales

Las casillas marcadas acreditan el alcance local implementado y comprobado; no
aprueban una publicación. Los checkpoints humanos permanecen abiertos.

| Tramos | Resultado local y límite |
| --- | --- |
| P01–P06 | Política, persistencia, creación/edición PATCH, control de versión y oferta pública/privada probados; E2E móvil real |
| P07–P08, P11, P20 | Obligaciones, idempotencia, propiedad, exclusión y efectivo auditado; referencias/discrepancias preservadas |
| P09–P10, P18–P19 | Adaptadores y checkout implementados con contratos simulados. Faltan cuentas/producto y cobro/rechazo reales sandbox: permanecen abiertos |
| P12 | Recuperación de referencia Culqi, sesión original Izipay cifrada, respuesta múltiple a incidencia y lotes sin bloqueo probados. Terminación real SIGKILL y conciliación Culqi verificadas sin otro cargo; semántica terminal/comercio Izipay aún requiere validación externa |
| P13–P17 | Snapshot, reserva, vencimiento efectivo, pago tardío, material/descarga, asistencia y reunión protegidos; dos procesadores cancelaron al arrancar y en el ciclo real de 30 s; carga del despliegue pendiente |
| P21–P22 | API/UI distinguen deuda, inscripción y entrega; historial/Mis cursos permiten consultar condiciones y pago de intentos anteriores tras reinscripción, sin perder la inscripción vigente |
| P23–P25 | Retención sin documento, pago posterior al cierre, datos académicos congelados, emisión única y entrega automática probados |
| P26 | Inventario de solo lectura, migración desde 0017 e idempotencia; backup/restauración local con huellas financieras idénticas. Falta acuerdo de regularización histórica y ensayo operativo del despliegue |
| P27 | 31 E2E reales y 12 demo seleccionados aprobados; ambos sandboxes pendientes |
| P28 | Simplificación acotada, revisión interna de pagos/acceso/constancias, DoD y seguridad revisados; límites de publicación explícitos |
| P29 | Guía/API/estado actual y mensajes de entrega preparados. Build, revisión humana y Git manuales pendientes |

Pruebas finales: 301 unitarias backend, 70 frontend, 3 servidor web; 289 integración
en base vacía separada de E2E; casos focalizados adicionales de material/asistencia/reunión
y dos procesadores en ciclo real aprobados. Tras la ampliación del historial,
se repitieron los 4 E2E afectados: todos aprobados. Cobertura de asistencia: 98.96 % líneas, 88.14 % ramas, 100 % funciones
(umbral existente 60 % sin cambios). Tipos backend/frontend/E2E aprobados. Lint
sin errores, dos avisos anteriores; MSW demo avisa de versión previa del worker.
`git diff --check` aprobado. Ninguna prueba omitida ni requisito rebajado.

Se conservaron por SHA-256 los prefijos previos de SPEC.md, plan.md y todo.md,
incluidos los conflictos anteriores. No se ejecutó build ni operación Git de escritura.
Para comandos, evidencia y pasos de activación: [guía de cobro](../docs/esp/cobroCursos.md).

---

# Tareas HU-26: Sesiones virtuales seguras

Estado: **implementado en local (16/11/2026); pendiente de revisión humana, build manual y despliegue.** Criterios HU26-xx
en [SPEC.md](../SPEC.md); orden y riesgos en [plan.md](plan.md). Build y Git: manuales.

## Fase 0: espiga y base

- [x] **T26-01 Espiga Jitsi local** (puerta de las fases B y C)
  - Aceptación: evidencia escrita de que (a) un colegiado que fuerza `addTrack` de
    pantalla con moderación `desktop` activa no llega a los demás; (b) `token_lobby_ondemand`
    y `event_sync` cargan en Docker; (c) `event_sync` envía el `id` del JWT;
    (d) un moderador expulsa y un no moderador no puede admitir, expulsar ni moderar.
  - Verificación: 2–3 Chromium contra `http://localhost:8000`; resultado y decisión
    en `docs/esp/sesionesVirtuales.md`. Si (a) falla: detenerse y consultar (pregunta 7).
  - Archivos: `docs/esp/sesionesVirtuales.md`. Configuración local no versionada.
- [x] **T26-02 Licencias de terceros** — HU26-05
  - Aceptación: docker-jitsi-meet, lib-jitsi-meet y jitsi-contrib/prosody-plugins con
    versión, licencia Apache-2.0, origen y «sin modificaciones de código»; prototipo `0f1aaef`.
  - Verificación: revisión del documento contra `version.json` y los `LICENSE` de la imagen.
  - Archivos: `docs/licenciasTerceros.md`, `infraestructura/jitsi/version.json`, `README.md`.
- [x] **T26-03 Configuración Jitsi y secreto de eventos**
  - Aceptación: `preparar.mjs` añade sala de espera, `event_sync` y Jibri desactivado;
    un modo de actualización conserva secretos; `jitsiEventosSecreto` obligatorio con
    Jitsi habilitado y distinto de los otros tres secretos.
  - Verificación: casos nuevos en `backend/test/env.test.ts` (rojo → verde); ejecución
    del preparador en una copia temporal.
  - Archivos: `infraestructura/jitsi/preparar.mjs`, `backend/src/config/env.schema.ts`,
    `backend/.env.example`, `backend/test/env.test.ts`.
- [x] **T26-04 Cursos virtuales y reunión creada por el instructor** (si se aprueba la pregunta 6)
  - Aceptación: un curso `VIRTUAL` admite sesiones; el instructor asignado crea la reunión
    de su sesión; otro instructor recibe 403.
  - Verificación: `test/integracion/sesionesCurso.test.ts` y `reuniones.test.ts`.
  - Archivos: `cursos/sesiones.repositorio.ts`, `reuniones/reuniones.rutas.ts` y sus pruebas.

## Fase A: `sala-segura`

- [x] **T26-05 Credencial con sala de espera y aviso de grabación** — HU26-01, 02, 04
  - Aceptación: token de colegiado con `lobby: true` y de moderador sin él; 401 sin sesión;
    403 a no inscrito, inscripción sin acceso y retirado; con `grabacionPrevista`, 422
    sin `aceptaGrabacion` y fecha registrada al aceptar.
  - Verificación: `backend/test/jitsi.test.ts` e integración `reuniones.test.ts`.
  - Archivos: migración `0032-salaSegura.sql`, `jitsi.servicio.ts`, `reuniones.rutas.ts`,
    `reuniones.validacion.ts`, pruebas.
- [x] **T26-06 Servicio de sala de espera** — HU26-03
  - Aceptación: el colegiado pasa a «en espera» al ser rechazado por sala cerrada; el
    anfitrión recibe solicitudes con identidad del JWT, admite, rechaza y admite inscritos.
  - Verificación: `frontend/src/servicios/salaEspera.test.ts` con conferencia simulada.
  - Archivos: `servicios/salaEspera.ts`, `servicios/salaJitsi.ts`, prueba.
- [x] **T26-07 Interfaz de espera y aviso** — HU26-03, 04
  - Aceptación: pantalla previa con aviso solo si hay grabación; estado «En sala de espera»;
    panel del anfitrión accesible (teclado, `aria-live`), también a 360 px.
  - Verificación: Vitest; lint; comprobación manual.
  - Archivos: `SalaReunionPagina.tsx`, `sala.css`, `servicios/reuniones.ts`.

### Checkpoint A
- [x] Suites backend, integración y frontend aprobadas; tipos y lint sin errores nuevos.
- [x] Evidencia real: enlace sin sesión, URL de Jitsi sin token, no inscrito, espera y admisión.
- [ ] Build manual pendiente del usuario. Revisión humana antes de seguir.

## Fase B: `control-sala`

- [x] **T26-08 Políticas persistentes** — HU26-06, 10
  - Aceptación: PATCH guarda pantalla, micrófono, mano, porcentaje (1–100) y grabación;
    solo instructor asignado o administrador; 409 con reunión finalizada o cancelada;
    pantalla deshabilitada por defecto en reuniones nuevas.
  - Verificación: integración `reuniones.test.ts` (incluye colegiado → 403).
  - Archivos: migración `0033-politicasReunion.sql`, `reuniones.rutas.ts`,
    `reuniones.validacion.ts`, `reuniones.repositorio.ts`, prueba.
- [x] **T26-09 Aplicar políticas en la sala** — HU26-07, 08, 11
  - Aceptación: al unirse, el moderador activa la moderación de los medios restringidos
    antes de admitir; botones deshabilitados u ocultos según permiso; autorizar y
    retirar el permiso de pantalla funciona.
  - Verificación: `moderacionSala.test.ts` y `salaJitsi.test.ts`.
  - Archivos: `moderacionSala.ts`, `salaJitsi.ts`, `SalaReunionPagina.tsx`, pruebas.
- [x] **T26-10 Expulsión sin reingreso** — HU26-09
  - Aceptación: expulsar cierra todas las conexiones con el mismo `id`, registra
    `retiradoEn`, la credencial nueva da 403 y en la espera aparece «Expulsado» sin admitir.
  - Verificación: integración `reuniones.test.ts`; Vitest de la sala.
  - Archivos: `reuniones.rutas.ts`, `salaJitsi.ts`, `salaEspera.ts`, `SalaReunionPagina.tsx`, pruebas.

### Checkpoint B
- [x] Suites, tipos y lint aprobados.
- [x] Evidencia real con un cliente que se salta la UI: pantalla sin permiso, expulsión
      con reintento usando el token anterior, colegiado intentando moderar.
- [ ] Revisión humana antes de seguir.

## Fase C: `asistencia-virtual`

- [x] **T26-11 Cálculo de porcentaje** — HU26-13
  - Aceptación: une intervalos solapados de varias conexiones, recorta a la referencia,
    trata intervalos vacíos y referencia nula sin dividir por cero.
  - Verificación: `backend/test/asistenciaVirtual.test.ts`.
  - Archivos: `reuniones/asistenciaVirtual.ts`, prueba.
- [x] **T26-12 Webhook de eventos** — HU26-12
  - Aceptación: 401 sin secreto válido; 400 con cuerpo inválido; ignora sala desconocida
    y sala de espera; joined/left idempotentes; `iniciar` fija `iniciadaEn`.
  - Verificación: integración `test/integracion/eventosJitsi.test.ts`.
  - Archivos: migración `0034-asistenciaVirtual.sql`, `jitsi/jitsi.eventos.ts`, `app.ts`,
    `reuniones.rutas.ts`, prueba.
- [x] **T26-13 Cierre con asistencia** — HU26-13, 14, 15
  - Aceptación: finalizar cierra intervalos, calcula y registra `VIRTUAL` si alcanza el
    mínimo; conserva QR; excluye al expulsado (pregunta 4); idempotente; cuenta en el 80 %.
  - Verificación: integración en `eventosJitsi.test.ts` con `asistenciaCurso`.
  - Archivos: `reuniones.rutas.ts`, `reuniones.repositorio.ts`, `asistenciaVirtual.ts`, prueba.
- [x] **T26-14 Interfaz de asistencia** — HU26-14, 15
  - Aceptación: el instructor fija el porcentaje mínimo y ve minutos, porcentaje y si cuenta.
  - Verificación: Vitest; lint.
  - Archivos: `SalaReunionPagina.tsx` o `ReunionesPagina.tsx`, `servicios/reuniones.ts`, prueba.

### Checkpoint C
- [x] Suites, tipos y lint aprobados.
- [x] Evidencia real: entrar, salir, reconectar, finalizar y ver la asistencia en el historial.
- [ ] Revisión humana.

## Cierre

- [x] **T26-15 Documentación**: `docs/reuniones.md` (incluye «coordinador» → administrador),
  `docs/API.md`, matriz RF-17/RF-18 en `docs/enfoqueCppp.md`.
- [x] **T26-16 Revisión y entrega**: simplificación de lo tocado; revisión de calidad y
  seguridad; contraste con `definition-of-done.md` y `security-checklist.md`; lista de
  publicación; Summary/Description por tarea y versión recomendada.
- [ ] Build: ejecución manual por el usuario.

## Fuera de alcance, registrado

- [ ] HU26-16 `sesion-ambas`: bloqueado por HU-36.
- [ ] HU26-17 `difusion-masiva`: historia aparte (espiga con `mod_visitors`).
- [ ] Re-estimar HU-26a/b/c en Planning Poker (equipo).

## Evidencia HU-26 (16/11/2026)

- Espiga en Jitsi local `stable-11248-2`: la moderación `desktop` **no** impide la pantalla de un
  cliente manipulado (77 cuadros en 3 s) → se aplicó el plan B (vigilante + expulsión + revocación).
  Sala de espera, identidad JWT en la espera, expulsión y `event_sync` confirmados.
- Recorrido real (interfaz + backend + Jitsi + base aislada): enlace sin sesión → `/login`; Jitsi sin
  token rechazado; aviso de grabación obligatorio; espera y admisión; mano oculta y pantalla
  deshabilitada; expulsión desde la interfaz con 403 posterior; cliente manipulado expulsado en
  555 ms; reingreso con token anterior marcado «Expulsado» sin admitir; asistencia 89,76 % `VIRTUAL`.
- Pruebas: 342 unitarias backend, 114 frontend + 3 servidor web, 334 de integración en base vacía,
  136 E2E demo y 36 E2E reales. Tipos backend/frontend/E2E aprobados. Lint: 0 errores, 2 avisos previos.
  `git diff --check` aprobado. Mutación comprobada en el preparador (ENABLE_LOBBY=0 hace fallar la prueba).
- Una desviación de TDD: `configuracionJitsi.mjs` y su prueba se escribieron en el mismo paso;
  se compensó con la mutación anterior.
- Pendientes: build manual; revisión humana del PR; dividir y re-estimar HU-26a/b/c en Jira y
  Planning Poker; despliegue en el servidor del CPPP (HTTPS, UDP 10000/TURN, `--api=`);
  retención de `conexionesReunion` según Ley 29733; prueba de carga; confirmar si existe otro prototipo.
- Commits: los prepara el usuario (AGENTS.md). Versión recomendada: `v3.1.0.0.0`.

---

# Tareas HU-36: Modalidad por sesión y cursos híbridos

Estado: **implementado en local (16/11/2026); pendiente de revisión humana y build manual.** Criterios HU36-xx en
[SPEC.md](../SPEC.md); orden y riesgos en [plan.md](plan.md). Build y Git: manuales.

## Fase A: backend

- [x] **T36-01 Migración y derivación** — HU36-03, 06
  - Aceptación: `classes.modalidad` con check; relleno desde el curso; `GRABADO` y
    `"modalidadPlanificada"` en cursos; ningún curso cambia de modalidad al migrar.
  - Verificación: `backend/test/modalidadCurso.test.ts` (derivación) e integración de migración.
  - Archivos: `migraciones/0033-modalidadSesion.sql`, `cursos/modalidadCurso.ts`, pruebas.
- [x] **T36-02 Sesión desde el curso** — HU36-01, 02, 03
  - Aceptación: modalidad obligatoria y validada; lugar según modalidad; el curso se recalcula.
  - Verificación: `test/integracion/sesionesCurso.test.ts`.
  - Archivos: `clases/clases.validacion.ts`, `cursos/sesiones.repositorio.ts`, `cursos/cursos.rutas.ts`, prueba.
- [x] **T36-03 Sesión desde clases** — HU36-01, 02, 03
  - Aceptación: `POST/PUT /api/clases` validan y guardan la modalidad; editar y cancelar recalculan el curso.
  - Verificación: `test/integracion/clases.test.ts`.
  - Archivos: `clases/clases.routes.ts`, `clases/clases.repositorio.ts`, prueba.
- [x] **T36-04 Curso calculado y grabado** — HU36-04, 13
  - Aceptación: con sesiones, la modalidad no se cambia a mano (422); `GRABADO` sin sesiones;
    sesiones en grabado → 409 `CURSO_GRABADO`; pasar a grabado con sesiones → 409.
  - Verificación: `test/integracion/cursos.test.ts`.
  - Archivos: `cursos/cursos.validacion.ts`, `cursos/cursos.repositorio.ts`, `cursos/cursos.rutas.ts`, prueba.
- [x] **T36-05 Detalle con modalidad y sala** — HU36-05, 08
  - Aceptación: cada sesión trae `modalidad`; `reunion` solo para gestión, instructor o inscrito con acceso.
  - Verificación: integración de cursos con tres actores.
  - Archivos: `cursos/sesiones.repositorio.ts`, `cursos/cursos.repositorio.ts`, prueba.
- [x] **T36-06 Sala automática** (pregunta 3) — HU36-07, 09
  - Aceptación: sesión virtual o «ambas» crea su reunión con el mismo horario (una activa);
    cancelar o pasar a presencial cancela la programada; reunión manual en presencial → 409.
  - Verificación: `test/integracion/sesionesVirtuales.test.ts` o archivo nuevo de HU-36.
  - Archivos: `reuniones/reuniones.repositorio.ts`, `reuniones/reuniones.rutas.ts`, rutas de sesiones, prueba.
- [x] **T36-07 Asistencia por modalidad** (pregunta 4) — HU36-10, 11
  - Aceptación: QR y marcado → 409 `SESION_VIRTUAL` en virtuales; en «ambas», QR y virtual; una asistencia.
  - Verificación: `test/integracion/asistencia.test.ts` y `qr.test.ts`.
  - Archivos: `asistencia/asistencia.service.ts`, `clases/clases.routes.ts`, pruebas.
- [x] **T36-08 Certificados** (pregunta 5) — HU36-12, 15
  - Aceptación: constancias en `VIRTUAL` e `HIBRIDA` con el 80 % de ambas vías; `GRABADO` → 409.
  - Verificación: `test/integracion/certificados.test.ts`.
  - Archivos: `certificados/certificados.repositorio.ts`, prueba.

### Checkpoint A
- [x] Unitarias, integración en base vacía y tipos del backend aprobados.
- [ ] Revisión humana antes de la interfaz.

## Fase B: interfaz y demo

- [x] **T36-09 Sesiones en el detalle** — HU36-01, 02, 05, 08
  - Aceptación: selector de modalidad; lugar oculto en virtual; lista con etiqueta, lugar o
    acceso a la sala («Entrar a la sala» / «La sala se habilita al iniciar»).
  - Verificación: `SesionesCurso.test.tsx` (nuevo).
  - Archivos: `servicios/cursos.ts`, `paginas/cursos/SesionesCurso.tsx`, prueba.
- [x] **T36-10 Formulario de clases** — HU36-01, 02
  - Aceptación: modalidad en alta y edición; lugar condicional; errores del backend visibles.
  - Verificación: Vitest del esquema del formulario.
  - Archivos: `paginas/coordinador/ClaseFormPagina.tsx`, `servicios/clases.ts`, prueba.
- [x] **T36-11 Curso, etiquetas y filtros** — HU36-04, 13, 14
  - Aceptación: opción «Grabado»; modalidad calculada en lectura cuando hay sesiones; etiqueta
    «Grabado» en catálogo, detalle, historial, certificados y filtros.
  - Verificación: `formatoCurso.test.ts` y Vitest del formulario.
  - Archivos: `CursoFormPagina.tsx`, `formatoCurso.ts`, `CursosPagina.tsx`, pruebas.
- [x] **T36-12 Demo alineada** — HU36-01 a 15
  - Aceptación: los mocks aplican las mismas reglas y derivación.
  - Verificación: `mocks/sesionesCurso.test.ts`, `mocks/cursosDemo.test.ts`.
  - Archivos: `mocks/cursos.ts`, `mocks/handlers.ts`, pruebas.

### Checkpoint B
- [x] Vitest, lint y tipos aprobados.
- [ ] Revisión humana.

## Cierre

- [x] **T36-13 E2E**: curso con cuatro sesiones virtuales y una presencial → «Híbrido»; el colegiado
  ve lugar en la presencial y acceso a sala en las virtuales (demo y real).
- [x] **T36-14 Documentación**: `docs/API.md`, `docs/esp/cursos.md`, `docs/esp/certificados.md`,
  `docs/reuniones.md`, matriz en `docs/enfoqueCppp.md`.
- [x] **T36-15 Revisión y entrega**: simplificación, calidad, seguridad, DoD, lista de publicación,
  Summary/Description por tarea y versión.
- [ ] Build: ejecución manual por el usuario.

## Fuera de alcance, registrado

- [ ] HU-37: lecciones en video y certificado del curso grabado.
- [ ] HU-39: cambios a la asistencia en aula más allá de la modalidad.
- [ ] Confirmar con el CPPP el formato del híbrido (no bloquea el diseño).

## Evidencia HU-36 (16/11/2026)

- Pruebas: 346 unitarias backend (4 nuevas de modalidad), 342 de integración en base vacía
  (8 nuevas en `modalidadSesion.test.ts`), 121 frontend (6 nuevas + 1 de la demo), 3 del
  servidor web, 136 E2E demo y 37 E2E reales (1 nueva: curso híbrido 4 virtuales + 1 presencial).
  Tipos backend/frontend/E2E aprobados; lint sin errores (2 avisos anteriores).
- Cambios de contrato verificados en pruebas existentes: PRG-01 recibe `modalidad`; HU-20 ya no
  rechaza cursos virtuales y rechaza el grabado; los fixtures de HU-26 y HU53-10 que abren sala
  usan sesiones virtuales o «ambas».
- Desviación de alcance: la E2E se hizo solo con backend real; la demo se cubrió con Vitest/MSW.
- Pendientes: build manual; revisión humana; `PUT /api/cursos/:id` en el backend; `ClaseFormPagina`
  con curso crea una clase suelta en el backend real (previo a HU-36); HU-37 (lecciones y
  certificado del grabado); confirmar con el CPPP el híbrido y el cambio de la regla de constancias.
- Versión recomendada: `v3.2.0.0.0` si HU-26 se publica antes como `v3.1.0.0.0`; si van juntas, `v3.1.0.0.0`.

# HU-40 · Tareas de implementación

**SCRUM-151 · Implementado localmente**

- [x] Revisar HU-22, el catálogo, las condiciones de cobro y el servidor web.
- [x] Formular los criterios HU40-01 a HU40-06 para revisión.
- [x] Registrar línea base de Express: 3 aprobadas, 0 fallidas.
- [x] Aprobar la [especificación](../SPEC.md#hu-40--compartir-un-curso-por-whatsapp-con-enlace-corto)
  y el [plan](plan.md#hu-40--plan-de-implementación).

### T40-01 · Consultar una ficha por ID

- [x] **Aceptación** — `GET /api/publico/cursos/:id` devuelve el curso publicado
  con una lista permitida de campos y vigencia según Lima. Inválido, inexistente,
  borrador y cerrado comparten el `404`. Se verifica la protección del detalle privado.
  Cubre HU40-03, HU40-05 y HU40-06.
- [x] **Verificación** — Pruebas rojo/verde en
  `npm exec -w backend -- node --import tsx --test --test-concurrency=1 test/integracion/catalogo.test.ts`
  con servicios aislados, más la regresión de permisos.
- **Dependencia** — Aprobación. **Tamaño** — M.
- **Archivos previstos** — `cursos.rutas.ts`, `cursos.repositorio.ts`,
  `permisos.ts` y `backend/test/integracion/catalogo.test.ts`.

### T40-02 · Abrir el enlace e iniciar la inscripción

- [x] **Aceptación** — `/c/:id` muestra el curso correcto tras abrirlo y recargar.
  Una ficha vigente con cupos permite conservar la selección por acceso o alta.
  Curso sin cupos, vencido o inexistente comunica su estado. Cubre HU40-03 y HU40-05.
- [x] **Verificación** — Prueba demo rojo/verde en
  `npm run e2e -- e2e/prb/demo/catalogoPublico.spec.ts`, con escenarios de retorno
  de HU-22, fecha y cupos.
- **Dependencia** — T40-01. **Tamaño** — M.
- **Archivos previstos** — `rutas.tsx`, nueva ficha bajo `paginas/cursos/`,
  `servicios/cursos.ts`, `mocks/cursos.ts` y `e2e/prb/demo/catalogoPublico.spec.ts`.

### Punto de control tras T40-02

- [x] Abrir el enlace anónimo, iniciar sesión y volver al curso elegido.
  Confirmar que la API privada continúa protegida y el acceso no crea una inscripción.

### T40-03 · Servir el HTML de la vista previa

- [x] **Aceptación HTTP** — El primer GET de `/c/:id` expone los metadatos, la
  imagen institucional es accesible y la URL canónica usa el origen configurado.
  Título con caracteres especiales, modalidades de cobro, información parcial de fechas,
  `404` y caída del backend tienen salida verificable. Cubre HU40-02, HU40-05 y HU40-06.
- [x] **Verificación local** — Pruebas HTTP rojo/verde con
  `npm run test:servidor -w frontend`. Comprobar el HTML sin JavaScript y la
  imagen pública. Express también se verificó conectado al backend real en local.
- [ ] **Vista previa externa** — Pegar el enlace del entorno HTTPS en WhatsApp
  y Facebook para comprobar la presentación del cliente (HU40-02).
- **Dependencias** — T40-01 y ruta acordada en T40-02. **Tamaño** — M.
- **Archivos previstos** — `frontend/server.js`, `frontend/servidor.js`,
  módulo de metadatos, `frontend/test/servidor.prueba.js` e imagen en `frontend/public/`.

### T40-04 · Compartir desde las tarjetas

- [x] **Aceptación** — «Compartir» aparece para publicados en catálogos público
  y autenticado y en «Mis cursos» de gestión. El título y el enlace coinciden con
  el curso; el portapapeles cuenta con selección manual y el control funciona
  con teclado. Cubre HU40-01 y HU40-04.
- [x] **Verificación** — Prueba rojo/verde de la acción y su URL en
  `npm run e2e -- e2e/prb/demo/catalogoPublico.spec.ts`. Verificar también
  el catálogo autenticado y el control a 320 px.
- **Dependencias** — T40-02 y T40-03. **Tamaño** — M.
- **Archivos previstos** — `CursosPagina.tsx`, componente de compartir,
  configuración del origen en `frontend/.env.example` y prueba Playwright demo.

### T40-05 · Compartir desde las fichas

- [x] **Aceptación** — La ficha pública y el detalle autenticado de un publicado
  ofrecen la misma acción. Un administrador obtiene el enlace y un profesor sin
  sesión abre la ficha y vuelve al mismo curso tras el acceso. Un borrador o
  cerrado no se puede compartir. Cubre HU40-01, HU40-03, HU40-04 y HU40-05.
- [x] **Verificación** — Recorrido rojo/verde en
  `npm run e2e:real -- e2e/prb/real/catalogoPublico.spec.ts` con PostgreSQL y
  Redis aislados. Interceptar la apertura a WhatsApp para comprobar el mensaje
  sin enviar a terceros.
- **Dependencias** — T40-02 a T40-04. **Tamaño** — M.
- **Archivos previstos** — Ficha pública, `DetalleCursoPagina.tsx`,
  `e2e/prb/real/catalogoPublico.spec.ts` y documentación de API y catálogo.

### Punto de control tras T40-05

- [x] Pasar las pruebas afectadas, `npm test`, tipos y lint. Registrar revisión
  de calidad, simplificación, controles de seguridad y Definition of Done.
- [x] Documentar condiciones de publicación y plan de recuperación.
- [ ] Ejecutar el build manual y validar la vista previa en WhatsApp y Facebook
  con el origen HTTPS de entrega.
- [x] Preparar mensajes de commit manuales y versión propuesta según la base
  verificada.

### Evidencia por criterio

| Criterio | Evidencia |
| --- | --- |
| HU40-01 | Playwright abre el enlace de WhatsApp desde el detalle de un administrador y comprueba el texto decodificado con el título y el enlace. La petición externa se interceptó. |
| HU40-02 | Express entrega Open Graph e imagen PNG antes de ejecutar JavaScript, también conectado a Fastify y PostgreSQL de prueba. Queda por comprobar el pegado en los clientes reales con el origen HTTPS. |
| HU40-03 | Demo y entorno con backend real abren el enlace sin sesión y conservan el curso al entrar. Playwright verifica el enlace al registro con la selección, y que abrir o iniciar sesión no envía la solicitud de inscripción. |
| HU40-04 | Playwright comprueba catálogos, fichas, copia normal y manual, y retorno del foco con Escape. La ficha y el control se inspeccionaron a 320 px sin desborde horizontal. |
| HU40-05 | Integración verifica respuesta idéntica para ID inválido, inexistente, borrador y cerrado, y `401` en el detalle privado. La demo comprueba los estados «Sin cupos» y «Curso finalizado». |
| HU40-06 | Las pruebas HTTP cubren fechas y las modalidades de cobro. La ficha y el HTML inicial comparten las mismas funciones de presentación. |

### Resultados de verificación

| Comando | Resultado |
| --- | --- |
| `npm test` | 347 unitarias de backend, 121 de frontend y 7 del servidor Express aprobadas. |
| `npm run test:integracion` | 337 pruebas aprobadas. Se interrumpió el archivo de QR porque dejó de avanzar durante la ejecución conjunta. Sus 7 pruebas aprobaron al ejecutarlas en una base aislada. Total verificado de 344 casos. |
| `npm run e2e` | 138 casos aprobados en la primera ejecución completa y 4 aprobados al repetir los fallidos con un trabajador. Total verificado de 142 casos. |
| `npm run e2e:real` | 35 casos aprobados en la ejecución completa y 2 en el reintento. El caso restante de HU-22 aprobó al sincronizar la prueba con la redirección del navegador y repetirlo 3 veces junto a HU-40. Total verificado de 38 casos. |
| `npm run typecheck`, `npm run e2e:tipos`, `npm run lint -w frontend` y `git diff --check` | Aprobados. Lint conserva dos avisos preexistentes en `pdfTexto.ts` y `CursosPagina.tsx`. |

### Revisión de calidad y seguridad

- Se comparte la selección de campos públicos, el criterio de vigencia y el
  formato de fechas y cobro. La consulta usa el ID como parámetro. El detalle
  privado y sus permisos siguen vigentes. Los nombres de código nuevos siguen
  `AGENTS.md`.
- Los límites revisados incluyen el ID de entrada, el backend configurado con
  espera acotada y sin redirecciones, y el HTML escapado. La URL canónica sale
  de configuración. La consulta de vista previa no reenvía cookies ni
  autorización, y las respuestas del enlace usan `no-store` y `nosniff`.
- `npm audit --omit=dev` informó cero alertas. La auditoría completa de la
  instalación local informó seis paquetes de desarrollo con alertas altas.
  HU-40 no añadió dependencias. El lockfile local está ignorado por Git y la
  auditoría se debe repetir para la instalación de entrega.
- Se cotejaron los controles aplicables de Definition of Done y Security
  Checklist. Quedan pendientes el build manual, la configuración y los
  encabezados del proxy HTTPS, la vista previa externa y la revisión de
  entrega.

### Commits sugeridos para ejecución manual

| Tarea | Summary | Description |
| --- | --- | --- |
| Planificación | `docs: especificar y planificar HU-40` | Documenta los criterios de aceptación y las cinco tareas. Línea base de Express con 3 pruebas aprobadas. |
| T40-01 | `feat: consultar cursos publicados por enlace público` | Añade la consulta con campos públicos y vigencia en Lima. Pruebas de catálogo y permisos verifican visibilidad y autenticación. Build manual pendiente. |
| T40-02 | `feat: abrir una ficha pública desde el enlace corto` | Añade la ficha y conserva el curso en acceso y alta. Playwright cubre retorno tras login, vigencia, cupos e inexistencia. Build manual pendiente. |
| T40-03 | `feat: servir la vista previa social de los cursos` | Express entrega Open Graph e imagen institucional. Se verificaron HTML, formatos y errores. Build y comprobación en los clientes externos pendientes. |
| T40-04 | `feat: compartir cursos desde las tarjetas del catálogo` | Añade WhatsApp y copia normal o manual. Playwright verifica catálogo público y de gestión, teclado y ancho de 320 px. Build manual pendiente. |
| T40-05 | `feat: compartir desde las fichas públicas y privadas` | Completa el recorrido de administrador a visitante y documenta el contrato. Playwright con backend real verifica el mensaje y el retorno al curso. Build manual pendiente. |

Versión de entrega propuesta `v3.1.0.0.0` si la base efectiva al publicarla
sigue siendo `v3.0.0.0.0`. Los commits, la etiqueta y la publicación se realizan
manualmente según `AGENTS.md`.

# HU-29 · Seguimiento

- [x] Revisar productores, cola de HU-32, permisos y flujos de acceso.
- [x] Escribir la propuesta del [alcance](../SPEC.md#hu-29--notificaciones-por-correo)
  y del [orden de implementación](plan.md#hu-29--plan-de-implementación).
- [x] Aprobación de los documentos. Se autorizó la implementación.

Las pruebas de Node indicadas se ejecutan desde `backend/` con
`node --import tsx --test` seguido del archivo. Las suites de integración
usan `NODE_ENV=test` y servicios aislados. Los archivos nuevos tienen nombres
previstos que se confirman durante cada incremento.

- [x] **T29-01 · Renderizar plantillas y enlaces.** Cada variante produce
  asunto, texto y HTML con datos escapados y destino interno validado.
  - Verificar por unidad las cinco plantillas con caracteres especiales y
    orígenes válidos o rechazados. Comprobar destinos de pago, curso e historial.
  - Depende de aprobación. Renderizador, configuración de origen y prueba.
- [x] **T29-02 · Registrar resultados SMTP.** Un solo trabajador reclama
  cada aviso a la vez. Registrar aceptación o próximo intento y distinguir
  el resultado incierto del permanente o agotado.
  - Verificar `test/integracion/correoPago.test.ts` con SMTP local, rechazo
    temporal, pérdida de respuesta, reinicio, concurrencia, pausa y migración.
  - Depende de T29-01. Migración, `pagos.correo.ts`, transporte y prueba.
- [x] **T29-03 · Enviar avisos de operaciones manuales.** Conservar un solo
  comprobante o rechazo por operación, con enlace protegido y PDF si aplica.
  - Verificar `test/integracion/transferenciasPago.test.ts` y
    `test/integracion/correoPago.test.ts`, incluidos aprobación, rechazo,
    conciliación y repetición de la revisión o del hecho financiero.
  - Depende de T29-01 y T29-02. `pagos.avisos.ts`, renderizado y pruebas.
- [x] **T29-04 · Avisar rechazos definitivos de pasarela.** Encolar solo la
  transición terminal acreditada y correlacionada. Mantener el estado
  financiero ante respuestas inválidas, inciertas o repetidas.
  - Verificar contrato de pasarela, rechazo definitivo y replay.
  - Depende de T29-03. Adaptador y servicio de pagos, repositorio y pruebas.
- [x] **T29-05 · Confirmar inscripción sin pago previo.** Una inscripción
  gratuita o con cobro por constancia encola y entrega un aviso con enlace al
  curso. Un rollback o una reserva pendiente queda sin aviso.
  - Verificar `test/integracion/correoInscripcion.test.ts` con ambas modalidades,
    concurrencia, correo inválido y cambio de dirección antes del despacho.
  - Depende de T29-01 y T29-02. Migración de cola, repositorio de notificaciones,
    ciclo existente, productor de cursos y prueba.
- [x] **T29-06 · Avisar confirmación de reserva pagada.** El pago que activa
  la reserva encola la confirmación. El ingreso tardío conserva su
  comprobante y la repetición conserva la misma confirmación.
  - Verificar `test/integracion/correoInscripcion.test.ts` con pago vigente,
    tardío y repetido.
  - Depende de T29-03 y T29-05. Repositorio de pagos y prueba de inscripción.
- [x] **T29-07 · Avisar cambios de sesión.** Un cambio real o cancelación
  encola un aviso por inscrito elegible. Una edición idéntica, rechazada o
  revertida queda sin aviso.
  - Verificar `test/integracion/sesionesCurso.test.ts` y la prueba de correos
    de sesión con dos revisiones, concurrencia y destinatarios no elegibles.
  - Depende de T29-05. Rutas y repositorio de clases, productor y pruebas.
- [x] **T29-08 · Avisar emisión de constancia.** Cierre, excepción o liberación
  encolan después de guardar el documento. Retención y rollback quedan sin aviso.
  - Verificar `test/integracion/certificados.test.ts` y la prueba de liberación
    con cobro. Comprobar que una constancia anterior queda fuera del despacho.
  - Depende de T29-05. Repositorio de certificados y pruebas.
- [x] **T29-09 · Consultar resultados como administrador.** La API lista ambas
  colas con filtros, intentos, fechas y causa normalizada.
  - Verificar respuestas para admin, otros roles y anónimo. Probar paginación,
    filas históricas y ausencia de cuerpos y diagnósticos crudos.
  - Depende de T29-02 y T29-05. Ruta, matriz de permisos, consulta y prueba.
- [x] **T29-10 · Mostrar resultados en administración.** El administrador
  encuentra el aviso, su estado y la causa. El destinatario llega a su
  destino protegido después de iniciar sesión.
  - Verificar permisos, filtros, estados y enlaces con Playwright real.
  - Depende de T29-09. Cliente, pantalla, rutas o navegación y prueba E2E.

## Puntos de control

- [x] Tras T29-02, verificar exclusión concurrente, plazo SMTP, reintentos y
  resultados inciertos sin datos sensibles. Revisar migración de filas previas.
- [x] Tras T29-04, validar aprobación y rechazo de pago en SMTP local. Confirmar
  si el contrato autorizado de Izipay permite probar rechazos definitivos.
- [x] Tras T29-07, validar inscripción directa, pago vigente y sesión cambiada
  con rollback y repetición.
- [x] Tras T29-10, completar pruebas generales, revisión y simplificación.
  Cotejar Definition of Done y Security Checklist, preparar los mensajes de
  commit manuales y registrar los pasos de activación pendientes.
- [ ] Build manual, ensayo de migraciones, SMTP institucional, origen HTTPS,
  retención acordada, revisión humana y validación en entorno autorizado.

## Línea base de la planificación

- `npm run typecheck` aprobó backend y frontend.
- `node --import tsx --test test/integracion/correoPago.test.ts` aprobó
  2 casos existentes con PostgreSQL aislado y SMTP local. Uno documenta que
  hoy se reintenta tras perder la respuesta final. HU-29 propone registrar un
  resultado incierto en ese escenario.

## Verificación de la implementación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 520 aprobadas. 353 de backend, 164 de frontend y 3 de Express. Una prueba de Jitsi agotó su espera en una ejecución paralela y aprobó al repetir la suite. |
| `NODE_ENV=test npm run test:integracion` | 355 aprobadas en PostgreSQL y Redis aislados. Incluye SMTP local, rechazos firmados de prueba, cambios de sesión, permisos y rollback. |
| Playwright real de HU-29 | 2 aprobadas. Panel con filtros y modo pausado, retorno al curso tras autenticarse y acceso administrativo denegado al agremiado. |
| Playwright demo de HU-29 | 2 aprobadas. El panel indica envío pausado en escritorio y móvil. |
| Tipos, lint y espacios | `npm run typecheck`, `npm run e2e:tipos`, `npm run lint -w frontend` y `git diff --check` aprobados. Lint conserva dos avisos preexistentes. |

## Revisión de calidad y seguridad

- La cola reclama registros con `FOR UPDATE SKIP LOCKED` y comprueba su ID
  de procesamiento antes de finalizar. La prueba SMTP distingue rechazo
  temporal, definitivo, agotamiento y aceptación incierta. Una respuesta
  perdida después de los datos y un procesamiento abandonado conservan el
  estado incierto sin despacho automático.
- El cambio registra el aviso en la transacción del negocio. Las pruebas
  cubren repetición y concurrencia, reserva tardía, cambio de correo del
  titular y reversión de una emisión si falla la auditoría.
- Se revisaron los controles aplicables de Definition of Done y Security
  Checklist. La API aplica el rol ADMIN y usa una respuesta explícita con
  códigos normalizados. El renderer escapa valores, usa destinos de lista
  cerrada y se comprueba el origen HTTPS. Los enlaces reutilizan sesión y
  autorización. El procesamiento informa totales y fallos operativos sin
  incluir cuerpos, correos ni respuestas SMTP en logs.
- La auditoría de producción informó cero alertas. La auditoría completa de
  la instalación local informó seis alertas altas en desarrollo. HU-29
  conserva los manifiestos y dependencias declaradas.
- Pendientes el build manual, el ensayo con datos de entrega, el dominio
  y SMTP institucional, validar con Izipay un rechazo en su entorno
  autorizado, acordar retención y aprobar las colas históricas antes de
  activar. [Operación y reversión](../docs/correos/README.md#operar-el-envío)

## Commits propuestos para ejecución manual

| Tarea | Summary | Description |
| --- | --- | --- |
| T29-01 | `feat: generar avisos de correo con enlaces protegidos` | Renderiza asunto, HTML escapado y texto para cinco eventos. Pruebas de contenidos y orígenes aprobadas. Build manual pendiente. |
| T29-02 | `fix: distinguir reintentos y entregas SMTP inciertas` | Registra aceptación y clasifica rechazos, agotamiento y envíos abandonados. Pruebas SMTP local y concurrencia aprobadas. Build manual pendiente. |
| T29-03 | `feat: informar aprobaciones y rechazos de pago por correo` | Reutiliza el aviso de pagos manuales y conserva el PDF. Pruebas del MIME y los pagos aprobadas. Build manual pendiente. |
| T29-04 | `feat: avisar rechazos definitivos de pasarela` | Correlaciona el rechazo firmado de Izipay y lo registra una vez. Pruebas de contrato y webhook sintético aprobadas. Build y validación de pasarela pendientes. |
| T29-05 | `feat: avisar inscripciones confirmadas sin pago previo` | Integra la cola general y la confirmación de altas inmediatas. Pruebas de concurrencia, SMTP y cambio de correo aprobadas. Build manual pendiente. |
| T29-06 | `feat: avisar reservas que se confirman por pago` | Encola después de verificar la transición de la reserva. Integración de pago vigente y tardío aprobada. Build manual pendiente. |
| T29-07 | `feat: avisar cambios y cancelaciones de sesiones` | Encola cambios reales por inscrito elegible. Integración de edición concurrente, cancelación y destinatarios aprobada. Build manual pendiente. |
| T29-08 | `feat: avisar la emisión de constancias` | Registra correo con el documento persistido y cubre excepción, liberación y rollback. Pruebas de emisión aprobadas. Build manual pendiente. |
| T29-09 | `feat: consultar resultados de correo como administrador` | Añade la API con filtros, permisos, resumen y diagnóstico. Integración HTTP aprobada. Build manual pendiente. |
| T29-10 | `feat: mostrar el estado de los correos en administración` | Añade la pantalla y adapta estados visibles de comprobantes. Playwright verifica el panel y el retorno de los enlaces. Build manual pendiente. |

Versión propuesta `v3.2.0.0.0` si la próxima entrega incluye HU-29 sobre
`v3.1.0.0.0`. Los commits y la etiqueta quedan para ejecución manual.

# T-24 · Seguimiento

- [x] Revisar el código actual y registrar la especificación y el plan.
- [x] **T24-01 · Contrastar las referencias.** Reunir evidencia de ambos
  orígenes para los cinco patrones e identificar el alcance de lo observado.
  Verificar guías, ficha de curso y su distinción frente al código del CPPP.
- [x] **T24-02 · Registrar patrones para Figma.** Documentar cada decisión y su
  historia con enlaces locales. Verificar cinco patrones y cuatro historias.
  Registrar las pautas del CPPP o su disponibilidad. Depende de T24-01.
- [x] **T24-03 · Revisar la entrega.** Enlazar el resumen desde las pantallas
  de Figma, comprobar anclas y diff y documentar los pendientes. Depende de
  T24-02. Preparar el commit manual.

### Verificación y pendientes de diseño

- Se comprobaron los cinco patrones y sus cinco anotaciones, la trazabilidad
  a cuatro historias y los enlaces locales. `git diff --check` pasó. El
  alcance es documental y el build no aplica.
- La revisión se cotejó con Definition of Done y Security Checklist para
  confirmar citas, alcance y estados de acceso. El informe conserva
  autenticación y autorización en el prototipo. La evidencia usa guías y
  fichas públicas sin capturas ni datos personales copiados al repositorio.
- [x] Verificar el nodo `4:52` del sistema de diseño y registrar las cinco
  anotaciones como texto editable en [T‑24 · Referencias de cursos grabados](https://www.figma.com/design/ORSusbg35vcu0nUEz4o08q/GestionCapa?node-id=262-2950),
  en la página «Escritorio». El marco enlaza las pantallas correspondientes.
  Figma restringe las anotaciones nativas para la cuenta conectada.
- [ ] Contrastar las asociaciones propuestas de HU-17, HU-38 y HU-44 con Jira
  y añadir los enlaces oficiales a las cuatro historias. El sitio Jira
  autorizado devuelve 404 para `SCRUM-160` y no muestra el proyecto `SCRUM`.
- [ ] Incorporar las pautas del CPPP si las entrega. El encargo disponible
  identifica NR-21.

**Summary** · `docs: registrar referencias de diseño para cursos grabados`

**Description** · Compara SIFODS y PerúEduca y documenta cinco patrones para
Figma con trazabilidad a HU-17, HU-37, HU-38 y HU-44. Cobertura y enlaces locales
verificados. Las cinco anotaciones se registraron en Figma. Pendientes la
confirmación de Jira y las pautas del CPPP si las entrega.

Versión propuesta `v3.1.0.0.1` si T-24 se entrega por separado sobre
`v3.1.0.0.0`. El commit y cualquier etiqueta corresponden al usuario.

### Prototipo aprobado en GestionCapa

- [x] T24-P01 · Curso gratuito de ejemplo, acceso desde catálogo y «Mis cursos», sesión e inscripción confirmada. La ruta está disponible en modo demo.
- [x] T24-P02 · Dos videos reproducibles, avance por cuenta tras recarga, bloqueo por orden, evaluación con reintento y navegación con teclado.
- [x] T24-P03 · PDF de demostración después de completar las actividades. Recorrido verificado en escritorio y móvil.
- [x] Revisión de la definición de terminado y la lista de seguridad para el prototipo. Se probaron rol, inscripción, orden, aislamiento por cuenta y descarga.
- [x] Verificación de cierre. Pasaron 522 pruebas de `npm test` y 26 de Playwright en
  escritorio y móvil. Pasaron `typecheck`, `e2e:tipos` y `git diff --check`. El lint
  terminó con dos advertencias preexistentes. Se revisaron cinco anotaciones, cuatro
  historias y 14 enlaces locales.
- [ ] Ejecutar `npm run build` y realizar la revisión humana antes de publicar. El commit y la etiqueta se preparan para ejecución manual.

Versión propuesta para la entrega con prototipo `v3.2.0.0.0`, nivel Función
sobre la etiqueta base local `v3.1.0.0.0`.

# HU-51 · Tareas de implementación

**SCRUM-177 · Implementada, pendiente de build manual y revisión humana · 18/11/2026**

- [x] Revisar código real, demo, historial de HU-40 y cobertura existente.
- [x] Guardar la [especificación](../SPEC.md#hu-51--imagen-de-portada-del-curso-en-el-catálogo)
  y el [plan](plan.md#hu-51--plan-de-implementación) para aprobación.
- [x] Aprobación del usuario para continuar con el plan (18/11/2026).

**Secuencia por tarea** · Anotar el fallo esperado y el resultado rojo,
implementar el cambio mínimo, comprobar el verde y preparar Summary y
Description para commit manual. El usuario ejecuta el build y las
operaciones Git.

### T51-01 · Validar y procesar la portada

- [x] Aceptar archivos estáticos reales de los tres formatos, 16:9 tras
  orientación y hasta 1 048 576 bytes. Rechazar proporción inválida,
  falsos tipos, archivo corrupto o sobredimensionado. Generar variantes
  dentro del presupuesto y sin metadatos originales. HU51-01, HU51-06.
- **Verificar** · `cd backend && node --import tsx --test test/portada.test.ts`.
  Usar imágenes 16:9 reales, incluido un archivo válido rellenado mediante
  metadatos hasta el límite. Medir dimensiones, tipo y bytes de las salidas.
- **Depende de** · Aprobación. **Alcance S/M** · Procesador y pruebas en
  `backend/src/modules/cursos/` y `backend/test/`; dependencia en
  `backend/package.json`.

### T51-02 · Editar la portada mediante la API

- [x] Reemplazar, consultar en privado y quitar como admin, con lectura
  privada permitida solo a quien puede ver el curso. Un rechazo preserva la
  portada anterior y los reintentos de una misma operación convergen.
  HU51-01, HU51-04, HU51-05.
- **Verificar** · Suite de integración de portadas. Probar `401/403/404`,
  cambio de dos archivos concurrentes, carga fallida, retiro repetido y
  lectura después de reiniciar la aplicación de pruebas.
- **Depende de** · T51-01. **Alcance M** · Una migración aditiva, repositorio
  de portadas, `cursos.rutas.ts`, `permisos.ts` y
  `backend/test/integracion/portadas.test.ts`.

### T51-03 · Crear con portada en una sola operación

- [x] Crear borrador y portada juntos, o devolver un error sin que aparezca
  un nuevo curso. Una creación sin portada conserva su contrato. HU51-01.
- **Verificar** · Suites de cursos y portadas. Probar rechazos de portada e
  instructor, un fallo de almacenamiento y la creación con archivo en el
  límite válido de transporte y negocio.
- **Depende de** · T51-02. **Alcance M** · `cursos.validacion.ts`,
  `cursos.repositorio.ts`, `cursos.rutas.ts` y pruebas de integración.

### Punto de control tras T51-03

- [x] Evidencia roja y verde, migración y cursos históricos comprobados.
  Build manual pendiente del usuario.

### T51-04 · Guardar desde el formulario administrativo

- [x] Crear con portada, visualizarla al recargar y cambiarla o quitarla
  desde edición. Los errores del campo son accesibles y el fallo en un
  reemplazo conserva la portada anterior. HU51-01, HU51-05.
- **Verificar** · `npm run e2e:real -- cursos.spec.ts`. Verificar selector a
  360 px, error de proporción, persistencia y actualización sin depender de
  la edición general del curso.
- **Depende de** · T51-02 y T51-03. **Alcance M** · `CursoFormPagina.tsx`,
  `CampoPortada.tsx`, `reglasCurso.ts`, servicio de cursos y prueba real.

### T51-05 · Alinear el modo demo

- [x] Simular creación y edición de portada con los mismos resultados de
  formulario, errores relevantes y restricciones de rol. HU51-01, HU51-05.
- **Verificar** · `npm exec -w frontend -- vitest run src/mocks/cursosS3.test.ts src/mocks/cursosDemo.test.ts`
  y `npm run e2e -- cursos.spec.ts`.
- **Depende de** · T51-04. **Alcance M** · `frontend/src/mocks/cursos.ts`,
  pruebas MSW y prueba demo de cursos.

### T51-06 · Servir portadas de cursos publicados

- [x] Publicar las URLs actuales en los catálogos y el detalle autenticado,
  con archivos separados del JSON. Cada acceso directo comprueba estado,
  variante y versión vigentes. HU51-02, HU51-04, HU51-05, HU51-06.
- **Verificar** · Suites de portadas y catálogo. Probar los tres tamaños,
  cabeceras, URL antigua tras reemplazo o retiro, autorización y `404` sin
  datos de curso para borrador y cerrado.
- **Depende de** · T51-02. **Alcance M** · Repositorio, rutas, matriz de roles
  y pruebas de catálogo y portadas.

### Punto de control tras T51-06

- [x] Repetir verificación API y formulario en demo y real. Registrar
  errores, reintento, roles, versiones y estado público de los cursos.

### T51-07 · Mostrar la portada responsiva en el catálogo y el detalle

- [x] Mostrar datos debajo de la imagen, detectar pulsación y conservar
  navegación por teclado y el botón independiente. Mantener texto
  alternativo, respaldo de categoría, ancho de 360 px y portada grande.
  HU51-02, HU51-03, HU51-04, HU51-05, HU51-06.
- **Verificar** · `npm run e2e -- catalogo.spec.ts catalogoPublico.spec.ts`
  y `npm run e2e:real -- catalogo.spec.ts catalogoPublico.spec.ts`. Verificar
  dimensiones y bytes descargados, foco, toque, dos categorías y error
  de descarga. Incluir fuente real seleccionada en la evidencia.
- **Depende de** · T51-05 y T51-06. **Alcance M por tramo** · Primero el
  componente común y sus contratos visuales en `piezasCurso.tsx` y su fuente
  de respaldo. Después `CursosPagina.tsx` y las pruebas Playwright. Usar
  las fichas existentes y ajustar sus llamadas si hace falta.

### T51-08 · Recuperar el enlace público de HU-40

- [x] Una visita anónima consulta la ficha por ID y puede obtener el enlace
  HTTPS estable, con los estados de inscripción de HU-22 y una lista
  explícita de datos públicos. HU51-04, HU51-07.
- **Verificar** · Suite de catálogo y `npm run e2e:real -- catalogoPublico.spec.ts`.
  Probar publicado vigente, vencido, sin cupos, borrador y cerrado, y
  conservar el ID al ir al acceso. Verificar integridad del origen configurado.
- **Depende de** · T51-06. **Alcance M por tramo** · Rutas, proyección,
  permisos y prueba de integración. En el cliente, alias de ruta React y
  prueba de catálogo público.

### T51-09 · Servir el HTML inicial con portada para WhatsApp

- [x] Responder el enlace corto y la ficha pública con Open Graph y la
  portada visible actual o el raster de categoría. Manejar errores de
  configuración y backend de forma diferenciada. HU51-05, HU51-07.
- **Verificar** · `npm run test:servidor -w frontend`. Probar HTML sin
  JavaScript, origen, escape, dimensiones, título y descarga del recurso.
  Validar el enlace generado en Playwright y en WhatsApp sobre HTTPS
  autorizado cuando el entorno esté disponible.
- **Depende de** · T51-07 y T51-08. **Alcance M por tramo** · Módulo de
  metadatos, Express y pruebas de servidor. Recursos raster de respaldo
  del mismo sistema de categorías, con una prueba de correspondencia.

### Punto de control tras T51-09

- [x] Relacionar HU51-01 a HU51-07 con productos de pruebas y evidencia real.
- [x] Simplificar el código tocado y repetir tipos, lint, unitarias,
  integración y Playwright. Actualizar los contratos y guías afectados.
- [x] Cotejar Definition of Done y Security Checklist en
  `~/.agents/agent-skills/references/`. Revisar permisos, entradas, límites,
  dependencia de imagen, contenido público, HTML, caché y logs.
- [ ] Registrar build manual y prueba externa pendientes hasta contar con
  evidencia. Completar revisión humana y preparación de salida, sin publicar.

### Comandos y evidencia

- Integración aislada, desde `backend/` con PostgreSQL y Redis de pruebas:
  `NODE_ENV=test DB_NAME=gestioncapa_hu51_test node --import tsx --test --test-concurrency=1 test/integracion/portadas.test.ts test/integracion/cursos.test.ts test/integracion/catalogo.test.ts`.
- Cierre: `npm run typecheck`, `npm run lint -w frontend`,
  `npm test`, `npm run e2e:tipos` y `git diff --check`, además de los
  recorridos de arriba. `npm run build` es manual.
- Línea base antes de la implementación: **19 pruebas de Vitest y 3
  de Express aprobadas**. La prueba de Vitest cubre el contrato simulado.
  Express cubre el proxy actual. La cobertura de HU-51 queda pendiente.

### Evidencia de la entrega

| Criterio | Pruebas |
| --- | --- |
| HU51-01 | `backend/test/portada.test.ts`, integración `portadas.test.ts`, MSW `cursosS3.test.ts`, Playwright `cursos.spec.ts` demo y real |
| HU51-02, HU51-03 | Playwright `portadaCatalogo.spec.ts` demo y real: orden visual, hover, pulsación, Enter, «Compartir» |
| HU51-04 | `portadas.test.ts` (URLs por versión), `portadaCatalogo.spec.ts` (detalle y ficha `/c/:id` con `grande`) |
| HU51-05 | `portadaCatalogo.spec.ts` (dos categorías y fallo de descarga), prueba de correspondencia raster en `servidor.prueba.js` |
| HU51-06 | `portadaCatalogo.spec.ts` real: `miniatura` ≤ 90 KiB con DPR 1 y `tarjeta` ≤ 180 KiB con DPR 2 a 360 px, sin desborde |
| HU51-07 | `catalogo.test.ts` (ficha y enlace), `servidor.prueba.js` (Open Graph sin JavaScript, escape, 404/502/503) |

- Rojo observado: MSW (2 fallos), integración T51-06 y T51-08 (1 y 3), cliente T51-08 (3),
  Playwright demo T51-07 contra los componentes previos y Express T51-09 (3).
- Verde: 370 unitarias backend; 369/370 de integración (HU29 falla solo con
  notificaciones pendientes de otras suites en la base compartida; aislada pasa 6/6);
  167 Vitest y 7 Express; Playwright 146 demo y 42 real; tipos, lint (2 advertencias
  previas) y `git diff --check`.
- Pendientes: build manual, prueba de WhatsApp en HTTPS autorizado, configurar
  `catalogoOrigenPublico` y revisión humana. `package-lock.json` está ignorado por Git.

# HU-54 · Tareas de implementación

## Preparación documental

- [x] Revisar la API, los dos puntos de entrada del cliente, los adaptadores,
  el esquema financiero, el envío SMTP y las pruebas existentes.
- [x] Incorporar la historia original, contrastar T-25 y la documentación de
  Izipay, y redactar [la especificación](../SPEC.md#hu-54--pago-en-línea-con-pasarela-intercambiable)
  y [el plan](plan.md#hu-54--plan-de-implementación).
- [x] Línea base. Backend 8/8 aprobadas con `node --import tsx --test test/izipay.test.ts test/culqi.test.ts test/pagosConfiguracion.test.ts` desde `backend/`.
  Frontend 11/11 aprobadas con `npm exec -w frontend -- vitest run src/servicios/pagos.test.ts src/paginas/cursos/PagoCurso.test.tsx`.
- [x] Aprobación de la especificación y el plan mediante la instrucción de implementar.

## Incrementos tras la aprobación

### T54-01 · Despachar la conciliación histórica

- [x] Mantener las rutas y los resultados existentes. Despachar IPN y
  recuperación por adaptador, con capacidades separadas para altas y resolución.
- [x] Verificar con dos adaptadores registrados. Apagar o quitar uno del
  registro deja operativo el otro, y apagar solo altas preserva IPN y consulta.
- **Comprobación** Node focalizado y `cobroCurso.test.ts` aislado. Casos de
  Izipay, Culqi histórico, recuperación y proveedor desconocido.
- **Depende de la aprobación** · M, 3–5 archivos previstos en
  `backend/src/modules/pagos/` y sus pruebas.

### T54-02 · Persistir el desglose por intento

- [x] Migrar el catálogo de medios y admitir desglose y correlación en
  nuevas operaciones en línea. Conservar montos, medios, estados y sesiones
  de las filas históricas y restricciones de exclusión.
- [x] Comprobar que un proveedor registrado de pruebas puede reservar un
  intento y ser leído tras quitar su adaptador de ejecución.
- **Comprobación** migración sobre una base de pruebas con historial y
  `pagosCurso.test.ts` para restricciones, compatibilidad y redondeo en céntimos.
- **Depende de T54-01** · M, 3–5 archivos previstos entre migración, repositorio,
  modelo e integración.

### Punto de control tras T54-02

- [x] Verificar historial, registro, exclusión de intentos y compatibilidad de
  los endpoints actuales con clientes en uso. Adjuntar pruebas rojas y verdes.

### T54-03 · Cotizar y reservar un pago consentido

- [x] Ofrecer opciones e importe del servidor para el propietario autorizado.
  Rechazar antes del proveedor si la cotización caducó, cambió o no corresponde
  a la opción elegida. Reservar el desglose bajo la exclusión existente.
- [x] Repetir una solicitud con igual clave conserva intento y total al
  cambiar la configuración. Cambiar proveedor, instrumento o consentimiento
  con esa clave genera conflicto. Conservar la recuperación histórica.
- **Comprobación** integración API/BD con adaptador controlado en
  `pagosCurso.test.ts` y `cobroCurso.test.ts`, incluidos permisos, paralelismo,
  efecto de flags, cambio de tarifa y error del proveedor.
- **Depende de T54-02** · M, 3–5 archivos previstos en rutas, servicio
  y pruebas de backend.

### T54-04 · Aplicar resultados auténticos de Izipay

- [x] Usar el total persistido para iniciar y verificar Izipay. Cubrir tarjeta
  y Yape con las formas oficiales y validar el resultado antes de cambiar la
  deuda. Aislar la compatibilidad con intentos históricos en el adaptador.
- [x] Diferenciar rechazo, cancelación acreditada e incertidumbre. Conservar
  la conciliación para discrepancias, múltiples autorizaciones y pagos tardíos.
- **Comprobación** `izipay.test.ts` y `cobroCurso.test.ts`. Usar fixtures de
  prueba depurados para firma, identificadores, comercio, entorno, orden,
  instrumento, importe, moneda, revisión de orden y repeticiones.
- **Depende de T54-03** · M, 3–5 archivos previstos en adaptador y verificación,
  transición transaccional y pruebas.

### Punto de control tras T54-04

- [x] Comprobar que el total consentido es el enviado y el verificado, que la
  deuda base y las reservas respetan HU-53 y que ningún error indeterminado
  ofrece otro cargo. Registrar aparte el estado del ensayo sandbox oficial.

### T54-05 · Entregar el comprobante registrado

- [x] Correo y descarga autorizada usan el desglose registrado del pago,
  con una cola por confirmación y el PDF coherente con el hecho financiero.
- [x] Repeticiones y fallo SMTP conservan la confirmación. La descarga
  es privada, disponible tras la confirmación y funciona con datos históricos.
- **Comprobación** `correoPago.test.ts` y `cobroCurso.test.ts` en entorno de
  pruebas, incluidos PDF, propietario, ADMIN, tercero y repetición.
- **Depende de T54-04** · M, 3–5 archivos previstos en avisos, PDF, rutas y
  pruebas de integración.

### T54-06 · Mostrar el total y abrir el checkout

- [x] Mostrar en la ruta principal solo las opciones habilitadas. El
  instrumento elegido y su total llegan al SDK del proveedor registrado.
- [x] Al cambiar o caducar la cotización se solicita nueva confirmación.
  El formulario propio contiene únicamente la selección y el consentimiento.
- **Comprobación** Vitest y MSW con `npm exec -w frontend -- vitest run src/servicios/pagos.test.ts`
  más la prueba nueva de pantalla o SDK. Navegador demo con
  `npm run e2e -- pagoEnLinea.spec.ts` tras incorporar ese archivo.
- **Depende de T54-03 y T54-04** · M, 3–5 archivos previstos en cliente API,
  registro de checkout, pantalla, MSW y pruebas.

### T54-07 · Mostrar el estado verificado

- [x] Diferenciar aprobación, rechazo, cancelación e incertidumbre desde
  los estados de la API. Recarga y callback duplicado muestran el mismo
  resultado. Una operación activa usa recuperación o consulta.
- [x] La confirmación presenta el total registrado, descarga y estado
  real del comprobante. El foco y los avisos son accesibles.
- **Comprobación** Playwright demo y real `pagoEnLinea.spec.ts` y componente
  en Vitest. Cubrir cierre, error de red, rechazo firmado y aceptación SMTP.
- **Depende de T54-05 y T54-06** · M, 3–5 archivos previstos en pantalla,
  presentación compartida de estados y pruebas.

### Punto de control tras T54-07

- [x] Recorrer cotización, autorización, mensaje final y comprobante desde
  el navegador con API de prueba. Probar teclado, recarga y pantalla estrecha.

### T54-08 · Usar el mismo recorrido en el historial

- [x] Reusar cotización, recuperación y estados de la ruta principal en
  `PagoCurso`. Confirmar antes de abrir el SDK también desde el historial.
- [x] Mantener las reglas de constancias y reserva vencida, y la consulta
  de documentos y transferencias previas.
- **Comprobación** `npm exec -w frontend -- vitest run src/paginas/cursos/PagoCurso.test.tsx`
  y recorridos de historial o constancia en integración y navegador.
- **Depende de T54-07** · M, 3–5 archivos previstos en componentes y pruebas.

### T54-09 · Verificar la continuidad de BCP y efectivo

- [x] Ejercitar BCP con voucher y revisión autorizada, y efectivo con
  registro ADMIN por el importe base, al cambiar disponibilidad de adaptadores.
- [x] Verificar coexistencia de notificación externa tardía y abono manual
  previamente realizado sin duplicar efectos, y recorrido completo en navegador
  con los servicios de pruebas.
- **Comprobación** `transferenciasPago.test.ts`, `voucherPago.test.ts`,
  `pagosCurso.test.ts`, `npm run e2e -- pagoEnLinea.spec.ts` y
  `npm run e2e:real -- pagoEnLinea.spec.ts transferenciaPago.spec.ts`.
- **Depende de T54-07 y T54-08** · M, 3–5 archivos previstos en fixtures y
  pruebas de integración o navegador.

### T54-10 · Documentar puesta en marcha y reversión

- [x] Actualizar contrato API y procedimiento de configuración por entorno,
  retiro y recuperación. Simplificar lo tocado y revisar calidad y seguridad
  contra las dos referencias requeridas.
- [x] Entregar evidencia y mensajes de commit manuales, versión revisada
  y pendientes concretos de sandbox oficial, build y publicación.
- **Comprobación** `npm run typecheck`, `npm run lint -w frontend`, `npm test`,
  `npm run e2e:tipos`, `git diff --check` y regresiones de los controles
  anteriores. `npm run build` queda a cargo del usuario.
- **Depende de T54-09** · S, 1–2 archivos previstos en documentación operativa
  y contrato API además del registro de evidencia. Si la revisión detecta un
  defecto, registrar un incremento focalizado y su prueba de regresión.

### Punto de control tras T54-10

- [x] Trazar HU54-01 a HU54-07 a resultados observados. Registrar evidencia
  de sandbox externo para tarjeta y Yape, o el impedimento específico.
- [ ] Confirmar comisión, métodos contratados, destino BCP, HTTPS/IPN, SMTP,
  respaldo, monitoreo y reversión antes de habilitar producción. Registrar
  revisión humana, build manual y SHAs que aporte el usuario.

## Evidencia de HU-54

| Criterio | Verificación local |
| --- | --- |
| HU54-01 | Unidad de redondeo con 0 explícito y límite de precisión. API/BD verifica la cotización vencida, importe manipulado, carreras, tarifa cambiada y recuperación. Playwright comprueba el desglose antes de pagar. |
| HU54-02 | Aprobación firmada y repetida, hecho financiero, PDF privado y cola únicos. SMTP de prueba acepta el comprobante de Yape con el importe cobrado. |
| HU54-03 | Playwright demo verifica rechazo; Playwright con API real y SDK sustituido verifica cierre, bloqueo de otro cargo, cancelación firmada y persistencia al recargar. |
| HU54-04 | Firma del payload original, comercio, orden, instrumento y monto se verifican antes de confirmar. El SDK del proveedor recibe los datos de pago. La aplicación descarta el cuerpo de su callback en el navegador y procesa IPN en memoria. |
| HU54-05 | Registro con dos adaptadores y prueba de desactivación. Izipay concilia con altas apagadas. Regresiones reales de Culqi, transferencia con voucher y efectivo. |
| HU54-06 | UI demo y Playwright con la API real ejercitan la integración simulada. Pendiente el ensayo frente al sandbox oficial, con credenciales y medios habilitados por Izipay. |
| HU54-07 | Migración `0039 → 0040` ensayada con hechos previos de los cuatro medios. Pruebas de idempotencia, conciliación tardía, vencimiento, carreras con transferencias y recuperación tras caída. |

- **Rojo observado.** Registro y cotizador inexistentes en la unidad inicial,
  oferta ausente en la API, región de desglose ausente en Chromium, error de
  precisión en importes extremos y tasa vacía interpretada como cero.
- **Verde local.** `npm test` con 381 unitarias backend, 167 Vitest y 7 Express.
  Integración completa 376/376, Playwright demo 4/4 y Playwright con API real 3/3.
  Tipos de los workspaces y de Playwright, lint con dos advertencias previas,
  y `git diff --check`. La auditoría de dependencias de producción con el
  lockfile local reportó cero avisos. El lockfile no está versionado.
- **Revisión.** Se verificaron permisos por obligación, estado privado
  y no almacenable en caché, entrada acotada, firma previa al acceso a la BD,
  separación de entornos, idempotencia, migración y ausencia de datos de
  tarjeta y de códigos Yape en persistencia y logs de GestionCapa.
  Se revisaron también accesibilidad por teclado, pantalla de 360 px, errores
  de consola de la aplicación y el procedimiento de reversión. La revisión
  usó `definition-of-done.md` y `security-checklist.md`.
- **Salida pendiente.** Completar el sandbox oficial, aplicar la migración
  en el destino, validar tarifa, BCP, HTTPS e IPN y SMTP institucionales,
  ejecutar build manual y obtener revisión humana antes de habilitar producción.
  [Guía de operación](../docs/esp/hu54Pagos.md)

## Mensajes de commit sugeridos

Los commits y la etiqueta los ejecuta el usuario. Versión única propuesta
para la entrega `v4.0.0.0.0` sobre `v3.1.0.0.0`. El contrato HTTP de nuevos
intentos exige instrumento y cotización.

El build manual queda pendiente para la entrega y el ensayo oficial queda
pendiente para las tareas que se prueban con un proveedor sustituido.

| Tarea | Summary | Description |
| --- | --- | --- |
| T54-01 | `refactor: despachar la conciliación por adaptador de pago` | Separa altas, notificaciones y recuperación. Pruebas de registro, permisos e integración con Culqi e Izipay. |
| T54-02 | `feat: conservar el desglose por intento de pago` | Persiste medio, instrumento, comercio, orden y total. Migración ensayada con hechos históricos de los cuatro medios. |
| T54-03 | `feat!: exigir la cotización aceptada al iniciar un pago` | Aplica cotización firmada e idempotencia. Pruebas de vigencia, concurrencia, propiedad, redondeo y recuperación. |
| T54-04 | `feat: verificar resultados de tarjeta y Yape con Izipay` | Correlaciona estados y total con el intento. Pruebas de IPN con respuestas firmadas, rechazo, cancelación y repeticiones. |
| T54-05 | `feat: entregar el comprobante del importe cobrado` | Ofrece PDF privado y encola el comprobante del hecho financiero. Pruebas de permisos, duplicados y SMTP local. |
| T54-06 | `feat: mostrar el total antes de abrir el checkout` | Presenta el desglose por instrumento en el recorrido principal. Pruebas Vitest y Playwright. |
| T54-07 | `fix: reflejar el resultado verificado del pago` | Presenta estados de operación y comprobante a partir del servidor. Playwright verifica recarga y cierre del checkout. |
| T54-08 | `improve: reutilizar el pago en línea desde el historial` | Reusa desglose y recuperación junto a la consulta de pagos pasados y constancias. Regresiones en Vitest e integración. |
| T54-09 | `test: verificar pagos en línea y medios manuales en navegador` | Prueba pago en línea, transferencia con voucher y continuidad de efectivo. Checkout simulado con API y PostgreSQL reales. |
| T54-10 | `docs: documentar activación y reversión del pago en línea` | Actualiza el contrato API, variables, verificación y procedimiento de operación. Se revisó el diff documental. |

# T-26 · Tareas backend en capas

Plan: [plan.md](plan.md#t-26--plan-backend-en-capas). Estado: aprobado el 24/11/2026; T0–T8 implementadas. Build y commits: manuales del usuario.

## Preparación documental
- [x] Especificación, inconsistencias y criterios de aceptación en `SPEC.md`.
- [x] Soluciones existentes evaluadas (repositorio, npm, web/GitHub, Astryx, skills).
- [x] Plan y desglose de tareas.
- [x] Aprobación del usuario y respuesta a las preguntas abiertas.

## Base
- [x] T0: integración local en puertos alternos (requiere autorización) y línea base.
  - Acepta: 189 pruebas de integración ejecutadas; los fallos previos, si los hay, quedan registrados.
- [x] T1: `test/arquitectura.test.ts` con el verificador de capas.
  - Acepta: rechaza `pg` en controladores, `fastify` en servicios, imports de servicios en repositorios y cualquier import en entidades; acepta `import type` de repositorios en servicios.
  - Verifica: `npm test -w backend` (rojo y luego verde).
- [x] T2: `ErrorAplicacion`, `conTransaccion`, `Consultor` y `esViolacionUnica` en `shared`.
  - Acepta: el manejador devuelve el estado, `code` y `message` del error; la transacción hace commit/rollback y siempre libera el cliente.
  - Verifica: unitarias, `npm run typecheck -w backend`.

### Punto de control: base común
- [x] Unitarias y tipos en verde; ningún comportamiento cambiado.

## Piloto 1: usuarios
- [x] T3: entidad, DTO, repositorio y servicio con pruebas unitarias (actor no admin, cuenta propia, correo duplicado, inexistente, auditoría, sin clave en la respuesta).
- [x] T4: controlador, `usuarios.module.ts`, `app.ts`; eliminar `usuarios.rutas.ts`; módulo en la prueba de arquitectura.
  - Verifica: integración `usuariosCppp`, `roles`, `rolesCppp`, `permisos` sin cambiar aserciones.

### Punto de control: primer piloto
- [x] Patrón aplicado en asistencia con la aprobación general del plan («implementa»); queda a revisión del usuario.

## Piloto 2: asistencia
- [x] T5: entidad, DTO, repositorio y servicio con dependencias inyectadas y pruebas de todos los rechazos.
- [x] T6: controlador, `asistencia.module.ts`, `app.ts`; eliminar archivos planos; ajustar `cobroCurso.test.ts` y `test:cobertura`.
  - Verifica: integración `asistencia`, `cobroCurso`, `sesionesCurso`, `modalidadSesion`, `sesionesVirtuales`, `certificados`; cobertura ≥ 60 %.

### Punto de control: suite completa
- [x] Unitarias, tipos e integración completas en verde.

## Cierre
- [x] T7: `docs/arquitecturaBackend.md`, `docs/decisions/002-capasBackend.md` y README.
- [x] T8: simplificación, revisión de calidad y seguridad, DoD, versión `v3.1.0.0.1` y mensajes de commit.
- [ ] Build: ejecución manual por el usuario.

## Evidencia T-26 (24/11/2026)

- Entorno: Postgres y Redis de gestioncapa en 55432/56379 (5432/6379 ocupados por otro proyecto);
  integración con `DB_PORT=55432 REDIS_URL=redis://:…@localhost:56379`.
- Línea base: tipos OK; 383/383 unitarias; integración 369/376 + 7/7 de HU43 con `NODE_ENV=test`.
- Final: tipos OK; 418/418 unitarias (35 nuevas: arquitectura 12, usuarios 9, asistencia 11, transacción 2, VAL-05 1);
  integración 370/377 + 7/7 de HU43 con `NODE_ENV=test`; cobertura de asistencia 98,7 % líneas, 90,7 % ramas.
- Mutaciones (5) detectadas por las pruebas unitarias.
- Revisión: se detectó y corrigió que el id del actor llega como texto (bigint de pg) y anulaba CUENTA_PROPIA;
  prueba de regresión en `usuariosCppp.test.ts`.
- Hallazgos previos ajenos: HU43 exige `NODE_ENV=test`; HU29 `correoPago` intermitente (la cola no filtra por curso);
  `roles.test.ts` deja un bloqueo de 15 min en Redis al repetirse; `findUserById` devuelve `id` texto con tipo number.
- Build: pendiente de ejecución manual por el usuario.

## Ampliación: capas globales y migración completa (24/11/2026)
- [x] Reestructurar a carpetas globales por capa (`src/<capa>/<componente>/`) con `routes/` como composición.
- [x] F2 `qr`, `health`, `pendientes`, `jitsi`, `historial`, `notificaciones`.
- [x] F3 `auth`.
- [x] F4 `reuniones`, `clases` (modalidad compartida con cursos en `entities/cursos`).
- [x] F5 `cursos` (servicio de inscripción separado del SQL).
- [x] F6 `pagos`, `certificados` (`ErrorPago` hereda de `ErrorAplicacion`; `ErrorCertificado` eliminado).
- [x] F7 parcial: semillas en `src/seeds/`, procesos en `src/jobs/`, `src/modules` eliminado.
- [ ] F7 pendiente: `dependency-cruiser` (requiere autorización) y `.archify` desactualizado.
- Evidencia final: tipos OK; 497/497 unitarias; integración 376/377 con `NODE_ENV=test`
  (fallo previo de HU29 por avisos pendientes que dejan otras pruebas); cobertura de asistencia 100 % líneas, 91,7 % ramas.
- [ ] Build: ejecución manual por el usuario.


## HU-39 · Asistencia presencial con QR personal o DNI

[Tareas y puntos de control](../docs/esp/sprints/asistencia-presencial/hu-39/todo.md) en el sprint Asistencia presencial.
