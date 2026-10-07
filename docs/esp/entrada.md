# Especificación: entrada y rutas

## Alcance y decisiones

El acceso se realiza en `/login`. E2E significa probar recorridos en un navegador.
SDD se usa aquí como desarrollo guiado por especificaciones: este archivo define el
comportamiento antes de escribir la prueba. TDD sigue el ciclo rojo → verde → refactor.
Los identificadores vinculan cada criterio con el título de su prueba Playwright.

La suite demo ejecuta el frontend real con el MSW existente. La suite real ejecuta
frontend, API, Postgres y Redis para la entrada del administrador. Las clases y la
asistencia aún no tienen implementación en el backend: probar su UI demo no demuestra
su funcionamiento contra la base de datos.

## Criterios de aceptación

| ID | Dado / cuando | Resultado observable |
|---|---|---|
| ENT-01 | Formulario vacío o correo inválido / ingresar | Errores de campo y permanencia en login |
| ENT-02 | Contraseña incorrecta / corregir y reenviar | Alerta comprensible; luego acceso correcto |
| ENT-03 | Cuenta válida de cada rol / ingresar y recargar | Inicio del rol y sesión conservada en la pestaña |
| ENT-04 | Contraseña escrita / mostrar y ocultar | Cambia su visibilidad, conserva el contenido |
| ENT-05 | Usuario conectado / salir y abrir ruta protegida | Login, sin acceso al contenido protegido |
| RUT-01 | Sin sesión / abrir cualquiera de las rutas protegidas | Redirección a `/login` |
| RUT-02 | Participante / abrir clases de coordinador | Inicio del participante, sin acciones del coordinador |
| RUT-03 | Enlace QR sin sesión / iniciar como participante | Conserva ruta y token, muestra resultado del QR |
| RUT-04 | Ruta inexistente / volver al inicio | Página 404 y acceso al login |
| REA-01 | Servicios reales activos / consultar salud | API, Postgres y Redis disponibles |
| REA-02 | Cuenta real válida / autenticar | Token y `usuario` en español, id texto y rol ADMIN |
| REA-03 | Administrador real / entrar, recargar y salir | Estado del sistema y protección tras cerrar sesión |
| REA-04 | Contraseña real incorrecta / ingresar | 401 CREDENCIALES_INVALIDAS y mensaje de la UI |
| REA-05 | Sesión real / cerrar; consultar `/me` sin token | Logout 204; consulta sin token 401 |

El logout elimina la sesión local. El JWT del backend es stateless: la revocación de
un token ya emitido no forma parte de este cambio.

## Pruebas

- Demo: `e2e/prb/demo/entrada.spec.ts` y `e2e/prb/demo/rutas.spec.ts`.
- Real: `e2e/prb/real/entrada.spec.ts`.
