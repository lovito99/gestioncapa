import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { inicioPorRol } from '@/auth/inicioPorRol'
import { PaginaPublica } from '@/components/layout/Pagina'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada } from '@/components/ui/Entrada'
import { mensajeDeError } from '@/lib/api'
import { accesoConCurso } from '@/lib/retornoCurso'
import { cancelarGoogle, continuarGoogle, enviarCodigoGoogle, esperarRetornoGoogle, intentoGoogle, limpiarIntentoGoogle, type PasoGoogle } from '@/servicios/authGoogle'
import { FormularioCrearCuenta } from './RegistroPagina'

const mensajeError = (error: unknown) => mensajeDeError(error, 'No pudimos completar el acceso con Google. Vuelve a intentarlo.')

export function AccesoGooglePagina() {
  const [intento] = useState(intentoGoogle)
  const [consulta] = useSearchParams()
  const retornoVencido = consulta.get('resultado') === 'vencido'
  const { usuario, iniciar } = useAuth()
  const navegar = useNavigate()
  const [resultado, setResultado] = useState<PasoGoogle>()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [codigoEnviadoAhora, setCodigoEnviado] = useState(false)
  const codigoEnviado = codigoEnviadoAhora || (resultado?.paso === 'verificarCorreo' && resultado.codigoEnviado)
  const continuacion = useRef<Promise<PasoGoogle> | null>(null)

  useEffect(() => {
    if (!intento || usuario || retornoVencido) return
    let vigente = true
    // StrictMode puede volver a montar el efecto. Ambos montajes esperan el mismo POST.
    continuacion.current ??= esperarRetornoGoogle(intento)
    void continuacion.current.then(datos => {
      if (vigente && intentoGoogle() === intento) setResultado(datos)
    }, fallo => {
      if (vigente && intentoGoogle() === intento) setError(mensajeError(fallo))
    })
    return () => { vigente = false }
  }, [intento, retornoVencido, usuario])

  useEffect(() => {
    if (!intento || resultado?.paso !== 'sesion' || usuario || retornoVencido || intentoGoogle() !== intento) return
    limpiarIntentoGoogle()
    iniciar(resultado.sesion)
    navegar(resultado.curso ? `/cursos/${resultado.curso}` : inicioPorRol(resultado.sesion.usuario), { replace: true })
  }, [iniciar, intento, navegar, resultado, retornoVencido, usuario])

  if (usuario) {
    const curso = resultado?.curso
    return <Navigate to={curso ? `/cursos/${curso}` : inicioPorRol(usuario)} replace />
  }
  if (!intento && !retornoVencido) return <Navigate to="/login" replace />

  function cancelar() {
    if (!retornoVencido) void cancelarGoogle()
    navegar(accesoConCurso('/login', resultado?.curso ?? null), { replace: true })
  }

  async function operar(operacion: () => Promise<void>) {
    setError('')
    setOcupado(true)
    try {
      await operacion()
    } catch (fallo) {
      if (intentoGoogle() === intento) setError(mensajeError(fallo))
    } finally {
      if (intentoGoogle() === intento) setOcupado(false)
    }
  }

  function recibir(paso: PasoGoogle) {
    if (intentoGoogle() === intento) setResultado(paso)
  }

  const confirmar = (evento: FormEvent<HTMLFormElement>, accion: 'vincular' | 'verificar-correo') => {
    evento.preventDefault()
    if (!intento) return
    const datos = new FormData(evento.currentTarget)
    void operar(async () => {
      const paso = accion === 'vincular'
        ? await continuarGoogle(intento, ['vincular', { password: String(datos.get('password') ?? '') }])
        : await continuarGoogle(intento, ['verificar-correo', { codigo: String(datos.get('codigo') ?? '') }])
      recibir(paso)
    })
  }

  if (intento && !retornoVencido && resultado?.paso === 'registro') {
    return <FormularioCrearCuenta curso={resultado.curso} correoGoogle={resultado.correo} cancelar={cancelar}
      crear={async ({ dni, nombres, apellidos, celular, aceptaPrivacidad }) =>
        recibir(await continuarGoogle(intento, ['registrar', { dni, nombres, apellidos, celular, aceptaPrivacidad }]))} />
  }

  return (
    <PaginaPublica>
      <main className="mx-auto w-full max-w-140 px-4 py-8">
        <Boton variante="secundario" onClick={cancelar}>Volver a iniciar sesión</Boton>
        <h1 className="mt-4 text-2xl font-bold text-ink">Ingresar con Google</h1>
        {retornoVencido && <div className="mt-4"><Alerta tipo="error">Este intento ya no está disponible. Vuelve a iniciar con Google.</Alerta></div>}
        {error && !retornoVencido && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
        {!retornoVencido && ((!resultado && !error) || resultado?.paso === 'sesion') && <p role="status" className="mt-4">Verificando el acceso…</p>}
        {!retornoVencido && resultado?.paso === 'vincular' && (
          <form className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-white p-4" onSubmit={evento => confirmar(evento, 'vincular')}>
            <p>Confirma la contraseña de GestionCapa de <strong className="wrap-anywhere">{resultado.correo}</strong> para vincular tu cuenta una sola vez.</p>
            <Campo etiqueta="Contraseña de GestionCapa" obligatorio>
              <Entrada name="password" type="password" autoComplete="current-password" required maxLength={256} />
            </Campo>
            <Boton type="submit" cargando={ocupado}>Vincular y entrar</Boton>
            <Link to="/recuperar" className="font-semibold text-brand underline" onClick={() => void cancelarGoogle()}>
              Recuperar mi contraseña
            </Link>
          </form>
        )}
        {intento && !retornoVencido && resultado?.paso === 'verificarCorreo' && (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-white p-4">
            <p>Confirma que tienes acceso al correo de tu cuenta de Google.</p>
            <Boton variante="secundario" disabled={ocupado} onClick={() => void operar(async () => {
              await enviarCodigoGoogle(intento)
              if (intentoGoogle() === intento) setCodigoEnviado(true)
            })}>{codigoEnviado ? 'Reenviar código' : 'Enviar código'}</Boton>
            {codigoEnviado && (
              <form className="flex flex-col gap-4" onSubmit={evento => confirmar(evento, 'verificar-correo')}>
                <p role="status">Revisa tu bandeja de correo para ver el código.</p>
                <Campo etiqueta="Código de verificación" obligatorio>
                  <Entrada name="codigo" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} />
                </Campo>
                <Boton type="submit" cargando={ocupado}>Verificar correo</Boton>
              </form>
            )}
          </div>
        )}
      </main>
    </PaginaPublica>
  )
}
