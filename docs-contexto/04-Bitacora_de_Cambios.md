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

### 6. Loop de Micrófono y Caída Grácil (Fallback Sin Micrófono)
- **Problema:** En Android y PC, el hack de persistencia de iOS (getUserMedia) bloqueaba el motor de reconocimiento (SpeechRecognition), causando que el micrófono no recibiera audio y entrara en un loop infinito de 'no te entendí'. Además, el comportamiento alternativo cuando el micrófono estaba apagado o denegado, pedía a los usuarios usar las teclas del teclado para responder sí/no o dictar números, lo cual era engorroso y confuso.
- **Solución:** Se limitó estrictamente el uso de getUserMedia a esIOS(). Adicionalmente, se rehizo completamente la lógica de caída (fallback). Si el micrófono falla o no tiene permisos, la IA ahora pide tocar la pantalla (o presionar cualquier tecla) en un lapso de 5 segundos si se desea repetir el audio. Si el usuario no interactúa, se asume un 'no', se despide educadamente y finaliza la experiencia sin pedir el número telefónico (dado que no hay micrófono para dictarlo).

## Ajustes de Sincronización y Voz (Última Sesión)

### 7. Inyección de Favicon Visual
- **Cambio:** Se integró el recurso gráfico (avicon.png) correspondiente a la campaña del tomate con gafas, inyectándolo en las etiquetas <head> del HTML (el="icon" y el="apple-touch-icon") para mejorar la presentación en pestañas de los navegadores y accesos directos de pantalla de inicio.

### 8. Optimización del Ritmo de Voz (Pacing) entre Actos
- **Problema:** Había un retraso de más de 1.8 segundos de silencio antinatural entre locuciones seguidas (ej. la transición del final del Acto 3 al arranque del Acto 4).
- **Solución:** Se ajustó la función decirEnVozAlta para que registrara el Timestamp ultimaVezQueHablo exactamente al *finalizar* la reproducción de la cadena de trozos (mediante el evento de término de la caja TTS), en vez del inicio. Esto le permitió al motor detectar ráfagas de locuciones consecutivas de forma precisa, reduciendo el retraso de hardware forzado de >1.5s a unos ágiles ~400ms.

### 9. Bypass de Corte y Despertador SAPI para Windows
- **Problema:** En Desktop (Chrome y Edge), el "Audio Fantasma" que había funcionado tan bien en móvil fallaba catastróficamente por dos motivos: Chrome de PC lo cancelaba prematuramente creyendo optimizar colas; y SAPI forzaba su propia sesión de audio.
- **Solución:** Tras iterar un parche complejo mediante Web Audio API que tampoco venció el aislamiento del SO de Windows, la arquitectura final implementada fue: Bypasear por completo el particionado de sentencias para Edge de Escritorio, e inyectar explícita y transparentemente la cadena "Ok. " (conArranqueDesechable) como palabra de sacrificio nativa de texto. Esto selló definitivamente el hueco que carcomía el inicio de las frases.

### 10. Flujo Completo y Unificado para Rutas Negativas
- **Cambio:** Se actualizó la máquina de estados en script.js (específicamente la fase PREGUNTA_CONTACTO). Cuando un usuario rechaza dejar su número (respondiendo "No" en el Acto 2), en vez de cerrar o quedarse esperando el dictado del número inútilmente, el flujo salta grácilmente de forma directa al Acto 4 (preguntarPdf()), manteniendo la naturalidad de la conversación.
