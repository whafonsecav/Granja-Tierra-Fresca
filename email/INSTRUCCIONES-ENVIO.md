# Cómo enviar el correo desde Outlook sin que lo bloqueen

## Lo primero: qué NO se puede hacer, y por qué no vale la pena intentarlo

El requerimiento original pedía que el audio se reprodujera solo al abrir el
correo. **Eso no existe.** No es una limitación de nuestro código: es cómo están
construidos todos los clientes de correo serios.

| Intento | Resultado real |
|---|---|
| `<audio autoplay>` | Outlook de escritorio renderiza con el motor de Word: descarta la etiqueta entera. Outlook Web la sanitiza al recibir. |
| `<script>` | Eliminado por el sanitizador en el 100% de los clientes. |
| `<iframe>` / `<embed>` / `<object>` | Eliminados igual. |
| GIF "con sonido" | No existe tal cosa; el formato GIF no tiene pista de audio. |
| AMP for Email | Requiere registrar el dominio remitente ante Google y Yahoo. No aplica a un correo universitario de Outlook. |

Y hay una razón de fondo para no forzarlo: **cada uno de esos intentos sube la
puntuación de spam del mensaje**. Un correo que trae etiquetas sanitizadas tiene
muchas más probabilidades de caer en Correo no deseado. Se perdería la entrega
entera por perseguir algo que igual no iba a funcionar.

## Lo que sí funciona: el "autoplay" ya está encendido

El destinatario tiene un lector de pantalla corriendo todo el tiempo. Cuando
recorre su bandeja, NVDA (o JAWS, o el Narrador) le lee en voz alta, sin que él
haga nada:

1. el remitente,
2. el **asunto**,
3. el **texto de vista previa** (preheader).

Ese es el audio automático, y ya está corriendo. No hay que inventar otro.

Por eso el correo **es un botón y nada más**. Ni párrafos, ni logo, ni firma, ni
pie de página. Cuando él presione la tecla `K` en NVDA (ir al siguiente enlace) o
deslice en VoiceOver, sólo existe un destino posible: la experiencia. Todo el
peso del mensaje lo cargan el asunto y la vista previa, que son justo los dos
campos que el sistema le lee solo.

---

## Asunto

Use este:

> **Tenemos un mensaje especial para ti**

Cuatro razones por las que es este y no otro:

- **No revela el producto.** Un asunto que empiece por "tomate" o "granja" se
  clasifica solo como publicidad antes de terminar de leerse. Este obliga a
  abrir para saber de qué se trata.
- **Es corto.** Treinta y cinco caracteres: no se corta en ninguna vista de
  bandeja, ni en el celular. El lector de pantalla lo lee entero de un tirón.
- **Tutea.** Es lo mismo que hace la voz de la página, así que el tono no
  cambia a mitad de camino.
- **Es literalmente la primera frase que va a oír al entrar.** La página abre
  diciendo "Tenemos un mensaje especial para ti". Ese eco no es pereza: le
  confirma, sin verlo, que llegó al sitio correcto.

Alternativas, por si prefiere otro tono:

- *Grabamos dos minutos pensando en ti.* (38 caracteres, más cálido)
- *Un mensaje que preferimos que escuches, no que leas.* (52 caracteres,
  más intrigante; insinúa el diseño sonoro sin condescendencia)

Tres cosas que **no** debe hacer con el asunto:

- No lo escriba en MAYÚSCULAS SOSTENIDAS: algunos lectores de pantalla las
  deletrean letra por letra.
- No le meta emojis. NVDA los lee con su nombre completo en inglés
  ("red apple", "loudspeaker") y arruina el arranque de la frase.
- No use `RE:` ni `FW:` falsos para forzar apertura. Con este destinatario, ese
  truco quema la confianza que es justamente lo que le estamos vendiendo.

## Texto de vista previa (preheader)

Ya viene incrustado en el HTML, oculto visualmente. Es este:

> Dos minutos de cocina real: el agua sobre la cáscara, el cuchillo en la pulpa,
> el aceite caliente. Un solo botón en todo el correo.

Los caracteres `&#8203;` (espacio de ancho cero) que van después no son basura:
si no estuvieran, Outlook rellenaría la vista previa con las primeras palabras
del cuerpo y se perdería el remate.

---

## Paso a paso del envío desde el correo institucional

El correo de la universidad entra por `poli.edu.co → Ingresar`, pasa por el
inicio de sesión de Microsoft y abre Outlook Web. Ahí no existe un botón de
"insertar HTML": el correo se arma copiando y pegando desde el navegador.

Eso tiene una consecuencia que ya está resuelta, pero conviene entenderla: **al
copiar y pegar se pierde todo lo que esté oculto**. El texto de vista previa
original iba oculto y no sobrevivía al pegado. Por eso ahora hay una línea
visible encima del botón que cumple ese papel. No es decoración ni relleno: es
el texto que Outlook muestra en la bandeja y que el lector de pantalla narra
justo después del asunto.

### Los pasos

1. Abra `correo-outlook.html` con doble clic. Se abre en Chrome o Edge y se ve
   una línea de texto y un botón rojo. Eso es todo el correo.

2. `Ctrl + A` y luego `Ctrl + C`.

3. En Outlook Web, **Correo nuevo**. Haga clic dentro del cuerpo del mensaje y
   pegue con **`Ctrl + V`**, el pegado normal.

   Ojo con esto, porque es al revés de lo que uno esperaría: en Outlook Web
   `Ctrl + Shift + V` pega como **texto plano** y destruye el botón. El que
   conserva el formato es el `Ctrl + V` corriente. Si aparece el botón flotante
   `(Ctrl)` justo después de pegar, ábralo y elija **Mantener formato de
   origen**.

4. En Asunto, pegue exactamente esto:

   > Este correo no tiene fotos del tomate. Tiene el sonido del tomate.

5. **Mándeselo primero a usted mismo.** Antes de enviarlo de verdad, verifique
   cuatro cosas:
   - el botón rojo se ve y se puede pulsar;
   - al pasar el mouse por encima, el enlace apunta a
     `whafonsecav.github.io/Granja-Tierra-Fresca` (si aparece
     `safelinks.protection.outlook.com`, es normal: la universidad reescribe
     todos los enlaces y sigue funcionando);
   - en la lista de la bandeja, debajo del asunto, se lee la línea de los dos
     minutos de cocina;
   - el correo llegó a Recibidos y no a Correo no deseado.

6. Escuche esa prueba con el Narrador de Windows (`Ctrl + Windows + Enter`).
   Recorra la bandeja sin abrir el correo: debe oír el asunto y enseguida la
   línea de la vista previa. Ese es el arranque de la experiencia, y es la única
   prueba que de verdad importa.

7. Ahora sí, envíelo al profesor.

### Si el botón se ve mal al pegar

Deshaga con `Ctrl + Z` hasta que el cuerpo quede vacío, y repita desde el paso 2
asegurándose de pegar con `Ctrl + V`, no con `Ctrl + Shift + V`. Si aun así se
rompe, escriba el correo con el
enlace en texto plano: pierde el botón, pero el destinatario no ve el botón de
todos modos. Lo que no puede faltar es que el texto del enlace siga diciendo a
dónde lleva y cuánto dura.

## Por qué este correo no debería caer en spam

- No tiene imágenes, ni scripts, ni etiquetas sanitizadas.
- Tiene una relación de texto a HTML muy alta, que es lo que los filtros premian.
- Tiene un solo enlace, a un dominio con buena reputación (`github.io`) y con
  HTTPS.
- No usa acortadores de URL, que son la señal de spam más fuerte que existe.
- No incluye palabras del vocabulario clásico de spam: *gratis*, *oferta*,
  *urgente*, *última oportunidad*, ni signos de admiración en el asunto.
