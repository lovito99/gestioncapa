import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import * as portadas from '../src/modules/cursos/portada.js';

test('recodifica JPG, PNG y WebP en tres variantes y retira metadatos', async () => {
  for (const formato of ['jpeg', 'png', 'webp'] as const) {
    const original = await sharp({
      create: { width: 1600, height: 900, channels: 3, background: '#943157' },
    }).withMetadata().toFormat(formato).toBuffer();
    const portada = await portadas.procesarPortada({
      nombre: 'curso', tipo: `image/${formato}`, contenidoBase64: original.toString('base64'),
    });
    for (const [variante, formato, ancho, alto, presupuesto] of [
      [portada.miniatura, 'webp', 352, 198, 90 * 1024],
      [portada.tarjeta, 'webp', 704, 396, 180 * 1024],
      [portada.grande, 'jpeg', 1280, 720, 384 * 1024],
    ] as const) {
      const { format, width, height, exif, icc } = await sharp(variante.archivo).metadata();
      assert.deepEqual([format, width, height, exif, icc], [formato, ancho, alto, undefined, undefined]);
      assert.ok(variante.archivo.length <= presupuesto);
    }
  }
});

test('aplica la orientación antes de validar y conserva el ancho real de una fuente pequeña', async () => {
  const original = await sharp({
    create: { width: 90, height: 160, channels: 3, background: '#876ab0' },
  }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const portada = await portadas.procesarPortada({
    nombre: 'vertical.jpg', tipo: 'image/jpeg', contenidoBase64: original.toString('base64'),
  });
  assert.equal(portada.miniatura.ancho, 160);
  assert.equal(portada.tarjeta.ancho, 160);
});

test('rechaza contenido corrupto, tipo incoherente, proporción inválida o demasiados píxeles', async () => {
  async function png(ancho: number, alto: number) {
    return sharp({ create: { width: ancho, height: alto, channels: 3, background: '#943157' } }).png().toBuffer();
  }
  const valida = await png(320, 180);
  for (const [archivo, tipo] of [
    [valida, 'image/webp'], [valida.subarray(0, 40), 'image/png'], [await png(320, 320), 'image/png'],
    [await png(5440, 3060), 'image/png'],
  ] as const) {
    await assert.rejects(portadas.procesarPortada({
      nombre: 'curso.png', tipo, contenidoBase64: archivo.toString('base64'),
    }), { code: 'VALIDACION' });
  }
  await assert.rejects(portadas.procesarPortada({
    nombre: 'curso.png', tipo: 'image/png', contenidoBase64: 'a.b?',
  }), { code: 'VALIDACION' });
});

test('el tamaño se mide en bytes del archivo y el límite de 1 MiB es inclusivo', async () => {
  const original = await sharp({
    create: { width: 320, height: 180, channels: 3, background: '#943157' },
  }).png().toBuffer();
  function entrada(tamano: number) {
    const texto = Buffer.alloc(tamano - original.length - 12, 65);
    texto.write('HU51\0');
    const encabezado = Buffer.alloc(8);
    encabezado.writeUInt32BE(texto.length);
    encabezado.write('tEXt', 4);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([encabezado.subarray(4), texto])));
    const archivo = Buffer.concat([original.subarray(0, -12), encabezado, texto, crc, original.subarray(-12)]);
    return { nombre: 'curso.png', tipo: 'image/png', contenidoBase64: archivo.toString('base64') };
  }
  assert.ok(await portadas.procesarPortada(entrada(1024 * 1024)));
  await assert.rejects(portadas.procesarPortada(entrada(1024 * 1024 + 1)), { code: 'PORTADA_MUY_PESADA' });
});

