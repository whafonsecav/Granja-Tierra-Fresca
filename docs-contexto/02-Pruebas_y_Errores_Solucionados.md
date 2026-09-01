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
