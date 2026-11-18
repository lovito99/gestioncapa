import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contenidoCorreo, origenCorreoValido, tiposCorreo } from '../src/modules/notificaciones/correo.contenido.js';

test('HU29: las cinco plantillas escapan el contenido y enlazan al recurso protegido', () => {
  for (const tipo of tiposCorreo) {
    const correo = contenidoCorreo(tipo, 'https://aula.example.org', {
      nombre: '<Elena>', curso: 'Didáctica & evaluación', cursoId: '9', detalles: ['<img src=x>'],
    });
    const destino = tipo === 'CONSTANCIA_EMITIDA' ? '/historial' : '/cursos/9';
    assert.match(correo.texto, /<Elena>/);
    assert.ok(correo.texto.includes('https://aula.example.org' + destino));
    assert.ok(correo.html.includes('href="https://aula.example.org' + destino + '"'));
    assert.ok(correo.html.includes('&lt;img src=x&gt;'));
    assert.doesNotMatch(correo.html, /<img src=x>/);
  }
});

test('HU29: solo permite orígenes institucionales HTTPS o loopback de pruebas', () => {
  assert.equal(origenCorreoValido('https://aula.example.org'), true);
  for (const url of ['https://aula.example.org@otro.example.org/', 'https://aula.example.org/ruta',
    'https://aula.example.org/?curso=2', 'http://aula.example.org/', 'javascript:alert(1)']) {
    assert.equal(origenCorreoValido(url), false);
  }
  assert.equal(origenCorreoValido('http://127.0.0.1:4174', true), true);
  assert.throws(() => contenidoCorreo('COMPROBANTE', 'https://aula.example.org', {
    nombre: 'Elena', curso: 'Didáctica', cursoId: '../../otra', detalles: [],
  }));
});
