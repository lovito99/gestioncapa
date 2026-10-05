import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { PaginaConEncabezado } from '@/components/layout/Pagina'
import { AdminPagina } from '@/paginas/admin/AdminPagina'
import { AsistenciaPagina } from '@/paginas/coordinador/AsistenciaPagina'
import { ClaseFormPagina } from '@/paginas/coordinador/ClaseFormPagina'
import { ClasesPagina } from '@/paginas/coordinador/ClasesPagina'
import { DetalleClasePagina } from '@/paginas/coordinador/DetalleClasePagina'
import { MisClasesPagina } from '@/paginas/instructor/MisClasesPagina'
import { QrAsistenciaPagina } from '@/paginas/instructor/QrAsistenciaPagina'
import { LoginPagina } from '@/paginas/LoginPagina'
import { NoEncontradaPagina } from '@/paginas/NoEncontradaPagina'
import { EscanearPagina } from '@/paginas/participante/EscanearPagina'
import { MarcarDesdeEnlacePagina } from '@/paginas/participante/MarcarDesdeEnlacePagina'
import { MisClasesParticipantePagina } from '@/paginas/participante/MisClasesParticipantePagina'
import { SinPermisoPagina } from '@/paginas/SinPermisoPagina'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPagina /> },
  {
    path: '/coordinador',
    element: <RutaProtegida rol="COORDINADOR" />,
    children: [
      {
        element: <PaginaConEncabezado />,
        children: [
          { index: true, element: <Navigate to="clases" replace /> },
          { path: 'clases', element: <ClasesPagina /> },
          { path: 'clases/nueva', element: <ClaseFormPagina /> },
          { path: 'clases/:id', element: <DetalleClasePagina /> },
          { path: 'clases/:id/editar', element: <ClaseFormPagina /> },
          { path: 'clases/:id/asistencia', element: <AsistenciaPagina /> },
        ],
      },
    ],
  },
  {
    path: '/instructor',
    element: <RutaProtegida rol="INSTRUCTOR" />,
    children: [
      { index: true, element: <Navigate to="clases" replace /> },
      { element: <PaginaConEncabezado />, children: [{ path: 'clases', element: <MisClasesPagina /> }] },
      // La vista del QR tiene su propio encabezado para proyectarse en sala
      { path: 'clases/:id/qr', element: <QrAsistenciaPagina /> },
    ],
  },
  {
    // Pantallas del participante: pensadas para celular
    element: <RutaProtegida rol="PARTICIPANTE" />,
    children: [
      {
        element: <PaginaConEncabezado />,
        children: [
          { path: '/participante', element: <Navigate to="clases" replace /> },
          { path: '/participante/clases', element: <MisClasesParticipantePagina /> },
          { path: '/participante/clases/:id/escanear', element: <EscanearPagina /> },
          { path: '/participante/escanear', element: <EscanearPagina /> },
          // Destino del QR cuando se escanea con la cámara del celular
          { path: '/asistencia/marcar', element: <MarcarDesdeEnlacePagina /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <RutaProtegida rol="ADMIN" />,
    children: [{ element: <PaginaConEncabezado />, children: [{ index: true, element: <AdminPagina /> }] }],
  },
  { path: '/sin-permiso', element: <SinPermisoPagina /> },
  { path: '*', element: <NoEncontradaPagina /> },
])
