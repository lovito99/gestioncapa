import { cargarSdkPago } from './pagosSdk'
import type { SesionIzipay } from './pagos'

declare global {
  interface Window {
    Izipay?:new(config:{config:Record<string,unknown>})=>{LoadForm:(entrada:{authorization:string;keyRSA:string;callbackResponse:(respuesta:unknown)=>void})=>void}
  }
}
// Contrato Web Core oficial: https://developers.izipay.pe/web-core/quickstart/
export async function abrirIzipay(sesion:SesionIzipay,alResponder:(respuesta:unknown)=>void) {
  const origen=sesion.entorno==='sandbox'?'https://sandbox-checkout.izipay.pe':'https://checkout.izipay.pe'
  await cargarSdkPago(`${origen}/payments/v1/js/index.js`)
  if (!window.Izipay) throw new Error('Izipay no está disponible. Consulta el estado de tu operación.')
  const checkout=new window.Izipay({config:{
    transactionId:sesion.transaccionId,action:'pay',merchantCode:sesion.comercio,
    order:{orderNumber:sesion.orden,currency:'PEN',amount:sesion.importe,processType:'AT',dateTimeTransaction:String(Date.now()),
      ...(sesion.instrumento && { payMethod: sesion.instrumento === 'YAPE' ? 'YAPE_CODE' : 'CARD' })},
    urlIPN:sesion.urlIPN,
  }})
  checkout.LoadForm({authorization:sesion.token,keyRSA:sesion.keyRSA,callbackResponse:alResponder})
}
