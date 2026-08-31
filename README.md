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
2. El correo **es un botón y nada más**. Lo pulsa y llega a la página.
3. **La página está vacía.** No hay títulos, ni botones, ni reproductor: sólo el
   fondo de la granja desenfocado. Todo ocurre por voz.
4. Al cargar, la superficie de arranque recibe el foco y el sistema le lee
   *«toque la pantalla»* en celular, o *«oprima cualquier tecla»* en computador.
5. Con ese gesto arranca el audio ASMR de un minuto, y se descarga sola la
   propuesta en PDF.
6. Al terminar, una voz en español pregunta: **«¿Desea reproducir la experiencia
   nuevamente?»** Reconocimiento de voz para **sí** o **no**.
7. Si dice **no**, pregunta: **«¿Desea contactar a Tierra Fresca?»**
   - Si dice **no**, agradece y se despide. Fin.
   - Si dice **sí**, le pide el celular **un número a la vez**, y le repite cada
     dígito apenas lo captura.
8. Con el número completo se lo lee de vuelta y pide confirmación. Si confirma,
   abre WhatsApp con el mensaje ya escrito.

En cada paso hay un camino alterno por teclado: cualquier tecla para arrancar,
`S` para sí, `N` para no, las teclas numéricas para el celular, `Retroceso` para
corregir.

## Máquina de estados

```
ESPERA_GESTO ──gesto──> REPRODUCIENDO ──fin del audio──> PREGUNTA_REPETIR
                              ^                                 │
                              └──────────── sí ─────────────────┤
                                                                │ no
                                                                v
                            FIN <─── no ─── PREGUNTA_CONTACTO ──┘
                                                 │ sí
                                                 v
                            CAPTURA_NUMERO ──> CONFIRMA_NUMERO ──sí──> WhatsApp
                                 ^                    │ no
                                 └────────────────────┘
```

## Estructura

```
index.html                          la experiencia (pantalla vacía)
style.css                           fondo desenfocado, nada más
script.js                           máquina de estados: audio, voz, micrófono
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

### En pantalla no hay nada, y eso es deliberado

Ni titulares, ni botones, ni reproductor. El destinatario es ciego: cualquier
texto en pantalla es información que él no recibe y que sólo sirve para que un
vidente crea que la pieza le habla a él. La pieza no le habla a él.

Lo único que existe en el HTML aparte del fondo es **texto reservado a lectores
de pantalla**, visualmente oculto con `clip-path`. No contradice la regla: es la
red de seguridad. Si el equipo no tiene voz española instalada, `speechSynthesis`
no puede hablar, y sin esa región la página se quedaría muda y sin salida.

### El arranque: por qué el foco y no un botón

El navegador exige un gesto del usuario antes de reproducir sonido, y venir de un
clic en el correo **no cuenta** como gesto en la página de destino.

La solución es un elemento transparente del tamaño de la pantalla que **recibe el
foco al cargar**. Eso hace que el lector de pantalla lea su `aria-label` de
inmediato, sin que el usuario tenga que buscar nada: *«toque la pantalla»* o
*«oprima cualquier tecla»*, según el dispositivo. Cualquier tecla, toque o clic
arranca.

Además se intenta decir la instrucción con `speechSynthesis`, que en la mayoría
de navegadores no está sujeto a la política de autoplay. Si suena, mejor. Si no,
el lector de pantalla ya hizo el trabajo.

### El reconocimiento de voz es una mejora, nunca la ruta crítica

`SpeechRecognition` sólo existe en Chrome y Edge, exige HTTPS y depende de que el
usuario dé permiso de micrófono. Firefox no lo soporta.

Como en pantalla no hay botones, el respaldo es **el teclado**: `S` para sí, `N`
para no, teclas numéricas para el celular, `Retroceso` para corregir. Si el
micrófono falla, la página lo dice una vez, sin dramatismo, y sigue funcionando.

### Sí o no: ante la duda, se vuelve a preguntar

Si una frase contiene a la vez una palabra de *sí* y una de *no* (*«no, sí»*), o
ninguna de las dos, la página **no adivina**: vuelve a preguntar. Tras tres
intentos fallidos ofrece el camino por teclado en vez de seguir insistiendo.

Es preferible una pregunta de más que saltar a WhatsApp sin que el usuario lo
haya pedido.

### La captura del celular repite cada dígito

Cuesta un segundo por dígito, pero es la diferencia entre corregir sobre la
marcha y descubrir al final que el número completo quedó mal. El reconocedor
devuelve tanto palabras (*«tres»*) como cifras agrupadas (*«315»*, *«treinta»*);
todo se descompone a dígitos sueltos. Decir *«borrar»* elimina el último.

Al final se lee el número completo, separado por comas para que la voz lo dicte
dígito por dígito y no como una cifra de mil millones.

### Qué pasa con el número capturado

GitHub Pages sirve archivos: no puede guardar datos. Por eso, al confirmar, la
página abre WhatsApp con el mensaje ya escrito, que es lo único que convierte el
número dictado en una conversación real. Se puede desactivar con la constante
`ABRIR_WHATSAPP_AL_CONFIRMAR`; en ese caso la página sólo agradece.

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
- Región `aria-live="assertive"` que narra cada mensaje, aunque el foco esté en
  otro lado. Es el canal de respaldo cuando no hay voz española instalada.
- La superficie de arranque recibe el foco al cargar: el lector de pantalla
  anuncia la instrucción sin que el usuario tenga que buscarla.
- Todo comando de voz tiene gemelo por teclado. Nada depende de ver la pantalla,
  de usar el mouse, ni de tener micrófono.
- Ni una sola imagen que cargue información: el fondo es decorativo y está
  marcado `aria-hidden`.
- Soporte de `prefers-reduced-motion` y del modo de alto contraste de Windows
  (`forced-colors`).

Sobre el indicador de foco: normalmente quitarlo es un error grave. Aquí no lo
es, porque el elemento enfocado ocupa la pantalla entera y su anillo sería un
marco alrededor de todo el navegador, no una pista útil. La instrucción no se
pierde: va por voz y por lector de pantalla.

## Pruebas hechas

Verificadas en navegador, con el micrófono bloqueado para forzar el camino de
contingencia:

- Cadena completa: gesto de teclado → audio → *«¿Desea reproducir nuevamente?»* →
  *no* → *«¿Desea contactar a Tierra Fresca?»* → *sí* → captura de diez dígitos →
  lectura de vuelta y confirmación.
- Camino de micrófono denegado: la página avisa una vez y el teclado toma el
  relevo sin perder el estado.
- Interpretación de sí/no, once casos: *«claro que sí»* → sí, *«no gracias»* →
  no, *«nunca»* → no, *«no, sí»* → ambiguo, vuelve a preguntar.
- Extracción de dígitos, diez casos: palabras sueltas (*«tres»*), cifras
  agrupadas (*«315»*), compuestos (*«treinta»*, *«veintitrés»*), ruido
  (*«ehh... siete»* → 7) y frases sin números (→ vacío).
- PDF: una página, un párrafo, diez líneas exactas, texto extraíble en orden de
  lectura.
- Pantalla: vacía. Sólo el fondo desenfocado, sin texto visible.

Sin probar todavía, porque necesita un equipo con micrófono y voz española
instalada: el reconocimiento de voz real y la síntesis en español.
