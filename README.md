# Granja Tierra Fresca — experiencia sensorial del tomate de guiso

Campaña de correo y web para vender un tomate de guiso a un docente
universitario ciego de nacimiento, usuario experto de lector de pantalla.

Pieza académica de **Comportamiento del Consumidor**, Politécnico Grancolombiano.
Mariana Silva y William Fonseca. *Granja Tierra Fresca* es una marca ficticia
creada para este ejercicio.

**Sitio publicado:** https://whafonsecav.github.io/Granja-Tierra-Fresca/

---

## Antes de publicar: dónde quedan los números

El número que dicte el profesor se guarda **siempre** en el navegador de él, en
`localStorage`. Eso no se pierde nunca, pero tampoco le llega a usted. Para que
llegue hay que configurar un destino.

### Por qué no se puede escribir directo en GitHub

Una página en GitHub Pages sirve archivos y nada más. Para escribir en el
repositorio desde el navegador haría falta un token de escritura dentro de
`script.js`, y en un repositorio público ese token queda a la vista de
cualquiera: podrían borrar todo el repositorio. GitHub además detecta los
tokens filtrados y los revoca solo, así que ni siquiera funcionaría por mucho
tiempo.

La solución es un intermediario que guarde el token del lado del servidor.

### El intermediario (unos cinco minutos, gratis)

En [`tools/registro-apps-script.gs`](tools/registro-apps-script.gs) está el
código listo para pegar, con el paso a paso completo en su encabezado. Resumen:

1. Cree una hoja de cálculo en Google Sheets.
2. Extensiones → Apps Script, y pegue el archivo.
3. Genere un token de GitHub restringido a este repositorio, con permiso
   **Contents: Read and write** y nada más.
4. Guarde el token en Propiedades de la secuencia de comandos, como
   `GITHUB_TOKEN`.
5. Implemente como aplicación web con acceso "Cualquier usuario", y copie la
   URL que termina en `/exec`.
6. Pegue esa URL en `script.js`, en la constante `ENDPOINT_REGISTRO`.

Desde ahí, cada número aparece en dos lugares:

- la **hoja de cálculo**, con fecha, dispositivo y origen;
- el archivo **`registros.json`** de este repositorio, que se puede abrir desde
  GitHub y leer de un vistazo.

Si la escritura en GitHub falla por lo que sea, la hoja ya quedó grabada. Y si
falla todo, la copia en el navegador del usuario sigue ahí:

```js
JSON.parse(localStorage.getItem("tierrafresca.registros"))
```

### Cierre por WhatsApp (desactivado)

La campaña cierra registrando el número y avisando que un aliado se comunica.
Si quisiera volver al cierre por WhatsApp, ponga `ABRIR_WHATSAPP_AL_CONFIRMAR`
en `true` y llene `NUMERO_WHATSAPP` en `script.js`.

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
   - Si dice **sí**, le pide el celular **completo, de corrido**. No lo
     interrumpe: escucha hasta que termine de hablar.
8. Le lee el número de vuelta, en grupos de tres, y le da tres salidas:
   **sí** confirma, **no** lo borra entero y vuelve a empezar, y **«repítalo»**
   se lo lee otra vez sin tocarlo.
9. Al confirmar: *«Su número ya quedó registrado. Uno de nuestros aliados se va
   a comunicar con usted para coordinar su envío.»*

En cada paso hay un camino alterno por teclado: cualquier tecla para arrancar,
`S` para sí, `N` para no, `R` para que le repita el número, las teclas numéricas
para el celular, `Enter` para dar por terminado el dictado.

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
                                          CAPTURA_NUMERO
                                                 │ silencio, o 10 dígitos
                                                 v
                            no ──> CONFIRMA_NUMERO <──┐
                            (borra)  │      │  repítalo
                                     │      └─────────┘
                                     │ sí
                                     v
                              registro + despedida
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
tools/registro-apps-script.gs       intermediario que guarda los números
registros.json                      los números registrados (lo escribe el
                                    intermediario, no se edita a mano)
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

### El celular se dicta completo, sin interrupciones

La primera versión repetía cada dígito apenas lo capturaba. Sonaba atento, pero
estaba roto de raíz: repetir obliga a apagar el micrófono para hablar y a
encenderlo de nuevo después, y ese vaivén partía en pedazos cualquier número
dicho de corrido. Se perdían dígitos en cada corte.

Ahora el micrófono queda abierto de principio a fin. La página no dice nada
mientras el usuario dicta. Cuando pasan cuatro segundos y medio de silencio, o
cuando llegan los diez dígitos, se da por terminado.

El reconocedor devuelve tanto palabras (*«tres»*) como cifras agrupadas
(*«315»*, *«treinta»*); todo se descompone a dígitos sueltos.

### La confirmación tiene tres salidas, no dos

Un número de diez cifras no siempre se retiene a la primera. Con sólo sí y no,
quien no alcanzó a oírlo tendría que decir *«no»* y dictarlo entero otra vez,
sin ninguna necesidad. Por eso hay un tercer comando: **«repítalo»** (tecla `R`),
que lo vuelve a leer sin tocarlo.

Y **«no» borra el número completo**, no un dígito. Se lo dice explícitamente —
*«lo borré por completo»* — para que no quede con la duda de si algo se guardó a
medias.

La lectura de vuelta va en grupos de tres, con una pausa entre grupos: 315. 888.
4433. Diez dígitos separados sólo por comas son una lista imposible de seguir de
oído; agrupados se retienen como un número. Un grupo final de un solo dígito se
absorbe en el anterior, porque *«cuatro, cuatro, tres... tres»* suena a error de
la máquina.

### Dónde queda el número

Siempre en `localStorage`, en el navegador del usuario: es la copia que no
depende de la red ni de que el intermediario esté bien configurado.

Y, si `ENDPOINT_REGISTRO` está configurado, también en la hoja de cálculo y en
`registros.json`. Ese envío va en modo `no-cors`, porque una aplicación web de
Apps Script no devuelve cabeceras CORS: la petición sale, pero el navegador no
deja leer la respuesta. Por eso no se puede confirmar la entrega desde la
página, y por eso la copia local no es opcional.

### Voz sintética y micrófono nunca funcionan al mismo tiempo

Si el micrófono siguiera abierto mientras la página habla, se escucharía a sí
misma y entraría en bucle. El código serializa: sintetiza, espera el `onend`, y
solo entonces enciende el micrófono. Lo mismo al reproducir el audio ASMR.

### La voz guía habla español, o se calla

Cada voz disponible se puntúa para quedarse con la más humana de las que hablen
español. Las voces neuronales (*Natural*, *Neural*) y las que se sintetizan en
servidor (*Online*, las de Google) suenan muchísimo mejor que las locales
clásicas de Windows, que arrastran la cadencia metálica de SAPI. Una voz que no
hable español queda descartada de entrada.

**Si el equipo no tiene ninguna voz española instalada, la página no sintetiza.**
Una voz inglesa leyendo español se entiende peor que el silencio. En ese caso
deja el mensaje en la región `aria-live` y lo narra el lector de pantalla del
propio usuario, que sí está en español y a su velocidad de siempre.

Para instalar voces en español en Windows:
**Configuración → Hora e idioma → Voz → Administrar voces → Agregar voces →
Español**.

### El segundo en blanco antes de cada frase

La salida de audio del sistema se duerme cuando lleva un rato en silencio, y al
despertar se come los primeros 200 a 400 milisegundos: la primera sílaba de cada
frase se perdía.

Antes de hablar, la página manda un segundo de silencio real por WebAudio. El
buffer no es silencio absoluto sino una amplitud mínima e inaudible, porque
algunos controladores detectan el silencio puro y apagan el canal igual, que es
justo lo que se quiere evitar. Cuando entra la voz, el dispositivo ya está
abierto.

Se ajusta con la constante `SILENCIO_INICIAL_MS`.

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

Verificadas en navegador, con el micrófono bloqueado a propósito para forzar el
camino de contingencia por teclado:

- Cadena completa: gesto → audio → *«¿Desea reproducir nuevamente?»* → **no** →
  *«¿Desea contactar a Tierra Fresca?»* → **sí** → diez dígitos de corrido →
  lectura de vuelta agrupada → **repítalo** → **sí** → mensaje de registro.
- El número queda en `localStorage` y la URL no cambia: no hay salto a WhatsApp.
- Rama de despedida (**no** en la pregunta de contacto).
- Interpretación de sí/no, once casos: *«claro que sí»* → sí, *«no gracias»* →
  no, *«nunca»* → no, *«no, sí»* → ambiguo y vuelve a preguntar.
- Extracción de dígitos: palabras sueltas, cifras agrupadas (*«315»*),
  compuestos (*«treinta»*, *«veintitrés»*), ruido (*«ehh... siete»* → 7), y
  frases sin números (→ vacío). Un celular dicho de corrido de las cinco formas
  probadas devuelve los diez dígitos correctos.
- Agrupación de la lectura: `3158884433` → *«3, 1, 5. 8, 8, 8. 4, 4, 3, 3»*, sin
  grupos finales de un solo dígito.
- Puntuación de voces contra una lista simulada: gana *Microsoft Salomé Online
  (Natural)* sobre *Google español*, sobre *Sabina* local, sobre *Helena*, y las
  voces en inglés quedan descartadas.
- PDF: una página, un párrafo, diez líneas exactas, texto extraíble en orden de
  lectura.
- Pantalla: vacía. Sólo el fondo desenfocado, sin texto visible.

Dos fallos reales que salieron de estas pruebas y ya están corregidos:

- `ENDPOINT_REGISTRO` no estaba declarada, y el `ReferenceError` reventaba
  dentro de `registrar()` justo antes del mensaje de cierre: el número se
  guardaba, pero el usuario nunca oía que había quedado registrado.
- Un error tardío del micrófono podía llegar con la conversación ya cerrada y
  pisar ese mismo mensaje de cierre con el aviso del teclado.

Sin probar todavía, porque necesita un equipo con micrófono y voz española
instalada: el reconocimiento de voz real y la síntesis en español. En este
equipo no hay ninguna voz española instalada, así que la degradación por
`aria-live` es la que quedó ejercitada.
