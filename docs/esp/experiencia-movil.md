# HU-10: Experiencia móvil fluida y comprensible

Como colegiado, quiero registrar asistencia desde mi celular con mensajes claros
en español para saber qué hacer si algo falla.

## Flujo y alcance

Con sesión iniciada, desde **Mis clases** se toca **Registrar asistencia** en la
clase correspondiente. La cámara trasera se abre y la lectura envía el registro
sin botón de confirmación. Es un toque de la aplicación; si el navegador solicita
permiso, se añade el toque de **Permitir**. El conteo parte de Mis clases y excluye
el inicio de sesión. Abrir directamente la URL del QR también registra sin una
confirmación adicional. La cámara necesita HTTPS o localhost.

A 360 px se comprueba que la lista, el escáner, la confirmación y los errores no
produzcan desplazamiento horizontal. Los nombres largos pueden partirse en varias
líneas; los controles principales tienen 48 px de alto.

## Errores y recuperación

| Caso | Orientación |
| --- | --- |
| Cámara denegada | Permitir acceso desde el navegador y pulsar Intentar de nuevo |
| QR vencido | Pedir el QR actualizado al instructor y volver a escanear |
| No inscrito | Solicitar al coordinador que revise la inscripción |
| Conexión perdida | Revisar conexión y reescanear; no asegurar registro ni duplicarlo |

El registro sin conexión falla de inmediato en lugar de esperar indefinidamente
la reconexión. Las solicitudes iniciadas tienen un tiempo de espera de 15 segundos
y no se reenvían automáticamente. Si la respuesta se perdió después de guardar,
el siguiente escaneo debe informar que la asistencia ya estaba registrada.

## Comprobación automatizada

`e2e/prb/demo/movilAsistencia.spec.ts` verifica a 360 × 800 px la lectura del QR
mediante un flujo de vídeo simulado, la confirmación, los cuatro errores y la
ausencia de desbordamiento horizontal. Usa datos demo; no sustituye la cámara,
red y API reales.

```bash
npm exec -- playwright test e2e/prb/demo/movilAsistencia.spec.ts --project=movil
```

## SCRUM-96 — pendiente de Sprint 1

La medición en celular real permanece **pendiente**. No inferir su resultado
ni cerrar esta actividad con pruebas de emulación.

En un celular real, abrir el entorno HTTPS con sesión iniciada y un colegiado
inscrito en una clase vigente. Desde Mis clases, contar toques, permitir cámara
y apuntar al QR actualizado del instructor. Medir desde que el QR queda dentro
del encuadre hasta que aparece la confirmación. Repetir al menos cinco veces con
registros de prueba independientes (sin reutilizar una asistencia ya guardada).

Registrar fecha, modelo, sistema operativo, navegador y versión, ancho CSS,
tipo de red, toques, tiempos individuales, mediana y máximo. Comprobar también
los cuatro errores y ausencia de desplazamiento horizontal. No guardar tokens,
imágenes de personas ni datos personales en la evidencia. La historia no define
un umbral de tiempo; acordarlo antes de usar la medición para aprobar rendimiento.

| Dispositivo y navegador | Red / ancho CSS | Toques | Tiempos / mediana / máximo | Resultado |
| --- | --- | --- | --- | --- |
| Pendiente | Pendiente | Pendiente | Pendiente | SCRUM-96 por hacer |
