import { UsuariosPagina } from '@/paginas/admin/UsuariosPagina'
import { EfectivoPagina } from '@/paginas/pagos/EfectivoPagina'
import { BandejaPagosPagina } from '@/paginas/pagos/BandejaPagosPagina'
import { RecuperarPagina } from '@/paginas/RecuperarPagina'
import { HistorialPagina, HistorialesAdminPagina } from '@/paginas/historial/HistorialPagina'
import { CatalogoPagina, CursosPagina } from '@/paginas/cursos/CursosPagina'
import { CursoFormPagina } from '@/paginas/cursos/CursoFormPagina'
import { PaginaPublicaCursoPagina } from '@/paginas/cursos/PaginaPublicaCursoPagina'
import { SesionesCursoPagina } from '@/paginas/cursos/sesiones/SesionesCursoPagina'
import { ProgramarSesionPagina } from '@/paginas/cursos/sesiones/ProgramarSesionPagina'
import { CerrarCursoPagina } from '@/paginas/cursos/cierre/CerrarCursoPagina'
import { CertificadosAdminPagina } from '@/paginas/cursos/cierre/CertificadosAdminPagina'
import { CertificadosCursoPagina } from '@/paginas/cursos/cierre/CertificadosCursoPagina'
import { DetalleCursoPagina } from '@/paginas/cursos/DetalleCursoPagina'
import { ReunionesPagina, SalaReunionPagina } from "@/paginas/reuniones/ReunionesPagina"
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { PaginaConEncabezado, PaginaPublica } from '@/components/layout/Pagina'
import { AdminPagina } from '@/paginas/admin/AdminPagina'
import { AsistenciaPagina } from '@/paginas/coordinador/AsistenciaPagina'
import { ClaseFormPagina } from '@/paginas/coordinador/ClaseFormPagina'
import { ClasesPagina } from '@/paginas/coordinador/ClasesPagina'
import { DetalleClasePagina } from '@/paginas/coordinador/DetalleClasePagina'
import { MisClasesPagina } from '@/paginas/instructor/MisClasesPagina'
import { QrAsistenciaPagina } from '@/paginas/instructor/QrAsistenciaPagina'
import { LoginPagina } from '@/paginas/LoginPagina'
import { NoEncontradaPagina } from '@/paginas/NoEncontradaPagina'
import { RegistroPagina } from '@/paginas/RegistroPagina'
import { CertificadoPagina } from '@/paginas/certificados/CertificadoPagina'
import { VerificarCertificadoPagina } from '@/paginas/certificados/VerificarCertificadoPagina'
import { DetalleClaseParticipantePagina } from '@/paginas/participante/DetalleClaseParticipantePagina'
import { EscanearPagina } from '@/paginas/participante/EscanearPagina'
import { MarcarDesdeEnlacePagina } from '@/paginas/participante/MarcarDesdeEnlacePagina'
import { MisClasesParticipantePagina } from '@/paginas/participante/MisClasesParticipantePagina'
import { MisCursosPagina } from '@/paginas/participante/MisCursosPagina'
import { MiQrPagina } from '@/paginas/participante/MiQrPagina'
import { PagarCursoPagina } from '@/paginas/pagos/PagarCursoPagina'
import { PuertaPagina } from '@/paginas/asistenciaPuerta/PuertaPagina'
import { SinPermisoPagina } from '@/paginas/SinPermisoPagina'

export const router = createBrowserRouter([
  { path: '/', element: <PaginaPublica><main><CatalogoPagina publico /></main></PaginaPublica> },
  { path: '/capacitaciones', element: <PaginaPublica><main><CatalogoPagina publico /></main></PaginaPublica> },
  { path: '/capacitaciones/:id', element: <PaginaPublica><PaginaPublicaCursoPagina /></PaginaPublica> },
  { path: '/login', element: <LoginPagina /> },
  { path: '/registro', element: <RegistroPagina /> },
  { path: '/recuperar', element: <RecuperarPagina /> },
  // Públicas: el QR del certificado lleva aquí sin pedir sesión
  { path: '/verificar', element: <VerificarCertificadoPagina /> },
  { path: '/verificar/:codigo', element: <VerificarCertificadoPagina /> },
  { element: <RutaProtegida />, children: [{ path: '/certificados/:codigo', element: <CertificadoPagina /> }] },
  {
    path: '/instructor',
    element: <RutaProtegida rol="INSTRUCTOR" />,
    children: [
      { index: true, element: <Navigate to="clases" replace /> },
      { element: <PaginaConEncabezado />, children: [{ path: 'clases', element: <MisClasesPagina /> }, { path: 'clases/:id/asistencia', element: <AsistenciaPagina /> }, { path: 'clases/:id/puerta', element: <PuertaPagina /> }] },
      // HU-49: las pantallas de QR (proyección y escaneo) no llevan pie de página
      { element: <PaginaConEncabezado sinPie />, children: [{ path: 'clases/:id/qr', element: <QrAsistenciaPagina /> }] },
    ],
  },
  {
    // Pantallas del participante: pensadas para celular
    element: <RutaProtegida rol="AGREMIADO" />,
    children: [
      {
        element: <PaginaConEncabezado />,
        children: [
          { path: '/participante', element: <Navigate to="clases" replace /> },
          { path: '/participante/clases', element: <MisClasesParticipantePagina /> },
          { path: '/participante/clases/:id', element: <DetalleClaseParticipantePagina /> },
          { path: '/participante/cursos', element: <MisCursosPagina /> },
          // HU-39: QR personal que el encargado escanea en la puerta
          { path: '/participante/mi-qr', element: <MiQrPagina /> },
          // S3 7.x: pago del agremiado (en línea, transferencia BCP o efectivo)
          { path: '/cursos/:id/pagar', element: <PagarCursoPagina /> },
          // Destino del QR cuando se escanea con la cámara del celular
          { path: '/asistencia/marcar', element: <MarcarDesdeEnlacePagina /> },
        ],
      },
      {
        element: <PaginaConEncabezado sinPie />,
        children: [
          { path: '/participante/clases/:id/escanear', element: <EscanearPagina /> },
          { path: '/participante/escanear', element: <EscanearPagina /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <RutaProtegida rol="ADMIN" />,
    children: [
      {
        element: <PaginaConEncabezado />,
        children: [
          { index: true, element: <AdminPagina /> },
          { path: 'historial', element: <HistorialesAdminPagina /> },
          { path: 'usuarios', element: <UsuariosPagina /> },
          { path: 'cursos/nuevo', element: <CursoFormPagina /> },
          { path: 'cursos/:id/editar', element: <CursoFormPagina /> },
          { path: 'cursos/:id/sesiones', element: <SesionesCursoPagina /> },
          { path: 'cursos/:id/sesiones/nueva', element: <ProgramarSesionPagina /> },
          { path: 'cursos/:id/sesiones/:sesionId/editar', element: <ProgramarSesionPagina /> },
          // SCRUM-171: cierre del curso y certificados
          { path: 'cursos/:id/cerrar', element: <CerrarCursoPagina /> },
          { path: 'cursos/:id/certificados', element: <CertificadosCursoPagina /> },
          { path: 'certificados', element: <CertificadosAdminPagina /> },
          // S3 8.1: bandeja de pagos; la conciliación con la pasarela queda aparte
          { path: 'pagos', element: <BandejaPagosPagina /> },
          { path: 'pagos/conciliar', element: <EfectivoPagina /> },
          { path: 'clases', element: <ClasesPagina /> },
          { path: 'clases/nueva', element: <ClaseFormPagina /> },
          { path: 'clases/:id', element: <DetalleClasePagina /> },
          { path: 'clases/:id/editar', element: <ClaseFormPagina /> },
          { path: 'clases/:id/asistencia', element: <AsistenciaPagina /> },
          // HU-39: asistencia en la puerta (S3 1.4)
          { path: 'clases/:id/puerta', element: <PuertaPagina /> },
        ],
      },
      { element: <PaginaConEncabezado sinPie />, children: [{ path: 'clases/:id/qr', element: <QrAsistenciaPagina /> }] },
    ],
  },
  { element: <RutaProtegida />, children: [
    { element: <PaginaConEncabezado />, children: [
      { path: '/reuniones', element: <ReunionesPagina /> },
      { path: '/catalogo', element: <CursosPagina catalogo /> },
      { path: '/historial', element: <HistorialPagina /> },
      { path: '/historial/:usuarioId', element: <HistorialPagina /> },
      { path: '/cursos', element: <CursosPagina /> },
      { path: '/cursos/:id', element: <DetalleCursoPagina /> },
    ] },
  ] },
  { element: <RutaProtegida />, children: [{ path: '/reuniones/:identificador', element: <SalaReunionPagina /> }] },
  { element: <RutaProtegida rol="ADMIN" />, children: [{ path: '/coordinador/*', element: <Navigate to="/admin/clases" replace /> }] },
  { path: '/sin-permiso' , element: <SinPermisoPagina /> },
  { path: '*', element: <NoEncontradaPagina /> },
])
