# HU-39 · Seguimiento

[Especificación y soluciones](SPEC.md) · [Plan](plan.md).

## Preparación

- [x] Diagnosticar la simulación, el backend y las rutas de sesión.
- [x] Consultar repositorio, Astryx, npm, GitHub público, MCP y skills.
- [x] Definir los siete criterios y las tareas verificables.
- [x] Aprobar la especificación, la búsqueda exacta, los encargados del catálogo
  actual y la compatibilidad del QR rotatorio.

## Credencial

- [x] T39-01 · Firmar el QR personal y rechazar códigos ajenos.
- [x] T39-02 · Mostrar «Mi QR» al colegiado autenticado.
- [x] T39-03 · Descargar PDF con QR escaneable.
- [x] Control 1 · El PDF y la pantalla representan la misma credencial.

## Configuración y registro

- [x] T39-04 · Persistir el encargado y validar su rol.
- [x] T39-05 · Abrir la puerta con acceso mínimo por asignación.
- [x] T39-06 · Registrar un QR personal sin duplicar asistencia.
- [x] T39-07 · Buscar por DNI exacto y registrar la asistencia.
- [x] Control 2 · La base conserva una sola marca por inscrito y sesión.

## Puerta y entrega

- [x] T39-08 · Conectar cámara, fallback DNI y contador.
- [x] T39-09 · Deshacer una marca concreta con auditoría.
- [x] T39-10 · Habilitar y bloquear el QR rotatorio según la sesión.
- [x] Control 3 · Puerta y alternativa rotatoria verificadas con ambos roles.
- [x] T39-11 · Verificar PDF por navegador, flujos de servidor y migración con datos anteriores.
- [ ] T39-11 · Validar cámara de un teléfono por HTTPS y el retorno de publicación en preproducción.
- [x] Control 4 · Registrar resultados, tipos, lint, calidad y seguridad.
- [ ] Build manual y decisión de publicación.

## Evidencia

| Tareas | Rojo | Verde |
| --- | --- | --- |
| T39-01 a T39-03 | Módulo de firma ausente y API «Mi QR» con 404. | Firma estable, rechazo de formatos ajenos, descargas autenticadas y lectura del QR extraído del PDF. |
| T39-04 a T39-07 | La API aceptaba un colegiado en el campo de encargado y faltaban las rutas reales. | Persistencia por sesión, permisos del delegado, pago pendiente sin acceso, búsqueda exacta y una sola marca en la carrera de tres métodos. |
| T39-08 a T39-10 | El delegado no tenía vínculo en «Mis clases». El reinicio de las secuencias de E2E hacía colisionar la auditoría de «Deshacer». El bloqueo original de agenda retenía también la marca. | Playwright prueba DNI sin cámara, rectificación, PDF y escaneo con flujo de vídeo sintético. PostgreSQL verifica corrección auditada y convivencia con la agenda. El QR rotatorio respeta el valor guardado. |
| T39-11 | La prueba de arquitectura señaló importaciones entre capas. Dos pruebas de contrato detectaron campos nuevos en respuestas históricas. | Composición de dependencias en la ruta, contratos históricos conservados y 0046 verificada sobre marcas antiguas `QR` y `VIRTUAL`. |

Las verificaciones se ejecutaron en PostgreSQL, Redis y navegador locales.
Las pruebas específicas de HU-39 quedaron excluidas de Git mediante
`.git/info/exclude`. También quedan en la máquina los archivos de prueba
anteriores de HU-37 y arranque.

### Resultados

| Verificación | Resultado |
| --- | --- |
| Backend, unitarias y arquitectura | 603 de 603 en el conjunto de la rama con la prueba local de firma. Los archivos locales de HU-37 y arranque quedaron fuera de esta ejecución. |
| Backend con PostgreSQL y Redis | 456 de 456 en integración, incluida la puerta. Se excluyó la suite local de HU-37, que depende de módulos ausentes en esta rama. Una pasada enfocada final de 48 pruebas también pasó. |
| Frontend | 190 de 190 con Vitest y 7 de 7 del servidor. Vitest excluyó la suite local de HU-37. |
| Navegador | 14 de 14 contra la API real y 18 de 18 en demo para clases y roles. |
| Tipos y lint | Tipos de la rama y E2E correctos con la exclusión documentada de HU-37. Lint terminó con dos advertencias previas en otros archivos. |
| Migración 0046 | Aplicada en una base aislada ya migrada a 0045 y con marcas de ambos orígenes históricos. Ambos registros conservaron sus identificadores y sus orígenes. |
| Build y cámara física | Pendientes de ejecución manual. |

### Revisión de calidad y seguridad

- Revisión con `definition-of-done.md` y `security-checklist.md`. La API
  autentica cada ruta y valida el operador por sesión antes de consultar o
  registrar. La prueba de integración cubre reasignación y desactivación.
- La búsqueda valida ocho dígitos, limita por operador y parametriza la
  consulta. El DNI parcial y la identidad mínima son las únicas proyecciones
  de perfil. Las rutas privadas deshabilitan la caché HTTP.
- El QR personal usa firma con propósito distinto del rotatorio. El
  marcado reutiliza unicidad y bloqueo de sesión. La rectificación usa una
  marca concreta y guarda su auditoría en la misma transacción.
- La lectura del PDF y la liberación de la pista se comprobaron con
  Chromium y un flujo de cámara sintético. Queda la comprobación física
  en un teléfono por HTTPS.
- El chequeo de tipos estándar detecta referencias locales a HU-37 sin
  sus módulos en la rama. Tipos de backend y frontend pasan excluyendo
  esos archivos locales. Las pruebas locales de arranque incluyen dos
  casos que esperan un comportamiento distinto al lanzador de esta rama.
