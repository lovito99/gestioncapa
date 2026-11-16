# Cobro de cursos — HU-53

> La guía vigente está dividida por responsabilidad en
> [docs/esp/cobro/](cobro/README.md). Este archivo se conserva como snapshot compatible
> para enlaces y evidencia de versiones anteriores; no debe recibir documentación nueva
> salvo que una tarea requiera actualizar expresamente ese historial.

Implementación local del 15/11/2026. Incluye política de cobro, obligaciones y
operaciones financieras, inscripción/acceso y entrega de constancias. No se ha
publicado ni habilitado un comercio. Izipay y Culqi están deshabilitados por defecto.

## Uso

El administrador elige al crear un curso:

| Modalidad | Importe | Inscripción | Constancia elegible |
| --- | --- | --- | --- |
| Pago antes de llevar el curso | Positivo | Reserva pendiente hasta pago verificado | No exige otro pago |
| Pago solo por el certificado | Positivo, por la constancia | Confirmada sin pago | Retenida hasta pago verificado |
| Gratuito | Cero | Confirmada | Sin obligación de pago |

Pago previo exige un plazo de 1–525600 minutos, desde la inscripción, sin valor
predeterminado. El monto se almacena como céntimos/PEN. El catálogo y detalle muestran
las condiciones antes de inscribirse. «Guardar condiciones de cobro» modifica la oferta
mediante PATCH, con versión; cada inscripción conserva sus condiciones aceptadas.
La edición general de metadatos por PUT sigue siendo una limitación anterior del backend.

Una reserva vencida deja de ocupar cupo desde el vencimiento y no habilita material,
descarga, asistencia ni reunión. Un proceso cada 30 s persiste las cancelaciones y
entrega constancias pagadas; al iniciar el servidor recupera el trabajo pendiente.
El tiempo depende del tamaño de la cola y de que PostgreSQL/servidor estén disponibles.
Las clases independientes conservan su flujo de inscripción y asistencia.

En el detalle del participante aparece la referencia de pago. El administrador abre
«Pagos», consulta esa referencia, verifica participante/curso/importe, ingresa el recibo
interno y confirma que recibió el importe completo. La referencia es única. Una operación
externa activa/incierta o una incidencia pendiente bloquea otra recepción de efectivo.
El comprobante interno no sustituye un comprobante tributario.

La constancia solo se evalúa dentro del alcance académico existente: presencial,
participación, asistencia mínima del curso (80 % por defecto), sesiones terminadas y
cierre oportuno. La elegibilidad queda congelada al cerrar. Retener no genera un PDF,
código público válido ni horas certificadas. Pagar después del cierre permite emitir
una sola vez desde esos datos. Se mantienen las firmas y leyendas de demostración;
HU-53 no aporta firma oficial, exámenes ni nuevas reglas académicas virtuales.

## Integración de pasarelas

Izipay Web Core genera el token desde backend, verifica HMAC-SHA256 sobre los bytes
originales de `payloadHttp` y correlaciona transacción, comercio y pedido. Culqi Checkout
Custom obtiene un token de tarjeta y el backend crea/consulta el cargo autenticado.
No se reciben PAN/CVV en GestionCapa. El navegador no puede acreditar un pago por sí solo.

La obligación y operación se registran antes de llamar a la pasarela. Hay una única
operación activa por obligación y claves de idempotencia vinculadas a la carga.
Una discrepancia verificada se conserva como incidencia. Referencias financieras y
auditoría no se borran por cascada al eliminar un curso. Un pago tardío queda registrado
para conciliación y nunca recupera automáticamente un cupo ya liberado.

La conciliación automática consulta hasta tres operaciones recuperables por ciclo de
60 s, cediendo turno incluso al fallar. Las que no tienen referencia manual no bloquean
las demás. Culqi conserva el identificador devuelto antes de consultar el cargo; si la
respuesta de creación se perdió sin identificador, ADMIN aporta la referencia del panel
para verificarla. Nunca se repite automáticamente la creación del cargo.

Izipay conserva su sesión original cifrada con AES-256-GCM y AAD por operación. Puede
reabrirse durante 14 minutos si sigue pendiente y exigible, usando la misma clave y token;
no se genera otro token para recuperar una respuesta perdida. El ciclo de recuperación
borra sesiones expiradas o confirmadas. La clave se deriva de `JWT_SECRET` con un contexto
propio; rotarlo invalida estas sesiones, conserva el historial y obliga a conciliar.
Una sesión incierta/expirada no se regenera. No se deduce un rechazo definitivo a partir
de códigos Izipay no documentados. La consulta firmada con varias órdenes conserva sus
referencias como incidencias sin aplicar automáticamente el cobro.

### Configuración y ejemplos de prueba

`backend/.env.example` contiene ejemplos **comentados** y reconocibles como marcadores,
sin credenciales utilizables. No copiarlos a producción ni compartir claves por chat.

| Variable | Uso |
| --- | --- |
| `pagosEntorno` | `sandbox` por defecto; `produccion` requiere NODE_ENV=production |
| `izipayHabilitado`, `culqiHabilitado` | `false` por defecto; habilitación independiente |
| `pagosUrlPublica` | Origen HTTPS del backend para IPN |
| `izipayCodigoComercio`, `izipayClavePublica` | Comercio y credencial backend de generación de token |
| `izipayClaveHash`, `izipayRsaPublica` | Verificación de firma y RSA pública del checkout |
| `culqiClavePublica`, `culqiClaveSecreta` | Claves test/live coherentes con el entorno |

Para acreditar sandboxes, el CPPP debe aportar cuentas/productos de comercio y configurar
credenciales por el canal seguro del despliegue. Configurar IPN/webhook HTTPS del proveedor,
verificar montos y límites del comercio, completar un pago de prueba y un rechazo, reenviar
notificaciones y conciliar una interrupción. Conservar referencias y estados anonimizados;
no registrar tarjetas, token de checkout, payload completo, JWT ni claves. Las pruebas
automatizadas actuales simulan únicamente el transporte del proveedor; no son evidencia
de una operación realizada por Izipay/Culqi. No existe una suite sandbox que aparente pasar
sin cuentas ni se añadieron pruebas omitidas para ocultar este pendiente.

Fuentes contrastadas: [Izipay Web Core](https://developers.izipay.pe/web-core/quickstart/),
[firma](https://developers.izipay.pe/web-core/Modalidades/firma-validation/),
[OpenAPI de token/consulta](https://developers.izipay.pe/yaml/api-v1-esp.yaml),
[Culqi cargos](https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/cargos/),
[Checkout Custom](https://docs.culqi.com/es/documentacion/checkout/checkout-custom/) y
[webhooks](https://docs.culqi.com/es/documentacion/pagos-online/webhooks/).
El producto contratado y el recorrido SDK real deben cotejarse antes de habilitar cada medio.

## Migración y recuperación

Las migraciones 0018–0028 amplían el esquema, refuerzan integridad financiera y añaden
consumidores transaccionales. No modifican migraciones históricas. El trigger de pago
activa reservas en la misma transacción, bajo el lock del curso; los módulos de pagos
no importan cursos ni certificados. Locks de clases/asistencia siguen el orden curso→clase.

Las inscripciones históricas sin intento no reciben pagos ni plazos inventados. Se conserva
el derecho gratuito conocido al migrar y al crear una inscripción legada en una oferta
entonces gratuita. Cambios posteriores de oferta no alteran ese derecho. Las condiciones
antiguas desconocidas necesitan acuerdo de regularización antes de emitir constancias.

Inventario de solo lectura (ejecutar con entorno de la copia aislada):

```bash
node --import tsx backend/src/scripts/inventarioCobro.ts --inventario
```

No hay un comando de aplicación masiva: faltan la decisión de negocio y la autorización
para datos reales. El inventario distingue oferta actual de condiciones históricas aceptadas.

Antes de activar: backup cifrado y restauración ensayada, inventario revisado y registro
de quién resolverá pendientes antiguos y pagos tardíos. Una vez haya operaciones nuevas,
no restaurar un backup antiguo sobre la base activa ni borrar tablas de pagos. Ante un
incidente, deshabilitar pasarelas, restringir nuevas altas en el proxy si hace falta,
conservar notificaciones verificables y corregir hacia adelante. El backend anterior no
conoce snapshots ni retenciones: no es un rollback compatible del flujo de cobro.
Conciliar con el panel del comercio antes de admitir otro cobro. GestionCapa no ejecuta
devoluciones ni perdona deudas mediante un botón administrativo sin verificación.

## Evidencia y límites de aceptación

| Criterios | Evidencia local | Límite pendiente |
| --- | --- | --- |
| 01–03 | politicaCobro, cobroCurso, formulario/formato y navegador real | Build manual |
| 04–05 | Contratos Izipay/Culqi, HMAC/cargo autenticado simulado, adaptadores y SDK | Cobros sandbox de ambos comercios |
| 06 | pagosCurso, cobroCurso, formulario y dos recorridos reales de efectivo | Revisión operativa del CPPP |
| 07–08 | Duplicados, exclusión, discrepancias, propiedad, firma, referencias, recuperación de sesión/cargo | Prueba comercial de rechazo/reintento de ambos proveedores |
| 09–13 | Snapshots, vencimiento, última plaza, pago oportuno/tardío, PDF y asistencia | Carga/latencia del procesador en despliegue |
| 14–18 | Retención sin documento, snapshot académico, pago tras cierre, emisión única e historial | Firma oficial de producción fuera de HU-53 |
| 19 | Migración desde 0017, datos legados, ejecución idempotente y protección del historial | Regularización de condiciones antiguas desconocidas |
| 20 | PostgreSQL/Redis aislados, navegador móvil real, revisión interna y controles locales | Sandboxes, build y revisión humana antes de publicar |

Las pruebas de HU-53 están en `backend/test/{politicaCobro,pagosConfiguracion,izipay,culqi,proveedorHttp}.test.ts`,
`backend/test/integracion/{cobroCurso,pagosCurso,migracionCobro}.test.ts`, pruebas frontend
de formulario/pago/historial/efectivo y `e2e/prb/real/cobroCurso.spec.ts`. Los nombres
propuestos en el plan se consolidaron aquí para no duplicar fixtures y preparación de BD.

### Revisión de calidad y seguridad

Se aplicaron las skills solicitadas y revisión interna independiente de pagos y
acceso/constancias. Hallazgos corregidos con reproducción RED/GREEN: borrado financiero
en cascada, referencias y discrepancias perdidas/reutilizadas, transición de operación
rechazada que colisionaba con otra activa, efectivo con incidencia, gratuidad histórica
inferida del precio posterior, referencia Culqi perdida y bloqueo del lote de recuperación.
No se solicitó otro modelo después de la preferencia del usuario por revisión interna.

DoD y Security Checklist: permisos/propiedad en servidor, SQL parametrizado, validación,
firma/consulta autenticada, HTTPS/hosts fijos, respuestas acotadas y timeouts, límites de
cuerpo/IP, no-store y auditoría persistente cubiertos. Sesión PSP cifrada y con expiración.
El servidor registra contadores de reservas/entregas y operaciones por conciliar sin datos
personales. No hay nuevos paquetes npm. La política actual sin lockfile impide acreditar
una auditoría reproducible de dependencias; no se modificó ni se declaró aprobada.
El servidor frontend mantiene su configuración previa sin CSP de producción: el CPPP
debe verificar la política del proxy y los hosts reales de SDK/3DS antes de habilitar cobros.
No se amplió una CSP a ciegas ni se añadieron comodines para fingir compatibilidad.

Quedan pendientes del gate de entrega: evidencia sandbox, build manual, aprobación humana,
ensayo operativo de recuperación del despliegue, responsables y alertas operativas (operaciones inciertas,
vencidos sin procesar, retenciones ya pagadas). Registrar métricas y umbrales del despliegue
antes de activar. No se declara satisfecha toda la DoD ni autorización de producción.

## Git y entrega manual

Sin add/commit/tag/push/merge/PR por el agente. Base local comprobada: `v2.0.0.1.0`,
HEAD `000a93c`. Recomendación condicional: `v3.0.0.0.0`, por exigir la versión de
condiciones en inscripciones pagadas y proteger contenido antes accesible con sesión.
Los paquetes npm conservan su versión. El usuario elige los commits y etiqueta de entrega.

Mensajes propuestos por bloque (no son commits creados):

1. `feat!: configurar y congelar condiciones de cobro por curso`
2. `feat: registrar pagos verificados y efectivo con auditoría`
3. `feat: aplicar pago y vencimiento al acceso del curso`
4. `feat: retener y entregar constancias según el cobro aceptado`
5. `test: verificar cobro y recuperación con API y navegador reales`

La separación por archivos requiere revisar hunks compartidos de cursos/constancias,
sin mezclar cambios ajenos. No usar `git add .` ni asignar una versión de publicación
distinta a cada bloque. El build y la revisión del diff quedan para el usuario.


## Verificaciones ejecutadas

Entorno: Node 24.15.0, PostgreSQL 17 y Redis 8 efímeros, Chromium/Playwright, Vite
de desarrollo sin build. Integración en `hu53integracion`, E2E en `gestioncapa_e2e`,
restauración en `hu53restaurada`; ninguna base real del usuario fue modificada.
El npm disponible es 9.2.0 frente al mínimo 11 del manifiesto; no se cambió la
herramienta global. No se presenta esta ejecución como una instalación reproducible.

| Comando desde la raíz | Resultado final |
| --- | --- |
| `npm test` | 301 backend, 70 frontend y 3 servidor aprobados |
| `npm run test:integracion` con BD limpia aislada | 289/289 aprobados, sin omisiones |
| `node --import tsx --test --test-name-pattern='ni materiales' backend/test/integracion/cobroCurso.test.ts` | Protección de PDF/material, asistencia y reunión antes/después de pago aprobada |
| `npm run test:cobertura` | 98.96 % líneas, 88.14 % ramas, 100 % funciones en asistencia; umbrales de 60 % intactos |
| `npm run e2e:real -- --workers=1` | 31/31 aprobados, incluidos ambos recorridos HU53 |
| `npm run e2e -- cursos.spec.ts inscripcionCurso.spec.ts catalogoPublico.spec.ts --workers=2` | 12/12 recorridos seleccionados aprobados |
| `npm run typecheck -w backend` | Aprobado sin generar build |
| `npm exec -w frontend -- tsc -p tsconfig.app.json --noEmit` y `tsconfig.node.json --noEmit` | Aprobados |
| `npm run e2e:tipos` | Aprobado |
| `npm run lint -w frontend` | Sin errores; dos avisos anteriores en pdfTexto/CursosPagina |
| `git diff --check` | Aprobado |

El aviso nuevo de `watch` en el formulario se resolvió con `useWatch`, sin supresiones.
Se compartió el criterio de actualización de entregas entre historial y Mis cursos,
sin alterar estados. MSW avisa en demo que el worker previo no coincide con la versión
instalada; no hubo fallos en esos recorridos ni se regeneró un archivo ajeno sin revisión.

Se preservaron los registros financieros al restaurar un `pg_dump -Fc` en otra base
y volver a ejecutar migraciones («ya está al día»). Coincidieron conteos y huellas de
las siete tablas: 9 obligaciones, 7 operaciones, 7 hechos, 0 incidencias, 7 auditorías,
18 intentos y 4 entregas. La muestra es exclusivamente sintética; no prueba una
restauración de producción con transacciones posteriores.

Causas de fallos intermedios: expectativas de selectores/estados antiguos en E2E,
filtro de catálogo HU14 contaminado por cursos dejados por E2E y los hallazgos
financieros/históricos descritos arriba. Se corrigieron las causas y se repitieron
los controles afectados. No se borraron pruebas ni se alteraron umbrales.

Historial y Mis cursos muestran el intento vigente y permiten desplegar los
anteriores, sus condiciones congeladas y la consulta de su pago. El recorrido
tras reinscripción se verificó en navegador móvil, incluyendo la reserva anterior
vencida; administración enlaza a su consulta protegida. Permanecen los gates externos
y operativos indicados. Los prefijos anteriores de SPEC.md, plan.md y todo.md fueron
verificados por SHA-256; los conflictos previos de todo.md se conservaron según instrucción.


Verificación adicional de recuperación: se inició la operación Culqi en un proceso
Node hijo con transporte del proveedor simulado. Tras persistir la referencia y
antes de devolver la consulta, el proceso se terminó con SIGKILL. Otro proceso
verificó el cargo, confirmó la reserva y conservó exactamente un hecho financiero,
sin emitir otro POST de cargo. Se diferencia esta prueba de los timeouts simulados.

Dos procesadores activos sobre la misma BD recuperaron reservas ya vencidas al
arrancar y cancelaron otra durante el intervalo real de 30 s (prueba de 31.2 s).
Reprocesar no alteró la fecha de cancelación y el cupo quedó libre. Esta prueba
focalizada se añadió tras la suite de 289 casos y pasó; no equivale a una prueba
de carga del despliegue.

Tras añadir la consulta de intentos anteriores, se repitieron 4 E2E reales de cobro
e historial: aprobados. La regresión completa anterior tiene 31 casos aprobados,
y los 12 demo seleccionados también pasaron. Frontend final: 70 pruebas en 15 archivos.

## Entorno de preparación de datos E2E

`e2e/ayud/entornoReal.ts` define los valores públicos de prueba compartidos por
el servidor Playwright y las preparaciones de datos HU-20/HU-53. Cada proceso hijo
combina la conexión heredada del job con este perfil; no depende de que la terminal
o GitHub Actions definan credenciales de sesión y administrador.

La configuración `webServer.env` solo configura los servidores que inicia Playwright;
no modifica `process.env` de los tests. Preparar HU-53 con solo NODE_ENV y DB_NAME
dejaba JWT_SECRET, QR_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD ausentes en CI.
Ese mismo caso podía pasar localmente cuando la terminal ya tenía esos valores.

La regresión se reproduce con conexiones aisladas de PostgreSQL/Redis y las cuatro
variables vacías en el proceso principal:

```bash
JWT_SECRET= QR_SECRET= ADMIN_EMAIL= ADMIN_PASSWORD= npm run e2e:real
```

La validación estricta del backend y la restricción
a `gestioncapa_e2e` siguen activas. Se reutiliza el E2E existente de retención como
prueba RED/GREEN, sin omitir casos ni añadir credenciales reales al workflow.

Resultado de esta corrección: el caso focalizado falló por las cuatro variables
ausentes antes del cambio y pasó después. La suite completa pasó 31/31, con CI=true,
dos workers y esas variables vacías en el padre, sobre PostgreSQL/Redis temporales.
`npm run e2e:tipos` y `git diff --check` aprobados. La ejecución remota de Actions y
el build manual quedan pendientes; no se hicieron commits ni push desde el agente.

## T-25 — Elección de pasarela y continuidad con HU-54

La elección comunicada por el usuario es **Izipay**, con efectivo presencial y
transferencia bancaria como medios adicionales. El
[comparativo de cuatro candidatas](comparativoPasarelas.md), el
[registro de decisión](../decisions/001-pasarelaIzipay.md) y los
[criterios locales para HU-54](hu54Pagos.md) documentan esa definición.

Esta selección de negocio no acredita afiliación, pruebas sandbox ni despliegue.
La ampliación solicitada implementa la declaración de transferencia por referencia
y la confirmación/rechazo ADMIN con conciliación bancaria real a cargo del CPPP.
El efectivo conserva su flujo administrativo. Culqi conserva notificaciones,
conciliación e historial; nuevos cobros usan Izipay.

### Configurar y operar transferencias

1. El usuario aplica `npm run migrate`: migraciones nuevas 0029 y 0030. Amplían el
   medio y añaden destinos/declaraciones; los registros anteriores se conservan.
2. Configurar de forma privada `transferenciaBanco`, `transferenciaTitular`,
   `transferenciaCuenta` (6–34 dígitos) y `transferenciaCci` (20 dígitos), y activar
   `transferenciaHabilitada=true`. Los marcadores de `.env.example` no son cuentas.
3. El propietario ve el destino ofrecido para su obligación y declara referencia
   y fecha de un abono ya realizado. Debe pagar el importe completo en PEN.
4. ADMIN consulta `/admin/pagos?pago=<referencia>` y contrasta el extracto bancario:
   destino, importe, moneda, fecha y referencia. Confirma recepción real o rechaza
   con motivo; los intentos y decisiones quedan auditados.

La primera cuenta ofrecida se conserva por obligación incluso al recargar o
cambiar configuración. Los destinos nuevos usan la configuración vigente.
Deshabilitar el flag deja de ofrecer cuentas a nuevas obligaciones, pero permite
declarar abonos ya hechos a destinos anteriores; la interfaz indica no pagar otra vez.
HU-32 añade voucher obligatorio en nuevas declaraciones y conserva las históricas
sin archivo. Declarar una referencia nunca confirma un pago. El efectivo exige
importe recibido y fecha; el servidor verifica ambos, también en reintentos.
Consulta [vouchers, correo y retención](pagosTransferenciaEfectivo.md).

La declaración queda `DECLARADO`, bloquea nuevos cargos/efectivo y entrega de sesión
Izipay. Puede coexistir con una operación iniciada antes de declarar: sus resultados
se concilian. Los abonos tardíos o adicionales se conservan con incidencia y nunca
recuperan automáticamente un cupo vencido ni aplican una deuda dos veces.
Las devoluciones, importes parciales y excedentes requieren gestión del CPPP.

### Publicación y recuperación

Antes de habilitar: revisión humana, build manual, backup, migraciones en staging,
cuenta institucional verificada y prueba real de Izipay con credenciales del comercio.
Mantener nuevas ofertas deshabilitadas hasta actualizar todas las instancias del
backend; los servidores anteriores no comprenden las declaraciones de transferencia.
Se conservan las credenciales Culqi necesarias para obligaciones históricas.
El cambio de nuevos cargos Culqi a Izipay es incompatible para esos consumidores;
el [contrato API](../API.md#t-25--izipay-y-transferencias-bancarias) indica la adaptación.

Para detener nuevas ofertas de transferencia, desactivar su flag sin borrar tablas
ni operaciones. La revisión de abonos ya declarados sigue disponible. Una reversión
del código necesita una versión que comprenda TRANSFERENCIA/DECLARADO: no desplegar
el backend antiguo sobre filas con esos valores. Conservar migraciones y datos;
no existe un down automático seguro que elimine historial financiero. La recuperación
productiva exige una versión correctiva compatible y conciliación, con build manual.
