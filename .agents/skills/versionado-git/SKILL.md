---
name: versionado-git
description: Recomendar versiones Git de GestionCapa con cinco niveles y preparar mensajes de commit y comandos para ejecución manual del usuario. Usar al solicitar versionado, clasificación de cambios o preparación de una entrega.
---

# Versionado de GestionCapa

Lee [VERSIONING.md](../../../VERSIONING.md) en la raíz del repositorio
(tres niveles arriba de esta carpeta). Aplica MAYOR.FUNCIÓN.MEJORA.ERROR.INTERNO
a etiquetas Git; conserva SemVer de tres números en package.json.

## Flujo de recomendación

1. Consulta con operaciones de solo lectura el estado, diff, historial y etiquetas
   locales relevantes. Distingue cambios preparados, pendientes y ya publicados.
   No presupongas que todos los cambios locales pertenecen a la misma entrega.
2. Obtén la versión base de una etiqueta `vN.N.N.N.N` correspondiente a la línea
   de publicación. No elijas por orden alfabético ni por fecha sin comprobar el
   historial. Si no hay base verificable, declara que falta; puedes proponer
   `1.0.0.0.0` como primera estable, sin afirmar que ya existe ni que está lista.
   Las etiquetas locales no garantizan el estado del remoto.
3. Clasifica los cambios por su comportamiento real. En una entrega con varios
   tipos, incrementa una sola vez el nivel más significativo y reinicia todos
   los de su derecha. Explica brevemente la elección.
4. Entrega versión base y propuesta, motivo, mensaje de commit y de etiqueta,
   comprobaciones realizadas y pendientes. Si el alcance es incierto, presenta
   la recomendación como condicional.
5. Cuando sean útiles, ofrece comandos para ejecución manual. Usa archivos
   concretos, rama y remoto comprobados; evita `git add .`. Si faltan datos,
   usa marcadores claramente identificados. No ejecutes los comandos.

El usuario realiza manualmente add, commit, tag, pull, push, merges y pull
requests. No modifiques índices, etiquetas, ramas ni versiones de publicación
como parte de esta skill. No publiques ni sincronices remotos. Implementar código
solicitado y ejecutar verificaciones sigue estando permitido.

## Forma habitual de trabajo

El usuario ejecuta `npm run build` manualmente, incluidas las variantes por
workspace. No ejecutes builds ni comandos que los ejecuten indirectamente,
como `npm run verificar`. Puedes ejecutar comprobaciones de tipos y pruebas
que no incluyan un build. En la recomendación de entrega, señala el build como
pendiente de ejecución manual salvo que exista evidencia aportada por el
usuario. No atribuyas un resultado al build sin haberlo comprobado.

## Entrega obligatoria en el chat

Al terminar cada tarea o funcionalidad, entrega **Summary** y **Description**
listos para copiar en el formulario de commit, aunque no se haya solicitado
una versión. Usa un título breve en español con el prefijo adecuado y una
descripción de los cambios efectivamente realizados en esa tarea, las
verificaciones y lo pendiente. No incluyas cambios ajenos al alcance ni
afirmes haber creado el commit. Para tareas solo documentales indica que
el build no aplica; para cambios de código, registra el build manual pendiente
si no hay evidencia de su resultado.

Formato de respuesta:

```text
Summary:
<prefijo: título breve>

Description:
<Cambios realizados. Verificaciones realizadas y pendientes.>
```

No introduzcas cinco componentes en campos npm `version`, ni afirmes que este
esquema es SemVer estándar. No generes una versión definitiva para cada archivo
o commit: la unidad es la entrega elegida por el usuario.
