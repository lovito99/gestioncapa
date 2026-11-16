# Operación, migración y recuperación

Las migraciones 0018–0030 amplían el esquema sin modificar migraciones históricas. Los
registros financieros y la auditoría no se borran por cascada. El procesador persiste
cancelaciones de reservas vencidas y entregas de constancias cada 30 s; al iniciar,
recupera el trabajo pendiente.

Las inscripciones históricas sin intento no reciben pagos ni plazos inventados. Un
derecho gratuito conocido se conserva aunque cambie la oferta actual. Las condiciones
antiguas desconocidas requieren una decisión de regularización antes de emitir una
constancia.

Antes de activar en producción: hacer backup cifrado y restauración ensayada, ejecutar
un inventario de solo lectura sobre una copia aislada, definir responsables de pagos
pendientes/tardíos y verificar las cuentas institucionales. No hay aplicación masiva
porque requeriría una decisión de negocio para datos reales.

```bash
node --import tsx backend/src/scripts/inventarioCobro.ts --inventario
```

Ante incidente, deshabilitar pasarelas y nuevas ofertas desde configuración o proxy,
conservar notificaciones verificables y conciliar contra el panel del comercio antes de
admitir otro cobro. No restaurar un backup antiguo sobre la base activa ni desplegar un
backend previo que no comprenda `TRANSFERENCIA` o `DECLARADO`; la recuperación requiere
una versión correctiva compatible y conciliación hacia adelante.
