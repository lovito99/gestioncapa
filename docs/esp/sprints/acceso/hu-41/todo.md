# HU-41 · Tareas y seguimiento

[Especificación y soluciones](SPEC.md) · [Plan](plan.md).

## Preparación

- [x] Leer HU-02, registro, roles, proxy y retorno de curso.
- [x] Buscar en repositorio, Astryx, npm, GitHub público, MCP, skills y documentación oficial.
- [x] Documentar criterios, riesgos, decisiones y dependencias.
- [x] Aprobar la especificación y el plan, incluida la confirmación única de
  cuenta existente, alta sin contraseña, prueba de correo externo y alcance de rol.

## Identidad y cuenta existente

- [x] T41-01 · Validar Google y disponibilidad con un proveedor controlado.
- [x] T41-02 · Completar y consumir un intento del mismo navegador.
- [x] Control 1 · Pruebas de firma, estados y origen. Rechazos sin crear sesión.
- [x] T41-03 · Persistir el vínculo y entrar con la misma cuenta local.
- [x] T41-04 · Confirmar por única vez la cuenta que coincide por correo.
- [x] T41-05 · Completar acceso desde la pantalla y revocar mediante HU-02.
- [x] Control 2 · Probar de extremo a extremo una cuenta existente y el cierre.

## Alta y verificación de entrega

- [x] T41-06 · Registrar DNI, cuenta, vínculo y auditoría en una transacción.
- [x] T41-07 · Verificar el correo externo para alta o primera vinculación mediante el transporte existente.
- [x] T41-08 · Completar formulario de alta y recuperar la navegación.
- [x] Control 3 · Probar alta de Google, conflictos y regresión del alta clásica.
- [x] T41-09 · Revisar calidad, seguridad, proxy, migración, retorno y documentación.
- [x] Control 4 · Validar tipos, regresiones y Playwright con el proveedor simulado.
- [ ] Preproducción con cliente Google autorizado, SMTP, build manual y decisión de publicación.

Cada tarea registra prueba roja y verde, causa raíz si hubo un fallo, y
Summary y Description para el commit manual. Conservar pruebas nuevas solo
en local. Esta fase de planificación tiene verificaciones documentales.

## Evidencia previa a la implementación

- Backend: 9 pruebas existentes de autenticación, registro y trazas pasaron.
- Frontend: 27 pruebas existentes de retorno al curso y vigencia de token
  pasaron.
- Verificados el manifiesto YAML, los enlaces locales, los seis criterios,
  las nueve tareas y su orden de dependencias, y `git diff --check`.
- La revisión adversarial identificó el riesgo de cuentas precreadas con
  correo ajeno, retornos cruzados entre pestañas y revocación tras un
  cambio de rol. La especificación incorpora comprobaciones para estos casos.
- La prueba funcional de HU-41 y la prueba autorizada con Google quedan
  pendientes de la implementación.

## Evidencia de implementación

| Incrementos | Prueba en rojo | Resultado en verde |
| --- | --- | --- |
| T41-01 | Faltaba el proveedor. La prueba adversarial demostró que una segunda audiencia podía ser aceptada. | La validación con claves de prueba rechaza la firma y los claims inválidos, incluida una audiencia ajena. |
| T41-02–04 | Los endpoints devolvían 404. Las pruebas de revisión reprodujeron un retorno antiguo que no quedaba invalidado y una cancelación que dejaba una alta confirmada. | Redis mantiene un intento vigente por navegador. Las transiciones impiden continuar desde otro intento o sobrescribir una sesión activa. PostgreSQL confirma una sola cuenta o vínculo. |
| T41-05–08 | Las pruebas HTTP mostraron que el acceso social no existía. La revisión detectó un cierre bloqueado por el guard normal de roles. | Se renueva el acceso de la cuenta vinculada, se conserva el retorno al curso, el DNI se conserva solo en el alta y HU-02 revoca el JWT exacto aunque cambie el estado del usuario. El correo externo se verifica mediante el transporte simulado. |
| T41-09 | La prueba de arquitectura detectó dependencias de controlador fuera de capa y se comprobó el riesgo de registrar la consulta en el proxy documentado. | La arquitectura pasa. El proxy local conserva cookies, privacidad y 303. El runbook exige filtrar la consulta en el proxy de destino. |

- `npm test`: 646 pruebas de backend y 200 de frontend, incluidas siete
  pruebas del servidor, pasaron.
- `npm run test:integracion`: 483 pruebas pasaron con PostgreSQL y Redis
  en contenedores aislados. La pasada enfocada final de firma, trazas y
  HU-41 también pasó sus nueve pruebas.
- Playwright: tres recorridos de HU-41 con Google simulado y backend real,
  más ocho regresiones de roles contra la API real, pasaron.
- Tipos de ambos workspaces y E2E, lint de frontend y prueba local de
  cabeceras del proxy pasaron. Lint mantiene dos avisos anteriores ajenos
  a esta historia.
- PostgreSQL 17: la migración `0048` se aplicó sobre `0047`, conservó los
  hashes previos y admitió altas sin contraseña. La segunda ejecución
  quedó al día. El artefacto de retorno requiere incluir la migración.
- Revisados la Definition of Done
  local y el checklist local de seguridad. Se verificaron permisos por
  cuenta, límites, roles, datos mínimos, transacciones y privacidad de los
  registros en la app. Quedan para preproducción Google y SMTP reales,
  el filtro efectivo del proxy de destino, el artefacto de retorno y el
  build manual.
- Las pruebas nuevas, el servidor simulado y su configuración de Playwright
  se excluyeron localmente con `.git/info/exclude`.
