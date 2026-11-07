# HU-50: registrarme con mi DNI

## Alcance y comportamiento

Desde el enlace «Crear cuenta» del login, un docente registra DNI de ocho
dígitos, nombres, apellidos, correo, celular y contraseña de al menos ocho
caracteres, y acepta el aviso de privacidad institucional. El servidor crea
exclusivamente un agremiado (`PARTICIPANTE` en la API, `participante` en SQL)
en la organización `cpppOrganizacionId`, por defecto `1`, y devuelve una sesión
JWT vigente. El acceso posterior por correo se conserva.

No exige símbolos ni comprueba habilitación en el padrón. HU-33 y el docente
externo de HU-43 corresponden al Sprint 3, fuera de esta historia. La cuenta
local no constituye evidencia de habilitación profesional.

- DNI y celular usan teclado numérico; el formulario se prueba a 360 px.
- Celular: nueve dígitos y empieza con 9. Nombres y apellidos: hasta 80 cada uno;
  correo: hasta 180. Contraseña: mínimo 8 caracteres y máximo 72 bytes UTF-8,
  para evitar el truncado silencioso de bcrypt.
- El nombre completo conserva nombres y apellidos, incluyendo el espacio entre ambos.
- Los errores se muestran en español junto a cada campo y conservan el formulario.
- El aviso enlaza a `https://www.cpppregion-cusco.com/privacidad.html`, según la
  indicación del usuario durante esta implementación.
- DNI o correo existentes, incluidos roles distintos o cuentas inactivas,
  responden con el mismo aviso de cuenta existente. No informa cuál coincidió.
- «Recuperar mi contraseña» abre `/recuperar`, que ofrece ayuda por el canal
  institucional. La recuperación automática por correo pertenece a RF-02 y sigue
  pendiente; no se simula un correo enviado ni un cambio de contraseña.

## Contrato

`POST /api/auth/registro` es público y acepta solo:

```json
{
  "dni": "12345678",
  "nombres": "Nombre",
  "apellidos": "Apellido",
  "email": "docente@example.com",
  "celular": "987654321",
  "password": "abcdefgh",
  "aceptaPrivacidad": true
}
```

- `201`: `{ token, user, usuario }`, con `usuario.id` texto, `rol: PARTICIPANTE`
  y `cargo: Agremiado`; mismo contrato de sesión que el login.
- `409 CUENTA_YA_REGISTRADA`: sin token; permite acceder a recuperación asistida.
- `422 VALIDACION`: mensajes por campo en `fields`, sin persistir la entrada.
- `429 LIMITE_REGISTROS`: más de diez intentos válidos por dirección en 60 segundos;
  incluye `Retry-After`. Redis comparte el contador entre instancias de la misma
  base. No se confía en una cabecera enviada por el cliente para definir la IP.

No acepta `rol`, `organizationId` ni atributos adicionales. El correo se normaliza
a minúsculas. No devuelve DNI, celular, consentimiento ni hash en la sesión.

## Persistencia, privacidad y migración

`0011-registroDocente.sql` añade nombres, apellidos, celular e índices únicos de
DNI y correo normalizado. Amplía el nombre completo a 161 caracteres sin modificar
migraciones anteriores. Un índice resuelve los registros simultáneos; no basta
una consulta previa de existencia.

La contraseña se guarda con bcrypt (costo 12). La creación de usuario y su fila en
`auditoriaRegistro` ocurren en la misma transacción: si falla la auditoría, no
queda una cuenta creada. La auditoría registra usuario, acción, fecha del servidor,
aceptación y referencia del aviso; no copia DNI, teléfono ni contraseña. La fecha
se guarda como `timestamptz`; la referencia identifica la URL, no una copia inmutable
del contenido externo. Los datos demo siguen siendo simulaciones en memoria.

Antes de desplegar, aplicar las migraciones con el flujo habitual. Si existen
DNI repetidos o correos que coinciden al pasar a minúsculas, el índice detiene la
migración. No se eliminan ni fusionan identidades automáticamente: el administrador
debe revisar los datos y resolver la colisión antes de reintentar. Los usuarios
anteriores pueden conservar `nombres`, `apellidos` y `celular` nulos.

## Verificación

- Integración: alta, sesión real, bcrypt, auditoría, duplicados, validaciones,
  concurrencia, rollback si falla auditoría y límite de altas.
- E2E demo y real: entrada desde login, errores sin pérdida de valores, registro,
  sesión iniciada, duplicado y acceso a ayuda; controles numéricos y ancho de 360 px.
- Las identidades de prueba de historial usan DNI distintos para respetar la
  nueva unicidad sin quitar sus comprobaciones de privacidad.
- Builds y operaciones Git se ejecutan manualmente por el usuario.


Verificación de esta entrega (07/11/2026): tipos de backend, frontend y E2E;
256 pruebas unitarias backend, 55 frontend y 3 del servidor frontend; suite de
220 pruebas de integración y seis pruebas específicas de registro (incluido el
límite añadido después); 23 E2E reales y dos recorridos demo de HU-50 aprobados.
El lint no presenta errores y mantiene dos advertencias preexistentes ajenas a
HU-50. Se comprobó además que exigir nueve caracteres en vez de ocho hace fallar
la prueba válida; el código original se restauró. `git diff --check` sin errores.
Build y migración del entorno de entrega pendientes de ejecución manual.
