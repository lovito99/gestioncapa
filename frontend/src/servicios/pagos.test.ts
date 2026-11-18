import { expect,it } from 'vitest'
import { pagoNecesitaActualizacion,type Pago } from './pagos'

it('HU32-07: sigue consultando el correo después de confirmar el dinero y termina al entregarse',()=>{
  const pago:Pick<Pago,'estado'|'operaciones'|'notificaciones'>={estado:'PAGADO',operaciones:[],notificaciones:[{id:'aviso',tipo:'COMPROBANTE',estado:'PENDIENTE',intentos:0,enviadoEn:null}]}
  expect(pagoNecesitaActualizacion(pago)).toBe(true)
  expect(pagoNecesitaActualizacion({...pago,notificaciones:[{...pago.notificaciones![0]!,estado:'ENVIANDO'}]})).toBe(true)
  expect(pagoNecesitaActualizacion({...pago,notificaciones:[{...pago.notificaciones![0]!,estado:'ENVIADO'}]})).toBe(false)
  expect(pagoNecesitaActualizacion({...pago,notificaciones:[{...pago.notificaciones![0]!,estado:'INCIERTO'}]})).toBe(false)
  expect(pagoNecesitaActualizacion({...pago,notificaciones:undefined})).toBe(false)
})
