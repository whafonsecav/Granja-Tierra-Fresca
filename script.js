/* =========================================================================
   Granja Tierra Fresca — experiencia 100 % sonora

   La pantalla esta vacia a proposito. Toda la interaccion ocurre por voz.

   MAQUINA DE ESTADOS
   ------------------
     ESPERA_GESTO      El navegador exige un gesto antes de sonar. La pantalla
                       entera es la superficie de arranque y tiene el foco, asi
                       que el lector de pantalla lee la instruccion sola.
     REPRODUCIENDO     Suena el audio ASMR.
     PREGUNTA_REPETIR  "Quieres escuchar el mensaje otra vez?"  ->  si / no
     PREGUNTA_CONTACTO "Quieres contactar a Tierra Fresca?"  ->  si / no
     CAPTURA_NUMERO    Dicta el celular completo, de corrido.
     CONFIRMA_NUMERO   Se le repite el numero digito por digito.  ->  si / no
     PREGUNTA_PDF      "Quieres descargar la propuesta en PDF?"  ->  si / no
     FIN               Despedida.

   CUATRO REGLAS QUE SOSTIENEN TODO EL ARCHIVO
   -------------------------------------------
   1. La voz y el microfono NUNCA estan encendidos a la vez. Si lo estuvieran,
      la pagina se oiria a si misma. Cada turno es: apagar microfono, hablar,
      esperar el onend, encender microfono.

   2. Durante el dictado del celular la pagina NO interrumpe. El microfono se
      queda abierto de principio a fin. Repetir cada digito obligaba a apagar
      y encender el microfono entre numero y numero, y eso partia en pedazos
      cualquier numero dicho de corrido. Se confirma una sola vez, al final.

   3. Todo comando de voz tiene gemelo por teclado. SpeechRecognition no existe
      en Firefox y el permiso de microfono se puede negar. Como en pantalla no
      hay botones, el respaldo es el teclado: S para si, N para no, las teclas
      numericas para el celular.

   4. Si no hay voz espanola instalada, la pagina no sintetiza. Una voz inglesa
      leyendo espanol se entiende peor que el silencio. En ese caso el mensaje
      viaja por la region aria-live y lo narra el lector de pantalla del propio
      usuario, que si esta en espanol.
   ========================================================================= */

(function () {
  "use strict";

  /* =====================================================================
     CONFIGURACION
     ===================================================================== */

  // Segundo en blanco antes de cada frase.
  //
  // No es un capricho de ritmo: la salida de audio del sistema se duerme
  // cuando lleva un rato en silencio, y al despertar se come los primeros
  // 200 a 400 milisegundos de la frase. Por eso se le manda primero un
  // silencio real por WebAudio (para despertar el dispositivo) y solo
  // despues se habla. El usuario oye la frase completa, desde la primera
  // silaba.
  var SILENCIO_INICIAL_MS = 1000;

  // Cierre de la conversacion. La campana termina registrando el numero y
  // avisando que un aliado se comunica: no salta a WhatsApp.
  //
  // Si algun dia se quiere volver al cierre por WhatsApp, poner esto en true
  // y llenar NUMERO_WHATSAPP. Es la unica forma de que el numero dictado no
  // se pierda: GitHub Pages sirve archivos, no puede guardar datos.
  var ABRIR_WHATSAPP_AL_CONFIRMAR = false;
  var NUMERO_WHATSAPP = "573001234567";
  var MENSAJE_WHATSAPP =
    "Hola, soy Carlos y recibí tu correo, me gustaría participar en la " +
    "campaña de su granja de tomates para guiso. Esperamos podamos hablar " +
    "por este medio para coordinar todo.";

  // A donde se manda el numero para quedar registrado.
  //
  // Una pagina estatica NO puede escribir en GitHub por si sola: haria falta
  // un token de escritura dentro de este archivo, que en un repositorio
  // publico queda a la vista de cualquiera. GitHub ademas detecta los tokens
  // filtrados y los revoca solo, asi que ni siquiera duraria.
  //
  // Por eso el registro pasa por un intermediario que guarda el token del
  // lado del servidor. En tools/registro-apps-script.gs esta el codigo listo
  // para pegar, y en el README el paso a paso para desplegarlo.
  //
  // Mientras esto este vacio, el numero se guarda unicamente en el navegador
  // del usuario. No se pierde, pero tampoco le llega a la granja.
  var ENDPOINT_REGISTRO =
    "https://script.google.com/macros/s/AKfycbxFqFEXw0ZI7rv9d-eOJbSiLWLF3ATxZbGpsCk0KiXroUSGDi3oJgH0GalBz-ZLt9fn/exec";

  var DIGITOS_CELULAR = 10;   // Colombia: 10 digitos
  var MINIMO_DIGITOS  = 7;

  // Silencio tras el cual se da por terminado el dictado del numero, si ya
  // hay digitos suficientes. Es lo que permite decir el celular de corrido
  // sin tener que anunciar que uno termino.
  var PAUSA_FIN_DICTADO_MS = 4500;

  /* =====================================================================
     Elementos y capacidades del navegador
     ===================================================================== */

  var audio     = document.getElementById("audio");
  var arranque  = document.getElementById("arranque");
  var anuncio   = document.getElementById("anuncio");
  var enlacePdf = document.getElementById("descarga");

  var SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  var TTS = window.speechSynthesis || null;

  var reconocimiento   = null;
  var queremosEscuchar = false;
  var alEscuchar       = null;   // que hacer con lo que se oiga, segun el estado
  var yaDescargado     = false;
  var yaArranco        = false;
  var estado           = "ESPERA_GESTO";
  var digitos          = [];
  var reintentos       = 0;
  var relojDictado     = null;

  function esMovil() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
      return navigator.userAgentData.mobile;
    }
    return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || "");
  }

  /* =====================================================================
     Canal de respaldo: la region aria-live
     ===================================================================== */

  function anunciar(texto) {
    // Vaciar y volver a escribir obliga a NVDA y a VoiceOver a releer un
    // texto aunque sea identico al anterior.
    anuncio.textContent = "";
    window.setTimeout(function () { anuncio.textContent = texto; }, 60);
  }

  /* =====================================================================
     Despertar la salida de audio
     ===================================================================== */

  var contexto = null;

  // Reproduce un silencio real por WebAudio para que el dispositivo de salida
  // este despierto cuando entre la voz.
  //
  // El buffer no es silencio absoluto sino una amplitud minima e inaudible:
  // algunos controladores de audio detectan el silencio puro y apagan el
  // canal igual, que es justo lo que se quiere evitar.
  function despertarSalida() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return; }
      if (!contexto) { contexto = new AC(); }
      if (contexto.state === "suspended") { contexto.resume(); }

      var muestras = Math.ceil(contexto.sampleRate * (SILENCIO_INICIAL_MS / 1000));
      var buffer = contexto.createBuffer(1, muestras, contexto.sampleRate);
      var datos = buffer.getChannelData(0);
      var i;
      for (i = 0; i < muestras; i++) {
        datos[i] = (i % 2 ? 1 : -1) * 0.0001;   // inaudible, pero no es cero
      }

      var fuente = contexto.createBufferSource();
      fuente.buffer = buffer;
      fuente.connect(contexto.destination);
      fuente.start();
    } catch (e) { /* sin efecto: se pierde el respiro, no la frase */ }
  }

  /* =====================================================================
     Mantener la pantalla encendida
     ===================================================================== */

  var bloqueoPantalla = null;

  // Durante el minuto y medio de audio nadie toca el telefono, asi que el
  // sistema lo da por inactivo y apaga la pantalla. Cuando eso pasa, el audio
  // se pausa o la sesion de reconocimiento se cae, y el usuario se encuentra
  // la experiencia rota sin haber hecho nada mal.
  //
  // La Screen Wake Lock API lo impide. Necesita HTTPS y que la pagina este
  // visible, dos condiciones que aqui se cumplen. En navegadores que no la
  // tengan (iOS anterior a 16.4) no hay alternativa razonable, y simplemente
  // no se bloquea nada: la pagina sigue funcionando igual.
  function mantenerPantallaEncendida() {
    if (bloqueoPantalla) { return; }
    if (!navigator.wakeLock || typeof navigator.wakeLock.request !== "function") {
      return;
    }
    try {
      navigator.wakeLock.request("screen").then(function (b) {
        bloqueoPantalla = b;
        b.addEventListener("release", function () { bloqueoPantalla = null; });
      })["catch"](function () { bloqueoPantalla = null; });
    } catch (e) { bloqueoPantalla = null; }
  }

  function soltarPantalla() {
    if (!bloqueoPantalla) { return; }
    try { bloqueoPantalla.release(); } catch (e) { /* ya estaba suelto */ }
    bloqueoPantalla = null;
  }

  // El sistema suelta el bloqueo solo en cuanto la pestana pasa a segundo
  // plano. Al volver hay que volver a pedirlo, o la pantalla se apagaria en
  // el resto de la sesion.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && yaArranco) {
      mantenerPantallaEncendida();
    }
  });

  /* =====================================================================
     Voz de la pagina
     ===================================================================== */

  // Se puntua cada voz para quedarse con la mas humana de las que hablen
  // espanol. Las voces neuronales ("Natural", "Neural") y las que se sintetizan
  // en servidor ("Online", las de Google) suenan muchisimo mas naturales que
  // las locales clasicas de Windows, que arrastran la cadencia metalica de
  // SAPI. Una voz que no hable espanol queda descartada de entrada.
  function puntuarVoz(v) {
    var lang = v.lang || "";
    var nombre = v.name || "";
    var p;

    if (/^es[-_]?(CO|MX|US|AR|CL|PE|419)/i.test(lang)) { p = 40; }      // espanol de America
    else if (/^es($|[-_])/i.test(lang)) { p = 25; }                     // cualquier espanol
    else if (/spanish|espanol|español/i.test(nombre)) { p = 10; }       // el motor reporta mal el idioma
    else { return -1; }

    if (/natural|neural/i.test(nombre)) { p += 30; }
    if (/^google/i.test(nombre)) { p += 20; }
    if (/online/i.test(nombre)) { p += 15; }
    if (v.localService === false) { p += 10; }

    return p;
  }

  function vozEspanol() {
    if (!TTS) { return null; }
    var voces = TTS.getVoices() || [];
    var mejor = null;
    var mejorPuntaje = 0;
    var i, p;
    for (i = 0; i < voces.length; i++) {
      p = puntuarVoz(voces[i]);
      if (p > mejorPuntaje) { mejorPuntaje = p; mejor = voces[i]; }
    }
    return mejor;
  }

  // Chrome devuelve getVoices() vacio en la primera llamada y avisa despues
  // con "voiceschanged". Sin esta espera, la primera frase saldria con la voz
  // por defecto del sistema, que en un Windows en ingles leeria el espanol
  // como si fuera ingles.
  function conVozLista(seguir) {
    if (!TTS) { seguir(null); return; }
    var v = vozEspanol();
    if (v) { seguir(v); return; }

    var resuelto = false;
    function resolver() {
      if (resuelto) { return; }
      resuelto = true;
      if (typeof TTS.removeEventListener === "function") {
        TTS.removeEventListener("voiceschanged", resolver);
      }
      seguir(vozEspanol());
    }
    if (typeof TTS.addEventListener === "function") {
      TTS.addEventListener("voiceschanged", resolver);
    }
    window.setTimeout(resolver, 1500);
  }

  // Estimacion de cuanto tarda en leerse un texto en voz alta. Se usa cuando
  // no hay sintesis y hay que darle margen al lector de pantalla del usuario.
  function tiempoDeLectura(texto) {
    return Math.min(20000, 1400 + texto.length * 58);
  }

  // ---------------------------------------------------------------------
  // Por que hablar() es tan enrevesado: el arranque recortado
  // ---------------------------------------------------------------------
  // Los motores de voz se comen el principio de la primera frase despues de
  // un silencio. No es un solo problema, son tres a la vez, y cada uno se
  // arregla distinto. Por eso hay tres capas:
  //
  //   1. El dispositivo de salida se duerme. Se despierta mandandole un
  //      silencio real por WebAudio antes de hablar (despertarSalida).
  //
  //   2. El motor de voz abre su PROPIO canal de audio, distinto del de
  //      WebAudio, y ese tambien arranca frio. Por eso se dice primero una
  //      frase de calentamiento que solo tiene comas: abre el canal y no
  //      pronuncia nada. El recorte se lo lleva ella.
  //
  //   3. Aun asi puede quedar un recorte de milisegundos. Por eso la frase
  //      real tambien empieza con comas: si algo se pierde, se pierde una
  //      pausa y no la primera silaba de la primera palabra.
  //
  // NO se usa puntuacion como pausa. Es tentador anteponer comas al texto
  // para que el recorte se coma una pausa en vez de una silaba, pero varios
  // motores de voz de celular VERBALIZAN los signos: la pagina termina
  // diciendo "coma, coma, coma" antes de cada frase. Es peor el remedio.
  //
  // El calentamiento se hace con volumen cero, que no puede sonar pase lo
  // que pase, y el despertar del dispositivo lo sigue haciendo WebAudio.

  var latido = null;

  // Chrome deja de hablar a los quince segundos si nadie lo empuja. Un
  // pause/resume periodico mantiene viva la locucion sin alterarla.
  // En movil no se aplica: alli pause() esta roto y produce cortes propios.
  function iniciarLatido() {
    detenerLatido();
    if (esMovil()) { return; }
    latido = window.setInterval(function () {
      if (!TTS || !TTS.speaking) { detenerLatido(); return; }
      try { TTS.pause(); TTS.resume(); } catch (e) { detenerLatido(); }
    }, 9000);
  }

  function detenerLatido() {
    if (latido) { window.clearInterval(latido); latido = null; }
  }

  var vozDesbloqueada = false;

  // iOS y varios Android exigen que la PRIMERA llamada a speak() ocurra dentro
  // del manejador del gesto del usuario, de forma sincrona. Si pasa por un
  // setTimeout, como hace hablar(), el navegador la descarta y el motor de voz
  // queda mudo el resto de la sesion.
  //
  // Por eso, en el instante del primer toque, se dispara una frase a volumen
  // cero sin pasar por ningun temporizador. Solo sirve para desbloquear.
  function desbloquearVoz() {
    if (vozDesbloqueada || !TTS ||
        typeof window.SpeechSynthesisUtterance !== "function") { return; }
    vozDesbloqueada = true;
    try {
      var llave = new window.SpeechSynthesisUtterance(".");
      llave.volume = 0;
      llave.lang = "es-CO";
      TTS.speak(llave);
    } catch (e) { /* sin efecto */ }
  }

  function nuevaFrase(texto, voz) {
    var f = new window.SpeechSynthesisUtterance(texto);
    f.lang = "es-CO";
    f.voice = voz;
    // 0.95 y 1.02: apenas por debajo de la velocidad nominal y apenas por
    // encima del tono neutro. Es lo que menos suena a maquina leyendo.
    f.rate = 0.95;
    f.pitch = 1.02;
    f.volume = 1;
    return f;
  }

  // hablar(texto, despues): apaga el microfono, deja pasar el silencio de
  // arranque, dice el texto en espanol y solo entonces ejecuta "despues". Es
  // el unico punto del archivo donde se sintetiza voz, para que las reglas 1
  // y 2 del encabezado no dependan de acordarse de aplicarlas en cada sitio.
  function hablar(texto, despues) {
    detenerMicrofono();
    anunciar(texto);
    despertarSalida();

    function seguir() { if (despues) { despues(); } }

    if (!TTS || typeof window.SpeechSynthesisUtterance !== "function") {
      // Sin sintesis: el lector de pantalla ya recibio el texto por aria-live.
      window.setTimeout(seguir, SILENCIO_INICIAL_MS + tiempoDeLectura(texto));
      return;
    }

    detenerLatido();
    TTS.cancel();

    conVozLista(function (voz) {
      if (!voz) {
        // Sin voz espanola no se sintetiza. Ver regla 4 del encabezado.
        window.setTimeout(seguir, SILENCIO_INICIAL_MS + tiempoDeLectura(texto));
        return;
      }
      // El silencio de WebAudio esta sonando durante esta espera. Cuando entra
      // la voz, el dispositivo ya esta abierto.
      window.setTimeout(function () { calentarYDecir(texto, voz, seguir); },
                        SILENCIO_INICIAL_MS);
    });
  }

  // Capa 2: frase de calentamiento a volumen cero. Abre el canal del motor de
  // voz sin que se oiga nada, ni siquiera si el motor decidiera verbalizar el
  // punto: con volume 0 no hay sonido posible.
  function calentarYDecir(texto, voz, seguir) {
    var calienta = nuevaFrase(".", voz);
    calienta.volume = 0;

    var arrancado = false;
    function decirDeVerdad() {
      if (arrancado) { return; }
      arrancado = true;
      decirEnVozAlta(texto, voz, seguir);
    }

    calienta.onend = decirDeVerdad;
    calienta.onerror = decirDeVerdad;
    // Si el calentamiento no avisa que termino, se sigue igual: perder el
    // respiro es molesto, quedarse mudo es fatal.
    window.setTimeout(decirDeVerdad, 1600);

    try { TTS.speak(calienta); } catch (e) { decirDeVerdad(); }
  }

  // Capa 3: la frase real, tal cual, sin nada antepuesto.
  function decirEnVozAlta(texto, voz, seguir) {
    var frase = nuevaFrase(texto, voz);

    var listo = false;
    function finalizar() {
      if (listo) { return; }
      listo = true;
      detenerLatido();
      // Respiro corto: si el microfono abre en el mismo instante en que calla
      // la voz, alcanza a capturar la cola de la propia frase.
      window.setTimeout(seguir, 250);
    }

    frase.onend = finalizar;
    frase.onerror = finalizar;
    // Red de seguridad: en algunos Chrome "onend" no dispara si la pestana
    // pierde el foco. Sin esto el flujo quedaria colgado para siempre.
    window.setTimeout(finalizar, tiempoDeLectura(texto) + 6000);

    iniciarLatido();
    try { TTS.speak(frase); } catch (e) { finalizar(); }
  }

  /* =====================================================================
     Oido de la pagina
     ===================================================================== */

  function normalizar(texto) {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var PATRON_SI = /\b(si|sii|sip|claro|correcto|dale|listo|bueno|obvio|exacto|afirmativo|supuesto|hagale|ok|okey|vale|quiero|acepto)\b/;
  var PATRON_NO = /\b(no|nop|nel|negativo|nunca|jamas|tampoco|incorrecto|equivocado)\b/;

  // Devuelve "si", "no" o null. Si la frase contiene ambas cosas, o ninguna,
  // devuelve null: es preferible volver a preguntar que adivinar mal.
  // Cierto si ALGUNA de las transcripciones cumple el patron.
  function algunaCumple(alternativas, patron) {
    var i;
    for (i = 0; i < alternativas.length; i++) {
      if (patron.test(normalizar(alternativas[i]))) { return true; }
    }
    return false;
  }

  function interpretarSiNo(texto) {
    var t = normalizar(texto);
    var si = PATRON_SI.test(t);
    var no = PATRON_NO.test(t);
    if (si && !no) { return "si"; }
    if (no && !si) { return "no"; }
    return null;
  }

  var UNIDADES = {
    cero: "0", zero: "0",
    uno: "1", un: "1", una: "1",
    dos: "2", tres: "3", cuatro: "4", cinco: "5",
    seis: "6", siete: "7", ocho: "8", nueve: "9"
  };

  // Diciendo el celular de corrido, el motor casi nunca devuelve digitos
  // sueltos: agrupa. "tres cero cero" puede volver como "300", y "treinta y
  // uno" como "31". Todo se descompone a digitos sueltos.
  var COMPUESTOS = {
    diez: "10", once: "11", doce: "12", trece: "13", catorce: "14",
    quince: "15", dieciseis: "16", diecisiete: "17", dieciocho: "18",
    diecinueve: "19", veinte: "20", veintiuno: "21", veintidos: "22",
    veintitres: "23", veinticuatro: "24", veinticinco: "25",
    veintiseis: "26", veintisiete: "27", veintiocho: "28",
    veintinueve: "29", treinta: "30", cuarenta: "40", cincuenta: "50",
    sesenta: "60", setenta: "70", ochenta: "80", noventa: "90",
    cien: "100", ciento: "100", doscientos: "200", trescientos: "300",
    cuatrocientos: "400", quinientos: "500", seiscientos: "600",
    setecientos: "700", ochocientos: "800", novecientos: "900",
    mil: "1000"
  };

  function extraerDigitos(texto) {
    var partes = normalizar(texto).split(" ");
    var salida = [];
    var i, j, p, v;
    for (i = 0; i < partes.length; i++) {
      p = partes[i];
      if (!p || p === "y") { continue; }          // "treinta y uno"
      if (/^\d+$/.test(p)) { v = p; }
      else if (UNIDADES.hasOwnProperty(p)) { v = UNIDADES[p]; }
      else if (COMPUESTOS.hasOwnProperty(p)) { v = COMPUESTOS[p]; }
      else { continue; }
      for (j = 0; j < v.length; j++) { salida.push(v.charAt(j)); }
    }
    return salida;
  }

  var PATRON_BORRAR = /\b(borrar|borra|borre|corregir|corrige|empezar de nuevo|eliminar|equivoque|error)\b/;
  // En la confirmacion se admite un tercer comando ademas de si y no: pedir
  // que se lo repitan. Un numero de diez digitos dicho de corrido no siempre
  // se retiene a la primera, y obligar a decir "no" para volver a oirlo
  // significaria borrarlo y dictarlo entero otra vez sin ninguna necesidad.
  // Se busca por RAIZ de la palabra (repit..., repet...) y no por una lista
  // cerrada de formas. La primera version listaba "repitalo" pero no
  // "repitelo", que es como se dice de verdad, y esa unica forma faltante
  // bastaba para que la peticion cayera al sino y terminara guardando el
  // numero. Con la raiz quedan cubiertas repita, repitelo, repitamelo,
  // repiteme, repetir y las demas sin tener que preverlas una por una.
  var PATRON_REPETIR = /\b(repit\w*|repet\w*|vuelv\w* a (decir|leer)|otra vez|de nuevo|nuevamente|no escuche|no oi|no entendi|que dijo|como dijo)\b/;
  var PATRON_LISTO  = /\b(listo|ya|termine|termina|es todo|nada mas|ya esta|fin)\b/;

  // Lee los digitos de a uno, con una pausa mas larga cada tres. De corrido,
  // diez digitos separados solo por comas se vuelven una lista imposible de
  // seguir de oido; agrupados de tres en tres se retienen como un numero.
  function leerDigitos(lista) {
    var grupos = [];
    var i;
    for (i = 0; i < lista.length; i += 3) {
      grupos.push(lista.slice(i, i + 3));
    }
    // Un grupo final de un solo digito suena a error de la maquina ("cuatro,
    // cuatro, tres... tres"). Se absorbe en el grupo anterior, que es como
    // cualquiera dictaria un celular de diez cifras: 315, 888, 4433.
    if (grupos.length > 1 && grupos[grupos.length - 1].length < 2) {
      var ultimo = grupos.pop();
      grupos[grupos.length - 1] = grupos[grupos.length - 1].concat(ultimo);
    }
    var textos = [];
    for (i = 0; i < grupos.length; i++) { textos.push(grupos[i].join(", ")); }
    return textos.join(". ");
  }

  function detenerMicrofono() {
    queremosEscuchar = false;
    if (!reconocimiento) { return; }
    try { reconocimiento.abort(); } catch (e) { /* ya estaba detenido */ }
  }

  // escuchar(manejador): enciende el microfono y entrega cada frase final al
  // manejador, que devuelve true cuando ya proceso la frase. Si el microfono
  // no esta disponible, avisa una sola vez y el teclado queda como unica via.
  function escuchar(manejador) {
    if (estado === "FIN") { return; }
    alEscuchar = manejador;

    if (!SR) { avisarSoloTeclado(); return; }

    try {
      reconocimiento = new SR();
    } catch (e) {
      avisarSoloTeclado();
      return;
    }

    reconocimiento.lang = "es-CO";
    reconocimiento.continuous = true;
    reconocimiento.interimResults = false;
    reconocimiento.maxAlternatives = 3;

    reconocimiento.onresult = function (evento) {
      var i, j, r, alternativas;
      for (i = evento.resultIndex; i < evento.results.length; i++) {
        r = evento.results[i];
        if (!r.isFinal) { continue; }

        // El motor devuelve hasta tres transcripciones de lo mismo. Se le
        // entregan TODAS JUNTAS al manejador, en vez de irlas probando una
        // por una hasta que alguna encaje.
        //
        // La diferencia no es de estilo. Probandolas por separado, bastaba
        // con que una sola alternativa trajera un "si" suelto para que ganara
        // la confirmacion: por eso decir "repitalo" terminaba guardando el
        // numero en vez de repetirlo. Viendolas juntas, el manejador puede
        // decidir con todo a la vista y darle prioridad a lo que importa.
        alternativas = [];
        for (j = 0; j < r.length; j++) { alternativas.push(r[j].transcript); }

        if (alEscuchar && alEscuchar(alternativas) === true) { return; }
      }
    };

    reconocimiento.onerror = function (evento) {
      if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
        queremosEscuchar = false;
        avisarSoloTeclado();
      }
      // "no-speech" y "aborted" son normales: silencio o corte. onend reanuda.
    };

    // Chrome termina la sesion sola tras unos segundos de silencio.
    reconocimiento.onend = function () {
      if (!queremosEscuchar) { return; }
      window.setTimeout(function () {
        if (!queremosEscuchar || !reconocimiento) { return; }
        try { reconocimiento.start(); } catch (e) { /* ya estaba activo */ }
      }, 300);
    };

    queremosEscuchar = true;
    try {
      reconocimiento.start();
    } catch (e) {
      avisarSoloTeclado();
    }
  }

  var yaAvisoTeclado = false;
  function avisarSoloTeclado() {
    if (yaAvisoTeclado) { return; }
    // El error del microfono llega de forma asincrona y puede aparecer cuando
    // la conversacion ya termino. Sin esta guarda, el aviso del teclado le
    // pisaba al usuario el mensaje de cierre, que es el que de verdad
    // importa: el que le dice que su numero quedo registrado.
    if (estado === "FIN") { return; }
    yaAvisoTeclado = true;
    hablar(
      "No puedo usar el micrófono, así que vamos por el teclado. " +
      "Presiona la tecla ese para decir sí, y la tecla ene para decir no. " +
      "Cuando te pida tu celular, márcalo con las teclas de números. " +
      "Y si quieres que te repita el número, presiona la tecla erre."
    );
  }

  /* =====================================================================
     Teclado: gemelo de cada comando de voz
     ===================================================================== */

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) { return; }

    // Antes de arrancar, CUALQUIER tecla inicia la experiencia.
    if (estado === "ESPERA_GESTO") {
      e.preventDefault();
      comenzar();
      return;
    }

    var k = e.key;

    if (estado === "PREGUNTA_REPETIR" || estado === "PREGUNTA_CONTACTO" ||
        estado === "CONFIRMA_NUMERO" || estado === "PREGUNTA_PDF") {
      if (/^[sS]$/.test(k)) { e.preventDefault(); resolverSiNo("si"); }
      else if (/^[nN]$/.test(k)) { e.preventDefault(); resolverSiNo("no"); }
      // Erre de "repítalo": gemelo por teclado del comando de voz que vuelve
      // a leer el numero sin borrarlo. Solo tiene sentido en la confirmacion.
      else if (/^[rR]$/.test(k) && estado === "CONFIRMA_NUMERO") {
        e.preventDefault();
        repetirNumero();
      }
      return;
    }

    if (estado === "CAPTURA_NUMERO") {
      if (/^[0-9]$/.test(k)) { e.preventDefault(); agregarDigitos([k]); }
      else if (k === "Backspace") { e.preventDefault(); reiniciarNumero(); }
      else if (k === "Enter") { e.preventDefault(); cerrarCaptura(); }
    }
  });

  /* =====================================================================
     Descarga automatica del PDF
     ===================================================================== */

  // Se descarga como Blob y no pinchando el .pdf: al pinchar un PDF, Chrome y
  // Edge lo abren en su visor integrado; asi lo guardan como archivo, en la
  // carpeta de descargas predeterminada, sin visor de por medio.
  //
  // Limite que no depende de nosotros: si el usuario tiene activada la opcion
  // "Preguntar donde guardar cada archivo", ninguna pagina puede saltarsela.
  var urlPdf = null;     // el PDF ya bajado a memoria, listo para guardar

  // Se trae el PDF apenas carga la pagina, pero SIN descargarlo. Asi, cuando
  // el usuario diga que si al final, guardarlo es instantaneo y sincrono: no
  // hay que esperar a la red en ese momento, y al ocurrir dentro de la misma
  // pulsacion de tecla el navegador lo trata como una accion del usuario, que
  // es lo que evita que lo bloquee.
  function precargarPdf() {
    if (typeof window.fetch !== "function" || !window.URL || !URL.createObjectURL) {
      return;
    }
    window.fetch(enlacePdf.getAttribute("href"), { cache: "force-cache" })
      .then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        return r.blob();
      })
      .then(function (blob) {
        // octet-stream: con application/pdf algunos navegadores prefieren
        // abrir el archivo en su visor en vez de guardarlo.
        urlPdf = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
      })
      ["catch"](function () { urlPdf = null; });   // queda el enlace directo
  }

  // Guarda el PDF en la carpeta de descargas predeterminada del navegador.
  //
  // Limite que no depende de nosotros: si el usuario tiene activada la opcion
  // "Preguntar donde guardar cada archivo", ninguna pagina puede saltarsela.
  function descargarPdf() {
    if (yaDescargado) { return; }
    yaDescargado = true;

    if (!urlPdf) {
      // La precarga fallo o todavia no termina: se usa el enlace tal cual.
      try { enlacePdf.click(); } catch (e) { yaDescargado = false; }
      return;
    }

    var a = document.createElement("a");
    a.href = urlPdf;
    a.download = enlacePdf.getAttribute("download") || "propuesta.pdf";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revocar de inmediato aborta la descarga en Safari.
    window.setTimeout(function () { URL.revokeObjectURL(urlPdf); urlPdf = null; }, 30000);
  }

  /* =====================================================================
     ESTADO 1 — Espera del gesto
     ===================================================================== */

  // El aviso del microfono va aqui y en ningun otro lado. Antes se decia dos
  // veces, una antes del gesto y otra al tocar, y sonaba a que la pagina se
  // repetia sola.
  var AVISO_PREGUNTAS =
    "Al final te haré unas preguntas muy breves que podrás responder con tu " +
    "micrófono. Cuando el navegador te pida permiso, actívalo.";

  function textoDeArranque() {
    var gesto = esMovil() ? "Toca la pantalla" : "Oprime cualquier tecla";
    return "Tenemos un mensaje especial para ti. " + gesto +
           " para escucharlo. " + AVISO_PREGUNTAS;
  }

  function prepararArranque() {
    var texto = textoDeArranque();
    arranque.setAttribute("aria-label", texto);

    // El foco es lo que hace que el lector de pantalla lea la instruccion
    // sola, sin que el usuario tenga que buscar nada en la pagina.
    arranque.focus();

    // En computador se dice en voz alta de una. En movil NO se intenta
    // siquiera: iOS y Android bloquean la voz antes del primer gesto, y la
    // frase se quedaba en cola hasta que el toque la soltaba, con lo cual el
    // usuario oia la bienvenida DESPUES de haber tocado, encima del mensaje
    // que si correspondia a ese momento. Sonaba a que la pagina se repetia.
    //
    // En movil el aria-label ya lleva el mismo texto para el lector de
    // pantalla, y quien no lo use lo escucha completo en cuanto toca.
    if (!esMovil()) { hablar(texto); }
    else { anunciar(texto); }
  }

  function comenzar() {
    if (yaArranco) { return; }
    yaArranco = true;
    if (TTS) {
      TTS.cancel();
      desbloquearVoz();   // sincrono, dentro del gesto: lo exige iOS
    }

    despertarSalida();
    mantenerPantallaEncendida();

    arranque.setAttribute("aria-label", "Reproduciendo.");
    arranque.blur();

    // En iOS y Android ninguna pagina puede hablar antes del primer toque: la
    // instruccion de arranque solo la oye quien tenga lector de pantalla. Este
    // es el primer instante en que la voz puede sonar, asi que se le dice aqui
    // lo que no se le pudo decir antes. En computador ya lo escucho y seria
    // repetirselo, asi que alli se entra directo.
    if (esMovil()) {
      hablar("Tenemos un mensaje especial para ti. " + AVISO_PREGUNTAS +
             " Aquí va.", reproducir);
      return;
    }

    reproducir();
  }

  arranque.addEventListener("click", function (e) { e.preventDefault(); comenzar(); });
  arranque.addEventListener("touchstart", function (e) { e.preventDefault(); comenzar(); }, { passive: false });

  /* =====================================================================
     ESTADO 2 — Reproduccion
     ===================================================================== */

  function reproducir() {
    estado = "REPRODUCIENDO";
    detenerMicrofono();
    if (TTS) { TTS.cancel(); }
    audio.currentTime = 0;
    var p = audio.play();
    if (p && typeof p["catch"] === "function") {
      p["catch"](function () {
        // El gesto no basto o se perdio: se vuelve a pedir.
        yaArranco = false;
        estado = "ESPERA_GESTO";
        prepararArranque();
      });
    }
  }

  audio.addEventListener("ended", function () { preguntarRepetir(); });

  audio.addEventListener("error", function () {
    hablar(
      "No fue posible cargar el audio, y te pido disculpas. " +
      "De todas formas quisiera saber si quieres contactar a Tierra Fresca.",
      preguntarContacto
    );
  });

  /* =====================================================================
     ESTADO 3 — "Quieres escuchar el mensaje otra vez?"
     ===================================================================== */

  function preguntarRepetir() {
    estado = "PREGUNTA_REPETIR";
    reintentos = 0;
    hablar(
      "¿Quieres escuchar el mensaje otra vez? Responde sí, o no.",
      function () { escuchar(oirSiNo); }
    );
  }

  /* =====================================================================
     ESTADO 4 — "Quieres contactar a Tierra Fresca?"
     ===================================================================== */

  function preguntarContacto() {
    estado = "PREGUNTA_CONTACTO";
    reintentos = 0;
    hablar(
      "¿Quieres contactar a Tierra Fresca? Responde sí, o no.",
      function () { escuchar(oirSiNo); }
    );
  }

  // Manejador compartido por los estados de pregunta cerrada.
  //
  // Si dos transcripciones de la misma frase se contradicen, una diciendo si y
  // otra diciendo no, no se elige ninguna: se vuelve a preguntar. Adivinar
  // aqui significaria registrar un numero que el usuario no confirmo.
  function oirSiNo(alternativas) {
    var enConfirmacion = (estado === "CONFIRMA_NUMERO");
    var i, v, r = null;

    for (i = 0; i < alternativas.length; i++) {
      v = interpretarSiNo(alternativas[i]);
      if (!v) { continue; }
      if (r && r !== v) { r = null; break; }   // se contradicen entre si
      r = v;
    }

    if (!r) {
      reintentos++;
      if (reintentos >= 3) {
        // Tres intentos fallidos: seguir insistiendo seria maltratarlo.
        reintentos = 0;
        hablar(
          "No logro entenderte, y la culpa es mía, no tuya. " +
          "Si estás en un computador, presiona la tecla ese para sí, " +
          "o la tecla ene para no.",
          function () { escuchar(enConfirmacion ? oirConfirmacion : oirSiNo); }
        );
      }
      return false;
    }
    resolverSiNo(r);
    return true;
  }

  function resolverSiNo(r) {
    detenerMicrofono();
    reintentos = 0;

    if (estado === "PREGUNTA_REPETIR") {
      if (r === "si") { hablar("Con mucho gusto. Aquí va otra vez.", reproducir); }
      else { preguntarContacto(); }
      return;
    }

    if (estado === "PREGUNTA_CONTACTO") {
      if (r === "si") { pedirNumero(); }
      else { despedirse(); }
      return;
    }

    if (estado === "PREGUNTA_PDF") {
      terminar(r === "si");
      return;
    }

    if (estado === "CONFIRMA_NUMERO") {
      if (r === "si") { registrar(); }
      else {
        // "No" borra el numero entero. Se dice que se borro y se vuelve a
        // pedir en la MISMA frase: encadenar dos locuciones dejaria al
        // usuario varios segundos en silencio sin saber si hablar o esperar.
        pedirNumero("Borrado.");
      }
    }
  }

  /* =====================================================================
     ESTADO 5 — Captura del celular, completo y de corrido
     ===================================================================== */

  // El preludio es opcional. Sin el, se da la explicacion completa, que solo
  // hace falta la primera vez. Con el, se dice que paso y se vuelve a pedir el
  // numero en la MISMA frase: encadenar dos locuciones ("lo borre" y despues
  // "digame el numero") deja al usuario varios segundos en silencio sin saber
  // si tiene que hablar o esperar.
  function pedirNumero(preludio) {
    estado = "CAPTURA_NUMERO";
    digitos = [];
    reintentos = 0;

    var texto = preludio
      ? preludio + " Dime tu número de celular completo otra vez, por favor."
      : "Qué alegría. Dime tu número de celular completo, de corrido y " +
        "con calma. Yo te lo repito al final para que me confirmes que " +
        "quedó bien.";

    hablar(texto, function () {
      escuchar(oirNumero);
      esperarFinDelDictado();
    });
  }

  // No se interrumpe al usuario mientras dicta: el microfono queda abierto de
  // principio a fin. Ver regla 2 del encabezado.
  function oirNumero(alternativas) {
    if (algunaCumple(alternativas, PATRON_BORRAR)) { reiniciarNumero(); return true; }

    // Se toma la primera transcripcion que traiga digitos. Las alternativas
    // del motor suelen coincidir en los numeros aunque difieran en el resto.
    var i, nuevos;
    for (i = 0; i < alternativas.length; i++) {
      nuevos = extraerDigitos(alternativas[i]);
      if (nuevos.length) { agregarDigitos(nuevos); return true; }
    }

    if (algunaCumple(alternativas, PATRON_LISTO)) { cerrarCaptura(); return true; }
    return false;
  }

  function agregarDigitos(nuevos) {
    var i;
    for (i = 0; i < nuevos.length && digitos.length < DIGITOS_CELULAR; i++) {
      digitos.push(nuevos[i]);
    }

    if (digitos.length >= DIGITOS_CELULAR) { cerrarCaptura(); return; }

    // Todavia faltan numeros: se reinicia la cuenta de silencio y se sigue
    // escuchando, sin decir nada.
    esperarFinDelDictado();
  }

  // Si el usuario deja de hablar y ya hay digitos suficientes, se da el
  // dictado por terminado. Es lo que permite decir el celular de corrido sin
  // tener que anunciar que uno acabo.
  function esperarFinDelDictado() {
    window.clearTimeout(relojDictado);
    relojDictado = window.setTimeout(function () {
      if (estado === "CAPTURA_NUMERO" && digitos.length >= MINIMO_DIGITOS) {
        cerrarCaptura();
      }
    }, PAUSA_FIN_DICTADO_MS);
  }

  function reiniciarNumero() {
    window.clearTimeout(relojDictado);
    pedirNumero("Borrado.");
  }

  function cerrarCaptura() {
    window.clearTimeout(relojDictado);
    detenerMicrofono();
    if (digitos.length < MINIMO_DIGITOS) {
      pedirNumero("Me faltaron números.");
      return;
    }
    confirmarNumero();
  }

  /* =====================================================================
     ESTADO 6 — Confirmacion del numero
     ===================================================================== */

  function confirmarNumero() {
    estado = "CONFIRMA_NUMERO";
    reintentos = 0;
    hablar(
      "El número que entendí es: " + leerDigitos(digitos) + ". " +
      "Si está correcto, di sí. Si está mal, di no, y lo tomamos otra vez. " +
      "Y si prefieres que te lo repita, dime: repítelo.",
      function () { escuchar(oirConfirmacion); }
    );
  }

  // Manejador propio de la confirmacion.
  //
  // Pedir que se repita se evalua PRIMERO y sobre TODAS las transcripciones,
  // y gana aunque alguna traiga tambien un si o un no. La razon es de riesgo,
  // no de gramatica: repetir es reversible y no cuesta nada, mientras que
  // confirmar registra el numero y borrar lo pierde entero. Ante la duda,
  // conviene equivocarse hacia el lado que no rompe nada.
  function oirConfirmacion(alternativas) {
    if (algunaCumple(alternativas, PATRON_REPETIR)) {
      repetirNumero();
      return true;
    }
    return oirSiNo(alternativas);
  }

  // Vuelve a leer el numero sin tocarlo y sin salir del estado.
  function repetirNumero() {
    detenerMicrofono();
    reintentos = 0;
    hablar(
      "Claro. Escúchalo otra vez: " + leerDigitos(digitos) + ". " +
      "¿Está correcto? Di sí, o no.",
      function () { escuchar(oirConfirmacion); }
    );
  }

  /* =====================================================================
     ESTADO 7 — Registro y cierre
     ===================================================================== */

  // Guarda el numero en el navegador del usuario. Es la copia que nunca
  // falla: no depende de la red, ni de que el intermediario este bien
  // configurado. Sirve para recuperar un registro si el envio se cayo.
  // Se puede leer desde la consola con:
  //     JSON.parse(localStorage.getItem("tierrafresca.registros"))
  function guardarLocalmente(registro) {
    try {
      var previos = JSON.parse(localStorage.getItem("tierrafresca.registros") || "[]");
      if (!(previos instanceof Array)) { previos = []; }
      previos.push(registro);
      localStorage.setItem("tierrafresca.registros", JSON.stringify(previos));
    } catch (e) { /* modo incognito o almacenamiento lleno: no es critico */ }
  }

  // Manda el numero al intermediario, que lo escribe en la hoja de calculo y
  // en registros.json del repositorio. Ver tools/registro-apps-script.gs.
  //
  // Va en modo no-cors porque una aplicacion web de Apps Script no devuelve
  // cabeceras CORS: la peticion sale, pero el navegador no deja leer la
  // respuesta. Por eso no se puede confirmar la entrega desde aqui, y por eso
  // la copia en localStorage no es opcional.
  function enviarRegistro(registro) {
    if (!ENDPOINT_REGISTRO) { return; }
    if (typeof window.fetch !== "function") { return; }
    try {
      window.fetch(ENDPOINT_REGISTRO, {
        method: "POST",
        mode: "no-cors",
        // text/plain es uno de los pocos tipos que no-cors permite sin
        // disparar una peticion de verificacion previa. Apps Script lee el
        // cuerpo igual y lo interpreta como JSON.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(registro)
      })["catch"](function () { /* queda la copia local */ });
    } catch (e) { /* queda la copia local */ }
  }


  function registrar() {
    estado = "FIN";
    window.clearTimeout(relojDictado);
    detenerMicrofono();

    var registro = {
      numero: digitos.join(""),
      fecha: new Date().toISOString(),
      dispositivo: esMovil() ? "movil" : "escritorio",
      origen: window.location.href
    };
    guardarLocalmente(registro);
    enviarRegistro(registro);

    if (ABRIR_WHATSAPP_AL_CONFIRMAR && /^\d{10,15}$/.test(NUMERO_WHATSAPP)) {
      var url = "https://wa.me/" + NUMERO_WHATSAPP +
                "?text=" + encodeURIComponent(MENSAJE_WHATSAPP);
      hablar(
        "Perfecto. Te voy a abrir WhatsApp con el mensaje ya escrito, " +
        "para que solo tengas que pulsar enviar.",
        function () { window.location.href = url; }
      );
      window.setTimeout(function () { window.location.href = url; }, 9000);
      return;
    }

    hablar(
      "Listo. Tu número ya quedó registrado. " +
      "Uno de nuestros aliados se va a comunicar contigo para coordinar " +
      "tu envío.",
      preguntarPdf
    );
  }

  function despedirse() {
    window.clearTimeout(relojDictado);
    detenerMicrofono();
    hablar(
      "Con mucho gusto. Gracias por darnos un rato de tu tiempo y de tu atención.",
      preguntarPdf
    );
  }

  /* =====================================================================
     ESTADO 8 — La propuesta en PDF, al final y solo si la quiere
     ===================================================================== */

  // La descarga va aqui, de ultimas, y nunca al abrir la pagina. En un celular
  // el gestor de descargas se toma la pantalla apenas empieza a bajar el
  // archivo: si eso pasa al principio, la pagina se queda muda justo cuando
  // iba a hablar y el usuario no entiende que ocurrio. Al final ya no
  // interrumpe nada, porque no queda nada por decir.
  function preguntarPdf() {
    estado = "PREGUNTA_PDF";
    reintentos = 0;
    hablar(
      "Una última cosa. ¿Quieres descargar nuestra propuesta? " +
      "Es un solo párrafo, de diez líneas, escrito para que tu lector de " +
      "pantalla te lo lea de corrido. Responde sí, o no.",
      function () { escuchar(oirSiNo); }
    );
  }

  function terminar(conPdf) {
    estado = "FIN";
    detenerMicrofono();

    if (conPdf) {
      // Se descarga antes de hablar: asi ocurre dentro de la misma pulsacion
      // de tecla cuando la respuesta vino del teclado, y el navegador la trata
      // como una accion del usuario en vez de bloquearla.
      descargarPdf();
      hablar(
        "Listo, ya lo tienes en tu carpeta de descargas. " +
        "Que ese guiso te quede como en casa. Hasta pronto."
      );
      return;
    }

    hablar(
      "Perfecto, te lo dejo así. " +
      "Que ese guiso te quede como en casa. Hasta pronto."
    );
  }

  /* =====================================================================
     Arranque
     ===================================================================== */

  // La descarga NO se dispara aqui. En un celular, el gestor de descargas se
  // toma la pantalla apenas empieza a bajar el archivo, y la pagina se queda
  // muda justo cuando iba a hablar: el usuario no entiende que esta pasando.
  // El PDF se ofrece al final, cuando la conversacion ya termino y que el
  // sistema tome el control no le quita nada a nadie.
  precargarPdf();
  if (TTS && typeof TTS.getVoices === "function") { TTS.getVoices(); }
  prepararArranque();

  // Por si el foco se pierde antes del gesto: el lector de pantalla necesita
  // que el elemento este enfocado para leer su etiqueta.
  window.addEventListener("load", function () {
    if (estado === "ESPERA_GESTO") { arranque.focus(); }
  });

  window.addEventListener("pagehide", function () {
    detenerMicrofono();
    soltarPantalla();
  });
})();
