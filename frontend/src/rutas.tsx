import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { PaginaConEncabezado } from '@/components/layout/Pagina'
import { AsistenciaPagina } from '@/paginas/coordinador/AsistenciaPagina'
import { ClaseFormPagina } from '@/paginas/coordinador/ClaseFormPagina'
import { ClasesPagina } from '@/paginas/coordinador/ClasesPagina'
import { DetalleClasePagina } from '@/paginas/coordinador/DetalleClasePagina'
import { MisClasesPagina } from '@/paginas/instructor/MisClasesPagina'
import { QrAsistenciaPagina } from '@/paginas/instructor/QrAsistenciaPagina'
import { LoginPagina } from '@/paginas/LoginPagina'
import { NoEncontradaPagina } from '@/paginas/NoEncontradaPagina'

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
  { path: '*', element: <NoEncontradaPagina /> },
])
