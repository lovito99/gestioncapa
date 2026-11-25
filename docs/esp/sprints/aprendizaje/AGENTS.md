# Instrucciones del sprint Aprendizaje

Aplica las [instrucciones del repositorio](../../../../AGENTS.md) y usa
[sprint.yml](sprint.yml) para ubicar la historia activa. Conserva el número del
sprint sin asignar hasta que el equipo lo confirme.

## HU-19

- **Especificación y búsqueda.** Consulta [la especificación](hu-19/SPEC.md) y
  sus soluciones existentes. Registra cualquier cambio de alcance o criterio
  en esa historia. Usa Astryx como referencia de interfaz y verifica el alcance
  antes de proponer una dependencia.
- **Planificación.** Usa [el plan](hu-19/plan.md) y
  [la lista de tareas](hu-19/todo.md). La implementación empieza después de la
  aprobación de la especificación, las decisiones abiertas y el plan.
- **Implementación.** Después de aprobar, verifica cada tarea en rojo y verde,
  conserva los límites de acceso de HU-20 y HU-53 y registra la evidencia en
  el seguimiento. Prepara el texto de commit para que el usuario lo ejecute.
- **Revisión.** Verifica permisos por curso e inscripción, privacidad de claves
  y notas, concurrencia y retención por pago. Aplica `definition-of-done.md`
  y `security-checklist.md` de `~/.agents/agent-skills/references/`. El
  usuario ejecuta el build y decide la publicación.

## HU-17

- Consulta la [especificación](hu-17/SPEC.md), el [plan](hu-17/plan.md) y
  el [seguimiento](hu-17/todo.md). Empieza a implementar después de la aprobación.
- Comprueba el acceso por inscripción y el 403 para el avance de otro titular.
  Guarda y verifica la fecha de finalización en la zona `America/Lima`.
- Prueba foco y visibilidad en un navegador real. Distingue reanudación, segundos
  acreditados y finalización. El aula, el cuestionario y la certificación deben
  consultar la misma finalización, incluidas las marcas históricas de HU-19.
- Registra cada prueba en rojo y verde. Aplica las referencias de calidad y
  seguridad del repositorio durante la revisión. Deja el build, los commits y
  la publicación al usuario.
