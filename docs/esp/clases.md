# Especificación: clases del coordinador

Perfil demo: interfaz real y API simulada existente. Cada prueba recibe una pestaña
nueva; los cambios de clases se realizan navegando dentro de la aplicación, porque
recargar reinicia los datos demo.

| ID | Dado / cuando | Resultado observable |
|---|---|---|
| CLA-01 | Nueva clase / guardar vacía o con hora final anterior | Validación visible; no se abandona el formulario |
| CLA-02 | Clase válida / crear, editar lugar y confirmar cancelación | Fila creada, lugar actualizado, estado Cancelada sin edición |
| CLA-03 | Instructor ocupado / programar un cruce y luego horario contiguo | Alerta de conflicto; horario contiguo aceptado |
| CLA-04 | Detalle de clase / inscribir cuenta inexistente, duplicada y nueva | Mensajes claros; inscritos aumentan solo en la inscripción válida |
| CLA-05 | Clase con asistencia y otra sin inscritos / abrir asistencia | Participantes y estados; pantalla vacía con enlace a inscripción |

Pruebas: `e2e/prb/demo/clases.spec.ts`. Aplicar las mismas reglas al backend es un
trabajo posterior descrito en `docs/API.md`.
