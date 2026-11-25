import { readFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import type { MiQr } from "../../entities/asistencia/asistenciaPuerta.js";

export async function crearCredencialPdf(credencial: Pick<MiQr, "nombre" | "dniParcial" | "token">) {
  const documento = await PDFDocument.create();
  documento.setTitle("Mi QR de asistencia");
  documento.registerFontkit(fontkit);
  const fuente = await documento.embedFont(await readFile(new URL("../../../assets/fuenteRegular.ttf", import.meta.url)), { subset: true });
  const pagina = documento.addPage([420, 420]);
  const centrar = (texto: string, y: number, tamano: number) => {
    const limpio = texto.replace(/[\r\n\t]/g, " ").normalize("NFC");
    const ancho = fuente.widthOfTextAtSize(limpio, 1);
    const size = Math.min(tamano, 360 / Math.max(ancho, 1));
    pagina.drawText(limpio, { x: (420 - ancho * size) / 2, y, size, font: fuente });
  };
  centrar("Mi QR de asistencia", 375, 22);
  centrar(credencial.nombre, 342, 16);
  centrar(`DNI ${credencial.dniParcial ?? "no registrado"}`, 319, 12);
  const qr = await documento.embedPng(await QRCode.toDataURL(credencial.token, { errorCorrectionLevel: "M", margin: 4, scale: 10 }));
  pagina.drawImage(qr, { x: 85, y: 54, width: 250, height: 250 });
  centrar("Muéstralo al encargado al llegar al aula.", 35, 11);
  return Buffer.from(await documento.save());
}
