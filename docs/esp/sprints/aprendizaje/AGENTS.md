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

## HU-37

- Consulta la [especificación](hu-37/SPEC.md), el [plan](hu-37/plan.md) y
  el [seguimiento](hu-37/todo.md). Inicia la implementación tras la aprobación.
- Verifica roles, inscripción, política de cobro y conservación de metadatos
  según las fuentes de YouTube consultadas en la especificación. Mantén las
  marcas propias del aula compatibles con HU-17 y HU-19 según la decisión
  aprobada. Usa un clip y credenciales autorizados para la prueba real.
- Registra resultados rojo y verde de las pruebas locales. Aplica las
  referencias de calidad y seguridad del proyecto. El build, los commits
  y la publicación quedan a cargo del usuario.

## HU-55

- Consulta la [especificación](hu-55/SPEC.md), el [plan](hu-55/plan.md) y el
  [seguimiento](hu-55/todo.md). Empieza a implementar después de que el usuario
  apruebe el alcance y el plan.
- Reutiliza la finalización de HU-17 y verifica que el 403 se aplique desde el
  servidor. Prueba las proyecciones de otros endpoints, la inscripción y el
  cuestionario de HU-19. Respeta la decisión de alcance sobre el contenido
  complementario de HU-37.
- Registra rojo y verde por tarea y conserva las pruebas nuevas localmente.
  Aplica las listas de calidad y de seguridad del repositorio al revisar la
  entrega. El usuario ejecuta el build y las operaciones Git manualmente.
