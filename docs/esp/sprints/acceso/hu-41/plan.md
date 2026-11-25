# HU-41 · Plan de implementación

**Estado** Implementación aprobada y verificada localmente. [Especificación](SPEC.md) · [Seguimiento](todo.md).

## Enfoque

Implementar Google como método de autenticación de GestionCapa. Primero se
prueba el intercambio OIDC sin emitir sesión. Luego se entrega el recorrido
de agremiado existente con sesión HU-02. Se agregan el alta por DNI y la prueba
de correo externo sobre ese contrato. React conserva las vistas de entrada
y registro, con el botón y los estados propios de Google. El backend sirve
la disponibilidad de la opción, apagada por defecto.

El protocolo usará Node y `jose`, el estado de intento Redis, y el vínculo y
alta PostgreSQL. Se reaprovechan el transporte de correo, validación, firma
y revocación que ya existen. La propuesta no necesita instalar paquetes.

## Orden y comprobaciones

| ID | Incremento | Depende de | Prueba de aceptación | Áreas previstas |
|---|---|---|---|---|
| T41-01 | Validar identidad y disponibilidad de Google | — | Proveedor simulado firma tokens de prueba. El backend acepta el ID válido y rechaza claims, algoritmo, firma y audiencia incorrectos. Configuración apagada mantiene operativo HU-02. | `config`, `providers/auth`, prueba unitaria local. |
| T41-02 | Completar un intento OIDC desde el mismo navegador | T41-01 | Inicio, callback y POST de continuación por origen esperado. Verificar una sola consumición entre instancias, cruce de cookies, expiración, cancelación, retorno tardío entre pestañas y consultas ausentes de logs. | `repositories/auth`, `controllers/auth`, `routes`, matriz y prueba HTTP local. |
| T41-03 | Entrar con un vínculo persistente | T41-02 | PostgreSQL resuelve la unicidad de identidad. Una cuenta vinculada conserva su ID y rol aunque cambie el correo recibido. Las cuentas inactivas y otros roles se bloquean. | Migración, repositorio y servicio de auth, prueba local. |
| T41-04 | Confirmar una cuenta local existente | T41-03 | Una coincidencia sin vínculo exige la contraseña local una vez. Clave incorrecta, bloqueo, cuenta que cambió durante el intento, vínculo conflictivo y referencias reutilizadas dejan el estado consistente. El primer vínculo externo queda disponible tras T41-07. | Continuación de auth y adaptador de casos de uso, prueba local. |
| T41-05 | Proyectar el botón y terminar el acceso con HU-02 | T41-03, T41-04 | En escritorio y 360 px el usuario inicia con teclado o toque, ve los estados de error y vinculación, vuelve al curso permitido y cierra sesión. El JWT revocado recibe 401. Probar cierre repetido, rol cambiado, caída de Redis y que otra sesión conserva su acceso. | `LoginPagina`, `servicios/auth`, navegación y guard, Playwright local. |
| T41-06 | Crear cuenta Google al completar el DNI | T41-03 | El alta usa el correo verificado en servidor, registra una sola cuenta agremiada más vínculo y auditoría, mantiene el acceso clásico y rechaza colisiones con DNI o correo. | DTO, registro y migración si corresponde, prueba PostgreSQL local. |
| T41-07 | Verificar un buzón externo | T41-04, T41-06 | Correo Google no autoritativo requiere prueba del buzón antes de ofrecer vínculo o alta. Validar remisión, rotación o caducidad, intentos, consumo único, respuesta SMTP fallida y privacidad. Usar transporte falso local. | Redis, proveedor SMTP existente y flujo de alta, prueba local. |
| T41-08 | Completar el registro y retomar la navegación | T41-05, T41-06, T41-07 | La UI solicita DNI, muestra el correo fijado y usa el mismo aviso de privacidad. Verificar recarga, reenviar código, conflictos y vuelta a login o a curso sin inscripción automática. | `RegistroPagina`, servicios y Playwright local. |
| T41-09 | Revisar regresiones, proxy y entrega | T41-08 | Pasan los recorridos clásico y Google, los permisos y las pruebas de tipos. Se verifica `Set-Cookie` y `Location` en el proxy, limpieza de artefactos y reversión compatible con cuentas Google. | API, pruebas de servidor y documentación. |

T41-04 y T41-06 pueden avanzar de forma independiente una vez fijados el
contrato de T41-03 y el orden de las migraciones. Coordinar sus escrituras en
auth. T41-09 reúne la revisión de código y seguridad contra
`~/.agents/agent-skills/references/definition-of-done.md` y
`~/.agents/agent-skills/references/security-checklist.md`. Ejecutar la prueba
en rojo, registrar su causa, pasarla en verde y simplificar antes de proponer
cada commit. `AGENTS.md` reserva los commits al usuario.

## Riesgos y límites

| Riesgo | Comprobación o tratamiento |
|---|---|
| Vincular una cuenta tomando únicamente el correo | Una coincidencia sin vínculo requiere contraseña local. Con buzón externo se prueba su control antes de ofrecer alta o vinculación. Repetir con cuenta preexistente ajena, cambio de correo y carreras. |
| Confundir sesión local y Google, o ampliar el rol de una sesión anterior | Reusar JWT y revocación de HU-02. Validar método, actividad y rol desde la política del backend al emitir y en cada acceso protegido. Probar un ascenso de rol. |
| Código o datos personales en trazas | Excluir la consulta del callback en Fastify y comprobar el proxy y el entorno de entrega. La respuesta se limpia con 303 y la sesión se entrega por POST privado. |
| SMTP en mantenimiento o congestión | Habilitar la primera vinculación y el alta externa cuando el transporte esté disponible. Aplicar límites por intento, destinatario e IP efectiva con proxy de confianza. Medir errores por código sin destinatarios en logs. |
| Volver a una versión con hash de contraseña obligatorio | Ensayar el apagado de Google y el uso del artefacto de retorno compatible con hashes nulos y con el historial de migraciones. Prepararlo antes de admitir cuentas Google. |

## Publicación posterior a la aprobación

- Configurar en Google Cloud un cliente web de pruebas y otro para el origen
  autorizado de producción. Validar origen, URI exacta del callback, pantalla
  de consentimiento, credenciales del backend y requisitos de publicación de
  Google aplicables a la aplicación.
- Probar con cuentas autorizadas Gmail y de correo externo, más SMTP de
  preproducción. Verificar `Set-Cookie` y `Location` del proxy de destino,
  omitir del registro de Nginx la consulta del callback y comprobar la política
  de referencia y el comportamiento con Google apagado. Ejecutar build manual.
- Aplicar y verificar migración en una base aislada antes del despliegue.
  Monitorizar disponibilidad, fallos de intercambio, revocación y altas.
  Preparar retorno y revisar privacidad del registro con el CPPP.
- Publicación y operaciones Git a cargo del usuario. La base alcanzable
  actual es `v3.2.0.0.0`. Si esta es la siguiente entrega funcional,
  se propone `v3.3.0.0.0`, sujeta a la base vigente al publicar.


## Commits manuales propuestos

| Incremento | Summary | Description |
|---|---|---|
| T41-01–02 | `feat: verificar el acceso de Google con OpenID Connect` | Incorpora validación de identidad, configuración y control de intentos de navegador. Verifica firma, audiencia y callback de un solo uso. |
| T41-03–04, T41-06–07 | `feat: vincular y registrar agremiados con Google` | Persiste el vínculo y el alta por DNI en PostgreSQL y verifica el buzón externo cuando corresponde. Verifica roles, conflictos y carreras. |
| T41-05, T41-08–09 | `feat: completar el ingreso y cierre por Google` | Conecta las pantallas, el retorno al curso y la revocación HU-02. Documenta proxy, migración y publicación. El build queda para ejecución manual. |
