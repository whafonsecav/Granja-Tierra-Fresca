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
La web fue ajustada con muchísimas capas de corrección (Polyfills lógicos) para asegurar que la misma base de código corra idénticamente en:
- Chrome/Edge en Windows/Mac.
- Android Chrome (con o sin TalkBack).
- iOS Safari (con o sin VoiceOver).
