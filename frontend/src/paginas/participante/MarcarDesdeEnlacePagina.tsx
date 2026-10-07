import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alerta } from '@/components/ui/Alerta'
import { useMarcarAsistencia } from '@/servicios/participante'
import { AsistenciaRechazada, AsistenciaRegistrada, Enviando } from './ResultadoAsistencia'

/**
 * Destino del QR (`/asistencia/marcar?token=…`). Si el participante lo escanea con la cámara
 * del celular, llega aquí y la asistencia se registra sin más toques.
 */
export function MarcarDesdeEnlacePagina() {
  const [parametros] = useSearchParams()
  const token = parametros.get('token') ?? ''
  const navegar = useNavigate()
  const marcar = useMarcarAsistencia()
  const { mutate } = marcar
  const enviado = useRef(false)

  useEffect(() => {
    // En desarrollo React monta dos veces: evitamos enviar el token dos veces
    if (!token || enviado.current) return
    enviado.current = true
    mutate({ token })
  }, [token, mutate])

  return (
    <div className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-120 flex-col gap-4">
        {!token ? (
          <Alerta tipo="error" titulo="Falta el código QR">
            Este enlace no tiene un código de asistencia. Escanea el QR que muestra tu instructor.
          </Alerta>
        ) : marcar.isSuccess ? (
          <AsistenciaRegistrada resultado={marcar.data} />
        ) : marcar.isError ? (
          // Reintentar desde aquí reenviaría el mismo token: mejor abrir el escáner
          <AsistenciaRechazada error={marcar.error} onReintentar={() => navegar('/participante/escanear')} />
        ) : (
          <Enviando />
        )}
      </div>
    </div>
  )
}
