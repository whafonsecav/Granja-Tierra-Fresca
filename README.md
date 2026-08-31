# Granja Tierra Fresca — experiencia sensorial del tomate de guiso

Campaña de correo y web para vender un tomate de guiso a un docente
universitario ciego de nacimiento, usuario experto de lector de pantalla.

Pieza académica de **Comportamiento del Consumidor**, Politécnico Grancolombiano.
Mariana Silva y William Fonseca. *Granja Tierra Fresca* es una marca ficticia
creada para este ejercicio.

**Sitio publicado:** https://whafonsecav.github.io/Granja-Tierra-Fresca/

---

## Antes de publicar: lo único que hay que configurar

Abra `script.js` y cambie esta línea por el número real de la granja:

```js
var NUMERO_WHATSAPP = "573001234567";
```

Formato: indicativo de país y número, **solo dígitos, sin `+`, sin espacios, sin
guiones**. Colombia es `57`. Si el número queda mal, la página no salta a
WhatsApp: avisa en voz alta que falta configurarlo, en vez de abrir un chat roto.

---

## Recorrido del usuario

1. Recibe el correo. Su lector de pantalla le narra asunto y vista previa en la
   bandeja, sin abrirlo. Ese es el único audio automático que existe en email.
2. Pulsa el único enlace del correo y llega a la página.
3. **Se descarga sola** la propuesta en PDF, a la carpeta de descargas.
4. **Arranca solo** el audio ASMR de un minuto. Si el navegador lo bloquea, toda
   la pantalla se convierte en un botón de inicio.
5. Al terminar el audio, una **voz sintética en español** le explica los dos
   comandos disponibles.
6. Se enciende el **micrófono**. Puede decir *«quiero volver a reproducir»* o
   *«quiero contactarlos»*.
7. Si dice que sí, la página abre **WhatsApp con el mensaje ya escrito**.

En cada paso hay un camino alterno: botones gigantes, navegables con `Tab`.

---

## Estructura

```
index.html                          la experiencia
style.css                           fondo desenfocado y alto contraste
script.js                           audio, voz, micrófono y conversión
audio/experiencia.mp3               pista ASMR de un minuto
docs/Tomate-de-Guiso-...pdf         propuesta de venta (se descarga sola)
assets/granja-tomates.jpg           fondo, generado por código
email/correo-outlook.html           el correo listo para enviar
email/INSTRUCCIONES-ENVIO.md        cómo enviarlo y por qué así
tools/generar_pdf.py                regenera el PDF (1 párrafo, 10 líneas)
tools/generar_fondo.py              regenera el fondo
```

Para regenerar los archivos derivados:

```bash
python tools/generar_pdf.py && python tools/generar_fondo.py
```

Requiere `reportlab` y `Pillow`.

---

## Decisiones que conviene entender antes de tocar el código

### El fondo está borroso a propósito

`blur(70px)`. Quien ve la página no obtiene ni un dato más que quien la escucha:
solo manchas verdes y rojas. Es el argumento de la campaña convertido en CSS.
Toda la información real está en el texto y en el audio.

Para cambiar la imagen por una foto real, sobrescriba
`assets/granja-tomates.jpg`. No hay que tocar el CSS.

### El autoplay de audio no está garantizado, y eso está resuelto

Chrome, Edge y Safari bloquean el sonido automático si la pestaña no ha recibido
un gesto del usuario. Venir de un clic en el correo **no cuenta** como gesto en
la página de destino.

La página intenta reproducir de una. Si la rechazan, muestra una compuerta que
ocupa la pantalla completa y **es un solo botón**: cualquier toque, `Enter` o
barra espaciadora arranca. Recibe el foco automáticamente, así que el lector de
pantalla la anuncia apenas carga.

### El reconocimiento de voz es una mejora, nunca la ruta crítica

`SpeechRecognition` solo existe en Chrome y Edge, exige HTTPS y depende de que
el usuario dé permiso de micrófono. Firefox no lo soporta.

Por eso **cada comando de voz tiene un botón gigante equivalente**, y si el
permiso se niega la página lo dice sin dramatismo y mueve el foco al botón de
conversión. Nunca se queda en un callejón sin salida.

### Voz sintética y micrófono nunca funcionan al mismo tiempo

Si el micrófono siguiera abierto mientras la página habla, se escucharía a sí
misma y entraría en bucle. El código serializa: sintetiza, espera el `onend`, y
solo entonces enciende el micrófono. Lo mismo al reproducir el audio ASMR.

### La voz guía habla español, o se calla

`speechSynthesis` usa `lang = "es-CO"` y busca una voz española en tres rondas:
español de América, cualquier variante de español, y por último por nombre de
voz.

**Si el equipo no tiene ninguna voz española instalada**, la página *no*
sintetiza: una voz inglesa leyendo español suena a ruido y se entiende peor que
el silencio. En ese caso deja el mensaje en la región `aria-live` y lo narra el
lector de pantalla del propio usuario, que sí está en español y a su velocidad
de siempre.

Para instalar voces en español en Windows:
**Configuración → Hora e idioma → Voz → Administrar voces → Agregar voces →
Español**.

### La descarga del PDF

Se hace con `fetch` a Blob y un enlace `download`, no pinchando el `.pdf`
directamente. La diferencia importa: al pinchar un PDF, Chrome y Edge lo abren
en su visor integrado; con este método lo **guardan como archivo en la carpeta
de descargas predeterminada**, sin visor de por medio.

Un límite que conviene tener claro: si el usuario tiene activada la opción
*"Preguntar dónde guardar cada archivo"* en su navegador, ninguna página web del
mundo puede saltársela. Es una preferencia suya, no algo que el sitio decida.

---

## Accesibilidad

- `lang="es-CO"` en la página y en el PDF (entrada `/Lang` del catálogo).
- Región `aria-live="assertive"` que narra cada cambio de estado, aunque el foco
  esté en otro lado.
- Reproductor de audio con controles nativos: accesibles por teclado desde el
  primer segundo, sin depender de nuestro JavaScript.
- Botones de 108 px de alto, texto de hasta 1.8 rem, anillo de foco de 5 px.
- Soporte de `prefers-reduced-motion` y del modo de alto contraste de Windows
  (`forced-colors`).
- Ni una sola imagen que cargue información: el fondo es decorativo y está
  marcado `aria-hidden`.

## Pruebas hechas

- Cadena completa `audio → voz → micrófono → contingencia`, verificada en
  navegador.
- Camino de permiso de micrófono denegado: mensaje claro y foco movido al botón
  de conversión.
- Los 15 casos de los patrones de voz, incluidos los negativos: *«siempre»* no
  dispara el comando de *«sí»*.
- PDF: una página, un párrafo, diez líneas exactas, texto extraíble en orden de
  lectura.
