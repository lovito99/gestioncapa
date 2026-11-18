# Flujos interactivos de GestionCapa

Los diagramas se generaron con Archify 3.2.0 el 18/11/2026, a partir del código
del commit `1e932c24ff76b49cfc4afa75b9081d67dc5a9007`. Cada nodo permite consultar
las referencias a los archivos y líneas de esa revisión. Describen el comportamiento
implementado; no comprueban que las integraciones estén activas en un despliegue.

## Diagramas

Abre los archivos HTML en un navegador. Son autónomos: el diagrama y sus controles
funcionan sin servidor ni conexión; los enlaces al código en GitHub requieren Internet.

| Diagrama | Qué explica |
| --- | --- |
| [Arquitectura](../.archify/workflow-gestioncapa-20261118-134358/arquitectura/arquitectura.html) | React, API Fastify, PostgreSQL, Redis e integraciones de pagos, correo y Jitsi. |
| [Acceso y permisos](../.archify/workflow-gestioncapa-20261118-134358/acceso/acceso.html) | Login, JWT, sesión del navegador, autorización y rechazos. |
| [Cursos y sesiones](../.archify/workflow-gestioncapa-20261118-134358/cursos/cursos.html) | Crear, publicar, programar sesiones y sincronizar salas virtuales. |
| [Inscripción](../.archify/workflow-gestioncapa-20261118-134358/inscripcion/inscripcion.html) | Cupos, tarifa, pago previo, gratuidad, pago de constancia y vencimiento de reservas. |
| [Pagos](../.archify/workflow-gestioncapa-20261118-134358/pagos/pagos.html) | Pasarelas, transferencia revisada por ADMIN, efectivo, confirmación y conciliación. |
| [Asistencia presencial](../.archify/workflow-gestioncapa-20261118-134358/asistencia/asistencia.html) | QR rotativo de clase, controles de acceso, marcado y duplicados. |
| [Reuniones virtuales](../.archify/workflow-gestioncapa-20261118-134358/reuniones/reuniones.html) | Credencial Jitsi, aviso de grabación, eventos autenticados y cálculo al finalizar. |
| [Cierre y constancias](../.archify/workflow-gestioncapa-20261118-134358/certificados/certificados.html) | Elegibilidad, excepción motivada, entrega retenida por pago, PDF y verificación pública. |

## Condiciones que cambian el recorrido

- Los roles actuales son ADMIN, INSTRUCTOR y AGREMIADO. Las rutas antiguas de
  coordinador redirigen a la administración.
- PREVIO reserva una plaza hasta pagar dentro del plazo. GRATUITO y CERTIFICADO
  permiten entrar al curso; CERTIFICADO cobra al resultar elegible la constancia.
  Un pago tardío genera revisión financiera y no recupera automáticamente el acceso.
- La asistencia presencial utiliza el QR de clase en ventanas de 30 segundos.
  La virtual usa intervalos de conexión verificados y un umbral configurable por reunión.
- La constancia ordinaria requiere el 80 % de sesiones o una excepción justificada,
  todas las sesiones terminadas y cierre dentro de los siete días siguientes a la última.
  La emisión actual cubre participación sin examen; el backend rechaza cursos grabados.
- Izipay se ofrece si está habilitado. Culqi conserva un adaptador backend, pero
  `mediosDisponibles()` devuelve `culqi: false`, por lo que no se presenta como
  opción disponible en la interfaz.
- El QR personal y la puerta tienen pantallas y simulaciones, pero sus endpoints
  no están registrados en la API actual. Este mapa no los presenta como un
  marcado operativo. El aula de cursos grabados está limitada al modo demo.

## Instalación local

Archify está instalado para Codex en [`.agents/skills/archify`](../.agents/skills/archify/SKILL.md).
La skill estará disponible para su descubrimiento en el siguiente turno. Se copió
desde [`tt-a1i/archify`](https://github.com/tt-a1i/archify/tree/44781293f38728baf04dbad33ce1a0cef8c39cca/archify),
revisión `44781293f38728baf04dbad33ce1a0cef8c39cca`, sin modificar sus archivos.
No requiere instalar dependencias npm en esa carpeta.

Diagnóstico desde la raíz:

```bash
node .agents/skills/archify/bin/archify.mjs doctor
```

Para generar otro diagrama, pide a Codex, por ejemplo:

> Usa Archify para explicar la inscripción de este proyecto, incluyendo pago
> previo, vencimiento de reserva y pago tardío. Verifica los pasos contra el código.

## Actualización de un diagrama

Cada carpeta contiene `candidate.json`, el HTML y los recibos de validación.
Para una nueva revisión del sistema, vuelve a leer los archivos afectados,
actualiza las referencias y fija `meta.repository.revision` al commit que realmente
respalda el diagrama. Las referencias se verifican contra ese commit, no contra
cambios todavía sin guardar en Git.

Ejemplo para regenerar el flujo de acceso después de editar su candidato:

```bash
ARCHIFY_UPDATE_CHECK_DISABLED=1 node .agents/skills/archify/bin/archify.mjs finalize workflow \
  .archify/workflow-gestioncapa-20261118-134358/acceso/candidate.json \
  .archify/workflow-gestioncapa-20261118-134358/acceso/acceso.html \
  --repo-root . --quality showcase \
  --out-dir .archify/workflow-gestioncapa-20261118-134358/acceso/revision-2 --json
```

Usa un directorio de revisión nuevo en cada regeneración para conservar la evidencia
de navegador anterior. Para arquitectura, el tipo del comando es `architecture`.
La variable del ejemplo desactiva la consulta opcional de actualizaciones durante
esa ejecución; no altera el diagrama ni la configuración de la aplicación.

## Verificaciones

El diagnóstico de la instalación y las cuatro etapas de `finalize` pasaron para
los ocho diagramas: validación de fuentes y estructura, generación, comprobación
del HTML y comprobación automática en navegador. Esta última revisó contención
en cuatro tamaños de escritorio, temas claro/oscuro y estados del visor.
Los recibos acompañan a cada HTML; las comprobaciones de navegador no equivalen
a probar los servicios de la aplicación.
Además se inspeccionaron capturas de escritorio de arquitectura y pagos para
revisar la lectura de nodos, etiquetas y conexiones.

No se modificó el código de la aplicación ni se ejecutó su build. Para esta entrega
documental el build no aplica.
