import type { Clase, Participante, Usuario } from '@/types/api'

/** Usuarios de prueba. Contraseña de todos: demo123 */
export const usuarios: (Usuario & { password: string; activo?: boolean })[] = [
  {
    id: 'u-coord-1',
    nombre: 'Ana Torres Villa',
    email: 'ana.torres@cpppregion-cusco.com',
    rol: 'ADMIN',
    cargo: 'Administradora',
    password: 'demo123',
  },
  {
    id: 'i-1',
    nombre: 'Carlos Mendoza Ríos',
    email: 'carlos.mendoza@cpppregion-cusco.com',
    rol: 'INSTRUCTOR',
    cargo: 'Instructor',
    password: 'demo123',
  },
  {
    id: 'i-2',
    nombre: 'Lucía Paredes Quispe',
    email: 'lucia.paredes@cpppregion-cusco.com',
    rol: 'INSTRUCTOR',
    cargo: 'Instructora',
    password: 'demo123',
  },
  // Los participantes usan el mismo id que en la lista de participantes
  {
    id: 'p-1',
    nombre: 'María Fernanda Quispe Ramos',
    email: 'maria.quispe@demo.cpppregion-cusco.com',
    rol: 'AGREMIADO',
    cargo: 'Agremiado',
    password: 'demo123',
  },
  {
    id: 'p-7',
    nombre: 'Luz Marina Apaza Choque',
    email: 'luz.apaza@demo.cpppregion-cusco.com',
    rol: 'AGREMIADO',
    cargo: 'Agremiado',
    password: 'demo123',
  },
  {
    id: 'u-admin-1',
    nombre: 'Administrador Demo',
    email: 'admin@gestioncapa.local',
    rol: 'ADMIN',
    cargo: 'Administrador',
    password: 'demo123',
  },
]

export const instructores = [
  { id: 'i-1', nombre: 'Carlos Mendoza Ríos' },
  { id: 'i-2', nombre: 'Lucía Paredes Quispe' },
  { id: 'i-3', nombre: 'Jorge Huamán Torres' },
]

export const participantes: Participante[] = [
  { id: 'p-1', nombre: 'María Fernanda Quispe Ramos', email: 'maria.quispe@demo.cpppregion-cusco.com' },
  { id: 'p-2', nombre: 'José Luis Condori Mamani', email: 'jose.condori@demo.cpppregion-cusco.com' },
  { id: 'p-3', nombre: 'Rosa Elena Ccahuana Palomino', email: 'rosa.ccahuana@demo.cpppregion-cusco.com' },
  { id: 'p-4', nombre: 'Pedro Alonso Vargas Soto', email: 'pedro.vargas@demo.cpppregion-cusco.com' },
  { id: 'p-5', nombre: 'Carmen Lucía Flores Ríos', email: 'carmen.flores@demo.cpppregion-cusco.com' },
  { id: 'p-6', nombre: 'Diego Armando Huillca Quispe', email: 'diego.huillca@demo.cpppregion-cusco.com' },
  { id: 'p-7', nombre: 'Luz Marina Apaza Choque', email: 'luz.apaza@demo.cpppregion-cusco.com' },
]

const instructor = (id: string) => instructores.find((i) => i.id === id)!

export const clases: Omit<Clase, 'inscritos'>[] = [
  {
    id: 'c-1',
    curso: null,
    nombre: 'Seguridad y salud en el trabajo',
    instructor: instructor('i-1'),
    fecha: '2026-10-12',
    horaInicio: '10:00',
    horaFin: '11:00',
    lugar: 'Auditorio principal, piso 2',
    estado: 'PROGRAMADA',
  },
  {
    id: 'c-2',
    curso: null,
    nombre: 'Atención a la diversidad',
    instructor: instructor('i-2'),
    fecha: '2026-10-14',
    horaInicio: '15:00',
    horaFin: '16:30',
    lugar: 'Sala de capacitación B',
    estado: 'PROGRAMADA',
  },
  {
    id: 'c-3',
    curso: null,
    nombre: 'Primeros auxilios básicos',
    instructor: instructor('i-1'),
    fecha: '2026-10-16',
    horaInicio: '09:00',
    horaFin: '10:00',
    lugar: 'Laboratorio 3',
    estado: 'PROGRAMADA',
  },
  {
    id: 'c-4',
    curso: null,
    nombre: 'Liderazgo pedagógico',
    instructor: instructor('i-3'),
    fecha: '2026-10-19',
    horaInicio: '16:00',
    horaFin: '17:00',
    lugar: 'Sala de capacitación A',
    estado: 'CANCELADA',
  },
  {
    id: 'c-5',
    curso: null,
    nombre: 'Estrategias de evaluación docente',
    instructor: instructor('i-1'),
    fecha: '2026-10-20',
    horaInicio: '15:00',
    horaFin: '16:30',
    lugar: 'Patio central',
    estado: 'PROGRAMADA',
  },
]

/** claseId → ids de participantes inscritos */
export const inscripciones: Record<string, string[]> = {
  'c-1': ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6'],
  'c-2': [],
  'c-3': ['p-1', 'p-4', 'p-7'],
  'c-4': ['p-2'],
  'c-5': ['p-3', 'p-5', 'p-6'],
}

/** claseId → participanteId → hora de registro (ISO) */
export const asistencias: Record<string, Record<string, string>> = {
  'c-1': {
    'p-1': '2026-10-12T15:02:00Z',
    'p-2': '2026-10-12T15:04:00Z',
    'p-4': '2026-10-12T15:05:00Z',
    'p-5': '2026-10-12T15:07:00Z',
  },
}
