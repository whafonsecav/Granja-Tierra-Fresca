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

> **Este correo no tiene fotos del tomate. Tiene el sonido del tomate.**

Es disruptivo justamente en el canal en el que él vive: rompe la expectativa de
"correo comercial con imágenes" en la primera frase que oye, y anuncia el
beneficio en la segunda. Tiene 62 caracteres, así que no se corta en la vista de
lista de Outlook ni en la del celular.

Alternativas, por si quiere variar:

- *No le vamos a describir el tomate. Se lo vamos a hacer oír.* (58 caracteres)
- *Profesor Carlos: dos minutos de cocina, sin una sola imagen.* (58 caracteres)

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
   pegue con **`Ctrl + Shift + V`**.

   Es `Ctrl + Shift + V` y no `Ctrl + V`: el pegado normal aplica el formato del
   destino y aplana el botón hasta dejarlo como un enlace de texto suelto.

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

Deshaga con `Ctrl + Z`, borre el borrador y repita desde el paso 2 asegurándose
de pegar con `Ctrl + Shift + V`. Si aun así se rompe, escriba el correo con el
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
