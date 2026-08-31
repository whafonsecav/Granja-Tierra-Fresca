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
# Cada afirmacion sale de los archivos de la campana:
#   Producto  -> firmeza, jugo, olor al destapar, tamano uniforme, empaque
#                facil de abrir sin ayuda
#   Precio    -> no es el mas barato, es la certeza de no llevarse sorpresas
#   Plaza     -> el correo como supermercado propio, sin depender de nadie
#   Promocion -> textura, aroma y sonido; calor de hogar; trato de igual a
#                igual, sin lastima y sin condescendencia
#
# Que lo firme una persona con nombre no es un adorno de redaccion. El estudio
# dice que el destinatario confia a ciegas en que quien empaca su pedido sera
# sus ojos: por eso esa persona existe, se llama Natalia y responde por lo que
# manda.
COPY = (
    "Hola, soy Natalia, y soy la que escoge los tomates que te van a llegar. "
    "Los recojo a mano, uno por uno, y el que no pasa mi prueba no lo empaco: "
    "si cede al apretarlo, se queda. Los que sí van todos del mismo tamaño, "
    "para que calcular tus porciones te sea apenas cuestión de contarlos. La "
    "caja se abre de un solo movimiento, sin tijeras y sin pedirle ayuda a "
    "nadie, y lo primero que vas a sentir al destaparla es el olor: verde, "
    "dulce, recién cortado. Lo demás lo vas a reconocer solo, porque tú ya "
    "sabes cómo suena un tomate bueno: la cáscara que rechina limpia bajo el "
    "agua, el cuchillo que entra sin resistencia y suelta el jugo de una, los "
    "cubos cayendo al aceite con ese chasquido espeso que no se puede fingir. "
    "Esa es mi garantía, y es la única prueba que te pido que evalúes. No te "
    "estoy ofreciendo el tomate más barato; te estoy ofreciendo la certeza de "
    "que no vas a encontrarte nunca uno machucado, blando ni pasado en tu "
    "propia cocina, y de que quien lo escogió tiene nombre y responde por él. "
    "Tú pides desde tu correo, en el hueco que te quede entre clase y clase, "
    "y yo te lo llevo hasta la puerta: tu mercado, tu decisión, tu guiso, tu "
    "casa oliendo a comida hecha en familia."
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
    c.setTitle("Un mensaje de Natalia - Granja Tierra Fresca")
    c.setAuthor("Natalia, Granja Tierra Fresca")
    c.setSubject("Propuesta de venta de tomate de guiso")
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
