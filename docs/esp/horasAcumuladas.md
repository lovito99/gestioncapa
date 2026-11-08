# HU-34 · Horas de capacitación acumuladas

El historial abre con el total de horas lectivas de los certificados válidos del
colegiado. El selector «Año» permite elegir «Todos los años» o un año de emisión.
El año se calcula en `America/Lima`, incluido el cambio de año. Los certificados
anulados y reemplazados no suman.

Se usan las horas guardadas en el documento (`datos.horasLectivas`), aunque el
curso cambie después. Para certificados históricos sin esa instantánea se usan
las horas actuales del curso: no se reconstruye un dato que no se guardó.

Sin certificados válidos se muestran «0 horas» y un mensaje explicativo. El
filtro anual solo cambia la tarjeta de horas; cursos y asistencias permanecen
visibles. El PDF incluye el total y el desglose de todos los años.

## API

`GET /api/colegiados/:usuarioId/historial` añade:

```json
{
  "horasAcumuladas": {
    "total": 40,
    "porAnio": [{ "anio": "2026", "horas": 16 }, { "anio": "2025", "horas": 24 }]
  }
}
```

Cada certificado incluye `horasLectivas`. El resumen se calcula en la misma
transacción de lectura del historial, con todos los certificados del propietario
y su organización, sin depender del estado de la inscripción. Se conservan los
permisos por propietario/administrador y `Cache-Control: private, no-store`.

## Dependencias y verificación

Requiere HU-20 y su migración `0013-certificadosQr.sql`; no añade migraciones ni
dependencias. Las constancias de HU-20 siguen siendo de demostración.

Las pruebas cubren suma y exclusión, cambio de año en Lima, horas de documento
distintas de las del curso, anulación, PDF, permisos y selección anual a 360 px.
El caso de interfaz multianual usa una respuesta controlada; la integración de
API comprueba el cálculo real en PostgreSQL.

Build y operaciones Git/PR pendientes de ejecución manual del usuario.

Verificación local: tipos de backend/frontend/E2E, 299 pruebas unitarias de
backend, 55 de frontend y 3 de su servidor; ocho pruebas de integración del
historial, dos recorridos reales (uno con respuesta controlada para probar varios
años) y dos recorridos demo. Se verificó en una copia temporal de HU-20
(`9f0a7c7`) con los cambios de HU-34, dado que la carpeta compartida seguía en
HU-16 (`755f775`). La integración sobre HU-20 y la CI remota quedan pendientes.
