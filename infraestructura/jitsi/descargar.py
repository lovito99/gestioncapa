"""Descarga la versión oficial fijada sin modificar la aplicación ni sus secretos."""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import subprocess
import urllib.request
import zipfile

carpeta = Path(__file__).resolve().parent
version = json.loads((carpeta / 'version.json').read_text())
destino = carpeta / 'servidor'
if destino.exists():
    raise SystemExit('servidor ya existe; se conserva. Usa otra carpeta para actualizar.')
contenido = urllib.request.urlopen(version['origen'], timeout=60).read()
if hashlib.sha256(contenido).hexdigest() != version['checksum']:
    raise SystemExit('El archivo no coincide con el checksum registrado.')
with zipfile.ZipFile(io.BytesIO(contenido)) as archivo:
    for entrada in archivo.infolist():
        ruta = Path(*PurePosixPath(entrada.filename).parts[1:])
        if not ruta.parts or '..' in ruta.parts:
            continue
        objetivo = destino / ruta
        if entrada.is_dir():
            objetivo.mkdir(parents=True, exist_ok=True)
        else:
            objetivo.parent.mkdir(parents=True, exist_ok=True)
            objetivo.write_bytes(archivo.read(entrada))
print('Servidor descargado en', destino)
subprocess.run(['git', 'clone', '--depth', '1', 'https://github.com/jitsi/lib-jitsi-meet.git', str(carpeta / 'biblioteca')], check=True)
subprocess.run(['git', '-C', str(carpeta / 'biblioteca'), 'fetch', '--depth', '1', 'origin', version['bibliotecaRevision']], check=True)
subprocess.run(['git', '-C', str(carpeta / 'biblioteca'), 'checkout', version['bibliotecaRevision']], check=True)
