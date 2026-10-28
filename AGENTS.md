# Instrucciones del proyecto

## Versionado y Git manual

Para recomendar versiones, preparar mensajes de commit o describir una entrega,
lee [.agents/skills/versionado-git/SKILL.md](.agents/skills/versionado-git/SKILL.md)
y aplica [VERSIONING.md](VERSIONING.md).

El agente solo recomienda las operaciones Git. El usuario ejecuta manualmente
`add`, `commit`, `tag`, `pull`, `push`, merges y la creación de pull requests.
No ejecutes esas operaciones ni cambies versiones de publicación por iniciativa
propia. Puedes consultar estado, diferencias, historial y etiquetas locales.
Esta regla no impide implementar y verificar cambios de código solicitados.

## Build manual

El usuario ejecuta `npm run build` manualmente, también sus variantes por
workspace. El agente no ejecuta builds ni comandos que los incluyan, como
`npm run verificar`. Puede realizar comprobaciones de tipos y pruebas que no
invoquen builds. Al entregar cambios, indica si el build queda pendiente de
ejecución manual; nunca lo declares aprobado sin evidencia.

## Entrega en el chat

Al finalizar cada tarea o funcionalidad, incluye siempre dos campos listos
para copiar en el formulario de commit: **Summary** y **Description**.
El Summary debe ser un título breve en español con el prefijo correspondiente
(`feat:`, `fix:`, `improve:`, `docs:`, etc.). La Description debe resumir los
cambios de esa tarea, las verificaciones realizadas y las pendientes, incluido
el build manual cuando corresponda. Describe únicamente trabajo realizado,
sin atribuir a la tarea otros cambios locales ni afirmar que ya hay un commit.
