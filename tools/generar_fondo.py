# -*- coding: utf-8 -*-
"""
Genera el fondo de la landing: una granja de tomates.

Se genera por codigo en vez de usar una foto de banco de imagenes por dos
razones: no arrastra licencias de terceros al repositorio publico, y como la
pagina le aplica un desenfoque de 70 px, el detalle fotografico se pierde de
todas formas. Lo unico que sobrevive al blur es la DISTRIBUCION DE COLOR:
cielo calido arriba, masa verde en el medio, puntos rojos regados y tierra
abajo. Eso es exactamente lo que se busca que vea una persona vidente:
manchas de color sin informacion legible.

Para reemplazarlo por una foto real, basta sobrescribir assets/granja-tomates.jpg
manteniendo el nombre. No hay que tocar el CSS.

Uso:  python tools/generar_fondo.py
"""

from PIL import Image, ImageDraw, ImageFilter
import os
import random

ANCHO, ALTO = 900, 600
SEMILLA = 20260830  # fondo reproducible: misma imagen en cada ejecucion


def mezclar(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def main():
    rnd = random.Random(SEMILLA)
    img = Image.new("RGB", (ANCHO, ALTO))
    d = ImageDraw.Draw(img)

    horizonte = int(ALTO * 0.26)

    # Cielo: azul palido arriba, calido y lavado sobre el horizonte.
    cielo_alto, cielo_bajo = (150, 190, 222), (238, 226, 196)
    for y in range(horizonte):
        d.line([(0, y), (ANCHO, y)], fill=mezclar(cielo_alto, cielo_bajo, y / horizonte))

    # Tierra: ocre en el fondo, mas oscura y humeda al frente.
    tierra_lejos, tierra_cerca = (150, 116, 82), (86, 58, 40)
    for y in range(horizonte, ALTO):
        t = (y - horizonte) / (ALTO - horizonte)
        d.line([(0, y), (ANCHO, y)], fill=mezclar(tierra_lejos, tierra_cerca, t))

    # Linea de arboles lejana.
    for _ in range(90):
        x = rnd.uniform(-40, ANCHO + 40)
        r = rnd.uniform(18, 46)
        d.ellipse([x - r, horizonte - r * 1.1, x + r, horizonte + r * 0.35],
                  fill=(52, 78, 48))

    # Surcos de tomateras en perspectiva: mas juntos y pequenos al fondo,
    # mas abiertos y grandes al frente.
    VERDES = [(58, 104, 48), (74, 126, 56), (96, 148, 62), (44, 88, 42)]
    ROJOS = [(196, 46, 34), (222, 70, 42), (176, 32, 30), (238, 96, 52)]

    filas = 16
    for i in range(filas):
        t = (i + 1) / filas                 # 0 = fondo, 1 = frente
        y = horizonte + (ALTO - horizonte) * (t ** 1.7)
        escala = 0.28 + t * 1.55
        alto_mata = 46 * escala
        paso = 30 * escala

        x = -paso
        while x < ANCHO + paso:
            cx = x + rnd.uniform(-paso * 0.3, paso * 0.3)
            # Follaje: varias manchas verdes por mata.
            for _ in range(5):
                rx = rnd.uniform(0.4, 0.9) * alto_mata
                ry = rx * rnd.uniform(0.55, 0.85)
                ox = rnd.uniform(-alto_mata * 0.5, alto_mata * 0.5)
                oy = rnd.uniform(-alto_mata * 0.6, alto_mata * 0.2)
                d.ellipse([cx + ox - rx, y + oy - ry, cx + ox + rx, y + oy + ry],
                          fill=rnd.choice(VERDES))
            # Tomates: generosos y grandes. Un blur de 70 px promedia el color con
            # el verde vecino, asi que un puntito rojo desaparece por completo.
            # Para que sobrevivan manchas rojas hay que sobredimensionarlas aqui.
            for _ in range(rnd.randint(4, 7)):
                rr = rnd.uniform(0.22, 0.42) * alto_mata
                ox = rnd.uniform(-alto_mata * 0.55, alto_mata * 0.55)
                oy = rnd.uniform(-alto_mata * 0.45, alto_mata * 0.35)
                d.ellipse([cx + ox - rr, y + oy - rr, cx + ox + rr, y + oy + rr],
                          fill=rnd.choice(ROJOS))
            x += paso

    # Suavizado leve: quita el borde duro de las elipses y deja algo mas
    # parecido a una captura fotografica antes del blur del navegador.
    img = img.filter(ImageFilter.GaussianBlur(radius=1.6))

    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    salida = os.path.join(raiz, "assets", "granja-tomates.jpg")
    img.save(salida, "JPEG", quality=78, optimize=True, progressive=True)
    print("Fondo generado: %s (%d bytes)" % (salida, os.path.getsize(salida)))


if __name__ == "__main__":
    main()
