# -*- coding: utf-8 -*-
"""
Genera el PDF de venta del tomate de guiso.

Restriccion del entregable: UN (1) parrafo de EXACTAMENTE 10 lineas.
Sin titulos, sin portada, sin encabezados, sin vinetas. Solo texto corrido.

Estrategia: el ancho del bloque de texto es fijo; se busca el cuerpo
tipografico mas grande que produzca exactamente 10 lineas al justificar.
Si ningun cuerpo lo logra, el script falla en vez de entregar un PDF invalido.

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
import sys

LINEAS_OBJETIVO = 10

# --- El copy. Un solo parrafo, escrito para ser ESCUCHADO, no leido. ---------
# Cada afirmacion sale de los archivos de la campana:
#   Producto  -> firmeza, jugo, olor al destapar, tamano uniforme, empaque facil
#   Precio    -> no es el mas barato, es la tranquilidad de no llevarse sorpresas
#   Plaza     -> el correo como supermercado propio, sin depender de nadie
#   Promocion -> textura, aroma y sabor; calor de hogar; trato de igual a igual
COPY = (
    "Usted ya sabe exactamente como debe sonar un buen tomate de guiso: la cascara "
    "rechinando limpia bajo el agua, el cuchillo entrando sin resistencia y soltando "
    "el jugo de una, el chasquido espeso de los cubos cayendo al aceite caliente. En "
    "la Granja Tierra Fresca escogemos ese tomate a mano, uno por uno, todos del mismo "
    "tamano, para que calcular sus porciones sea apenas cuestion de contarlos, y los "
    "empacamos en una caja que se abre de un solo movimiento, sin tijeras y sin pedirle "
    "ayuda a nadie. Lo primero que va a llegarle al destaparla es el olor: verde, dulce, "
    "recien cortado. Esa es nuestra garantia y es la unica prueba que le pedimos que "
    "evalue. No le estamos ofreciendo el tomate mas barato, le estamos ofreciendo la "
    "certeza de no encontrarse jamas uno machucado, blando o pasado en su propia cocina. "
    "Usted pide desde su correo, en el hueco que le quede entre clase y clase, y le llega "
    "a la puerta: su mercado, su decision, su guiso, su casa oliendo a comida hecha en "
    "familia."
)

# Los acentos se restituyen aqui para no depender de la codificacion del editor.
REEMPLAZOS = [
    ("como debe sonar", "c\u00f3mo debe sonar"),
    ("la cascara", "la c\u00e1scara"),
    ("tamano, para", "tama\u00f1o, para"),
    ("cuestion de", "cuesti\u00f3n de"),
    ("recien cortado", "reci\u00e9n cortado"),
    ("garantia y es la unica", "garant\u00eda y es la \u00fanica"),
    ("que evalue", "que eval\u00fae"),
    ("el tomate mas barato", "el tomate m\u00e1s barato"),
    ("no encontrarse jamas", "no encontrarse jam\u00e1s"),
    ("su decision", "su decisi\u00f3n"),
]


def texto_final():
    t = COPY
    for viejo, nuevo in REEMPLAZOS:
        if viejo not in t:
            raise SystemExit("No se encontro el fragmento a acentuar: %r" % viejo)
        t = t.replace(viejo, nuevo)
    return t


def contar_lineas(texto, ancho, cuerpo, interlineado):
    estilo = ParagraphStyle(
        "cuerpo",
        fontName="Helvetica",
        fontSize=cuerpo,
        leading=interlineado,
        alignment=TA_JUSTIFY,
    )
    p = Paragraph(texto, estilo)
    p.wrap(ancho, 10000)
    return len(p.blPara.lines), p, estilo


def buscar_cuerpo(texto, ancho):
    """Devuelve el cuerpo tipografico mas grande que da exactamente 10 lineas."""
    candidatos = []
    paso = 0.05
    cuerpo = 20.0
    while cuerpo >= 8.0:
        n, _, _ = contar_lineas(texto, ancho, cuerpo, cuerpo * 1.62)
        if n == LINEAS_OBJETIVO:
            candidatos.append(round(cuerpo, 2))
        cuerpo -= paso
    if not candidatos:
        raise SystemExit(
            "Ningun cuerpo tipografico entre 8 y 20 pt produce %d lineas exactas. "
            "Ajuste el copy o el ancho del bloque." % LINEAS_OBJETIVO
        )
    return max(candidatos)


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    salida = os.path.join(raiz, "docs", "Tomate-de-Guiso-Tierra-Fresca.pdf")

    texto = texto_final()

    margen_x = 2.0 * cm
    ancho_bloque = A4[0] - (2 * margen_x)

    cuerpo = buscar_cuerpo(texto, ancho_bloque)
    interlineado = cuerpo * 1.62
    n, parrafo, _ = contar_lineas(texto, ancho_bloque, cuerpo, interlineado)

    if n != LINEAS_OBJETIVO:
        raise SystemExit("Verificacion fallida: %d lineas." % n)

    alto_bloque = parrafo.height
    c = pdfcanvas.Canvas(salida, pagesize=A4)
    # Metadatos: no se imprimen en la hoja, pero el lector de pantalla los anuncia
    # al abrir el documento. No violan la regla de "cero titulos" visuales.
    c.setTitle("Tomate de guiso - Granja Tierra Fresca")
    c.setAuthor("Granja Tierra Fresca")
    c.setSubject("Propuesta de venta de tomate de guiso")
    try:
        c._doc.Catalog.Lang = PDFString("es-CO")  # idioma del documento para TTS
    except Exception as e:
        raise SystemExit("No se pudo fijar el idioma del PDF: %s" % e)

    y = (A4[1] + alto_bloque) / 2.0  # bloque centrado verticalmente
    parrafo.drawOn(c, margen_x, y - alto_bloque)
    c.showPage()
    c.save()

    print("PDF generado: %s" % salida)
    print("Cuerpo: %.2f pt | Interlineado: %.2f pt | Lineas: %d" % (cuerpo, interlineado, n))
    print("Caracteres del parrafo: %d" % len(texto))


if __name__ == "__main__":
    main()
