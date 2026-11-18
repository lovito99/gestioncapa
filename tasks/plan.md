# Plan de implementación CPPP

Fuente: T-23 / SCRUM-121 y Requisitos GestionCapa CPPP v4.0, 27/10/2026,
proporcionados por el usuario. Alcance elegido: todos los requisitos por etapas.
El detalle y la evidencia se mantienen en [la matriz](../docs/enfoqueCppp.md).

El calendario del producto se conserva: Sprint 2 (27/10–09/11/2026), certificados
con QR; Sprint 3, pagos y sesiones virtuales seguras antes del evento de fines
de noviembre. Las etapas técnicas siguientes no reemplazan esa prioridad ni
fijan fechas no proporcionadas. Véase [T-23](../docs/esp/reestructuracionCppp.md).

| Etapa | Resultado verificable | Dependencias |
|---|---|---|
| 1. Base institucional y acceso | Identidad CPPP, catálogo público, sesión revocable, bloqueo y límites | PostgreSQL y Redis existentes |
| 2. Personas y afiliación | Perfil, recuperación, usuarios, sedes y padrón habilitado | Contrato del padrón, SMTP y política de altas |
| 3. Formación | Edición real de cursos, categorías/etiquetas, sesiones y avisos | Etapa 2 y notificaciones |
| 4. Aprendizaje | Avance, evaluaciones, intentos adicionales y foro | Etapas 2–3 |
| 5. Pagos | Pasarela, BCP, efectivo, confirmación y comprobantes | Pasarela aprobada, comisiones, cuenta BCP, SMTP |
| 6. Certificación | Cierre con asistencia/nota/pago, excepción, firma, QR, anulación y auditoría | Etapas 3–5 y firma autorizada del Decano |
| 7. Videoconferencia | Jitsi propio, control real de pantalla/expulsión y asistencia | Servidor y despliegue Jitsi aprobado |
| 8. Consulta y operación | Historial completo, horas, reportes PDF/Excel, paneles, rendimiento y respaldo | Etapas anteriores y servidor del CPPP |

La vista MSW o una ruta pendiente no acredita una funcionalidad del backend.
Cada etapa verifica permisos, errores, persistencia y recorrido de usuario.
No se ejecutan builds, cambios de versión ni operaciones Git de escritura.
No se inventan credenciales, pagos, afiliados habilitados ni firmas.

La URL sugerida capacitacion.cpppregion-cusco.com y el presupuesto de 5 USD
son requisitos del documento, no un despliegue o una capacidad ya contratados.
El documento no especifica API/esquema del padrón, pasarela, SMTP, acceso al
servidor ni firma autorizada. Las reglas HU-20 v2 se recibieron y se documentan
en [certificados](../docs/esp/certificados.md). Las integraciones y firmas
se deben aportar antes de dar por completadas las etapas correspondientes.

---

# Plan HU-53: Modalidad de cobro por curso

## Estado y alcance

Plan de implementación del 15/11/2026 basado en [SPEC.md: HU-53](../SPEC.md#hu-53-modalidad-de-cobro-por-curso).
El usuario aprobó el mapa de cuatro bloques y confirmó efectivo presencial.
El usuario autorizó después implementar y continuar. Se añade esta sección sin
sustituir el plan CPPP. El resultado local y los pendientes de sandbox/entrega
figuran en [la guía operativa](../docs/esp/cobroCursos.md).
Las tareas verificables se registran en [todo.md: HU-53](todo.md#tareas-hu-53-modalidad-de-cobro-por-curso).

Resultado: tres modalidades, dos pasarelas reales y efectivo auditado; condiciones
congeladas por inscripción; expiración, acceso y entrega de constancias coherentes.
HU-53 incluye dependencias de HU-32/RF-22/RF-24/RF-25 y no se estima solo como un
selector de formulario. Planning Poker lo realiza el equipo.

## Decisiones de diseño implementadas

1. Mantener la estructura Fastify/pg/React existente. `politica-cobro` ofrece condiciones;
   `pagos-cursos` confirma hechos financieros; `inscripcion-acceso` y `constancias` los
   aplican sin que pagos importe esos módulos. Sin bus genérico ni tarjeta en backend.
2. Usar importe exacto en céntimos/PEN, snapshot de condiciones por intento y estado
   financiero independiente del académico. Mantener `costo` y estados históricos.
3. Completar la edición del cobro con PATCH acotado y control explícito en la interfaz;
   no usar el PUT general inexistente para aparentar persistencia.
4. Centralizar idempotencia y exclusión de intentos activos entre Izipay, Culqi y
   efectivo. Timeout significa conciliación pendiente, no permiso para cobrar otra vez.
5. Expansión de esquema y habilitación separadas. No aceptar nuevas inscripciones en
   ofertas de pago sin condiciones completas ni ofrecer una pasarela sin configurar.
   Cada tramo debe conservar el comportamiento compatible previo mientras no se active.
6. Control de acceso efectivo por BD/servidor, no por botón oculto. Reloj leído después
   de bloqueos; ordenar también los locks existentes de asistencia/clases.
7. Retención financiera separada de validez documental. Capturar elegibilidad al cierre
   y emitir tras pago sin reabrir curso; conservar la marca de demostración vigente.

El siguiente orden respeta las dependencias del mapa y prioriza los riesgos de
proveedores y concurrencia. Los primeros seis tramos completan recorridos de crear,
editar y consultar la oferta; el núcleo de pagos precede a la activación de reservas.
Los cambios de esquema son aditivos y se incorporan solo donde cada recorrido los necesita.

## Tareas ordenadas

Cada tarea tiene hasta tres condiciones verificables y aproximadamente 3–5 archivos,
incluidas sus pruebas. Si el impacto real excede ese tamaño, dividirla antes de
implementarla y actualizar este plan; no ocultar cambios masivos en ajustes de fixtures.

| Id | Incremento verificable | Depende de | Criterios principales |
| --- | --- | --- | --- |
| H53-P01 | Validar modalidad, monto y plazo sin persistencia | — | HU53-01 |
| H53-P02 | Crear y consultar curso con política persistida | P01 | HU53-01 |
| H53-P03 | Crear curso desde formulario con modalidades | P02 | HU53-01 |
| H53-P04 | Editar condiciones futuras mediante PATCH real | P02 | HU53-02 |
| H53-P05 | Editar cobro desde control administrativo explícito | P03, P04 | HU53-02 |
| H53-P06 | Mostrar modalidad y monto antes de inscripción | P03, P05 | HU53-03 |
| H53-P07 | Persistir obligación y hechos financieros idempotentes | P02 | HU53-07, HU53-08 |
| H53-P08 | Exponer consulta e inicio autorizados de pago | P07 | HU53-07, HU53-08 |
| H53-P09 | Verificar Izipay contra su contrato oficial | P08; cuenta sandbox | HU53-04, HU53-08 |
| H53-P10 | Verificar Culqi contra su contrato oficial | P08; cuenta sandbox | HU53-05, HU53-08 |
| H53-P11 | Registrar efectivo administrativo auditado | P08 | HU53-06, HU53-07 |
| H53-P12 | Recuperar cobros inciertos y notificaciones pendientes | P09, P10, P11 | HU53-07, HU53-13 |
| H53-P13 | Inscribir con snapshot, reserva e intento estable | P06, P07, P12 | HU53-02, HU53-09, HU53-12, HU53-17 |
| H53-P14 | Cancelar reservas vencidas y reutilizar cupos | P13 | HU53-11, HU53-12, HU53-13 |
| H53-P15 | Proteger detalle de contenido y descargas | P13, P14 | HU53-10 |
| H53-P16 | Proteger asistencia e inscripción manual en sesiones | P15 | HU53-10, HU53-12 |
| H53-P17 | Proteger reuniones y credenciales de acceso | P15 | HU53-10 |
| H53-P18 | Pagar desde checkout Izipay y consultar resultado | P09, P12, P13 | HU53-04, HU53-09, HU53-12 |
| H53-P19 | Pagar desde checkout Culqi y recuperar rechazo | P10, P18 | HU53-05, HU53-07 |
| H53-P20 | Registrar efectivo desde administración | P11, P13 | HU53-06 |
| H53-P21 | Consultar deuda e inscripción separadas en historial | P13, P14 | HU53-18 |
| H53-P22 | Mostrar estados independientes al participante | P18, P19, P21 | HU53-18 |
| H53-P23 | Cerrar curso y retener elegibilidad sin emitir | P12, P13, P16 | HU53-14, HU53-16, HU53-17 |
| H53-P24 | Liberar constancia pagada tras cierre, una sola vez | P23 | HU53-15, HU53-16, HU53-17 |
| H53-P25 | Mostrar retención y entrega en vistas de constancias | P22, P24 | HU53-14, HU53-18 |
| H53-P26 | Ensayar regularización histórica y recuperación | P14, P24; reglas históricas aprobadas | HU53-19 |
| H53-P27 | Verificar recorridos reales y ambos sandboxes | P17, P19, P20, P25, P26 | HU53-01 a HU53-20 |
| H53-P28 | Simplificar y revisar calidad y seguridad | P27 | HU53-08, HU53-20 |
| H53-P29 | Preparar entrega y condiciones de publicación manual | P28; build del usuario | HU53-19, HU53-20 |

Las dependencias Pxx en la tabla significan H53-Pxx. La lista detallada en todo.md
incluye verificaciones y archivos propuestos, no archivos creados.

## Checkpoints y forma de trabajo posterior a la aprobación

Checkpoints tras P03, P06, P09, P12, P15, P18, P21, P24, P27 y P29. En cada uno:
evidencia de pruebas focalizadas, compatibilidad/regresión relevante y demostración
del recorrido alcanzado; revisión humana antes del siguiente bloque. El build queda
para ejecución manual del usuario. No marcar un checkpoint si faltan sus dependencias,
si solo funciona en MSW o si la pasarela no tiene evidencia sandbox.

Por tarea: leer su bloque y contratos, escribir prueba de comportamiento, demostrar
RED por la causa esperada, implementar mínimo, demostrar GREEN y simplificar lo
tocado. Ante un fallo inesperado usar debugging-and-error-recovery: reproducir,
localizar la primera causa y registrar el diagnóstico antes de corregir.
Preparar diff, resultado de pruebas y mensaje de commit; **el usuario realiza el
commit manual** según AGENTS.md. No ejecutar add/commit/tag/pull/push/merge/PR.
No asignar una versión distinta a cada tarea; la versión corresponde a una entrega.

La ejecución es secuencial en este workspace. No presupone agentes paralelos.
Adaptadores P09/P10 comparten interfaz y podrían desarrollarse independientemente
en trabajos autorizados aparte; no integrarlos hasta pasar el contrato común.

## Riesgos, mitigaciones y decisiones abiertas

| Riesgo o dependencia | Mitigación y evidencia exigida |
| --- | --- |
| No se han aportado cuentas/producto contratado/credenciales sandbox | No simular confirmaciones. Verificar producto, autenticación y consulta de operación incierta de cada proveedor antes de habilitarlo; probar ambos sandboxes |
| Precio editado entre consulta e inscripción | Versión de política y snapshot; responder conflicto y pedir aceptar nuevas condiciones |
| Último cupo, pago y vencimiento simultáneos | Bloqueos con orden común, reloj posterior al lock y pruebas de carreras reales en PostgreSQL 17 |
| Timeout, reinicio o webhook repetido/tardío | Correlación persistida antes de llamada, idempotencia SQL, conciliación reanudable e incidencia sin sobreinscribir |
| Efectivo y tarjeta para la misma obligación | Excluir registros mientras exista intento externo activo/incierto; no duplicar efectos ni borrar hechos externos inesperados |
| Retención eludida por descarga histórica/excepción | Estado de entrega separado y autorización en todas las rutas; sin PDF/código vigente antes de pago |
| Pago de constancia después del cierre | Snapshot de elegibilidad y emisión idempotente; no recalcular ventana de cierre al pagar |
| Datos históricos no prueban condiciones/pago | Inventario, acuerdo de regularización y backfill auditado; mantener derechos adquiridos |
| Rollback con pagos ya realizados | Probar recuperación compatible hacia adelante y pausa de nuevas operaciones; nunca perder el libro de pagos |
| Política actual sin lockfile y marcadores previos en todo.md | Registrar discrepancias sin cambiar política ni borrar historia ajena; no declarar seguridad/limpieza global aprobada |
| SDK y datos sensibles | Revisar dependencia/producto, hosts CSP concretos, secretos solo backend y payloads de prueba anonimizados |
| Emisión académica más amplia que la existente | Conservar alcance presencial/participación y demo; otras reglas académicas requieren su propia implementación |

Pendientes de acuerdo antes de activar datos reales: límites del plazo, tratamiento
de reservas antiguas, pagos tardíos/devolución, cotejo de RF-25 v4 y responsables
operativos. Estas dependencias no impiden revisar esta propuesta, pero sí condicionan
la finalización y la habilitación de las tareas afectadas.

## Verificación y salida de la fase

Usar los comandos completos de [la estrategia de pruebas](../SPEC.md#estrategia-de-pruebas-y-comandos)
y los de cada tarea. Integración/E2E en PostgreSQL 17/Redis 8 desechables; sin cobros
bancarios reales. Mantener cobertura de asistencia >=60 % y suites existentes.
Nunca ejecutar `npm run verificar` porque incluye build; `npm run build` es manual.

La revisión final incluye las dos listas solicitadas en
`~/.agents/agent-skills/references/definition-of-done.md` y `security-checklist.md`,
con evidencias o pendientes explícitos. Shipping-and-launch entrega prerrequisitos,
monitoreo, responsable de conciliación y recuperación, sin publicar ni hacer push.

La implementación y sus pruebas están en el árbol de trabajo; no hay commits del
agente. Las pruebas se consolidaron en `backend/test/integracion/cobroCurso.test.ts`
y `pagosCurso.test.ts`, manteniendo los identificadores de aceptación. Las rutas de
archivos de la tabla inicial describen la división propuesta; `tasks/todo.md` registra
la evidencia final y sus límites. Los checkpoints humanos y builds siguen pendientes.

Los cuatro bloques se implementaron en tramos RED/GREEN y correcciones independientes.
Algunos recorridos cruzaron más de cinco archivos y se verificaron por subtramos de
política, persistencia, autorización e interfaz; no se crearon commits para simular
la separación que AGENTS.md reserva al usuario.

Versión condicional recomendada para la entrega funcional completa: `v3.0.0.0.0`
desde `v2.0.0.1.0`, por el cambio incompatible en aceptación de condiciones pagadas
y en el acceso a contenidos. Ninguna versión de publicación fue modificada.


## Verificación final HU-53

Implementación local de los cuatro bloques y pruebas documentadas en
[la guía de cobro](../docs/esp/cobroCursos.md). 301 pruebas backend, 70 frontend,
3 servidor web, 289 de integración y 31 E2E reales aprobados; 12 E2E demo
seleccionados y cobertura exigida aprobados. El caso focalizado de material,
asistencia y reunión también está aprobado. No se ejecutó build.

Los pendientes de cada tramo se conservan en todo.md: cuentas/sandboxes, prueba
comercial y carga del procesador en despliegue, regularización histórica y gate
manual de entrega. La terminación real, dos procesadores e intentos antiguos
se verificaron localmente después de la primera regresión completa.
No se marcan los checkpoints de revisión humana como si hubieran ocurrido.

---

# Plan HU-26: Sesiones virtuales seguras

Estado: **aprobado e implementado en local el 16/11/2026**; la espiga cambió la aplicación
de la pantalla al plan B (vigilante) y se usó una sola migración (0032). Especificación: sección HU-26 de
[SPEC.md](../SPEC.md). Tareas y evidencia: sección HU-26 de [todo.md](todo.md).

## Resumen

Se completa el prototipo existente (`0f1aaef`: sala propia con lib-jitsi-meet) en tres
módulos: `sala-segura`, `control-sala` y `asistencia-virtual`. Primero una espiga
demuestra en el Jitsi local lo que el diseño da por supuesto; después, cortes verticales
de backend, interfaz y verificación real. `difusion-masiva` y `sesion-ambas` quedan
fuera y se registran como historias aparte.

## Decisiones de arquitectura

- **El servidor decide; la interfaz acompaña.** La pantalla y el micrófono se restringen
  con la moderación audiovisual de Jitsi (`desktop`, `audio`), que valida Prosody/Jicofo.
  Ocultar botones solo mejora la experiencia. La mano es la única restricción solo de UI.
- **Sala de espera obligatoria** mediante `token_lobby_ondemand`: el token de colegiado
  lleva `lobby: true`. También contiene el reingreso con un token ya emitido tras expulsar.
- **Asistencia por eventos del servidor** (`event_sync` de Prosody hacia un webhook con
  secreto propio), nunca por eventos del navegador. El cálculo es una función pura
  y se ejecuta dentro de la transacción de finalizar.
- **Migraciones nuevas por corte** (0032 sala segura, 0033 políticas y expulsión,
  0034 asistencia); no se modifican las aplicadas. `attendances.origen` permite que la
  asistencia virtual cuente para el 80 % sin cambiar `asistenciaCurso`.
- **Sin dependencias nuevas** y sin modificar Jitsi: solo configuración en `preparar.mjs`.
- **Git y build manuales** (AGENTS.md): el paso «haz un commit» de la solicitud se
  cumple preparando Summary y Description por tarea para que el usuario confirme.

## Grafo de dependencias

```
T26-01 espiga (puerta) ──┬── T26-03 config Jitsi ──┬── T26-05 credencial ── T26-06/07 sala de espera ── Checkpoint A
T26-02 licencias         │                          │
T26-04 cursos virtuales ─┘                          ├── T26-08 políticas ── T26-09 aplicar ── T26-10 expulsión ── Checkpoint B
                                                    └── T26-11 cálculo ── T26-12 webhook ── T26-13 cierre ── T26-14 UI ── Checkpoint C
                                                                                       T26-15 docs ── T26-16 revisión y entrega
```

Las fases B y C dependen de A pero no entre sí: pueden ir en paralelo, salvo las
migraciones, que se numeran y aplican en orden.

## Tareas ordenadas

| Id | Tarea | Criterios | Tamaño |
|---|---|---|---|
| T26-01 | Espiga en Jitsi local: moderación `desktop` frente a un cliente manipulado, carga de módulos contrib en Docker, sala de espera por token, `event_sync` con `id` del JWT, expulsión por moderador y rechazo a no moderadores | Puerta de 07, 09, 10, 12 | M (solo docs) |
| T26-02 | Registro de licencias de terceros y origen del prototipo | 05 | XS |
| T26-03 | `preparar.mjs` idempotente (sala de espera, `event_sync`, sin Jibri) y `jitsiEventosSecreto` en el esquema de entorno | Base de 03, 12 | S |
| T26-04 | Sesiones en cursos `VIRTUAL` y creación de reunión por el instructor asignado (si se aprueba la pregunta 6) | Habilitador | S |
| T26-05 | Credencial con `lobby`, aviso de grabación aceptado y pruebas de acceso denegado | 01, 02, 04 | M |
| T26-06 | Servicio de sala de espera: unirse, recibir solicitudes, admitir, rechazar, «Admitir inscritos» | 03 | S |
| T26-07 | Interfaz: pantalla previa con aviso, estado en espera y panel del anfitrión | 03, 04 | M |
| — | **Checkpoint A**: evidencia real con 2 Chromium + revisión humana | 01–05 | — |
| T26-08 | Políticas persistentes y validadas (pantalla, micrófono, mano, porcentaje, grabación) | 06, 10 | S |
| T26-09 | Aplicar políticas al conectar el moderador y antes de admitir; botones según permiso | 07, 08, 11 | M |
| T26-10 | Expulsión: cerrar todas las conexiones, `retiradoEn`, «Expulsado» en la espera sin admitir | 09 | M |
| — | **Checkpoint B**: evidencia real con cliente manipulado + revisión humana | 06–11 | — |
| T26-11 | Función pura de unión de intervalos y porcentaje | 13 | XS |
| T26-12 | Webhook `occupant/joined|left`: secreto, validación, idempotencia, `iniciadaEn` | 12 | M |
| T26-13 | Finalizar: cerrar intervalos, calcular, registrar `VIRTUAL`, `GET .../asistencia` | 13, 14, 15 | M |
| T26-14 | Interfaz: porcentaje mínimo en configuración y resultado de asistencia | 14, 15 | S |
| — | **Checkpoint C**: evidencia real de eventos → asistencia → 80 % + revisión humana | 12–15 | — |
| T26-15 | Documentación: `docs/reuniones.md`, `docs/API.md`, matriz RF-17/RF-18 | Todos | S |
| T26-16 | Simplificación, revisión de calidad y seguridad, DoD y lista de publicación | Todos | S |

## Forma de trabajo por tarea (después de aprobar)

1. Escribir la prueba del criterio y comprobar que falla por la razón esperada.
2. Implementar lo mínimo; ejecutar la prueba focalizada y luego la suite del workspace.
3. `npm run typecheck`; `npm run lint -w frontend` si se tocó el frontend.
4. Refactorizar solo lo tocado; anotar evidencia en `todo.md`.
5. Entregar Summary y Description para que el usuario haga el commit. El build queda pendiente.

Ante un fallo: reproducir, aislar y corregir la causa raíz antes de seguir (sin
desactivar pruebas ni rebajar criterios).

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Jicofo/JVB no impide publicar pantalla a quien se salta la UI | Alto | T26-01 lo comprueba primero; plan B: silenciado automático por el moderador (pregunta 7) y aviso al equipo |
| Los módulos contrib no cargan en Docker sin montar archivos | Medio | Espiga; montarlos desde `prosody-plugins-custom` mediante `preparar.mjs`, sin modificarlos |
| La identidad en la sala de espera no llega con el JWT | Medio | Espiga; si falta, se cruza con el `id` de la presencia y la lista de inscritos de la API, sin confiar en nombres |
| Se pierden eventos y la asistencia queda incompleta | Medio | Reintentos de `event_sync`, cierre de intervalos al finalizar y resultado visible para revisión |
| El webhook queda expuesto en Internet | Alto | Secreto propio, comparación en tiempo constante, solo red interna de Docker; documentar el proxy |
| Sala de espera lenta con muchos inscritos | Medio | «Admitir inscritos» en bloque; ~1000 personas pertenece a `difusion-masiva` |
| La historia creció y no cabe en el sprint | Alto | Dividir en HU-26a/b/c y re-estimar en Planning Poker; cada fase es publicable |
| Instalaciones Jitsi previas sin los nuevos módulos | Medio | Modo de actualización explícito en `preparar.mjs` que conserva secretos y avisa del reinicio |

## Versionado propuesto

Base verificada: `v3.0.0.0.0` (ancestro de HEAD). Todas las fases añaden funcionalidad
(nivel Función). Una sola entrega: `v3.1.0.0.0`. Si se publica por historias:
HU-26a `v3.1.0.0.0`, HU-26b `v3.2.0.0.0`, HU-26c `v3.3.0.0.0`. Los commits intermedios
no llevan etiqueta. El usuario crea commits, etiquetas y PR.

## Preguntas abiertas

Las siete de la sección «Preguntas abiertas» de HU-26 en [SPEC.md](../SPEC.md).
T26-04 depende de la pregunta 6 y el plan B de T26-09 de la pregunta 7.

---

# Plan HU-36: Modalidad por sesión y cursos híbridos

Estado: **aprobado e implementado en local el 16/11/2026** (ajustes en la sección HU-36 de SPEC.md). Especificación: sección HU-36 de
[SPEC.md](../SPEC.md). Tareas y evidencia: sección HU-36 de [todo.md](todo.md).
Depende de HU-26 (aún fuera de `main`).

## Resumen

La modalidad pasa del curso a cada sesión (`PRESENCIAL`, `VIRTUAL`, `AMBAS`); el curso
se clasifica solo según sus sesiones programadas y se añade el curso `GRABADO`. Las
sesiones virtuales obtienen su sala de HU-26 automáticamente y la asistencia se toma por
la vía que corresponde a cada sesión. Se construye primero el backend (fuente de verdad)
en cortes verticales probados con PostgreSQL y después la interfaz y la demo.

## Decisiones de arquitectura

- **Modalidad derivada y guardada**: `cursos.modalidad` se recalcula dentro de cada
  transacción que toca sesiones, para que el catálogo filtre sin cambios. Se conserva la
  planificada (`"modalidadPlanificada"`) para cursos sin sesiones.
- **Una función de derivación pura** usada por backend y demo, con pruebas unitarias.
- **Las dos vías de sesiones comparten validación**: la regla de modalidad y lugar vive en
  `clases.validacion.ts`, que ya usan ambas.
- **Reunión automática** dentro de la misma transacción de la sesión, reutilizando la
  creación de HU-26 (sin duplicar la lógica de participantes e invitaciones).
- **Una migración** `0033-modalidadSesion.sql`, que rellena desde el curso para no alterar
  ningún curso existente.
- **Git y build manuales** (AGENTS.md): por tarea se entregan Summary y Description.

## Grafo de dependencias

```
T36-01 migración + derivación ─┬─ T36-02 vía cursos/sesiones ─┐
                               ├─ T36-03 vía /api/clases ──────┼─ T36-05 detalle con modalidad y sala ─ T36-06 sala automática
                               └─ T36-04 curso calculado/GRABADO┘          │
                                                                T36-07 asistencia ─ T36-08 certificados ─ Checkpoint A
Checkpoint A ─ T36-09 servicio y sesiones UI ─ T36-10 formulario de clases ─ T36-11 curso/etiquetas ─ T36-12 demo ─ Checkpoint B
Checkpoint B ─ T36-13 E2E ─ T36-14 docs ─ T36-15 revisión y entrega
```

## Tareas ordenadas

| Id | Tarea | Criterios | Tamaño |
|---|---|---|---|
| T36-01 | Migración 0033 y `modalidadDerivada` pura | 03, 06 | S |
| T36-02 | Modalidad y lugar en `POST /api/cursos/:id/sesiones` con recálculo | 01, 02, 03 | S |
| T36-03 | Modalidad en `POST/PUT /api/clases` y recálculo al cancelar | 01, 02, 03 | M |
| T36-04 | Modalidad calculada en `POST/PATCH /api/cursos` y valor `GRABADO` | 04, 13 | S |
| T36-05 | Detalle del curso: sesiones con `modalidad` y `reunion` según permisos | 05, 08 | S |
| T36-06 | Reunión automática por sesión virtual o «ambas»; 409 en presenciales | 07, 09 | M |
| T36-07 | QR rechazado en sesiones virtuales; «ambas» por cualquier vía | 10, 11 | S |
| T36-08 | Certificados en cursos virtuales e híbridos; grabado fuera hasta HU-37 | 12, 15 | S |
| — | **Checkpoint A**: suites backend e integración, tipos; revisión humana | 01–15 backend | — |
| T36-09 | Servicio y `SesionesCurso`: selector, lugar condicional, etiqueta y acceso a sala | 01, 02, 05, 08 | M |
| T36-10 | `ClaseFormPagina`: modalidad y lugar condicional | 01, 02 | S |
| T36-11 | Formulario del curso (Grabado y modalidad calculada), etiquetas y filtros | 04, 13, 14 | M |
| T36-12 | Demo MSW alineada con las reglas del backend | 01–15 demo | M |
| — | **Checkpoint B**: Vitest, lint, tipos; revisión humana | UI | — |
| T36-13 | E2E demo y real: curso híbrido (virtual + presencial) visto por el colegiado | 03, 05, 08 | M |
| T36-14 | Documentación: API, cursos, certificados, reuniones y matriz CPPP | Todos | S |
| T36-15 | Simplificación, revisión de calidad y seguridad, DoD y lista de publicación | Todos | S |

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambiar la regla de certificación sin acuerdo del CPPP | Alto | Pregunta 5; la tarea T36-08 solo se hace si se aprueba |
| Datos existentes cambian de modalidad al migrar | Alto | Relleno desde el curso y prueba de migración que compara antes y después |
| Divergencia entre las dos vías de sesiones | Medio | Validación compartida y pruebas en ambas rutas |
| Reunión automática duplicada o huérfana | Medio | Una reunión activa por sesión, en la misma transacción, con pruebas de cancelación |
| Filtros, historial y certificados con el nuevo valor `GRABADO` | Medio | Búsqueda de todos los usos de `modalidad` y etiquetas centralizadas |
| PR apilado sobre HU-26 | Medio | Integrar HU-26 primero; si cambia, rebasar esta rama |
| Demo (MSW) desalineada | Medio | T36-12 con las mismas pruebas de reglas |

## Versionado propuesto

Funcionalidad nueva (nivel Función). Si HU-26 se publica antes como `v3.1.0.0.0`, HU-36
sería `v3.2.0.0.0`; si se publican juntas, `v3.1.0.0.0`. El usuario crea commits y etiquetas.

## Preguntas abiertas

Las ocho de la sección HU-36 de [SPEC.md](../SPEC.md). T36-06 depende de la pregunta 3,
T36-07 de la 4, T36-08 de la 5 y T36-04/T36-11 de la 6.

# HU-40 · Plan de implementación

**SCRUM-151 · Implementado localmente**

## Recorrido y dependencias

El identificador existente sirve de base para la ficha anónima y la vista previa.
La misma URL abre la ficha, se copia o se envía a WhatsApp.

1. **T40-01** · Consultar la ficha pública por ID y probar su límite de exposición.
2. **T40-02** · Abrir el enlace como visitante y continuar a inscripción.
   Depende de T40-01.
3. **T40-03** · Servir la vista previa Open Graph y la imagen institucional.
   Depende de T40-01 y comparte la ruta de T40-02.
4. **T40-04** · Compartir desde las tarjetas de catálogo y de gestión.
   Depende de T40-02 y del contrato de origen de T40-03.
5. **T40-05** · Compartir desde ambas fichas y verificar el recorrido completo.
   Depende de T40-02 a T40-04.

Tras fijar el contrato de datos, la ficha React y las pruebas HTTP de Open Graph
son verificables por separado. T40-03 completa el enlace con HTML social y ficha
React. T40-04 define el control compartido que reutiliza T40-05.
Los criterios y archivos previstos están en el
[seguimiento HU-40](todo.md#hu-40--tareas-de-implementación).

## Ejecución posterior a aprobación

- Por cada tarea de código, escribir una prueba enfocada y registrar que falla
  por la conducta que falta. Implementar el cambio mínimo y comprobar que la
  prueba y las regresiones relacionadas pasan. Si aparece un fallo inesperado,
  reproducirlo, localizar la causa y comprobar la corrección.
- Después de T40-02, comprobar el acceso público y el retorno de HU-22. Después
  de T40-05, volver a comprobar el recorrido completo en demo y en un entorno
  real aislado. Las pruebas de Express verifican el HTML inicial con un backend
  simulado y una plantilla de prueba, sin requerir build. Vite y MSW verifican
  navegación e interfaz. El entorno público verifica los clientes externos.
- Revisar y simplificar el código tocado con sus pruebas en verde. Revisar
  calidad, seguridad y documentación con
  `~/.agents/agent-skills/references/definition-of-done.md` y
  `~/.agents/agent-skills/references/security-checklist.md`. Registrar evidencias
  o pendientes para las secciones aplicables.
- Preparar un **Summary** y una **Description** por tarea para el commit manual.
  Registrar las pruebas ejecutadas, sus resultados y el build pendiente. El
  usuario ejecuta las operaciones Git.

## Riesgos y verificaciones

| Riesgo | Verificación o medida |
| --- | --- |
| Un borrador o un curso cerrado queda expuesto mediante el ID. | Probar la consulta, la respuesta HTML y la matriz de permisos. Comprobar que la API privada mantiene el `401` anónimo y que el HTML de error carece de metadatos del curso. |
| Metadatos manipulados mediante el título o un origen de solicitud no fiable. | Usar salida HTML codificada, origen canónico de configuración y backend fijo. Probar caracteres especiales, redirecciones del backend y que la URL canónica e imagen no dependan de las cabeceras del cliente. |
| Se anuncia como precio del curso el importe de la constancia. | Probar las modalidades de cobro y el estado histórico sin configurar. Verificar fechas y precio en el HTML que recibe el rastreador. |
| La ruta abre React, pero el proxy público sirve solo el HTML estático. | Verificar que `/c/:id` llegue a Express, que la imagen se sirva por HTTPS y que el rastreador alcance ambos recursos sin iniciar sesión. |
| La vista previa queda en caché o el cliente omite parte del texto. | Verificar en WhatsApp y Facebook con un enlace representativo y registrar el resultado por cliente. Revisar la actualización de vista previa con las herramientas de Meta. |

## Preparación de publicación y recuperación

Configurar `VITE_ORIGEN_PUBLICO` con el mismo origen HTTPS al compilar y al
iniciar Express. Confirmar DNS, TLS y el enrutamiento de `/c/:id`, `/api` y la
imagen institucional. Verificar el build manual, la vista previa en ambos
servicios, el comportamiento de un curso retirado y la inscripción desde un
enlace real. La configuración y el contrato constan en `frontend/.env.example`,
`docs/API.md` y `docs/esp/catalogoPublico.md`.

Antes de activar la difusión, revisar los encabezados del proxy HTTPS y la
auditoría de dependencias de la instalación de entrega. Confirmar la revisión
humana y probar un enlace de un curso representativo en ambos clientes.

Revisar los `404` de cursos retirados y errores `5xx` en los logs disponibles,
sin registrar mensajes o credenciales. Si se revierte antes de publicar, volver
a la versión compatible del frontend y el backend. Si ya circulan enlaces,
mantener la ruta `/c/:id` y la API pública compatibles mientras se revierte el
cambio que causó el fallo. El diseño reutiliza IDs y no requiere migración.
La publicación queda fuera de esta tarea.

## Versionado previsto

La base local comprobada es `v3.0.0.0.0`, alcanzable desde la rama de HU-40
y desde `upstream/main` local. HU-40 incrementa el nivel **Función** una sola
vez por entrega. Si se incluye en la próxima entrega sobre esa base, se
propone `v3.1.0.0.0`. Si se publica después de otra entrega funcional,
se recalcula desde la etiqueta efectiva. La rama parte de HU-36 y se debe
delimitar el alcance antes de versionar. No hay commits ni etiquetas de HU-40
creados en esta fase.
