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
