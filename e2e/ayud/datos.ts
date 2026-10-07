import { rutas } from './rutas'

export const cuentas = {
  coord: { email: 'ana.torres@organizacion.pe', password: 'demo123', inicio: rutas.clases, titulo: 'Clases' },
  instr: { email: 'carlos.mendoza@organizacion.pe', password: 'demo123', inicio: rutas.instructor, titulo: 'Mis clases' },
  part: { email: 'maria.quispe@demo.pe', password: 'demo123', inicio: rutas.participante, titulo: 'Mis clases' },
  luz: { email: 'luz.apaza@demo.pe', password: 'demo123', inicio: rutas.participante, titulo: 'Mis clases' },
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
  nombre: 'Prevención de riesgos E2E',
  instructor: 'Carlos Mendoza Ríos',
  fecha: '2030-01-15',
  inicio: '10:00',
  fin: '11:00',
  lugar: 'Sala de pruebas',
}
