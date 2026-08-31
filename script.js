/* =========================================================================
   Granja Tierra Fresca — experiencia 100 % sonora

   La pantalla esta vacia a proposito. Toda la interaccion ocurre por voz.

   MAQUINA DE ESTADOS
   ------------------
     ESPERA_GESTO      El navegador exige un gesto antes de sonar. La pantalla
                       entera es la superficie de arranque y tiene el foco, asi
                       que el lector de pantalla lee la instruccion sola.
     REPRODUCIENDO     Suena el audio ASMR de un minuto.
     PREGUNTA_REPETIR  "Desea reproducir nuevamente?"  ->  si / no
     PREGUNTA_CONTACTO "Desea contactar a Tierra Fresca?"  ->  si / no
     CAPTURA_NUMERO    Dicta el celular, un digito a la vez.
     CONFIRMA_NUMERO   Se le repite el numero completo.  ->  si / no
     FIN               Despedida.

   TRES REGLAS QUE SOSTIENEN TODO EL ARCHIVO
   -----------------------------------------
   1. La voz y el microfono NUNCA estan encendidos a la vez. Si lo estuvieran,
      la pagina se oiria a si misma: al repetir el digito "tres" lo volveria a
      capturar como un tres nuevo. Cada pregunta es: apagar microfono, hablar,
      esperar el onend, encender microfono.

   2. Todo comando de voz tiene gemelo por teclado. SpeechRecognition no existe
      en Firefox y el permiso de microfono se puede negar. Como en pantalla no
      hay botones, el respaldo es el teclado: S para si, N para no, las teclas
      numericas para el celular.

   3. Si no hay voz espanola instalada, la pagina no sintetiza. Una voz inglesa
      leyendo espanol se entiende peor que el silencio. En ese caso el mensaje
      viaja por la region aria-live y lo narra el lector de pantalla del propio
      usuario, que si esta en espanol.
   ========================================================================= */

(function () {
  "use strict";

  /* =====================================================================
     CONFIGURACION
     ===================================================================== */

  // Numero de WhatsApp de la granja: indicativo de pais + numero, solo
  // digitos. Colombia es 57. Ejemplo: "573001234567".
  var NUMERO_WHATSAPP = "573001234567";

  var MENSAJE_WHATSAPP =
    "Hola, soy Carlos y recibí tu correo, me gustaría participar en la " +
    "campaña de su granja de tomates para guiso. Esperamos podamos hablar " +
    "por este medio para coordinar todo.";

  // Al confirmar el celular, la pagina abre WhatsApp para que la conversacion
  // quede iniciada de verdad. Se puede apagar: en ese caso solo agradece.
  // Sin servidor propio, esta es la unica forma de que el numero dictado no
  // se pierda: GitHub Pages sirve archivos, no puede guardar datos.
  var ABRIR_WHATSAPP_AL_CONFIRMAR = true;

  var DIGITOS_CELULAR = 10;   // Colombia: 10 digitos

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
     Voz de la pagina
     ===================================================================== */

  // Se busca voz espanola en tres rondas, de la mas deseable a la mas
  // tolerante: espanol de America, cualquier espanol, y por nombre de voz.
  function vozEspanol() {
    if (!TTS) { return null; }
    var voces = TTS.getVoices() || [];
    var i, n;
    for (i = 0; i < voces.length; i++) {
      if (/^es[-_]?(CO|MX|US|AR|CL|PE|419)/i.test(voces[i].lang)) { return voces[i]; }
    }
    for (i = 0; i < voces.length; i++) {
      if (/^es($|[-_])/i.test(voces[i].lang)) { return voces[i]; }
    }
    for (i = 0; i < voces.length; i++) {
      n = voces[i].name || "";
      if (/spanish|espanol|español|helena|sabina|laura|jorge|monica|mónica|paulina|raul|raúl|diego|elvira/i.test(n)) {
        return voces[i];
      }
    }
    return null;
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

  // hablar(texto, despues): apaga el microfono, dice el texto en espanol y
  // solo entonces ejecuta "despues". Es el unico punto del archivo donde se
  // sintetiza voz, para que la regla de no solaparse con el microfono no
  // dependa de acordarse de aplicarla en cada sitio.
  function hablar(texto, despues) {
    detenerMicrofono();
    anunciar(texto);

    function seguir() { if (despues) { despues(); } }

    if (!TTS || typeof window.SpeechSynthesisUtterance !== "function") {
      // Sin sintesis: el lector de pantalla ya recibio el texto por aria-live.
      window.setTimeout(seguir, tiempoDeLectura(texto));
      return;
    }

    TTS.cancel();

    conVozLista(function (voz) {
      if (!voz) {
        // Sin voz espanola no se sintetiza. Ver regla 3 del encabezado.
        window.setTimeout(seguir, tiempoDeLectura(texto));
        return;
      }

      var frase = new window.SpeechSynthesisUtterance(texto);
      frase.lang = "es-CO";
      frase.rate = 0.96;
      frase.pitch = 1;
      frase.voice = voz;

      var listo = false;
      function finalizar() {
        if (listo) { return; }
        listo = true;
        // Respiro corto: si el microfono abre en el mismo instante en que
        // calla la voz, alcanza a capturar la cola de la propia frase.
        window.setTimeout(seguir, 250);
      }
      frase.onend = finalizar;
      frase.onerror = finalizar;
      // Red de seguridad: en algunos Chrome "onend" no dispara si la pestana
      // pierde el foco. Sin esto el flujo quedaria colgado para siempre.
      window.setTimeout(finalizar, tiempoDeLectura(texto) + 4000);

      TTS.speak(frase);
    });
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
  var PATRON_NO = /\b(no|nop|nel|negativo|nunca|jamas|tampoco)\b/;

  // Devuelve "si", "no" o null. Si la frase contiene ambas cosas, o ninguna,
  // devuelve null: es preferible volver a preguntar que adivinar mal y saltar
  // a WhatsApp sin que el usuario lo haya pedido.
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

  // El motor a veces agrupa: "tres uno cinco" puede volver como "315", y
  // "treinta" como palabra. Se descompone todo a digitos sueltos.
  var COMPUESTOS = {
    diez: "10", once: "11", doce: "12", trece: "13", catorce: "14",
    quince: "15", dieciseis: "16", diecisiete: "17", dieciocho: "18",
    diecinueve: "19", veinte: "20", veintiuno: "21", veintidos: "22",
    veintitres: "23", veinticuatro: "24", veinticinco: "25",
    veintiseis: "26", veintisiete: "27", veintiocho: "28",
    veintinueve: "29", treinta: "30", cuarenta: "40", cincuenta: "50",
    sesenta: "60", setenta: "70", ochenta: "80", noventa: "90",
    cien: "100", ciento: "100"
  };

  function extraerDigitos(texto) {
    var partes = normalizar(texto).split(" ");
    var salida = [];
    var i, j, p, v;
    for (i = 0; i < partes.length; i++) {
      p = partes[i];
      if (!p) { continue; }
      if (/^\d+$/.test(p)) { v = p; }
      else if (UNIDADES.hasOwnProperty(p)) { v = UNIDADES[p]; }
      else if (COMPUESTOS.hasOwnProperty(p)) { v = COMPUESTOS[p]; }
      else { continue; }
      for (j = 0; j < v.length; j++) { salida.push(v.charAt(j)); }
    }
    return salida;
  }

  var PATRON_BORRAR = /\b(borrar|borra|borre|corregir|corrige|atras|eliminar|quitar|equivoque|error)\b/;
  var PATRON_LISTO  = /\b(termine|termina|es todo|nada mas|ya esta|fin)\b/;

  function detenerMicrofono() {
    queremosEscuchar = false;
    if (!reconocimiento) { return; }
    try { reconocimiento.abort(); } catch (e) { /* ya estaba detenido */ }
  }

  // escuchar(manejador): enciende el microfono y entrega cada frase final al
  // manejador, que devuelve true cuando ya proceso la frase. Si el microfono
  // no esta disponible, avisa una sola vez y el teclado queda como unica via.
  function escuchar(manejador) {
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
      var i, j, r;
      for (i = evento.resultIndex; i < evento.results.length; i++) {
        r = evento.results[i];
        if (!r.isFinal) { continue; }
        // Se prueban todas las alternativas: el motor a veces acierta en la
        // segunda o la tercera y falla en la primera.
        for (j = 0; j < r.length; j++) {
          if (alEscuchar && alEscuchar(r[j].transcript) === true) { return; }
        }
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
    yaAvisoTeclado = true;
    hablar(
      "No puedo usar el micrófono, así que vamos por el teclado. " +
      "Presione la tecla ese para decir sí, y la tecla ene para decir no. " +
      "Cuando le pida su celular, márquelo con las teclas de números."
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
        estado === "CONFIRMA_NUMERO") {
      if (/^[sS]$/.test(k)) { e.preventDefault(); resolverSiNo("si"); }
      else if (/^[nN]$/.test(k)) { e.preventDefault(); resolverSiNo("no"); }
      return;
    }

    if (estado === "CAPTURA_NUMERO") {
      if (/^[0-9]$/.test(k)) { e.preventDefault(); agregarDigitos([k], true); }
      else if (k === "Backspace") { e.preventDefault(); borrarUltimoDigito(); }
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
  function descargarPdf() {
    if (yaDescargado) { return; }
    yaDescargado = true;

    var ruta = enlacePdf.getAttribute("href");
    var nombre = enlacePdf.getAttribute("download") || "propuesta.pdf";

    function directo() {
      try { enlacePdf.click(); } catch (e) { yaDescargado = false; }
    }

    if (typeof window.fetch !== "function" || !window.URL || !URL.createObjectURL) {
      directo();
      return;
    }

    window.fetch(ruta, { cache: "force-cache" })
      .then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        return r.blob();
      })
      .then(function (blob) {
        // octet-stream: con application/pdf algunos navegadores siguen
        // prefiriendo abrir el archivo antes que guardarlo.
        var url = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
        var a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revocar de inmediato aborta la descarga en Safari.
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
      })
      ["catch"](directo);
  }

  /* =====================================================================
     ESTADO 1 — Espera del gesto
     ===================================================================== */

  function textoDeArranque() {
    return esMovil()
      ? "Toque la pantalla para escuchar la experiencia de la Granja Tierra Fresca."
      : "Oprima cualquier tecla para escuchar la experiencia de la Granja Tierra Fresca.";
  }

  function prepararArranque() {
    var texto = textoDeArranque();
    arranque.setAttribute("aria-label", texto);

    // El foco es lo que hace que el lector de pantalla lea la instruccion
    // sola, sin que el usuario tenga que buscar nada en la pagina.
    arranque.focus();
    anunciar(texto);

    // Ademas se intenta decirlo con la voz del navegador. speechSynthesis no
    // esta sujeto a la politica de autoplay en la mayoria de navegadores, asi
    // que suele sonar sin gesto previo. Si no suena, el lector de pantalla ya
    // hizo el trabajo y no se pierde nada.
    if (TTS && typeof window.SpeechSynthesisUtterance === "function") {
      conVozLista(function (voz) {
        if (!voz || estado !== "ESPERA_GESTO") { return; }
        var f = new window.SpeechSynthesisUtterance(texto);
        f.lang = "es-CO";
        f.voice = voz;
        f.rate = 0.96;
        try { TTS.speak(f); } catch (e) { /* sin efecto */ }
      });
    }
  }

  function comenzar() {
    if (yaArranco) { return; }
    yaArranco = true;
    if (TTS) { TTS.cancel(); }

    // Segundo intento de descarga, ahora si con un gesto del usuario detras:
    // Chrome bloquea descargas automaticas en pestanas que no han recibido uno.
    descargarPdf();

    arranque.setAttribute("aria-label", "Reproduciendo.");
    arranque.blur();
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
      "No fue posible cargar el audio, y le pido disculpas. " +
      "De todas formas quisiera saber si desea contactar a Tierra Fresca.",
      preguntarContacto
    );
  });

  /* =====================================================================
     ESTADO 3 — "Desea reproducir nuevamente?"
     ===================================================================== */

  function preguntarRepetir() {
    estado = "PREGUNTA_REPETIR";
    reintentos = 0;
    hablar(
      "¿Desea reproducir la experiencia nuevamente? Responda sí o no.",
      function () { escuchar(oirSiNo); }
    );
  }

  /* =====================================================================
     ESTADO 4 — "Desea contactar a Tierra Fresca?"
     ===================================================================== */

  function preguntarContacto() {
    estado = "PREGUNTA_CONTACTO";
    reintentos = 0;
    hablar(
      "¿Desea contactar a Tierra Fresca? Responda sí o no.",
      function () { escuchar(oirSiNo); }
    );
  }

  // Manejador de escucha compartido por los tres estados de pregunta cerrada.
  function oirSiNo(frase) {
    var r = interpretarSiNo(frase);
    if (!r) {
      reintentos++;
      if (reintentos >= 3) {
        // Tres intentos fallidos: seguir insistiendo seria maltratarlo.
        reintentos = 0;
        hablar(
          "No logro entenderle, y la culpa es mía, no suya. " +
          "Si está en un computador, presione la tecla ese para sí, " +
          "o la tecla ene para no.",
          function () { escuchar(oirSiNo); }
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

    if (estado === "CONFIRMA_NUMERO") {
      if (r === "si") { cerrarConversion(); }
      else {
        digitos = [];
        hablar("Sin problema, empecemos de nuevo.", pedirNumero);
      }
    }
  }

  /* =====================================================================
     ESTADO 5 — Captura del celular, digito por digito
     ===================================================================== */

  function pedirNumero() {
    estado = "CAPTURA_NUMERO";
    digitos = [];
    reintentos = 0;
    hablar(
      "Qué alegría. Por favor indíqueme su número de celular, " +
      "un número a la vez. Yo le voy repitiendo cada uno. " +
      "Si se equivoca, diga: borrar.",
      function () { escuchar(oirDigitos); }
    );
  }

  function oirDigitos(frase) {
    var t = normalizar(frase);

    if (PATRON_BORRAR.test(t)) { borrarUltimoDigito(); return true; }

    var nuevos = extraerDigitos(frase);
    if (nuevos.length) { agregarDigitos(nuevos, true); return true; }

    if (PATRON_LISTO.test(t)) { cerrarCaptura(); return true; }
    return false;
  }

  // Se repite cada digito en voz alta apenas se captura. Cuesta un segundo por
  // digito, pero es la diferencia entre corregir sobre la marcha y descubrir
  // al final que el numero completo quedo mal.
  function agregarDigitos(nuevos, repetir) {
    var i;
    for (i = 0; i < nuevos.length && digitos.length < DIGITOS_CELULAR; i++) {
      digitos.push(nuevos[i]);
    }

    if (digitos.length >= DIGITOS_CELULAR) { cerrarCaptura(); return; }

    if (repetir) {
      hablar(nuevos.join(", "), function () { escuchar(oirDigitos); });
    }
  }

  function borrarUltimoDigito() {
    if (!digitos.length) {
      hablar("Todavía no hay ningún número. Dígame el primero.",
             function () { escuchar(oirDigitos); });
      return;
    }
    digitos.pop();
    hablar("Listo, lo borré. Van " + digitos.length + ". Siga.",
           function () { escuchar(oirDigitos); });
  }

  function cerrarCaptura() {
    detenerMicrofono();
    if (digitos.length < 7) {
      hablar("Me faltan números. Por favor dígamelos de nuevo, uno a la vez.",
             pedirNumero);
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
    // Separado por comas para que la voz lo lea digito por digito y no como
    // una cifra de mil millones.
    hablar(
      "Le repito el número: " + digitos.join(", ") + ". ¿Es correcto? Responda sí o no.",
      function () { escuchar(oirSiNo); }
    );
  }

  /* =====================================================================
     ESTADO 7 — Cierre
     ===================================================================== */

  function cerrarConversion() {
    estado = "FIN";
    detenerMicrofono();

    if (!ABRIR_WHATSAPP_AL_CONFIRMAR || !/^\d{10,15}$/.test(NUMERO_WHATSAPP)) {
      hablar(
        "Perfecto. Ya quedó registrado. Nos comunicamos con usted muy pronto. " +
        "Gracias por regalarnos su oído."
      );
      return;
    }

    var url = "https://wa.me/" + NUMERO_WHATSAPP +
              "?text=" + encodeURIComponent(MENSAJE_WHATSAPP);

    hablar(
      "Perfecto. Le voy a abrir WhatsApp con el mensaje ya escrito, " +
      "para que solo tenga que pulsar enviar.",
      function () { window.location.href = url; }
    );
    // Si la sintesis no avisa que termino, se salta igual.
    window.setTimeout(function () { window.location.href = url; }, 9000);
  }

  function despedirse() {
    estado = "FIN";
    detenerMicrofono();
    hablar(
      "Con mucho gusto. Gracias por darnos un minuto de su tiempo y de su " +
      "atención. Que ese guiso le quede como en casa. Hasta pronto."
    );
  }

  /* =====================================================================
     Arranque
     ===================================================================== */

  descargarPdf();
  if (TTS && typeof TTS.getVoices === "function") { TTS.getVoices(); }
  prepararArranque();

  // Por si el foco se pierde antes del gesto: el lector de pantalla necesita
  // que el elemento este enfocado para leer su etiqueta.
  window.addEventListener("load", function () {
    if (estado === "ESPERA_GESTO") { arranque.focus(); }
  });

  window.addEventListener("pagehide", detenerMicrofono);
})();
