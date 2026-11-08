import { rutas } from './rutas'

export const cuentas = {
  coord: { email: 'ana.torres@cpppregion-cusco.com', password: 'demo123', inicio: rutas.admin, titulo: 'Estado del sistema' },
  instr: { email: 'carlos.mendoza@cpppregion-cusco.com', password: 'demo123', inicio: rutas.instructor, titulo: 'Mis clases' },
  part: { email: 'maria.quispe@demo.cpppregion-cusco.com', password: 'demo123', inicio: rutas.participante, titulo: 'Mis clases' },
  luz: { email: 'luz.apaza@demo.cpppregion-cusco.com', password: 'demo123', inicio: rutas.participante, titulo: 'Mis clases' },
  admin: { email: 'admin@gestioncapa.local', password: 'demo123', inicio: rutas.admin, titulo: 'Estado del sistema' },
} as const

// Credenciales públicas, exclusivas de gestioncapa_e2e; no se leen secretos del .env.
export const cuentaReal = {
  email: 'admin@e2e.gestioncapa.local',
  password: 'ClaveLocalE2e123!',
  inicio: rutas.admin,
  titulo: 'Estado del sistema',
}

export const claseNueva = {
  // 3.2: cada clase pertenece a un curso (es una de sus sesiones)
  curso: 'Demo · Seguridad y primeros auxilios',
  nombre: 'Prevención de riesgos E2E',
  instructor: 'Carlos Mendoza Ríos',
  fecha: '2030-01-15',
  inicio: '10:00',
  fin: '11:00',
  lugar: 'Sala de pruebas',
}
