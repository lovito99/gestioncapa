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

# HU-29 · Plan de implementación

La especificación de [HU-29](../SPEC.md#hu-29--notificaciones-por-correo)
define cinco eventos que comparten entrega SMTP y seguimiento. Esta propuesta
espera aprobación antes de iniciar T29-01.

## Diseño propuesto

- Conservar `notificacionesPago` como registro de comprobantes y rechazos de
  pago. Usar una cola persistente para inscripciones, sesiones y documentos.
  Ambas reutilizan el transporte SMTP, la política de intentos y el ciclo de
  procesamiento existente. La vista administrativa consulta ambas fuentes.
- Mantener la unicidad de pagos por operación y tipo. Para los demás avisos,
  usar tipo, ID estable del evento y usuario. El intento identifica una
  inscripción, el cambio confirmado identifica una revisión de la sesión y
  el documento emitido identifica la constancia. Comparar cambios reales de
  sesión bajo bloqueo de fila. Una repetición idéntica no crea una revisión.
- Reclamar y finalizar cada aviso verificando su identificador de procesamiento.
  Registrar la aceptación, la próxima ejecución o un estado final revisable.
  Distinguir un rechazo temporal confirmado de una aceptación que no pudo
  verificarse. El error de SMTP se normaliza antes de exponerlo.
- Los enlaces salen de un origen institucional configurado y de destinos
  permitidos construidos por la aplicación. Reutilizar los controles de
  identidad y propiedad de los recursos de destino. Ajustar el retorno de
  acceso solo si el recorrido real lo requiere.
- Aplicar migraciones aditivas. Conservar los registros históricos en su lugar
  y comprobar la forma del DTO de pago vigente. Al activar el worker, pasan
  los avisos nuevos y el pendiente ya existente del que el operador haya
  aprobado la entrega. Revisar las filas históricas pendientes sin reenviarlas
  en bloque. La reversión puede pausar el SMTP existente con
  `correoHabilitado=false`, lo que también pausa el correo de HU-32.

## Orden y dependencias

| Tarea | Entrega verificable | Depende de |
| --- | --- | --- |
| T29-01 | Plantillas CPPP con texto alternativo y enlaces protegidos. | Aprobación |
| T29-02 | Worker de pagos con registro, reintento acotado y tratamiento de aceptación incierta. | T29-01 |
| T29-03 | Comprobante de pago y rechazo de transferencia con plantilla y enlace reales. | T29-01, T29-02 |
| T29-04 | Rechazos definitivos de pasarela que el servidor pueda verificar. | T29-03 |
| T29-05 | Confirmación de inscripción sin pago previo, desde transacción hasta SMTP. | T29-01, T29-02 |
| T29-06 | Confirmación de inscripción después de un pago vigente. | T29-03, T29-05 |
| T29-07 | Aviso de cambio o cancelación a los inscritos afectados. | T29-05 |
| T29-08 | Aviso al emitir o liberar una constancia. | T29-05 |
| T29-09 | Consulta administrativa paginada y protegida con diagnósticos filtrados. | T29-02, T29-05 |
| T29-10 | Vista administrativa, navegación y recorrido de permisos en navegador. | T29-09 |

Verificar la entrega SMTP tras T29-02, los avisos de pago tras T29-04 y los
eventos de inscripción y sesión tras T29-07. Una vez estable el contrato
de la cola, sesiones y constancias pueden trabajarse en paralelo con cambios
en módulos distintos. Mantener un orden único para las migraciones y coordinar
las pruebas que compartan datos. [Tareas y controles](todo.md#hu-29--seguimiento)

## Pruebas y entregas manuales

- Por cada tarea de código, ejecutar primero la prueba de la regresión y
  confirmar el fallo esperado. Implementar el mínimo cambio, comprobar en
  verde y revisar la simplificación antes de preparar su mensaje de commit.
  Ante un fallo, conservar evidencia, aislar causa y añadir o ajustar la prueba.
- Backend focalizado desde `backend/`. Usar
  `node --import tsx --test test/integracion/correoPago.test.ts` y las suites
  de las tareas con `NODE_ENV=test`, PostgreSQL y Redis aislados y un servidor
  SMTP en loopback. Las pruebas controlan el tiempo de reintento sin dormir
  los intervalos de producción.
- Ejecutar al final `npm test`, `npm run typecheck`, `npm run e2e:tipos`,
  `npm run lint -w frontend`, `NODE_ENV=test npm run test:integracion`
  y Playwright para el panel y el retorno desde enlaces. Cotejar calidad y
  seguridad con
  `~/.agents/agent-skills/references/definition-of-done.md` y
  `~/.agents/agent-skills/references/security-checklist.md`.
- Registrar resultados y preparar `Summary` y `Description` por incremento.
  Los commits, etiquetas y `npm run build` corresponden al usuario.

## Riesgos y preparación para publicar

| Riesgo | Prueba o medida |
| --- | --- |
| La aplicación repite un despacho tras perder la respuesta SMTP. | Simular rechazo explícito, aceptación y pérdida de respuesta tras el cuerpo. Mantener el estado incierto y un ID para conciliar con el proveedor. |
| Se envía un aviso de acceso antes de la confirmación del pago o después de vencer. | Leer la transición persistida de la inscripción en la transacción y comprobar reserva vigente, tardía y repetición del hecho. |
| Un webhook o un error temporal se interpreta como rechazo definitivo. | Usar solo una transición autenticada, correlacionada y terminal. Contrastar el contrato de Izipay; si la señal sigue siendo ambigua, conservar el estado actual y documentar la brecha antes de activar. |
| Un enlace, plantilla o diagnóstico expone datos o desvía al destinatario. | Probar permisos por objeto, origen permitido, escape de campos, cambio de correo, HTML y códigos de error. Revisar que registros y panel excluyan cuerpos, credenciales y datos de pago sensibles. |
| Una migración pierde información histórica o reactiva correos. | Ensayar con filas anteriores enviadas y pendientes, comparar su estado y revisar la cola antes de activar. |

Antes de publicar quedan el build manual, el ensayo de migraciones y pausa con
una copia controlada, la configuración SMTP/TLS y origen HTTPS, la política de
retención, la revisión humana y un envío de verificación en un entorno
autorizado. Dejar visibles la antigüedad de pendientes y los totales de fallos
e inciertos sin incluir datos personales. Antes de un rollback, pausar el envío
y revisar entregas inciertas y registros en proceso. No se realiza publicación
ni push como parte de la tarea.

## Versión prevista

La rama alcanza la etiqueta local `v3.1.0.0.0`. Si esa es la base de la próxima
entrega que incluya HU-29, se propone `v3.2.0.0.0` por nueva función. Recalcular
desde la etiqueta efectiva si la base cambia. La planificación no crea un
commit ni una versión.

# T-24 · Plan del referente de diseño

La [especificación](../SPEC.md#t-24--referencias-de-diseño-para-cursos-grabados)
define un entregable documental para el equipo que mantiene el Figma del CPPP.
Se parte de las fuentes públicas y de las pantallas locales de la aplicación.

| Tarea | Entrega | Depende de | Verificación |
| --- | --- | --- | --- |
| T24-01 | Levantar evidencia de SIFODS y PerúEduca y contrastarla con el recorrido actual. | Especificación | Cubrir los cinco patrones, situar cada guía en su contexto y reconocer las pantallas autenticadas sin acceso. |
| T24-02 | Registrar decisiones de diseño y anotaciones para Figma. | T24-01 | Vincular cada patrón con al menos una historia, comprobar que aparecen HU-17, HU-37, HU-38 y HU-44 y marcar vínculos provisionales. |
| T24-03 | Integrar el informe en la documentación de Figma y revisar su entrega. | T24-02 | Abrir fuentes, verificar anclas, controlar el alcance del diff y documentar lo que resta en Figma, Jira y con el CPPP. |

Tras T24-01 verificar que una práctica de un curso concreto no se atribuya a
toda la plataforma. Tras T24-02 revisar que avance, aprobación y constancia
tengan estados distintos. El informe mantiene un vínculo con el original de
Figma y resume las pautas del colegio si las hay. Se usan enlaces locales
mientras falten los destinos autorizados de Figma o Jira.

La revisión final aplica Definition of Done y Security Checklist al alcance
documental. Verificar fuentes, trazabilidad, permisos de destino descritos y
ausencia de datos personales. `git diff --check` valida el formato del diff.
El build no aplica. La revisión humana del prototipo y el registro de sus
nodos son el paso de entrega en Figma. El commit se prepara para ejecución
manual según `AGENTS.md`.

Por sí sola, la entrega documental incrementaría el nivel **Interno** de
`v3.1.0.0.0` a `v3.1.0.0.1`. Si se incluye con una función como HU-29, se
mantiene el incremento **Función** de esa entrega sobre la base efectiva.

## Prototipo aprobado en el repositorio

| Tarea | Entrega | Verificación |
| --- | --- | --- |
| T24-P01 | Curso de ejemplo, inscripción y ruta del aula en modo demo. | Acceso desde el catálogo y «Mis cursos». Verificar sesión, inscripción y aislamiento del modo real. |
| T24-P02 | Índice, material grabado, avance y evaluaciones. | Verificar bloqueo, respuesta incorrecta, progreso por cuenta y recuperación al recargar. |
| T24-P03 | Constancia de demostración y revisión móvil. | Verificar PDF tras completar el curso, rechazo de la descarga anticipada y Playwright en escritorio y móvil. |

P02 usa el acceso de P01 y P03 usa el progreso de P02. Preparar el commit
manual y dejar el build para el usuario según `AGENTS.md`.

# HU-51 · Plan de implementación

**SCRUM-177 · Aprobado e implementado · 18/11/2026**

## Recorrido y dependencias

Una portada elegida en administración pasa por validación y persistencia
antes de que el catálogo, el detalle y el HTML de WhatsApp puedan mostrarla.
La [especificación](../SPEC.md#hu-51--imagen-de-portada-del-curso-en-el-catálogo)
define los criterios HU51-01 a HU51-07. Se conserva el historial de planificación
y seguimiento de las demás historias.

| Tarea | Entrega | Depende de |
| --- | --- | --- |
| T51-01 | Validar y generar las variantes de una portada a partir del archivo real. | Aprobación de la especificación |
| T51-02 | Cambiar, leer en privado y quitar una portada mediante la API. | T51-01 |
| T51-03 | Crear un borrador y su portada en una operación. | T51-02 |
| T51-04 | Usar la portada desde el formulario real de creación y de edición. | T51-02 y T51-03 |
| T51-05 | Alinear el contrato de portada en demo y verificar el formulario. | T51-04 |
| T51-06 | Entregar URLs y archivos de portada a catálogos y detalles. | T51-02 |
| T51-07 | Mostrar portada responsiva, respaldo accesible y respuesta de la tarjeta. | T51-05 y T51-06 |
| T51-08 | Consultar la ficha y obtener el enlace público de HU-40 en real. | T51-06 |
| T51-09 | Servir la portada en el HTML inicial que consulta WhatsApp. | T51-07 y T51-08 |

Los incrementos se ejecutan en el orden de la tabla. Cada uno deja
utilizables los contratos anteriores. T51-06 y T51-08 reutilizan la proyección
pública del catálogo. T51-07 y T51-09 usan una sola asignación de respaldo
por categoría para la web y el HTML social.

## Decisiones de implementación

- Centralizar procesamiento y límites del archivo en el backend y guardar las
  variantes vigentes juntas en una tabla opcional por curso. La migración
  aditiva deja disponibles los cursos actuales y no requiere rellenar imágenes.
- Mantener las escrituras de portada en la matriz de roles y reutilizar el
  control de acceso al detalle para el recurso privado. La ruta pública valida
  estado, versión y variante. Se sirven tipos determinados por el procesador
  y consultas SQL parametrizadas.
- Conservar el componente de portada compartido, el enlace expandido de la
  tarjeta y el botón de compartir. Usar en cada contexto el tamaño adecuado,
  mantener su proporción y reutilizar los recursos del Sprint 3. La vista
  social usa una versión raster del respaldo si falta la imagen del curso.
- Recuperar de HU-40 el patrón de HTML inicial, enlace e identificación pública
  por ID. Revisar el historial para adaptar solo las partes compatibles con
  el flujo actual de HU-22, la ficha existente y la regla vigente de precios.
  Express conserva el proxy y su fallback para las demás rutas.

## Ejecución tras aprobar

Cada tarea funcional comienza con la prueba mínima reproducible y registra el
fallo por la conducta esperada. Luego se implementa, se verifica en verde y se
revisa el diff. Ante un fallo inesperado se identifica la causa raíz antes
de cambiar código. Tras la última tarea se simplifican los cambios que lo
necesiten, se repiten las pruebas afectadas y se realiza la revisión de
calidad y seguridad.

- **Tras T51-03** · Verificar en integración formatos, permisos, consistencia
  de creación y actualización, y compatibilidad con cursos existentes.
- **Tras T51-06** · Verificar carga y reintento en administración, paridad
  funcional del demo y visibilidad del archivo público e interno.
- **Tras T51-09** · Verificar catálogo, detalle, móvil, teclado y HTML sin
  JavaScript. Aplicar Definition of Done y Security Checklist antes de la
  revisión humana de entrega.

Los comandos completos y el entorno requerido figuran en el
[seguimiento](todo.md#hu-51--tareas-de-implementación) y en la
[especificación](../SPEC.md#hu-51--imagen-de-portada-del-curso-en-el-catálogo).
Por cada incremento se prepara un mensaje de commit para ejecución manual.
El usuario ejecuta Git y el build según `AGENTS.md`.

## Riesgos y mitigaciones

| Riesgo | Verificación prevista |
| --- | --- |
| Tipo falsificado, archivo truncado o consumo excesivo de memoria | Validar base64 y tipo detectado, acotar cuerpo, bytes y píxeles, decodificar con error ante corrupción, recodificar y eliminar metadatos. Probar límites con imágenes válidas y errores de formato. Verificar Sharp con Node 24 y su dependencia nativa, conforme a la política de instalación de la lista de seguridad. [Instalación de Sharp](https://sharp.pixelplumbing.com/install/) |
| Dos guardados concurrentes o fallo a mitad del cambio | Preparar las variantes antes de actualizar, escribir una sola versión completa con la operación de base de datos y verificar que la versión anterior siga usable si falla el cambio. Probar que el reintento vuelva a dejar el estado esperado. |
| Portada de borrador, cerrada o retirada accesible por una URL anterior | Comprobar estado y versión en la consulta pública, revalidar caché, devolver un error común y evitar datos privados en las proyecciones. Probar URL directa y permiso por objeto. |
| Portada antigua en WhatsApp o ruta que devuelve solo el HTML general | Verificar HTTP anónimo contra Express y comprobar el contenido y el tipo del archivo a partir de Open Graph. Hacer la prueba de cliente con un enlace nuevo en HTTPS y registrar lo observado tras cambiar la portada, incluida la caché del tercero si interviene. |
| Regresión al abrir una tarjeta o usar «Compartir» desde móvil | Verificar clic desde varias áreas, toque, foco, Enter y diálogo, incluidos estados sin cupos y con un fallo de imagen. Revisar red y consola. |

## Preparación de entrega

1. Revisar en local la migración con datos anteriores y seguir el arranque
   normal del backend y del proxy. Documentar el contrato y cómo volver a la
   versión de aplicación anterior conservando la tabla aditiva y sus datos.
2. Registrar pruebas rojas y verdes, suites repetidas después de simplificar,
   revisión de los cambios y comprobación de las referencias de calidad y
   seguridad. Registrar los controles sin evidencia como pendientes.
3. Antes de publicar, confirmar el origen HTTPS del catálogo, que el proxy
   preserve el cuerpo del archivo límite y sirva las rutas públicas, el build
   manual y la imagen que recibe un cliente de WhatsApp. Observar rechazos y
   fallos de subida y de vista previa a partir de códigos y logs sin archivos.
4. Preparar los commits para ejecución manual y anotar los SHAs cuando el
   usuario los aporte. El cierre identifica lo que falta para publicar.

## Versión prevista

La base local comprobada en la línea de publicación y en esta rama es
`v3.1.0.0.0`. Esta fase documental, si se entrega por separado sobre esa
base, corresponde a **Interno** y a la propuesta `v3.1.0.0.1`. La función
completa incorpora carga y publicación real de una portada, por lo que
corresponde a **Función** y a la propuesta `v3.2.0.0.0` si la base efectiva
sigue siendo la misma. GestionCapa calcula la versión una vez por entrega.

La aprobación del plan confirma la proporción estricta, el límite de
píxeles, PostgreSQL y Sharp, el guardado independiente en edición y la
recuperación acotada de HU-40. El origen público y el entorno para la prueba
externa se confirman antes de acreditar la salida.

# HU-54 · Plan de implementación

## Alcance de la fase

Plan aprobado junto con [la especificación](../SPEC.md#hu-54--pago-en-línea-con-pasarela-intercambiable).
Izipay es el primer checkout nuevo. Culqi conserva conciliación e historial.
El trabajo abarca cotización, inicio, resultado y comprobante para las entradas
de pago actuales, y ejercicios de regresión para transferencia BCP y efectivo.
Las tareas y sus comprobaciones están en [el seguimiento](todo.md#hu-54--tareas-de-implementación).

## Decisiones de arquitectura

- **Registro de pasarelas.** El dominio recibe un proveedor registrado y su
  capacidad de alta o conciliación. El adaptador traduce el contrato externo a
  resultados de dominio. Las notificaciones y el trabajador se despachan por
  ese registro. Para dejar de ofrecer un proveedor, se deshabilitan las altas
  conservando acceso a la resolución de sus intentos. Para retirar su código,
  primero se concilian operaciones pendientes y se conserva la identificación
  del proveedor en los registros históricos. Agregar otro proveedor requiere
  su adaptador, registro y configuración, incluida su identidad persistida.
- **Datos persistidos.** Proponer una migración aditiva para el desglose del
  intento en línea, instrumento y correlación cuando el protocolo lo requiera.
  Sustituir las listas rígidas de proveedores SQL por una restricción basada
  en un catálogo persistente que se inicia con los identificadores existentes.
  Mantener restricciones de medios manuales, exclusión de operaciones activas,
  claves de idempotencia y referencias. El código anterior a la migración
  conserva la lectura de importes y medios que conocía. Probar el esquema
  antes y después con datos históricos.
- **Contrato HTTP.** Extender `GET /api/pagos/:id` con opciones en línea,
  desglose y resultados persistidos. Mantener la respuesta privada y los
  campos de los medios manuales. Extender `POST /api/pagos/:id/intentos` con
  proveedor, instrumento y cotización aceptada. El servidor recalcula el
  desglose, controla disponibilidad y reserva antes de pedir una sesión.
  Conservar los reintentos exactos de operaciones anteriores y la forma
  existente de las rutas. Las altas nuevas requieren cotización y consentimiento
  explícitos. Actualizar los consumidores del repositorio en la misma entrega
  y validar clientes existentes antes de decidir activación y versionado.
  Los incrementos se ensayan con el proveedor de pruebas. En un entorno con
  altas previas, desplegar API y cliente de forma coordinada con las altas
  apagadas y la conciliación disponible durante la transición.
- **Resultado financiero.** El retorno del checkout dispara una consulta o
  entrega la prueba firmada. Almacenar una referencia correlacionada permite
  recibir IPN aun cuando el usuario abandona la página. Usar el total retenido
  en el intento para validar el movimiento. El flujo transaccional existente
  conserva la deuda base, el efecto de HU-53 y la unicidad del correo.
- **Interfaz y comprobante.** Reutilizar una interacción en línea en ambas
  entradas y mantener la selección manual que ya existe. Actualizar UI desde
  el resultado persistido y mostrar el estado del correo. Compartir los datos
  financieros del PDF descargable y el adjunto de la cola, con lectura
  autorizada y sin registrar el contenido de la notificación del proveedor.

## Tareas ordenadas y dependencias

| Tarea | Entrega | Depende de | Alcance |
| --- | --- | --- | --- |
| T54-01 | Despachar webhooks y conciliación histórica por adaptador | Aprobación | Mediano |
| T54-02 | Persistir proveedores, correlación y desglose por intento | T54-01 | Mediano |
| T54-03 | Cotizar e iniciar un pago en línea con consentimiento e idempotencia | T54-02 | Mediano |
| T54-04 | Aplicar la respuesta Izipay de tarjeta o Yape | T54-03 | Mediano |
| T54-05 | Servir un comprobante coherente por correo y descarga | T54-04 | Mediano |
| T54-06 | Mostrar la cotización y abrir el SDK elegido en la ruta principal | T54-03, T54-04 | Mediano |
| T54-07 | Mostrar resultado, conciliación y estado del correo en la ruta principal | T54-05, T54-06 | Mediano |
| T54-08 | Reutilizar el recorrido en el historial y pago de constancia | T54-07 | Mediano |
| T54-09 | Verificar la independencia de BCP y efectivo y el recorrido en navegador | T54-07, T54-08 | Mediano |
| T54-10 | Documentar configuración, revisión y reversión | T54-09 | Pequeño |

T54-01 a T54-04 cambian el mismo estado financiero y se ejecutan en orden.
Tras fijar el contrato de la API, el comprobante y el cliente de checkout se
pueden verificar de forma independiente. T54-07 necesita ambos resultados.
Los puntos de control se aplican tras T54-02, T54-04, T54-07 y T54-10.
Cada incremento debe dejar verificable la versión de prueba y los medios
manuales. La salida requiere las pruebas de integración pertinentes y revisión
humana del resultado.

## TDD y comprobaciones

1. Tras aprobar, escribir la prueba focalizada de la tarea y registrar su
   fallo esperado, comando y resultado. Implementar lo mínimo y registrar
   la ejecución verde junto con las regresiones relevantes. Si falla por un
   motivo distinto, reproducir y localizar la causa antes de corregir.
2. Al terminar cada incremento, revisar el diff y preparar los archivos,
   **Summary** y **Description** del commit para que el usuario ejecute Git.
   Anotar el SHA cuando esté disponible. La fase de documentación y revisión
   registra evidencia de casos existentes cuando la tarea carece de cambios
   de comportamiento.
3. Al cerrar el código, simplificar el alcance tocado, volver a ejecutar
   pruebas y revisar corrección, permisos, compatibilidad, errores y datos
   sensibles. Aplicar ambas referencias solicitadas en la especificación y
   registrar controles pendientes con su evidencia.

## Riesgos y preparación para publicar

| Riesgo | Mitigación y verificación |
| --- | --- |
| Cobrar un total diferente al que se aceptó | Céntimos enteros, revisión atómica de la cotización, desglose inmutable y prueba de cambio de tasa entre cotización, inicio, recepción y correo. |
| SDK/IPN real incompatible con fixtures o Yape no habilitado | Apoyarse en el contrato oficial y validar el producto específico contra sandbox por instrumento. Probar estructuras, identificadores, firma, cierre y autenticidad antes de acreditar el recorrido externo. |
| Doble cobro por timeout, cancelación dudosa, replay o carrera manual | Reaprovechar exclusión e idempotencia, mantener el estado en verificación mientras haga falta y conservar incidencias tardías o discrepantes. Observar operaciones inciertas, duplicados e incidencias por proveedor. |
| Cambio de credenciales, entorno o retirada con operaciones abiertas | Desactivar altas primero, mantener IPN/consulta y revisar el lote pendiente. Verificar el drenado y conservar historial antes de cambiar de entorno o retirar el adaptador. |
| Aprobación con correo fallido o documentos incoherentes | Verificar el registro contable y la cola en la misma transacción. Monitorizar antigüedad y estados pendientes, fallidos o inciertos, y verificar la operación segura de SMTP sin repetir el cobro. |

Para publicar, el CPPP confirma contrato, política de comisión, métodos activos,
credenciales por entorno y cuenta BCP. Operaciones ensaya la migración,
verifica respaldo y recuperación, endpoint público HTTPS/IPN y SMTP,
registra evidencia sandbox de tarjeta y Yape, comprueba indicadores de
conciliación y correo y valida que apagar altas conserva los medios manuales.
Ante una incidencia, apagar altas del proveedor, conservar eventos e historial
y conciliar las operaciones en curso. La revisión humana y el build manual
quedan pendientes hasta su ejecución. La activación requiere una decisión
expresa del CPPP.

## Versionado previsto

La etiqueta local alcanzable desde la rama es `v3.1.0.0.0` (`9b3b497`).
La entrega de HU-54 se clasifica como **Mayor** porque el inicio de cobros
nuevos exige enviar instrumento y cotización. Un cliente anterior que inicia
Izipay sin esos campos recibe 409 y debe actualizarse junto con la API.
La versión propuesta, si la base de publicación efectiva sigue siendo esa,
es `v4.0.0.0.0`. Si se entrega solo la planificación por separado, la
documentación corresponde al nivel **Interno** sobre la misma base.

# T-26 · Plan backend en capas

Especificación: [SPEC.md](../SPEC.md#t-26--backend-en-capas-por-módulo-mvc--solid).
Estado: **aprobado e implementado (T0–T8)**; fases F2–F7 pendientes.

## Resumen

Se crea la base común (errores, transacción, prueba de arquitectura) y se
migran por completo dos pilotos de bajo acoplamiento: `usuarios` (sin
dependientes; peor caso de SQL en la ruta) y `asistencia` (tiene servicio con
reglas ricas y concurrencia). Después queda el plan por fases para los 13
módulos restantes.

## Decisiones de arquitectura

- Fábricas `crearXRepository(consultor)`, `crearXService(deps)` y
  `xController(servicio): FastifyPluginAsync`; `<modulo>.module.ts` las compone
  y exporta el mismo nombre que hoy usa `app.ts` (`registrarUsuarios`, `asistenciaRoutes`).
- Las transacciones las abre el repositorio (`enTransaccion`) y las reglas que
  ocurren dentro de ellas las decide el servicio. El SQL se copia sin reescribir.
- Los servicios lanzan `ErrorAplicacion`; los controladores no capturan errores.
  El manejador global lo traduce a `{code,message}` con el mismo estado de hoy.
- `asistencia` recibe por parámetro `obtenerClase`/`conClaseBloqueada` de
  `clases`, `verificarTokenQr`, `reloj` y `QR_SECRET`, para probarse sin BD.
- Sin dependencias nuevas, sin cambios de SQL, migraciones ni contrato HTTP.

## Grafo de dependencias

```
T0 entorno integración (usuario) ─┐
T1 prueba de arquitectura ────────┼─► T3 usuarios: servicio+repo ─► T4 usuarios: controlador+wiring ─┐
T2 base común (errores, tx) ──────┘                                                                ├─► T7 documentación ─► T8 limpieza y revisión
                                  └─► T5 asistencia: servicio+repo ─► T6 asistencia: controlador+wiring ┘
```

T3–T4 y T5–T6 son independientes entre sí; se harán en secuencia para revisar un
piloto completo antes de repetir el patrón.

## Tareas

| # | Tarea | Tamaño | Archivos | Verificación |
|---|---|---|---|---|
| T0 | Levantar Postgres/Redis de gestioncapa en puertos alternos y medir la línea base de integración | — | ninguno (Docker, con autorización) | 189 pruebas de integración en verde, o fallos previos registrados |
| T1 | Verificador de capas `test/arquitectura.test.ts` con módulos falsos en memoria; lista de módulos migrados vacía | S | `test/arquitectura.test.ts`, `test/apoyo/capas.ts` | rojo → verde con muestras válidas e inválidas |
| T2 | `ErrorAplicacion`, manejo en `plugins/errores.ts`, `shared/transaccion.ts`, `Consultor` y `esViolacionUnica` en `shared/database.ts` | M | `shared/errorAplicacion.ts`, `shared/transaccion.ts`, `shared/database.ts`, `plugins/errores.ts`, `clases.repositorio.ts` (reexporta), `test/errores.test.ts`, `test/transaccion.test.ts` | unitarias y tipos |
| T3 | `usuarios`: entidad, DTO, repositorio y servicio con pruebas unitarias del servicio | M | `entities/usuario.ts`, `dto/usuarioDto.ts`, `repositories/usuariosRepository.ts`, `services/usuariosService.ts`, `test/usuariosService.test.ts` | rojo → verde; la ruta antigua sigue activa |
| T4 | `usuarios`: controlador, `usuarios.module.ts`, `app.ts`; elimina `usuarios.rutas.ts`; añade el módulo a la prueba de arquitectura | M | `controllers/usuariosController.ts`, `usuarios.module.ts`, `app.ts`, `usuarios.rutas.ts` (borrar), `test/arquitectura.test.ts` | arquitectura rojo → verde; integración `usuariosCppp`, `roles`, `rolesCppp`, `permisos` |
| T5 | `asistencia`: entidad, DTO, repositorio (incluye la consulta de curso cerrado) y servicio con dependencias inyectadas y pruebas | M | `entities/asistencia.ts`, `dto/asistenciaDto.ts`, `repositories/asistenciaRepository.ts`, `services/asistenciaService.ts`, `test/asistenciaService.test.ts` | rojo → verde |
| T6 | `asistencia`: controlador, `asistencia.module.ts`, `app.ts`; elimina los 3 archivos planos; ajusta el import de `cobroCurso.test.ts` y la ruta de `test:cobertura` | M | `controllers/asistenciaController.ts`, `asistencia.module.ts`, `app.ts`, `package.json`, `test/integracion/cobroCurso.test.ts`, `test/arquitectura.test.ts` | arquitectura; integración `asistencia`, `cobroCurso`, `sesionesCurso`, `modalidadSesion`, `sesionesVirtuales`, `certificados`; `test:cobertura` ≥ 60 % |
| T7 | Guía `docs/arquitecturaBackend.md` (reglas, plantilla de módulo, plan por fases), ADR-002 y estructura del README | S | 3 documentos | revisión de enlaces y de las reglas frente a la prueba |
| T8 | Simplificación, revisión de calidad y seguridad (DoD y checklist), versión y mensajes de commit | S | solo lo tocado | unitarias, tipos e integración completas |

Puntos de control: tras T2 (base común), tras T4 (primer piloto completo,
revisión humana del patrón antes de repetirlo) y tras T6 (suite completa).

## Plan de migración y crecimiento (fases posteriores, no incluidas)

Cada fase reutiliza la plantilla de T3–T4, añade el módulo a la prueba de
arquitectura y verifica con su integración. Orden por dependencias y riesgo:

| Fase | Módulos | Motivo | Riesgo principal |
|---|---|---|---|
| F2 | `health`, `pendientes`, `qr`, `historial`, `jitsi`, `notificaciones` | Sin dependencias entrantes problemáticas | `notificaciones` usa SMTP: va a `providers/` si se aprueba |
| F3 | `auth` (incluye `seguridadAcceso`, registro y semilla de usuarios) | Superficie de seguridad | Bloqueo, revocación y límites: revisión de seguridad obligatoria |
| F4 | `clases`, `reuniones` | `reuniones` tiene SQL en rutas; `clases` lo usan asistencia y cursos | Bloqueos por clase/instructor y solapamiento |
| F5 | `cursos` | El más grande; rompe `cursos ↔ clases` con funciones inyectadas | Portadas, catálogo público y cobro |
| F6 | `pagos`, `certificados` | Rompe `cursos ↔ pagos`; las pasarelas (estrategia) pasan a `providers/` | Dinero: conciliación, avisos IPN, vencimientos |
| F7 | Cierre | `app.ts` solo importa `*.module.ts`; unificar `ErrorPago`/`ErrorCertificado`/`ErrorHistorial`; mover semillas a `src/seeds/` y `cobro.procesos.ts` a `src/jobs/`; `dependency-cruiser` en CI (con autorización); actualizar `.archify` | Rutas de import en pruebas y documentación |

Crecimiento: todo módulo nuevo nace con la plantilla de la guía, se añade a
la prueba de arquitectura en su primera tarea y registra sus rutas en
`plugins/permisos.ts`, como hoy.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| No hay integración local (I-10) | Alto: CA-3 no se puede demostrar | T0 antes de T4; sin T0 no se marca el piloto como hecho |
| Lanzar errores dentro de `conClaseBloqueada` cambia el commit por rollback | Medio | Hoy los rechazos no escriben nada; se comprueba que el ayudante haga rollback y se cubre con MAR-06/07 |
| Cambio sutil de mensajes o cabeceras | Alto | Mensajes copiados literalmente; las pruebas de integración comparan `code` y estado; prueba unitaria de `ErrorAplicacion` |
| Concurrencia en asistencia (5 escaneos simultáneos) | Alto | El SQL `on conflict` y el bloqueo de clase no cambian; MAR-03 debe pasar |
| El verificador de imports por expresión regular pasa por alto un caso | Bajo | Pruebas del verificador con muestras inválidas; `dependency-cruiser` en F7 |
| Desfase de `dist/` y `server.js` | Bajo | El build lo ejecuta el usuario; `server.js` ya detecta `dist` desactualizado |

## Versionado previsto

Base comprobada `v3.1.0.0.0`. Refactorización sin cambio funcional → nivel
**Interno**: `v3.1.0.0.1` para la entrega completa de T-26. `package.json` no cambia.
Prefijos: `test:` (T1), `refactor:` (T2–T6), `docs:` (T7). Commit, etiqueta y
build los ejecuta el usuario.


## HU-39 · Asistencia presencial con QR personal o DNI

[Plan de implementación](../docs/esp/sprints/asistencia-presencial/hu-39/plan.md) en el sprint Asistencia presencial.
