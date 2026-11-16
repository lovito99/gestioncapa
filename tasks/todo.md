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
