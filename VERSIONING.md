# Versionado Git

GestionCapa usa la convención personalizada `MAYOR.FUNCIÓN.MEJORA.ERROR.INTERNO`
en sus etiquetas Git, por ejemplo `v1.0.0.0.0`. El agente recomienda la versión
y los comandos; el usuario realiza manualmente las operaciones Git y los pull
requests. Este documento no declara que exista una primera versión estable.

| Nivel | Cuándo incrementarlo | Ejemplo desde 1.0.0.0.0 |
| --- | --- | --- |
| Mayor | Cambio incompatible de API o comportamiento, reestructuración incompatible | 2.0.0.0.0 |
| Función | Nuevo módulo, funcionalidad o caso de uso | 1.1.0.0.0 |
| Mejora | Mejora de una función existente perceptible por el usuario | 1.0.1.0.0 |
| Error | Corrección de un comportamiento defectuoso | 1.0.0.1.0 |
| Interno | Refactorización, mantenimiento, documentación o ajustes técnicos sin cambio funcional | 1.0.0.0.1 |

Los componentes son enteros no negativos, sin ceros iniciales. Al incrementar
un nivel se ponen a cero todos los componentes a su derecha. Por ejemplo,
una mejora sobre `1.2.3.4.5` produce `1.2.4.0.0`.

Una entrega que combine varios tipos incrementa el nivel de mayor importancia:
Mayor > Función > Mejora > Error > Interno. No se suman incrementos por cada
archivo o commit. `1.0.0.0.0` es la propuesta para la primera publicación estable
cuando el usuario decida realizarla, no una versión asignada automáticamente.

## Mensajes de commit

| Prefijo | Clasificación habitual |
| --- | --- |
| `feat:` | Función |
| `improve:` | Mejora |
| `fix:` | Error |
| `refactor:`, `chore:`, `docs:`, `test:`, `build:`, `ci:` | Interno si no alteran comportamiento funcional |
| `perf:` | Mejora si el beneficio es visible; Interno si es exclusivamente técnico |
| `!` o pie `BREAKING CHANGE:` | Mayor cuando describe una incompatibilidad real |

El efecto del cambio prevalece sobre el prefijo: una corrección incompatible
también requiere un incremento Mayor.

## Publicación manual

Antes de recomendar una entrega, consultar cambios y etiquetas locales,
delimitar los archivos incluidos y registrar las verificaciones relevantes.
No presentar como ejecutadas pruebas que no se hayan realizado.

Ejemplo orientativo para una corrección cuya base comprobada sea `v1.0.0.0.0`:

```bash
git add -- ruta/al/archivo
git diff --cached
git commit -m "fix: corregir cálculo de reservas"
git tag -a v1.0.0.1.0 -m "Corrección de cálculo de reservas"
git push origin <rama-de-publicacion>
git push origin v1.0.0.1.0
```

Sustituir ruta y rama antes de ejecutar. Revisar todo el contenido del índice
antes del commit, incluidos archivos preparados previamente. La etiqueta debe
apuntar al commit de publicación elegido. El flujo de pull, merge y pull request
depende de las ramas del equipo y también lo realiza el usuario manualmente.

## Compatibilidad con npm

Este esquema no es SemVer estándar. Los campos `version` de los `package.json`
conservan tres componentes válidos para npm. No copiar allí `1.0.0.0.0` ni usar
`npm version` para crear etiquetas de cinco componentes. Las versiones de los
paquetes se gestionan por separado cuando corresponda; no se deriva una
conversión automática entre ambos esquemas.
