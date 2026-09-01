# Bitácora de Cambios (Changelog)

Este documento registra cronológicamente los ajustes y desarrollos críticos realizados en el proyecto.

## Últimos Ajustes Críticos (Sesión Reciente)

### 1. Unificación de Frases (Desktop y Móvil)
- **Problema:** En Desktop y Móvil la voz de la IA decía frases de bienvenida diferentes ('Tenemos un mensaje' vs 'Hemos preparado un mensaje').
- **Solución:** Se unificó la lógica en script.js para usar siempre la clave ienvenidaMovil modificada en idiomas.js para que sea universal (usando 'tu dispositivo te solicitará permisos' en vez de 'tu celular').

### 2. Texto Visible de Instrucción y Fin de Auto-arranque
- **Problema:** Chrome y Edge en Desktop bloqueaban el motor de voz al intentar auto-arrancar. El código esperaba 15 segundos y saltaba al mensaje 'A continuación...'. Adicionalmente, el usuario requería un texto visible claro para el lector de pantalla.
- **Solución:** Se deshabilitó el auto-arranque en Desktop. Se añadió un párrafo visible <p id='texto-arranque'> dentro del botón gigante, que muestra 'Haz clic' o 'Toca dos veces' según el dispositivo. Ahora TODAS las plataformas inician con un clic, garantizando que el navegador no bloquee el audio y la IA hable el saludo completo.

### 3. Solución al Solapamiento (VoiceOver/TalkBack vs Voz IA)
- **Problema:** El lector nativo del dispositivo y la voz sintética hablaban al mismo tiempo repitiendo lo mismo.
- **Solución:** Se desactivó la función nunciar(texto) que alimentaba la etiqueta ria-live. Ahora, la voz sintética (TTS) tiene el control exclusivo, dejando al lector de pantalla 100% en silencio después del primer toque.

### 4. Hack de Persistencia de Micrófono (iOS Safari)
- **Problema:** Safari bloqueaba programáticamente la activación del reconocimiento de voz (SpeechRecognition.start()) al no provenir de un toque directo e inmediato en la pantalla.
- **Solución:** Se inyectó un _stream_ persistente oculto usando getUserMedia al hacer el primer toque post-audio. Mantener viva la 'píldora roja' del micrófono en iOS engaña a Safari, relajando sus reglas de seguridad y permitiendo que la voz IA inicie la escucha automáticamente al terminar cada pregunta, igual que en Android.

### 5. Parche Samsung y Bug de Cancelación TTS
- **Problema:** Dispositivos Samsung ignoraban el evento 	ouchstart si se usaba preventDefault(). Además, hacer TTS.cancel() bloqueaba motores en iOS/Samsung de forma irreversible.
- **Solución:** Se migró al evento click puro y se deshabilitó el TTS.cancel() y el autoplay engañoso en móviles.
