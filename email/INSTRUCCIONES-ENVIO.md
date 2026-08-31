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
- *Profesor Carlos: un minuto de cocina, sin una sola imagen.* (57 caracteres)

Tres cosas que **no** debe hacer con el asunto:

- No lo escriba en MAYÚSCULAS SOSTENIDAS: algunos lectores de pantalla las
  deletrean letra por letra.
- No le meta emojis. NVDA los lee con su nombre completo en inglés
  ("red apple", "loudspeaker") y arruina el arranque de la frase.
- No use `RE:` ni `FW:` falsos para forzar apertura. Con este destinatario, ese
  truco quema la confianza que es justamente lo que le estamos vendiendo.

## Texto de vista previa (preheader)

Ya viene incrustado en el HTML, oculto visualmente. Es este:

> Un minuto de cocina real: el agua sobre la cáscara, el cuchillo en la pulpa,
> el aceite caliente. Un solo botón en todo el correo.

Los caracteres `&#8203;` (espacio de ancho cero) que van después no son basura:
si no estuvieran, Outlook rellenaría la vista previa con las primeras palabras
del cuerpo y se perdería el remate.

---

## Paso a paso del envío

### Opción A — Outlook Web (la más simple, y la recomendada)

Outlook en el navegador no tiene un botón de "insertar HTML". Se usa el
portapapeles, que conserva el formato:

1. Abra `correo-outlook.html` en Chrome o en Edge (doble clic sobre el archivo).
2. `Ctrl + A` para seleccionar todo lo que se ve, y `Ctrl + C` para copiarlo.
3. En Outlook Web, redacte un correo nuevo y pegue con **`Ctrl + Shift + V`**
   (pegar manteniendo el formato de origen).
4. Escriba el asunto de arriba.
5. Envíese el correo a usted mismo primero. Verifique tres cosas antes de
   mandarlo de verdad:
   - que el botón rojo se vea y sea pinchable;
   - que al pasar el mouse por encima el enlace apunte a
     `https://whafonsecav.github.io/Granja-Tierra-Fresca/`;
   - que el correo llegue a Recibidos y no a Correo no deseado.
6. Ahora sí, envíelo al destinatario.

### Opción B — Outlook de escritorio, insertando el archivo como texto

Esta conserva el HTML sin que el portapapeles lo reescriba:

1. Correo nuevo → pestaña **Insertar** → **Adjuntar archivo** →
   **Examinar este equipo**.
2. Seleccione `correo-outlook.html`, pero **no pulse Insertar**: abra la flecha
   del botón y elija **Insertar como texto**.
3. Escriba el asunto y envíe.

### Opción C — Su propio Gmail o cuenta personal

Si el correo institucional le reescribe demasiado el HTML, mándelo desde Gmail
con la extensión gratuita *HTML Email* o pegando igual que en la Opción A. Gmail
respeta este HTML sin problema porque no usa el motor de Word.

---

## Antes de enviar: revisión rápida

- [ ] El sitio ya está publicado y abre bien en
      `https://whafonsecav.github.io/Granja-Tierra-Fresca/`
- [ ] El número de WhatsApp está configurado en `script.js`
      (constante `NUMERO_WHATSAPP`)
- [ ] La prueba a usted mismo llegó a Recibidos
- [ ] Probó el correo con las imágenes bloqueadas: como no hay ninguna imagen,
      se debe ver exactamente igual
- [ ] Verificó que en todo el correo hay **un solo enlace**: el botón
- [ ] Si puede, escuche el correo con el Narrador de Windows
      (`Ctrl + Windows + Enter`). Es la prueba que de verdad importa.

## Por qué este correo no debería caer en spam

- No tiene imágenes, ni scripts, ni etiquetas sanitizadas.
- Tiene una relación de texto a HTML muy alta, que es lo que los filtros premian.
- Tiene un solo enlace, a un dominio con buena reputación (`github.io`) y con
  HTTPS.
- No usa acortadores de URL, que son la señal de spam más fuerte que existe.
- No incluye palabras del vocabulario clásico de spam: *gratis*, *oferta*,
  *urgente*, *última oportunidad*, ni signos de admiración en el asunto.
