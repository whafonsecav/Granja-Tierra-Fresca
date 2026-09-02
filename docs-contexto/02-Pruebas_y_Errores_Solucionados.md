# Pruebas y Errores Solucionados

A lo largo del desarrollo, se resolvieron problemas críticos de compatibilidad (especialmente con iOS Safari y Políticas de Autoplay de navegadores Desktop).

## 1. Bloqueo de SpeechRecognition en iOS Safari
- **El Problema:** Safari prohíbe activar el micrófono (webkitSpeechRecognition.start()) a menos que provenga directamente de una interacción física del usuario. Llamarlo después de que la voz de la IA terminaba de hablar generaba un error de seguridad silencioso, desactivando el micrófono.
- **La Solución:** 
  1. Se agregó un toque obligatorio extra (solo en celulares) tras terminar el .mp3.
  2. En ese toque, se pide permiso nativo con getUserMedia. 
  3. **Hack implementado:** Se mantiene vivo el _stream_ del micrófono (la pastilla roja queda encendida). Al tener el stream vivo en la pestaña, iOS Safari 'relaja' su regla de seguridad y permite llamar a SpeechRecognition.start() asíncronamente las veces que sea necesario para hacer preguntas de forma automática.

## 2. Solapamiento de voces (VoiceOver/TalkBack vs. Voz IA)
- **El Problema:** El lector de pantalla nativo (VoiceOver) y la voz de la IA hablaban al mismo tiempo repitiendo lo mismo.
- **La Solución:** 
  - Se eliminaron las carreras asíncronas de la etiqueta ria-live. La voz IA es el **único** locutor activo durante la interacción. 
  - Se removieron llamadas a ocus() durante el cambio de fases, para evitar que el lector de pantalla interpretara el cambio como una orden para hablar y chocar con el TTS.

## 3. Silencio Permanente en Desktop (Autoplay Policies)
- **El Problema:** En Chrome/Edge de PC, el motor de voz (TTS) se bloqueaba por políticas de autoplay al abrir la página, pero como el código intentaba arrancar de todas formas, se quedaba colgado en un loop infinito de silencio.
- **La Solución:** Se unificó el comportamiento en TODAS las plataformas. Se agregó un texto en pantalla que el lector de pantalla lee inmediatamente, pidiendo al usuario hacer clic o presionar cualquier tecla para iniciar. Con ese clic, se garantiza que el motor TTS se libere y funcione a la primera.

## 4. Corte de Voz (Audio Ducking) en Windows SAPI y Edge
- **El Problema:** La primera palabra de la IA se cortaba al inicio (ej. "Hola" desaparecía). Además, en Edge (PC) el audio se cortaba abruptamente a mitad de la primera frase, reiniciando la pronunciación de manera defectuosa.
- **La Solución:** 
  1. Se deshabilitó la función partirEnTrozos() para computadores de escritorio, resolviendo definitivamente los cortes a mitad de párrafo en navegadores como Microsoft Edge, los cuales manejan de forma muy torpe las transiciones entre sentencias encoladas.
  2. Dado que en Windows el motor TTS (SAPI) arranca en una sesión de audio aislada y sufre un "Audio Ducking" inevitable a nivel de sistema operativo (que ni siquiera la API de WebAudio lograba mitigar), se implementó una palabra de sacrificio natural ("Ok. ") inyectada dinámicamente al inicio del texto solo en Desktop. Esto actúa como blindaje: Windows se traga el "Ok" (o se escucha un inocuo "Ok. Hola..."), protegiendo el mensaje principal del guion intacto.

## 5. Errores de Codificación (UTF-8 en PowerShell) y Caché Persistente en Móviles
- **El Problema:** Las tildes en el archivo de idiomas se mostraban como rombos o símbolos raros porque la consola de comandos dañaba el formato UTF-8 al aplicar inyecciones. Además, los celulares guardaban en caché los archivos viejos de JS y CSS, impidiendo ver los cambios.
- **La Solución:** Se reescribió idiomas.js utilizando secuencias de escape Unicode nativas de JavaScript (\u00e9 para la "é", etc.) para aislar la codificación de forma infalible. Se inyectaron Cache Busters dinámicos (?v=timestamp) directamente en las etiquetas del index.html para obligar a los móviles agresivos a solicitar siempre el código fresco.
