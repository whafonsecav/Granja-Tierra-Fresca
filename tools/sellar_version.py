# -*- coding: utf-8 -*-
"""
Sella una version nueva en la pagina, para que ningun navegador sirva
archivos viejos.

EL PROBLEMA
-----------
El navegador guarda lo que descarga. Si la pagina siempre pide "script.js",
"experiencia.mp3" o el PDF con el mismo nombre, el navegador no tiene forma de
saber que el archivo cambio y sigue usando la copia que ya tenia. A quien ya
haya abierto el sitio se le queda una version antigua, y no se le puede pedir
que borre la cache: no se le pide eso a un destinatario, y menos si son varios.

LA SOLUCION
-----------
Que el nombre cambie cuando cambia el contenido. Este script pone un sello de
version en cada referencia del HTML:

    script.js  ->  script.js?v=20260831T0140

Para el navegador esa es una direccion distinta, asi que la descarga de nuevo.
No hay forma de que sirva la vieja, porque la vieja tenia otro nombre.

Ademas escribe version.json, que la pagina consulta al arrancar para detectar
si el propio HTML que se le sirvio esta atrasado. Ver comprobarVersion() en
script.js.

CUANDO EJECUTARLO
-----------------
Siempre, antes de subir cambios. Si se olvida, los archivos nuevos quedan
publicados pero a nadie le llegan.

    python tools/sellar_version.py
"""

from datetime import datetime, timezone
import io
import os
import re

# Los archivos cuyas referencias hay que sellar dentro del HTML. Se listan a
# mano y no se detectan solos, para que agregar uno sea una decision
# consciente y no una sorpresa.
REFERENCIAS = [
    "style.css",
    "idiomas.js",
    "script.js",
    "audio/experiencia.mp3",
    "docs/Tomate-de-Guiso-Tierra-Fresca.pdf",
]


def nueva_version():
    # Sello legible: se puede leer en la URL y saber de cuando es. Al ir en
    # UTC, no cambia de valor por el horario de verano ni por viajar.
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M")


def sellar_html(ruta, version):
    s = io.open(ruta, encoding="utf-8").read()

    for archivo in REFERENCIAS:
        # Solo se sellan las referencias de verdad, las que van dentro de un
        # href o un src. Sin esta restriccion el sello se colaba tambien en
        # los comentarios del HTML, que mencionan los archivos por su nombre
        # para explicar como encajan entre si.
        patron = r'((?:href|src)=")' + re.escape(archivo) + r'(?:\?v=[0-9A-Za-z]+)?(")'
        s = re.sub(patron, r'\g<1>' + archivo + "?v=" + version + r'\g<2>', s)

    # El sello tambien va en un meta, para que la propia pagina sepa que
    # version es la que se esta ejecutando.
    if 'name="tf-version"' in s:
        s = re.sub(r'<meta name="tf-version" content="[^"]*" />',
                   '<meta name="tf-version" content="%s" />' % version, s)
    else:
        s = s.replace(
            '<link rel="stylesheet"',
            '<meta name="tf-version" content="%s" />\n<link rel="stylesheet"'
            % version, 1)

    io.open(ruta, "w", encoding="utf-8").write(s)


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    version = nueva_version()

    html = os.path.join(raiz, "index.html")
    sellar_html(html, version)

    # version.json lo lee la pagina al arrancar, siempre sin cache, para
    # comparar contra el sello que trae incrustado. Si no coinciden es que el
    # navegador le sirvio un HTML atrasado, y se recarga sola una vez.
    io.open(os.path.join(raiz, "version.json"), "w", encoding="utf-8").write(
        '{ "version": "%s" }\n' % version)

    print("Version sellada: %s" % version)
    for archivo in REFERENCIAS:
        print("  %s?v=%s" % (archivo, version))


if __name__ == "__main__":
    main()
