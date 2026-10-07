# Rutas y acceso

## Entrar en modo demo

Desde la raíz, con Node 24 y npm 11:

```bash
npm install --include=dev --include=optional
npm run dev:demo
```

Abre <http://localhost:5173/login>. Este comando usa `frontend/.env.demo`, sin
modificar tu `.env`, y no necesita backend, Postgres ni Redis.

Si ya tienes Vite abierto en 5173, detén ese servidor con `Ctrl+C` en su terminal
antes de ejecutar el modo demo. También puedes elegir otro puerto con
`npm run dev:demo -- --port 5174`.

| Rol | Correo demo | Contraseña | Inicio |
|---|---|---|---|
| Coordinador | ana.torres@organizacion.pe | demo123 | `/coordinador/clases` |
| Instructor | carlos.mendoza@organizacion.pe | demo123 | `/instructor/clases` |
| Participante | maria.quispe@demo.pe | demo123 | `/participante/clases` |
| Participante | luz.apaza@demo.pe | demo123 | `/participante/clases` |
| Administrador | admin@gestioncapa.local | demo123 | `/admin` |

Los datos demo están en memoria: recargar restaura los datos iniciales.

## Mapa de pantallas

`id` es el identificador de la clase; en demo, por ejemplo, `c-1` o `c-3`.

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/` | Público | Redirige al login (o al inicio si ya existe sesión) |
| `/login` | Público | Formulario de acceso |
| `/coordinador` | Coordinador | Redirige a clases |
| `/coordinador/clases` | Coordinador | Listado y cancelación |
| `/coordinador/clases/nueva` | Coordinador | Crear clase |
| `/coordinador/clases/:id` | Coordinador | Detalle e inscripciones |
| `/coordinador/clases/:id/editar` | Coordinador | Editar clase |
| `/coordinador/clases/:id/asistencia` | Coordinador | Presentes y ausentes |
| `/instructor` | Instructor | Redirige a sus clases |
| `/instructor/clases` | Instructor | Clases asignadas |
| `/instructor/clases/:id/qr` | Instructor | Proyección del QR rotativo |
| `/participante` | Participante | Redirige a sus clases |
| `/participante/clases` | Participante | Clases inscritas |
| `/participante/clases/:id/escanear` | Participante | Escáner de una clase |
| `/participante/escanear` | Participante | Escáner general |
| `/asistencia/marcar?token=...` | Participante | Registro desde enlace QR |
| `/admin` | Administrador | Salud de API, Postgres y Redis |
| `/sin-permiso` | Público | Mensaje 403 |
| Cualquier otra | Público | Página 404 |

Una ruta protegida sin sesión lleva al login y conserva el destino, incluida la
query del QR. Un usuario de otro rol vuelve a su propio inicio. Estos controles
del navegador no sustituyen la autorización del backend.

## Entrar con el backend real

Sigue la instalación de Postgres, Redis y las variables de entorno en el
[README](../README.md#instalacion-local-completa). En `frontend/.env` usa:

```dotenv
VITE_API_URL=/api
VITE_BACKEND_URL=http://localhost:8080
VITE_USE_MOCKS=false
```

Ejecuta `npm run dev` y abre <http://localhost:5173/login>. Usa el administrador
configurado mediante `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `backend/.env`, que el seed
crea si no existe. Las credenciales demo no sirven para la base real.

La entrada y `/admin` funcionan con la API real. Clases, inscripciones y asistencia
siguen pendientes en el backend; consulta el [contrato de API](API.md).

Los puertos 4173, 4174 y 8180 se reservan para las [pruebas E2E](e2e.md); Playwright
levanta y detiene esas aplicaciones automáticamente.
