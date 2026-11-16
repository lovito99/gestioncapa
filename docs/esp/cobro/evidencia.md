# Evidencia y gates de entrega

La evidencia automatizada de HU-53/HU-32 cubre política de cobro, snapshots de oferta,
vencimiento, última plaza, pagos en efectivo y transferencia, propiedad de pagos,
retención de vouchers, recuperación de operaciones y recorridos de navegador. Las
pruebas de proveedor usan transporte simulado: no acreditan un cobro realizado por
Izipay o Culqi.

Controles aplicados: autorización en servidor, SQL parametrizado, validación de entradas,
firma y consulta autenticadas, timeouts, límites de cuerpo/IP, `no-store`, auditoría
persistente y cifrado con expiración para la sesión PSP. No se añadieron paquetes npm ni
credenciales utilizables.

Gates pendientes antes de publicar:

- Ejecutar el build manual y revisar su salida.
- Revisar y aprobar el diff por una persona responsable.
- Configurar cuentas sandbox/comercio y completar pago, rechazo, webhook e incidencias.
- Ensayar backup/restauración y recuperación operativa en staging.
- Definir responsables, alertas y umbrales para operaciones inciertas, vencimientos y
  constancias retenidas ya pagadas.

El servidor frontend y el proxy de producción deben verificar CSP, orígenes HTTPS y los
hosts reales de SDK/3DS antes de habilitar una pasarela. No se debe sustituir ese análisis
por comodines de CSP.
