# Especificación: asistencia por QR

Perfil demo. El QR se obtiene de la pantalla real del instructor y de la API MSW
existente. Las pruebas no fabrican firmas ni responden las solicitudes con `page.route`.
El reloj del navegador se controla para probar vencimientos sin esperar treinta
segundos reales ni depender de cuándo empezó la ejecución.

| ID | Dado / cuando | Resultado observable |
|---|---|---|
| ASI-01 | Instructor asignado / mostrar QR y pasar el vencimiento | QR visible, nuevo token y cuenta regresiva |
| ASI-02 | Participante inscrita / abrir QR válido y volver a usarlo | Asistencia registrada y aviso de duplicado sin segunda marca |
| ASI-03 | Token vencido / abrir enlace | Mensaje de expiración y opción de escanear de nuevo |
| ASI-04 | Token alterado / abrir enlace | Mensaje de QR no válido |
| ASI-05 | Participante no inscrita / abrir QR válido | Mensaje de falta de inscripción sin sugerir reintento |
| ASI-06 | Enlace sin token / abrirlo con sesión | Explicación para obtener el QR del instructor |

Pruebas: `e2e/prb/demo/asist.spec.ts`. La lectura física con cámara queda fuera de
esta suite. La firma del servidor y la persistencia real de la asistencia se prueban
contra el backend en [asistencia](asistencia.md) (MAR, LIS, PAR y VIN-01).
