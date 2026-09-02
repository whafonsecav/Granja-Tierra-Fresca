# Cómo Funciona Actualmente

## Arquitectura Base
El proyecto se basa enteramente en Vanilla JavaScript, CSS y HTML sin frameworks, debido a que toda la carga funcional descansa en las APIs nativas del navegador:
- **SpeechSynthesis API:** Para la voz de la IA (el bot).
- **SpeechRecognition API:** Para captar la voz del usuario (dictado de números y comandos 'sí/no').
- **MediaDevices.getUserMedia:** Usado como técnica de persistencia de permisos en iOS para evadir los bloqueos de Apple.

## Archivos Principales
- **index.html:** La estructura. Visualmente solo hay un div gigantesco (#arranque) que captura los clics, y un div de fondo con desenfoque extremo. Se agregó el texto visible de inicio #texto-arranque para la correcta accesibilidad.
- **style.css:** Desenfoque, z-indexes y centrado de la instrucción de arranque.
- **idiomas.js:** Diccionario de frases exactas que dirá el bot IA.
- **script.js:** Todo el 'cerebro'. Gestiona las máquinas de estado de la conversación, el reproductor de audio, las reglas de iOS, y el dictado de números.

## Reglas de Captura del Teléfono
El sistema espera **estrictamente 10 dígitos**. No hay reglas de prefijo (no se requiere que inicie con 3). Si la persona dicta más o menos dígitos, o se queda callada, la IA responde indicando el error y vuelve a abrir el micrófono de manera autónoma.

## Compatibilidad
La web fue ajustada con muchísimas capas de corrección. La interacción inicial (Bienvenida) y la instrucción en pantalla ("Haz clic/Toca para iniciar") se unificaron al 100% para PC y Celulares, asegurando que todos los dispositivos usen la misma dinámica idéntica (el mensaje de "Hemos preparado un mensaje... tu dispositivo solicitará permisos"). (Polyfills lógicos) para asegurar que la misma base de código corra idénticamente en:
- Chrome/Edge en Windows/Mac.
- Android Chrome (con o sin TalkBack).
- iOS Safari (con o sin VoiceOver).

## Flujo Conversacional Estricto (Máquina de Estados)
La IA sigue actualmente un flujo de 4 Actos en cadena, los cuales están programados en script.js:
- **Acto 1:** Bienvenida interactiva, solicitud de permisos y reproducción del audio comercial (MP3).
- **Acto 2:** Pregunta de cierre 1 ("¿Quieres escuchar de nuevo?"). Si es 'sí', retorna al MP3. Si es 'no', avanza a la toma de contacto.
- **Acto 3:** Confirmación y guardado del número ("Tu número quedó guardado").
- **Acto 4:** Pregunta de cierre 2 ("¿Quieres descargar el PDF?"). Si es 'sí', invoca una descarga nativa silenciosa. Si es 'no', se despide y finaliza el script.

En caso de que el micrófono falle, no se soliciten permisos o la persona hable sin hardware activo, el sistema omite el Acto 3 (la captura del número de teléfono) cayendo hacia el final grácilmente solicitando un toque en la pantalla, en lugar de solicitar entradas de teclado (lo cual era inviable en móvil).
