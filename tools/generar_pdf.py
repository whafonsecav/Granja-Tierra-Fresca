# -*- coding: utf-8 -*-
"""
Genera el PDF de venta del tomate de guiso.

Restriccion del entregable: UN (1) parrafo de EXACTAMENTE 10 lineas.
Sin titulos, sin portada, sin encabezados, sin vinetas. Solo texto corrido.

Quien habla es Natalia, la misma voz del audio, y tutea al destinatario. El
PDF no es un folleto: es la version escrita y resumida de lo que ella cuenta
en la pista, para que el lector de pantalla lo lea de corrido.

Estrategia tipografica: el ancho del bloque es fijo y se busca el cuerpo mas
grande que produzca exactamente 10 lineas al justificar. Si ningun cuerpo del
rango lo consigue, el script falla en vez de entregar un PDF invalido.

Uso:  python tools/generar_pdf.py
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.pdfbase.pdfdoc import PDFString
from reportlab.platypus import Paragraph

import os

LINEAS_OBJETIVO = 10

# Rango de cuerpo tipografico admisible.
#
# El limite inferior no es capricho: por debajo de 7 puntos el documento deja
# de ser legible para una persona con baja vision, y aunque el destinatario de
# esta pieza es ciego, la pieza tambien la revisan personas que si ven.
# El superior evita que un copy corto salga con letra de cartel.
CUERPO_MINIMO = 7.0
CUERPO_MAXIMO = 12.0

# --- El copy. Un solo parrafo, en primera persona, escrito para ser OIDO ----
#
# Es la version resumida del audio, y sigue sus mismos hitos en el mismo
# orden. Quien habla es Natalia, que NO trabaja en la granja: es una clienta
# ciega de nacimiento, igual que el destinatario, contando su experiencia.
#
# Ese detalle lo cambia todo y conviene no perderlo de vista al editar. La
# pieza no funciona porque una marca describa su producto, sino porque alguien
# que vive exactamente la misma situacion cuenta que le funciono. El estudio
# de las 4 P pide "lenguaje natural y cercano, que no lo trate de forma
# diferente ni con pesar por su condicion": el testimonio de un par es la
# unica forma de conseguir eso sin caer en la condescendencia.
#
# Hitos del audio que este parrafo conserva:
#   1. Natalia es ciega de nacimiento, como el destinatario.
#   2. La angustia de pedir a domicilio sin saber que le empacan a uno.
#   3. Abrio un correo de una granja inclusiva y respondio.
#   4. Le llego una docena de muestra, gratis.
#   5. Al tocarlos: firmes, redonditos, del mismo tamano -> porciones a la fija.
#   6. Una marca que confia en su independencia.
#   7. Al cocinarlos, el olor la llevo a los domingos donde su abuela.
#   8. El detalle que la convencio: recetario en braille impreso, y el mismo
#      recetario en audiolibro por correo. Respeto, no publicidad.
#   9. La granja se llama Tierra Fresca y quiere mandarle una muestra gratis.
#  10. Si le gusta, pueden volverse sus proveedores oficiales.
#
# El cierre lleva una llamada a la accion explicita, que antes faltaba: el
# parrafo terminaba en una promesa y no le decia que hacer. Es la misma accion
# con la que cierra el audio, responder el correo, y a proposito: el PDF se
# descarga al final de la experiencia pero se lee despues, quiza dias despues,
# cuando la pagina ya no esta abierta. Responder el correo es lo unico que
# sigue estando a su alcance en ese momento.
COPY = (
    "Hola, Carlos. Soy Natalia y, como tú, soy ciega de nacimiento, así que "
    "no tengo que explicarte lo que se siente pedir algo a domicilio y "
    "quedarse esperando a ver qué le empacaron a uno. Yo abrí un correo "
    "parecido a este, de una granja inclusiva, y me animé a responder. Me "
    "llegó a la casa una docena de tomates de guiso de muestra, gratis. Los "
    "toqué uno por uno y sentí un alivio buenísimo: todos firmes, redonditos "
    "y exactamente del mismo tamaño, que es lo que le permite a uno calcular "
    "las porciones a la fija, sin enredarse. Se siente bonito cuando una "
    "marca entiende nuestra condición y confía en que uno puede hacer las "
    "cosas por su cuenta. Al cocinarlos soltaron un olor que me llevó de una "
    "a los domingos donde mi abuela. Pero lo que de verdad me hizo confiar "
    "fue un detallazo: junto con los tomates me mandaron un recetario impreso "
    "en braille, y al correo el mismo recetario en audiolibro. Eso no es "
    "publicidad, es respeto. Se llaman Tierra Fresca, y a ti también quieren "
    "mandarte una muestra gratis para que la pruebes con tus propias manos. "
    "Si te gusta, y yo sé que sí, pueden volverse tus proveedores oficiales. "
    "Así que anímate: respóndele a su correo aceptando y ellos se encargan de "
    "todo lo demás. Yo lo hice, y no me arrepiento."
)


def medir(texto, ancho, cuerpo):
    """Devuelve cuantas lineas ocupa el parrafo con ese cuerpo, y el parrafo."""
    estilo = ParagraphStyle(
        "cuerpo",
        fontName="Helvetica",
        fontSize=cuerpo,
        leading=cuerpo * 1.62,
        alignment=TA_JUSTIFY,
    )
    p = Paragraph(texto, estilo)
    p.wrap(ancho, 10000)
    return len(p.blPara.lines), p


def buscar_cuerpo(texto, ancho):
    """El cuerpo mas grande del rango que da exactamente 10 lineas."""
    candidatos = []
    cuerpo = CUERPO_MAXIMO
    while cuerpo >= CUERPO_MINIMO:
        n, _ = medir(texto, ancho, cuerpo)
        if n == LINEAS_OBJETIVO:
            candidatos.append(round(cuerpo, 2))
        cuerpo -= 0.05

    if not candidatos:
        raise SystemExit(
            "Ningún cuerpo entre %.1f y %.1f puntos produce %d líneas exactas "
            "con este copy. Alargue o acorte el texto." %
            (CUERPO_MINIMO, CUERPO_MAXIMO, LINEAS_OBJETIVO)
        )
    return max(candidatos)


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    salida = os.path.join(raiz, "docs", "Tomate-de-Guiso-Tierra-Fresca.pdf")

    margen_x = 2.0 * cm
    ancho_bloque = A4[0] - (2 * margen_x)

    cuerpo = buscar_cuerpo(COPY, ancho_bloque)
    n, parrafo = medir(COPY, ancho_bloque, cuerpo)

    if n != LINEAS_OBJETIVO:
        raise SystemExit("Verificación fallida: %d líneas." % n)

    c = pdfcanvas.Canvas(salida, pagesize=A4)
    # Metadatos: no se imprimen en la hoja, pero el lector de pantalla los
    # anuncia al abrir el documento. No violan la regla de "cero títulos".
    c.setTitle("Lo que me paso con Tierra Fresca - Natalia")
    c.setAuthor("Natalia")
    c.setSubject("Testimonio sobre el tomate de guiso de Tierra Fresca")
    c._doc.Catalog.Lang = PDFString("es-CO")   # idioma del documento, para TTS

    alto = parrafo.height
    y = (A4[1] + alto) / 2.0                   # bloque centrado verticalmente
    parrafo.drawOn(c, margen_x, y - alto)
    c.showPage()
    c.save()

    print("PDF generado: %s" % salida)
    print("Cuerpo: %.2f pt | Interlineado: %.2f pt | Líneas: %d"
          % (cuerpo, cuerpo * 1.62, n))
    print("Caracteres del párrafo: %d" % len(COPY))


if __name__ == "__main__":
    main()
