import { createHash } from 'node:crypto';
import { entradaArchivoVoucher } from '../../dto/pagos/pagoDto.js';
import type { ArchivoVoucher } from '../../entities/pagos/pago.js';
import { ErrorPago } from '../../shared/errorPago.js';

export const limiteVoucher=5*1024*1024;

/** Comprueba el contenido real (firma de PNG, JPEG o PDF), no solo el tipo declarado. */
export function validarArchivoVoucher(entrada:unknown):ArchivoVoucher {
  const datos=entradaArchivoVoucher.parse(entrada);
  if(datos.contenidoBase64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(datos.contenidoBase64)) throw new ErrorPago(422,'VOUCHER_INVALIDO','El archivo no es válido.');
  const contenido=Buffer.from(datos.contenidoBase64,'base64');
  if(contenido.length>limiteVoucher||contenido.toString('base64')!==datos.contenidoBase64) throw new ErrorPago(422,'VOUCHER_INVALIDO','Selecciona un archivo válido de hasta 5 MiB.');
  const png=contenido.length>=33&&contenido.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&contenido.subarray(12,16).toString()==='IHDR'&&
    contenido.readUInt32BE(16)>0&&contenido.readUInt32BE(20)>0&&contenido.readUInt32BE(16)<=12000&&contenido.readUInt32BE(20)<=12000;
  const jpeg=contenido.length>=10&&contenido[0]===255&&contenido[1]===216&&contenido[2]===255&&contenido.at(-2)===255&&contenido.at(-1)===217;
  const pdf=contenido.length>=16&&/^%PDF-[12]\.\d/.test(contenido.subarray(0,8).toString('ascii'))&&contenido.subarray(-1024).includes(Buffer.from('%%EOF'));
  if(!(datos.tipo==='image/png'?png:datos.tipo==='image/jpeg'?jpeg:pdf)) throw new ErrorPago(422,'TIPO_VOUCHER_INVALIDO','El contenido no corresponde a un JPG, PNG o PDF admitido.');
  return {tipo:datos.tipo,contenido,tamano:contenido.length,hash:createHash('sha256').update(contenido).digest('hex')};
}
