import type { Clase, Participante, Usuario } from '@/types/api'

/** Usuarios de prueba. Contraseña de todos: demo123 */
export const usuarios: (Usuario & { password: string })[] = [
  {
    id: 'u-coord-1',
    nombre: 'Ana Torres Villa',
    email: 'ana.torres@organizacion.pe',
    rol: 'COORDINADOR',
    cargo: 'Coordinadora',
    password: 'demo123',
  },
  {
    id: 'i-1',
    nombre: 'Carlos Mendoza Ríos',
    email: 'carlos.mendoza@organizacion.pe',
    rol: 'INSTRUCTOR',
    cargo: 'Instructor',
    password: 'demo123',
  },
  // Los participantes usan el mismo id que en la lista de participantes
  {
    id: 'p-1',
    nombre: 'María Fernanda Quispe Ramos',
    email: 'maria.quispe@demo.pe',
    rol: 'PARTICIPANTE',
    cargo: 'Participante',
    password: 'demo123',
  },
  {
    id: 'p-7',
    nombre: 'Luz Marina Apaza Choque',
    email: 'luz.apaza@demo.pe',
    rol: 'PARTICIPANTE',
    cargo: 'Participante',
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
  { id: 'p-1', nombre: 'María Fernanda Quispe Ramos', email: 'maria.quispe@demo.pe' },
  { id: 'p-2', nombre: 'José Luis Condori Mamani', email: 'jose.condori@demo.pe' },
  { id: 'p-3', nombre: 'Rosa Elena Ccahuana Palomino', email: 'rosa.ccahuana@demo.pe' },
  { id: 'p-4', nombre: 'Pedro Alonso Vargas Soto', email: 'pedro.vargas@demo.pe' },
  { id: 'p-5', nombre: 'Carmen Lucía Flores Ríos', email: 'carmen.flores@demo.pe' },
  { id: 'p-6', nombre: 'Diego Armando Huillca Quispe', email: 'diego.huillca@demo.pe' },
  { id: 'p-7', nombre: 'Luz Marina Apaza Choque', email: 'luz.apaza@demo.pe' },
]

const instructor = (id: string) => instructores.find((i) => i.id === id)!

export const clases: Omit<Clase, 'inscritos'>[] = [
  {
    id: 'c-1',
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
    nombre: 'Atención al cliente',
    instructor: instructor('i-2'),
    fecha: '2026-10-14',
    horaInicio: '15:00',
    horaFin: '16:30',
    lugar: 'Sala de capacitación B',
    estado: 'PROGRAMADA',
  },
  {
    id: 'c-3',
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
    nombre: 'Liderazgo de equipos',
    instructor: instructor('i-3'),
    fecha: '2026-10-19',
    horaInicio: '16:00',
    horaFin: '17:00',
    lugar: 'Sala de capacitación A',
    estado: 'CANCELADA',
  },
  {
    id: 'c-5',
    nombre: 'Manejo de extintores',
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
