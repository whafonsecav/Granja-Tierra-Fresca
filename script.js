/* =========================================================================
   Granja Tierra Fresca — logica de la experiencia sensorial

   Recorrido previsto:
     1. Al abrir, se descarga sola la propuesta en PDF.
     2. Se intenta reproducir el audio ASMR. Si el navegador lo bloquea, la
        pantalla entera se vuelve un boton de inicio.
     3. Al terminar el audio, una voz sintetica explica los dos comandos.
     4. Recien ahi se enciende el microfono y se escucha al usuario.
     5. "Quiero contactarlos" abre WhatsApp con el mensaje ya escrito.

   Regla de oro del archivo: el reconocimiento de voz es una MEJORA, nunca la
   ruta critica. Cada comando de voz tiene un boton gigante equivalente, porque
   Firefox no soporta SpeechRecognition y porque el permiso de microfono se
   puede negar.
   ========================================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     CONFIGURACION — lo unico que hay que tocar antes de publicar
     --------------------------------------------------------------------- */

  // Numero de WhatsApp de la granja, en formato internacional y SOLO digitos:
  // indicativo de pais + numero. Colombia es 57. Ejemplo: "573001234567".
  var NUMERO_WHATSAPP = "573001234567";

  // Mensaje exigido por la campana. Se envia ya redactado para que el usuario
  // no tenga que escribir nada: solo pulsar enviar.
  var MENSAJE_WHATSAPP =
    "Hola, soy Carlos y recibí tu correo, me gustaría participar en la " +
    "campaña de su granja de tomates para guiso. Esperamos podamos hablar " +
    "por este medio para coordinar todo.";

  var GUIA_HABLADA =
    "Gracias por escucharnos. Si quiere volver a reproducir, por favor diga: " +
    "quiero volver a reproducir. Si quiere contactarnos, por favor diga: " +
    "quiero contactarlos. También puede usar los dos botones de la página.";

  /* ---------------------------------------------------------------------
     Elementos
     --------------------------------------------------------------------- */

  var audio       = document.getElementById("audio");
  var compuerta   = document.getElementById("compuerta");
  var estado      = document.getElementById("estado");
  var anuncio     = document.getElementById("anuncio");
  var microfono   = document.getElementById("microfono");
  var btnRepetir  = document.getElementById("btn-repetir");
  var btnContacto = document.getElementById("btn-contacto");
  var enlacePdf   = document.getElementById("descarga");

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var TTS = window.speechSynthesis || null;

  var reconocimiento = null;
  var queremosEscuchar = false;   // intencion; distinta de "esta escuchando"
  var yaDescargado = false;
  var yaArranco = false;
  var navegando = false;          // evita disparar WhatsApp dos veces

  /* ---------------------------------------------------------------------
     Utilidades de comunicacion con el usuario
     --------------------------------------------------------------------- */

  // Escribe en pantalla y, a la vez, en la region aria-live para que el lector
  // de pantalla lo narre aunque el foco este en otro lado.
  function decir(texto) {
    estado.textContent = texto;
    // Reiniciar el nodo obliga a NVDA y a VoiceOver a releer un texto repetido.
    anuncio.textContent = "";
    window.setTimeout(function () { anuncio.textContent = texto; }, 60);
  }

  function estadoMicrofono(texto, escuchando) {
    microfono.hidden = false;
    microfono.textContent = texto;
    microfono.classList.toggle("escuchando", !!escuchando);
  }

  /* ---------------------------------------------------------------------
     1. Descarga automatica del PDF
     --------------------------------------------------------------------- */

  // Objetivo: que el PDF caiga solo en la carpeta de Descargas, sin visor de
  // PDF de por medio y sin que el usuario tenga que elegir nada.
  //
  // Limite real que conviene tener claro: si el navegador tiene activada la
  // opcion "Preguntar donde guardar cada archivo", NINGUNA pagina web puede
  // saltarsela. Es una preferencia del usuario, no algo que el sitio decida.
  // Lo que si esta en nuestras manos, y es lo que hace esta funcion:
  //
  //   a) Descargar el archivo como Blob y entregarlo con un enlace
  //      "download". Asi el navegador lo guarda como archivo en vez de
  //      abrirlo en su visor de PDF integrado, que es el comportamiento por
  //      defecto de Chrome y de Edge al pinchar un .pdf.
  //   b) Fijar el nombre del archivo desde aqui.
  //   c) Reintentar tras el primer gesto del usuario, porque Chrome bloquea
  //      descargas automaticas en pestanas que aun no han recibido ninguno.
  function descargarPdf() {
    if (yaDescargado) { return; }
    yaDescargado = true;

    var ruta = enlacePdf.getAttribute("href");
    var nombre = enlacePdf.getAttribute("download") || "propuesta.pdf";

    function guardarBlob(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Se libera despues: revocar de inmediato aborta la descarga en Safari.
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    }

    if (typeof window.fetch !== "function" || !window.URL || !URL.createObjectURL) {
      try { enlacePdf.click(); } catch (e) { yaDescargado = false; }
      return;
    }

    window.fetch(ruta, { cache: "force-cache" })
      .then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        return r.blob();
      })
      .then(function (blob) {
        // Se fuerza octet-stream: con application/pdf, algunos navegadores
        // siguen prefiriendo abrirlo antes que guardarlo.
        guardarBlob(new Blob([blob], { type: "application/octet-stream" }));
      })
      ["catch"](function () {
        // Sin red, o abriendo el archivo con file:// : queda el enlace directo.
        try { enlacePdf.click(); } catch (e) { yaDescargado = false; }
      });
  }

  /* ---------------------------------------------------------------------
     2. Audio: intento de reproduccion automatica y compuerta de respaldo
     --------------------------------------------------------------------- */

  function reproducir() {
    detenerReconocimiento();          // el microfono no debe oir el propio audio
    if (TTS) { TTS.cancel(); }
    audio.currentTime = 0;
    return audio.play();
  }

  function intentarArranqueAutomatico() {
    var promesa = audio.play();

    // Navegadores viejos devuelven undefined en vez de una promesa.
    if (!promesa || typeof promesa.then !== "function") {
      alReproducir();
      return;
    }

    promesa.then(alReproducir)["catch"](function () {
      // Bloqueo por politica de autoplay: es lo esperado, no es un error.
      abrirCompuerta();
    });
  }

  function abrirCompuerta() {
    compuerta.hidden = false;
    compuerta.focus();
    decir("Toque la pantalla o presione Enter para comenzar a escuchar.");
  }

  function cerrarCompuerta() {
    if (compuerta.hidden) { return; }
    compuerta.hidden = true;
  }

  function alReproducir() {
    yaArranco = true;
    cerrarCompuerta();
    decir("Reproduciendo la experiencia. Dura un minuto. Al terminar, la página le va a hablar.");
  }

  compuerta.addEventListener("click", function () {
    descargarPdf();                   // segundo intento, ya con gesto del usuario
    reproducir().then(alReproducir)["catch"](function () {
      decir("No se pudo iniciar el audio. Use el reproductor de la página para escucharlo.");
      cerrarCompuerta();
    });
  });

  audio.addEventListener("play", function () {
    if (!yaArranco) { alReproducir(); }
    detenerReconocimiento();
  });

  audio.addEventListener("error", function () {
    decir("No fue posible cargar el audio. Puede contactarnos directamente con el botón «Quiero contactarlos».");
    if (btnContacto) { btnContacto.focus(); }
  });

  /* ---------------------------------------------------------------------
     3. Voz sintetica de la pagina
     --------------------------------------------------------------------- */

  // La voz que guia al usuario tiene que hablar en espanol, si o si: el texto
  // esta en espanol y una voz inglesa lo destroza hasta volverlo inentendible.
  // Se busca en tres rondas, de la mas deseable a la mas tolerante.
  function vozEspanol() {
    if (!TTS) { return null; }
    var voces = TTS.getVoices() || [];
    var i, v;

    // 1. Espanol de America: es el acento que espera un usuario colombiano.
    for (i = 0; i < voces.length; i++) {
      if (/^es[-_]?(CO|MX|US|AR|CL|PE|419)/i.test(voces[i].lang)) { return voces[i]; }
    }
    // 2. Cualquier variante de espanol, incluida la de Espana.
    for (i = 0; i < voces.length; i++) {
      if (/^es|^es[-_]/i.test(voces[i].lang)) { return voces[i]; }
    }
    // 3. Ultimo recurso: buscar por nombre. Algunos motores reportan mal el
    //    codigo de idioma pero si identifican la voz como espanola.
    for (i = 0; i < voces.length; i++) {
      v = voces[i].name || "";
      if (/spanish|español|espanol|helena|sabina|laura|jorge|monica|mónica|paulina|raul|raúl|diego|elvira/i.test(v)) {
        return voces[i];
      }
    }
    return null;
  }

  // Chrome entrega getVoices() vacio en la primera llamada y dispara
  // "voiceschanged" cuando termina de cargarlas. Sin esta espera, la primera
  // frase de la pagina se pronunciaria con la voz por defecto del sistema,
  // que en un Windows en ingles leeria el espanol como si fuera ingles.
  function conVozLista(alEstarLista) {
    if (!TTS) { alEstarLista(null); return; }
    if (vozEspanol()) { alEstarLista(vozEspanol()); return; }

    var resuelto = false;
    function resolver() {
      if (resuelto) { return; }
      resuelto = true;
      if (typeof TTS.removeEventListener === "function") {
        TTS.removeEventListener("voiceschanged", resolver);
      }
      alEstarLista(vozEspanol());
    }
    if (typeof TTS.addEventListener === "function") {
      TTS.addEventListener("voiceschanged", resolver);
    }
    // Si el motor nunca avisa, no se deja al usuario esperando en silencio.
    window.setTimeout(resolver, 1500);
  }

  // hablar() serializa sintesis y reconocimiento. Si el microfono siguiera
  // abierto mientras la pagina habla, se escucharia a si misma y entraria en
  // bucle. Por eso el microfono solo se enciende en el callback final.
  function hablar(texto, alTerminar) {
    if (!TTS || typeof window.SpeechSynthesisUtterance !== "function") {
      if (alTerminar) { alTerminar(); }
      return;
    }
    detenerReconocimiento();
    TTS.cancel();

    conVozLista(function (voz) {
      // Sin voz espanola instalada, sintetizar seria contraproducente: una voz
      // inglesa leyendo espanol suena a ruido y es mas dificil de entender que
      // el silencio. En ese caso se deja el mensaje en la region aria-live y lo
      // narra el lector de pantalla del propio usuario, que si esta en espanol
      // y con su velocidad de siempre. Se espera un tiempo proporcional al
      // largo del texto para no encender el microfono mientras el lector habla.
      if (!voz) {
        decir(texto);
        window.setTimeout(alTerminar || function () {},
                          Math.min(20000, 1800 + texto.length * 55));
        return;
      }

      var frase = new window.SpeechSynthesisUtterance(texto);
      frase.lang = "es-CO";
      frase.rate = 0.98;
      frase.pitch = 1;
      if (voz) { frase.voice = voz; }

      var terminado = false;
      function finalizar() {
        if (terminado) { return; }
        terminado = true;
        if (alTerminar) { alTerminar(); }
      }

      frase.onend = finalizar;
      frase.onerror = finalizar;

      // Red de seguridad: en algunos Chrome de escritorio "onend" no dispara
      // si la pestana pierde el foco. Sin este respaldo el flujo se colgaria.
      window.setTimeout(finalizar, Math.min(30000, 3000 + texto.length * 95));

      TTS.speak(frase);
    });
  }

  // Se pide la lista apenas carga la pagina para que este lista cuando haga
  // falta, sin el retraso de la primera consulta.
  if (TTS && typeof TTS.getVoices === "function") { TTS.getVoices(); }

  /* ---------------------------------------------------------------------
     4. Reconocimiento de voz
     --------------------------------------------------------------------- */

  // Quita tildes y signos para que "quiero volver a reproducir" y
  // "Quiero volver a reproducir." lleguen iguales al comparador.
  function normalizar(texto) {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var PATRON_REPETIR  = /\b(volver a reproducir|reproducir de nuevo|reproducir otra vez|repetir|repitelo|repitela|otra vez|de nuevo|escuchar otra vez)\b/;
  // "si", "claro" y "acepto" cuentan como aceptacion porque la voz sintetica
  // termina invitando a contactar: es la respuesta natural a esa pregunta.
  var PATRON_CONTACTO = /\b(contactarlos|contactarlo|contactarnos|contactar|contacto|quiero hablar|hablar con ustedes|whatsapp|si|claro|acepto|dale)\b/;

  function interpretar(frase) {
    var t = normalizar(frase);
    if (!t) { return; }

    // El repetir se evalua primero: "quiero volver a reproducir" no contiene
    // ninguna palabra de contacto, pero una frase larga si podria contener
    // ambas, y en ese caso repetir es la accion reversible y segura.
    if (PATRON_REPETIR.test(t)) {
      detenerReconocimiento();
      decir("Reproduciendo de nuevo.");
      reproducir()["catch"](function () {
        decir("No se pudo reiniciar el audio. Use el reproductor de la página.");
      });
      return;
    }
    if (PATRON_CONTACTO.test(t)) {
      irAWhatsApp("voz");
      return;
    }

    estadoMicrofono(
      "Escuché «" + frase.trim() + "», pero no reconocí el comando. " +
      "Puede decir «quiero volver a reproducir» o «quiero contactarlos».",
      true
    );
  }

  function activarMicrofono() {
    if (!SR) {
      contingencia("Su navegador no permite comandos de voz. Use los dos botones de la página: recorra con la tecla Tab y confirme con Enter.");
      return;
    }

    try {
      reconocimiento = new SR();
    } catch (e) {
      contingencia("No fue posible encender el micrófono. Use los dos botones de la página.");
      return;
    }

    reconocimiento.lang = "es-CO";
    reconocimiento.continuous = true;
    reconocimiento.interimResults = false;
    reconocimiento.maxAlternatives = 3;

    reconocimiento.onstart = function () {
      estadoMicrofono("Micrófono encendido. Lo estoy escuchando.", true);
    };

    reconocimiento.onresult = function (evento) {
      var i, j, resultado, texto;
      for (i = evento.resultIndex; i < evento.results.length; i++) {
        resultado = evento.results[i];
        if (!resultado.isFinal) { continue; }
        // Se revisan todas las alternativas: el motor a veces acierta el
        // comando en la segunda o la tercera, no en la primera.
        for (j = 0; j < resultado.length; j++) {
          texto = normalizar(resultado[j].transcript);
          if (PATRON_CONTACTO.test(texto) || PATRON_REPETIR.test(texto)) {
            interpretar(resultado[j].transcript);
            return;
          }
        }
        interpretar(resultado[0].transcript);
      }
    };

    reconocimiento.onerror = function (evento) {
      if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
        queremosEscuchar = false;
        contingencia("No dio permiso al micrófono, y está bien: no lo necesita. Use los dos botones de la página. Recórralos con la tecla Tab y confirme con Enter.");
        return;
      }
      if (evento.error === "no-speech" || evento.error === "aborted") {
        return;   // silencio o corte normal: el onend se encarga de reanudar
      }
      estadoMicrofono("El micrófono tuvo un problema. Los botones de la página siguen funcionando.", false);
    };

    // Chrome corta la sesion sola tras unos segundos de silencio. Se reanuda
    // mientras la pagina siga queriendo escuchar.
    reconocimiento.onend = function () {
      if (!queremosEscuchar) { return; }
      window.setTimeout(function () {
        if (!queremosEscuchar || !reconocimiento) { return; }
        try { reconocimiento.start(); } catch (e) { /* ya estaba activo */ }
      }, 350);
    };

    queremosEscuchar = true;
    try {
      reconocimiento.start();
    } catch (e) {
      contingencia("No fue posible encender el micrófono. Use los dos botones de la página.");
    }
  }

  function detenerReconocimiento() {
    queremosEscuchar = false;
    if (!reconocimiento) { return; }
    try { reconocimiento.abort(); } catch (e) { /* sin efecto */ }
  }

  function contingencia(mensaje) {
    estadoMicrofono(mensaje, false);
    decir(mensaje);
    if (btnContacto) { btnContacto.focus(); }
  }

  /* ---------------------------------------------------------------------
     5. Conversion: WhatsApp
     --------------------------------------------------------------------- */

  function esMovil() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
      return navigator.userAgentData.mobile;
    }
    return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || "");
  }

  function urlWhatsApp() {
    var texto = encodeURIComponent(MENSAJE_WHATSAPP);
    // En movil, wa.me abre la app instalada sin pantallas intermedias.
    // En escritorio, ir directo a web.whatsapp.com evita el interstitial de
    // wa.me, que obliga a un clic extra imposible de anticipar por voz.
    if (esMovil()) {
      return "https://wa.me/" + NUMERO_WHATSAPP + "?text=" + texto;
    }
    return "https://web.whatsapp.com/send?phone=" + NUMERO_WHATSAPP + "&text=" + texto;
  }

  function irAWhatsApp(origen) {
    if (navegando) { return; }

    if (!/^\d{10,15}$/.test(NUMERO_WHATSAPP)) {
      decir("El número de WhatsApp de la granja todavía no está configurado en la página. Revise la constante NUMERO_WHATSAPP en el archivo script punto js.");
      return;
    }

    navegando = true;
    detenerReconocimiento();

    var destino = urlWhatsApp();
    var aviso = "Perfecto. Abriendo WhatsApp con el mensaje ya escrito. Solo tiene que pulsar enviar.";

    decir(aviso);

    if (origen === "voz") {
      // Se confirma en voz alta antes de saltar: el usuario pidio esto sin
      // mirar la pantalla y merece saber que se le entendio bien.
      hablar(aviso, function () { window.location.href = destino; });
      window.setTimeout(function () { window.location.href = destino; }, 7000);
    } else {
      window.location.href = destino;
    }
  }

  /* ---------------------------------------------------------------------
     6. Botones de contingencia
     --------------------------------------------------------------------- */

  btnRepetir.addEventListener("click", function () {
    descargarPdf();
    detenerReconocimiento();
    decir("Reproduciendo de nuevo.");
    reproducir()["catch"](function () {
      decir("No se pudo reiniciar el audio. Use el reproductor de la página.");
    });
  });

  btnContacto.addEventListener("click", function () { irAWhatsApp("boton"); });

  /* ---------------------------------------------------------------------
     7. Fin del audio: hablar y luego escuchar
     --------------------------------------------------------------------- */

  audio.addEventListener("ended", function () {
    decir("Terminó la experiencia. Ahora le voy a explicar qué puede decir en voz alta.");
    hablar(GUIA_HABLADA, function () {
      decir("Diga «quiero volver a reproducir» o «quiero contactarlos». También puede usar los botones.");
      activarMicrofono();
    });
  });

  /* ---------------------------------------------------------------------
     Arranque
     --------------------------------------------------------------------- */

  descargarPdf();
  intentarArranqueAutomatico();

  // Si el usuario se va de la pagina, se apaga el microfono. No se deja un
  // permiso activo consumiendo bateria ni el indicador de microfono encendido.
  window.addEventListener("pagehide", detenerReconocimiento);
})();
