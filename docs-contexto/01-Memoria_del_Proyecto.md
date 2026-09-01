# Memoria del Proyecto: Granja Tierra Fresca

## Objetivo del Proyecto
Crear una experiencia sonora web de dos minutos (enfocada en el tomate de guiso) diseñada **exclusivamente para personas ciegas o con discapacidad visual**.
La interfaz visual es nula (solo un fondo desenfocado), y la interacción es **100% conversacional y táctil** usando la Web Speech API (Síntesis y Reconocimiento de voz).

## Flujo de la Experiencia
1. **Inicio:** El usuario abre la web. Un texto en pantalla y su lector de pantalla (TalkBack/VoiceOver) le indican que toque la pantalla (o presione una tecla en PC) para iniciar.
2. **Bienvenida (Voz IA):** La IA saluda, da contexto y pide permisos implícitos.
3. **El Audio Principal:** Reproduce un audio .mp3 inmersivo de 2 minutos sobre la granja.
4. **Interacción y Permisos:** Al terminar el MP3 (y tras un toque extra en iOS para asegurar permisos), la IA pregunta si quiere repetir el audio.
5. **Captura de Datos:** Si no repite, pide el número de celular del usuario (validación estricta de 10 dígitos sin reglas de prefijo). Confirma el número.
6. **Descarga de PDF:** Ofrece descargar un PDF (optimizado para lectores de pantalla) con la propuesta comercial.
7. **Despedida:** Termina la experiencia.

## Consideraciones Críticas
- **Accesibilidad Total:** No hay botones visuales. Toda la pantalla es un único gran botón (#arranque).
- **Control de Lector de Pantalla:** Se evitó a toda costa el uso de etiquetas aria-live simultáneas con el motor de texto a voz (TTS) para evitar que ambas voces se solapen.
- **Autonomía:** En celulares y PC, NADA se reproduce solo para evitar chocar con políticas de los navegadores y el SO. Requiere un clic explícito garantizando fluidez.
