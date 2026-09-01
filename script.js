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

  // Hablar aunque el equipo no tenga ninguna voz en espanol instalada.
  //
  // La primera version hacia lo contrario: si no encontraba voz espanola se
  // callaba, con el argumento de que una voz inglesa leyendo espanol se
  // entiende peor que el silencio. El argumento no era malo, pero la realidad
  // lo desmintio.
  //
  // Windows suele traer solo voces en ingles. Chrome no lo nota porque trae
  // las suyas propias, con espanol incluido; Edge usa unicamente las del
  // sistema. Resultado: la misma pagina hablaba en Chrome y se quedaba muda
  // en Edge, en el mismo computador. Para quien la usa eso no es una decision
  // de calidad, es una pagina rota.
  //
  // Se habla siempre, con lang en es-CO. Aunque la voz sea inglesa, muchos
  // motores le aplican al menos parte de la fonetica del idioma declarado, y
  // una voz con acento raro es infinitamente mejor que el silencio.
  //
  // La recomendacion para el equipo donde se presente la pieza sigue en pie:
  // Configuracion, Hora e idioma, Voz, Agregar voces, Espanol.
  var HABLAR_SIN_VOZ_ESPANOLA = true;

  // Velocidad de la voz. En escritorio va mas rapida: las voces de Windows
  // son de por si pausadas y a velocidad nominal se hacen eternas. En movil
  // se deja en 1, porque los motores de Android e iOS ya leen mas agil y
  // acelerarlos los vuelve atropellados.
  //
  // tiempoDeLectura() la tiene en cuenta: si no, la pagina esperaria de mas
  // en el camino sin sintesis y quedaria en silencio sin razon.
  var VELOCIDAD_VOZ = esMovil() ? 1 : 1.25;

  // Cuanto se espera antes de mandarle el texto al lector de pantalla.
  //
  // Tiene que ser mayor que el silencio inicial, porque la voz no empieza a
  // sonar hasta despues de el. Con un margen encima para el arranque del
  // motor. Si en ese plazo la voz no dio senales, se da por bloqueada y se
  // deja que el lector de pantalla haga el trabajo.
  var ESPERA_ANUNCIO = SILENCIO_INICIAL_MS + 1500;

  // Cuanto espera la primera frase antes de sonar.
  //
  // Un lector de pantalla, al abrir la pagina, anuncia por su cuenta el
  // titulo y el elemento enfocado, y eso le toma un par de segundos. Si la
  // voz de la pagina arranca en medio, se oyen las dos encimadas. Se le cede
  // el turno: la voz espera a que el lector termine su presentacion.
  //
  // A quien no use lector de pantalla esto le cuesta unos segundos de
  // silencio al abrir, que es un precio pequeno comparado con dos voces
  // hablando a la vez.
  var ESPERA_PRIMERA_FRASE = 3200;

  var DIGITOS_CELULAR = 10;   // Colombia: 10 digitos
  var MINIMO_DIGITOS  = 7;

  // Silencio tras el cual se da por terminado el dictado del numero, si ya
  // hay digitos suficientes. Es lo que permite decir el celular de corrido
  // sin tener que anunciar que uno termino.
  var PAUSA_FIN_DICTADO_MS = 7500;

  /* =====================================================================
     Elementos y capacidades del navegador
     ===================================================================== */

  var audio     = document.getElementById("audio");
  var arranque  = document.getElementById("arranque");
  var anuncio   = document.getElementById("anuncio");
  var enlacePdf = document.getElementById("descarga");

  var SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  var TTS = window.speechSynthesis || null;
  window._utterances = []; // To prevent garbage collection of utterances

  var reconocimiento   = null;
  var queremosEscuchar = false;
  var alEscuchar       = null;   // que hacer con lo que se oiga, segun el estado
  var yaDescargado     = false;
  var yaArranco        = false;
  var estado           = "ESPERA_GESTO";
  var digitos          = [];
  var reintentos       = 0;
  // Contador propio del numero, separado de "reintentos". pedirNumero()
  // reinicia "reintentos" cada vez que se llama a si misma para repreguntar,
  // y si el conteo de fallos viviera en esa misma variable se borraria solo
  // en cada vuelta: nunca llegaria a tres. Este cuenta aparte y sobrevive.
  var intentosSinNumero = 0;
  // Cuenta las veces que se le da mas tiempo a alguien que YA dijo algunos
  // digitos y se quedo callado. Es distinto de intentosSinNumero: aqui no se
  // borra nada ni se interrumpe, solo se espera un poco mas antes de decidir
  // que de verdad se detuvo.
  var extensionesDictado = 0;
  var relojDictado     = null;

  function esMovil() {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
    if (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0) {
      return true;
    }
    if ("ontouchstart" in window) { return true; }
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
      return navigator.userAgentData.mobile;
    }
    return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || "");
  }

  /* =====================================================================
     Canal de respaldo: la region aria-live
     ===================================================================== */

  var relojAnuncio = null;

  // Escribe en la region aria-live SIN condiciones. Solo se usa cuando se
  // sabe que la voz de la pagina no va a hablar.
  function anunciarYa(texto) {
    // Vaciar y volver a escribir obliga a NVDA y a VoiceOver a releer un
    // texto aunque sea identico al anterior.
    anuncio.textContent = "";
    window.setTimeout(function () { anuncio.textContent = texto; }, 60);
  }

  // Anuncia solo SI LA VOZ DE LA PAGINA NO ALCANZA A DECIRLO.
  //
  // Los dos canales dicen lo mismo: la region aria-live la lee el lector de
  // pantalla del usuario, y la voz sintetica la emite la pagina. Si los dos
  // funcionan a la vez, alguien ciego oye dos voces superpuestas con medio
  // segundo de desfase. Es peor que el silencio.
  //
  // No hay manera de preguntarle al navegador si hay un lector de pantalla
  // encendido: esa informacion no se expone, y con razon. Asi que en lugar de
  // detectarlo se ordenan los canales en el tiempo. Se deja pendiente el
  // anuncio y se cancela en cuanto el motor de voz avisa que empezo a hablar.
  // Si nunca empieza, el anuncio sale y el lector de pantalla se hace cargo.
  function anunciar(texto) {
    window.clearTimeout(relojAnuncio);
    relojAnuncio = window.setTimeout(function () {
      anunciarYa(texto);
    }, ESPERA_ANUNCIO);
  }

  // La voz empezo a sonar: el lector de pantalla ya no tiene que repetirlo.
  function callarAnuncio() {
    window.clearTimeout(relojAnuncio);
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

      // El silencio dura mas que la espera previa a hablar, a proposito: si
      // terminara justo cuando arranca la voz, el dispositivo ya estaria
      // cerrandose y el recorte volveria. Tiene que seguir sonando por
      // debajo mientras entra la primera silaba.
      var duracion = (SILENCIO_INICIAL_MS + 2000) / 1000;
      var muestras = Math.ceil(contexto.sampleRate * duracion);
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
     Que nadie se quede con una version vieja
     ===================================================================== */

  // El sello de version viaja en cada direccion del HTML: script.js?v=...,
  // experiencia.mp3?v=..., y asi. Cuando cambia el sello cambia la direccion,
  // y el navegador se ve obligado a descargar de nuevo. Eso resuelve los
  // archivos.
  //
  // Falta el propio HTML, que se pide siempre con la misma direccion y podria
  // servirse de la copia guardada. Para eso esta esto: se consulta
  // version.json sin pasar por la cache y se compara con el sello que trae
  // incrustado la pagina que se esta ejecutando. Si no coinciden, es que el
  // navegador sirvio un HTML atrasado, y se recarga una sola vez pidiendolo
  // con el sello nuevo.
  //
  // No se le pide a nadie que borre la cache. Eso no se le pide a un
  // destinatario, y menos cuando ya son varios los que abrieron el enlace.
  function comprobarVersion() {
    var meta = document.querySelector('meta[name="tf-version"]');
    var mia = meta ? meta.getAttribute("content") : null;
    if (!mia || typeof window.fetch !== "function") { return; }

    window.fetch("version.json?t=" + (new Date()).getTime(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.version || d.version === mia) { return; }

        // Salvaguarda contra recargas en bucle: si ya se recargo por este
        // mismo desfase, no se vuelve a intentar. Es preferible una pagina
        // atrasada a una que se recarga sin parar.
        var marca = "tierrafresca.recarga";
        try {
          if (window.sessionStorage.getItem(marca) === mia) { return; }
          window.sessionStorage.setItem(marca, mia);
        } catch (e) { return; }

        window.location.replace(window.location.pathname + "?v=" + d.version);
      })["catch"](function () { /* sin red: se sigue con lo que hay */ });
  }

  // La direccion queda limpia despues de una recarga por version. El
  // parametro ya cumplio su unico trabajo, que era obligar la descarga; se
  // quita para que nadie vea ni copie una URL con cosas pegadas.
  function limpiarDireccion() {
    if (!window.location.search) { return; }
    if (!window.history || !window.history.replaceState) { return; }
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) { /* sin efecto */ }
  }

  /* =====================================================================
     Idioma de la voz
     ===================================================================== */

  var IDIOMAS = window.TIERRA_FRESCA_IDIOMAS || {};
  var idiomaHablado = "es";   // se ajusta cuando se conoce la voz elegida

  // Orden de preferencia. El espanol primero porque es el idioma de la
  // campana; despues los que mas se le parecen en fonetica, y el ingles de
  // ultimo. Un idioma sin voz instalada simplemente no se elige.
  var PREFERENCIA_IDIOMA = { es: 100, pt: 62, it: 58, fr: 52, en: 46 };

  function codigoDeIdioma(lang) {
    return String(lang || "").slice(0, 2).toLowerCase();
  }

  // El idioma en el que se va a hablar, deducido de la voz que se vaya a
  // usar. Si la voz habla algo que no esta traducido, se cae al espanol.
  function idiomaDeLaVoz(voz) {
    var c = voz ? codigoDeIdioma(voz.lang) : "es";
    return IDIOMAS.hasOwnProperty(c) ? c : "es";
  }

  // Devuelve el texto de una clave en un idioma, con los marcadores ya
  // sustituidos. Si a un idioma le falta la clave se usa la espanola: una
  // traduccion incompleta no puede dejar muda a la pagina.
  function frase(idioma, clave, datos) {
    var pack = IDIOMAS[idioma] || IDIOMAS.es || {};
    var base = IDIOMAS.es || {};
    var t = pack[clave] !== undefined ? pack[clave] : base[clave];
    if (t === undefined) { return ""; }

    var gesto = esMovil()
      ? (pack.gestoMovil || base.gestoMovil)
      : (pack.gestoEscritorio || base.gestoEscritorio);

    t = t.split("{gesto}").join(gesto || "");
    t = t.split("{aviso}").join(pack.aviso || base.aviso || "");
    if (datos && datos.numero !== undefined) {
      t = t.split("{numero}").join(datos.numero);
    }

    // Barrido final: si quedo algun marcador sin reemplazar, se borra en vez
    // de leerse. Un {promesa} olvidado se pronuncio en voz alta como la
    // palabra "Promesa" en mitad de la bienvenida, y eso no puede repetirse:
    // un texto incompleto es un problema, pero uno que se lee en voz alta es
    // un ridiculo delante del destinatario.
    t = t.replace(/\{[a-zA-Z]+\}/g, "");
    return t.replace(/\s{2,}/g, " ").trim();
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
     Los tonos que marcan el turno de palabra
     ===================================================================== */

  // Dos pitidos cortos: uno cuando el microfono se abre y le toca hablar al
  // usuario, y otro cuando se cierra y la pagina ya tiene lo que dijo.
  //
  // Sin ellos, quien no ve la pantalla no tiene forma de saber en que momento
  // empezar. Callarse y esperar a que la maquina este lista es adivinar, y
  // hablar antes de tiempo significa que la primera mitad de lo que dijo no
  // se registro. Con dos sonidos distintos, el turno queda claro sin que haga
  // falta explicarlo cada vez.
  //
  // Suben para pedir la palabra y bajan para devolverla, que es como funciona
  // la entonacion de una pregunta y una respuesta en el habla de verdad.
  //
  // Se generan con WebAudio en el momento, sin archivos: asi no dependen de
  // que se descargue nada y suenan igual en cualquier aparato y navegador.
  function tono(frecuencias, duracion, volumen) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return; }
      if (!contexto) { contexto = new AC(); }
      if (contexto.state === "suspended") { contexto.resume(); }

      // Se programa con un pequeno margen por delante. resume() es asincrono:
      // si se programara en currentTime exacto, el contexto podria seguir
      // dormido en ese instante y el tono no llegaria a sonar. Esa era una de
      // las razones por las que a veces no se oia nada.
      var t0 = contexto.currentTime + 0.06;
      var i, osc, gan, ini, fin;

      for (i = 0; i < frecuencias.length; i++) {
        osc = contexto.createOscillator();
        gan = contexto.createGain();
        // Triangular y no senoidal: una onda pura de 700 Hz se pierde en el
        // altavoz de un celular, que reproduce mal los tonos limpios. La
        // triangular lleva armonicos y corta mucho mejor.
        osc.type = "triangle";
        osc.frequency.value = frecuencias[i];

        ini = t0 + (i * duracion);
        fin = ini + duracion;

        // Las rampas no son adorno: un oscilador que empieza y termina de
        // golpe produce un chasquido, y un chasquido en el oido de alguien
        // que esta escuchando con atencion es desagradable.
        gan.gain.setValueAtTime(0.0001, ini);
        gan.gain.exponentialRampToValueAtTime(volumen, ini + 0.015);
        gan.gain.exponentialRampToValueAtTime(0.0001, fin);

        osc.connect(gan);
        gan.connect(contexto.destination);
        osc.start(ini);
        osc.stop(fin + 0.02);
      }
    } catch (e) { /* sin tono, pero la pagina sigue */ }
  }

  // Sube: te toca hablar.
  function tonoTeToca() { tono([700, 1050], 0.17, 0.55); }

  // Baja: ya te oi, puedes parar.
  //
  // Termina mas grave y mas largo que el de apertura, para que se distingan
  // sin tener que pensarlo. El volumen es casi el mismo: al principio lo puse
  // mas bajo por discrecion y el resultado fue que no se oia.
  function tonoYaTeOi() { tono([1050, 560], 0.20, 0.50); }

  /* =====================================================================
     Voz de la pagina
     ===================================================================== */

  // Se puntua cada voz por dos cosas: que idioma habla y que tan humana
  // suena. El idioma pesa mucho mas, porque una voz mediocre que pronuncia
  // bien se entiende siempre, y una voz excelente en el idioma equivocado no
  // se entiende nunca.
  //
  // Entre las que suenan bien: las neuronales ("Natural", "Neural") y las que
  // se sintetizan en servidor ("Online", las de Google) le sacan mucha
  // ventaja a las locales clasicas de Windows, que arrastran la cadencia
  // metalica de SAPI.
  function puntuarVoz(v) {
    var lang = codigoDeIdioma(v.lang);
    var nombre = v.name || "";

    // Un idioma sin traduccion vale poco, pero no cero: si es lo unico que
    // hay en el equipo, mas vale hablar con el que quedarse en silencio.
    var p = PREFERENCIA_IDIOMA.hasOwnProperty(lang) ? PREFERENCIA_IDIOMA[lang] : 8;

    if (/natural|neural/i.test(nombre)) { p += 12; }
    if (/^google/i.test(nombre)) { p += 8; }
    if (/online/i.test(nombre)) { p += 6; }
    if (v.localService === false) { p += 4; }

    return p;
  }

  // La mejor voz INSTALADA en el aparato para un idioma. Sirve de red cuando
  // la voz elegida se sintetiza en servidor y la red no responde.
  function vozLocal(idioma) {
    if (!TTS) { return null; }
    var voces = TTS.getVoices() || [];
    var i, v;
    for (i = 0; i < voces.length; i++) {
      v = voces[i];
      if (v.localService && codigoDeIdioma(v.lang) === idioma) { return v; }
    }
    for (i = 0; i < voces.length; i++) {
      if (voces[i].localService) { return voces[i]; }
    }
    return null;
  }

  // La ultima buena voz que se vio. Ver la nota del arranque.
  var mejorVozVista = null;
  function recordarMejorVoz() {
    var v = vozEspanol();
    if (v) { mejorVozVista = v; }
  }

  function vozEspanol() {
    if (!TTS) { return null; }
    var voces = TTS.getVoices() || [];
    var mejor = null;
    var mejorPuntaje = -1;
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
    // Edge tarda bastante mas que Chrome en enumerar sus voces, sobre todo
    // las que se sintetizan en servidor. Pasado este tiempo se sigue adelante
    // con lo que haya, que puede ser nada: hablar con la voz por defecto es
    // preferible a esperar indefinidamente en silencio.
    window.setTimeout(resolver, 2800);
  }

  // Estimacion de cuanto tarda en leerse un texto en voz alta. Se usa cuando
  // no hay sintesis y hay que darle margen al lector de pantalla del usuario.
  function tiempoDeLectura(texto) {
    return Math.min(20000, 1400 + (texto.length * 58) / VELOCIDAD_VOZ);
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
  // ---------------------------------------------------------------------
  // El arranque recortado: pasa en TODAS las frases, no solo en la primera
  // ---------------------------------------------------------------------
  // El motor de voz se come el principio de cada locucion que llega despues
  // de un silencio. Y entre una frase y otra de esta pagina siempre hay
  // silencio: mientras suena el audio, mientras el usuario contesta. Asi que
  // el problema no es del arranque de la sesion, es de cada turno.
  //
  // Tres remedios que NO sirven, y conviene dejarlos anotados para no
  // repetirlos:
  //
  //   - Anteponer comas o puntos para que el recorte se coma una pausa.
  //     Varios motores de celular VERBALIZAN los signos: la pagina decia
  //     "coma, coma, coma". Inaceptable.
  //
  //   - Una frase de calentamiento a volumen cero. Con volumen cero el motor
  //     ni siquiera abre el canal de audio, asi que no despierta nada.
  //
  //   - Ponerle el saludo solo a la primera frase. Arregla una de diez.
  //
  // Lo que si funciona: que CADA frase empiece por una palabra de verdad que
  // se pueda perder sin consecuencias. Si el sistema se come 300
  // milisegundos, se come "Bien" y la pregunta llega entera.
  //
  // Se rotan varias para que no suene a muletilla, y se omite cuando la frase
  // ya empieza por una palabra corta que cumple el mismo papel ("Listo.",
  // "Borrado.", "Claro."). El resultado no suena a parche: suena a alguien
  // que enlaza lo que va diciendo.
  var nConector = 0;
  var yaHabloAlguna = false;

  function conArranqueDesechable(texto, idioma) {
    var pack = IDIOMAS[idioma] || IDIOMAS.es || {};

    if (!yaHabloAlguna) {
      yaHabloAlguna = true;
      return (pack.saludo || "Hola.") + " " + texto;
    }
    // NO hay excepciones. Aqui habia una: si la frase ya empezaba por una
    // palabra corta seguida de punto, se daba por hecho que esa haria de
    // sacrificio y no se anadia ninguna.
    //
    // Fue un error, y devolvio el recorte que ya estaba resuelto. Muchas de
    // las frases empiezan asi y esas palabras SIGNIFICAN algo: "Listo, ya lo
    // tengo", "Borrado. Dime tu numero otra vez". Perder "Borrado" es perder
    // justo la confirmacion de que se borro. La palabra desechable tiene que
    // ser una que sobre, no la primera que haya.

    var lista = pack.conectores || ["Bien."];
    var c = lista[nConector % lista.length];
    nConector++;
    return c + " " + texto;
  }

  // Cierto en cuanto el motor de voz EMPIEZA a hablar de verdad, no cuando se
  // le pide que hable. La diferencia importa: Android Chrome deja hablar sin
  // gesto previo del usuario, iOS Safari no. Pidiendolo en los dos y mirando
  // quien arranco, cada plataforma da lo mejor que puede sin que haya que
  // adivinar por el user agent.
  var algunaVozSono = false;

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

  // NOTA IMPORTANTE, para no volver a caer en lo mismo.
  //
  // Aqui habia una vigilancia que miraba TTS.speaking para deducir si la voz
  // habia sonado. Parecia razonable y estaba mal: en iOS Safari y en algunos
  // Chrome de Android, speaking devuelve true en cuanto se encola la
  // locucion, AUNQUE el navegador la tenga bloqueada y no salga ni un sonido.
  //
  // El resultado fue el peor posible. La pagina creia que la bienvenida ya se
  // habia oido, asi que al tocar la pantalla se saltaba la frase del toque y
  // entraba directo el audio. Y como esa frase era la unica ligada a un gesto
  // del usuario, el motor de voz nunca se desbloqueaba: el bot no hablaba en
  // toda la sesion, ni al principio ni en las preguntas del final. En un
  // iPhone 13 y en un Galaxy S24 fallaba; en un S25 y en un Mac funcionaba.
  //
  // Leccion: speaking no prueba que haya sonido. La unica prueba es onstart,
  // que dispara cuando el motor empieza a emitir de verdad.
  //
  // Ya no hace falta deducir nada, porque ahora en el toque se habla SIEMPRE.
  // Ver comenzar().

  // Parte un texto en frases de hasta ~130 caracteres. Ver la nota de por
  // que en decirEnVozAlta: es lo que evita el corte a los quince segundos
  // de Android sin depender de pause()/resume(), que en movil esta roto.
  function partirEnTrozos(texto) {
    var LARGO = 130;
    var partes = texto.match(/[^.!?\u2026]+[.!?\u2026]*\s*/g) || [texto];
    var trozos = [];
    var i, p, palabras, actual, j;
    for (i = 0; i < partes.length; i++) {
      p = partes[i].replace(/^\s+|\s+$/g, "");
      if (!p) { continue; }
      if (p.length <= LARGO) { trozos.push(p); continue; }
      // Una frase sola ya mas larga que el limite: se corta por palabras,
      // sin partir ninguna a la mitad.
      palabras = p.split(/\s+/);
      actual = "";
      for (j = 0; j < palabras.length; j++) {
        if (actual && (actual + " " + palabras[j]).length > LARGO) {
          trozos.push(actual);
          actual = palabras[j];
        } else {
          actual = actual ? actual + " " + palabras[j] : palabras[j];
        }
      }
      if (actual) { trozos.push(actual); }
    }
    return trozos.length ? trozos : [texto];
  }

  function nuevaFrase(texto, voz, idioma) {
    var pack = IDIOMAS[idioma || "es"] || IDIOMAS.es || {};
    var f = new window.SpeechSynthesisUtterance(texto);
    f.lang = pack.lang || "es-CO";
    // Sin voz explicita, el motor elige por su cuenta segun el idioma. Es lo
    // que pasa en Edge, que a veces no ha terminado de enumerar las voces.
    if (voz) { f.voice = voz; }
    // 0.95 y 1.02: apenas por debajo de la velocidad nominal y apenas por
    // encima del tono neutro. Es lo que menos suena a maquina leyendo.
    f.rate = VELOCIDAD_VOZ;
    f.pitch = 1.02;
    f.volume = 1;
    return f;
  }

  // hablar(texto, despues): apaga el microfono, deja pasar el silencio de
  // arranque, dice el texto en espanol y solo entonces ejecuta "despues". Es
  // el punto por el que pasa casi toda la voz de la pagina, para que las
  // reglas 1 y 2 del encabezado no dependan de acordarse de aplicarlas.
  var ultimaVezQueHablo = 0;

  function hablar(clave, despues, datos) {
    detenerMicrofono();

    // Lo que se anuncia por aria-live va SIEMPRE en espanol, pase lo que pase
    // con la voz sintetica. Ese canal lo lee el lector de pantalla del propio
    // usuario, que esta en su idioma y no depende de lo que traiga instalado
    // el navegador. Solo la voz de la pagina se adapta.
    var texto = frase("es", clave, datos);
    anunciar(texto);
    despertarSalida();

    function seguir() { if (despues) { despues(); } }

    if (!TTS || typeof window.SpeechSynthesisUtterance !== "function") {
      // Este navegador no sintetiza voz. No hay riesgo de que se pisen dos
      // canales, asi que el anuncio sale de una y lo lee el lector de
      // pantalla.
      callarAnuncio();
      anunciarYa(texto);
      window.setTimeout(seguir, SILENCIO_INICIAL_MS + tiempoDeLectura(texto));
      return;
    }

    detenerLatido();
    TTS.cancel();

    conVozLista(function (voz) {
      // Aqui NO se decide callar. Se habla con la mejor voz que haya, y si no
      // hay ninguna en espanol se habla igual con la del sistema, salvo que
      // se apague a proposito. Ver la nota de HABLAR_SIN_VOZ_ESPANOLA.
      if (!voz && !HABLAR_SIN_VOZ_ESPANOLA) {
        window.setTimeout(seguir, SILENCIO_INICIAL_MS + tiempoDeLectura(texto));
        return;
      }
      // Se habla en el idioma de la voz que se va a usar, no en el de la
      // campana. Una voz inglesa pronunciando ingles se entiende; la misma
      // voz pronunciando espanol, no.
      idiomaHablado = idiomaDeLaVoz(voz);
      var dicho = frase(idiomaHablado, clave, datos);

      // El silencio de arranque solo hace falta cuando el dispositivo lleva
      // rato callado. Entre dos frases seguidas de la misma conversacion el
      // canal sigue abierto, y esperar otro segundo entero se siente como si
      // la pagina se hubiera quedado pensando. Eso era lo que hacia que la
      // pregunta del PDF tardara tanto en llegar despues del numero.
      // Entre dos frases seguidas basta con medio segundo. Antes eran 200 ms,
      // y con eso la voz arrancaba encima del tono de cierre, que dura algo
      // mas de cuatro decimas: se oia el principio del pitido y nada mas.
      var seguido = (new Date()).getTime() - ultimaVezQueHablo < 5000;
      var espera = seguido ? 550 : SILENCIO_INICIAL_MS;

      window.setTimeout(function () {
        ultimaVezQueHablo = (new Date()).getTime();
        decirEnVozAlta(conArranqueDesechable(dicho, idiomaHablado),
                       voz, seguir, idiomaHablado);
      }, espera);
    });
  }

  function decirEnVozAlta(texto, voz, seguir, idioma) {
    // Se habla en trozos cortos, encolados de una vez, y no en una sola
    // locucion larga.
    //
    // Chrome en Android deja de emitir a los quince segundos si nadie lo
    // empuja. Ese empujon normalmente es un pause()/resume() periodico,
    // pero en movil ese mismo pause() rompe la voz en vez de mantenerla
    // viva (ver la nota de iniciarLatido), asi que ahi esta apagado. Sin
    // otra defensa, la bienvenida -la frase mas larga de la pagina- se
    // cortaba a mitad de camino y se quedaba en silencio el resto de la
    // sesion.
    //
    // Ninguna frase de la pieza dura sola quince segundos. Troceada por
    // oraciones, cada trozo termina bien antes del limite, y el corte no
    // tiene ocasion de producirse. El motor de voz reproduce los trozos
    // encolados uno detras de otro sin que haya que esperar el "onend" de
    // cada uno para pedir el siguiente: encolarlos todos de entrada es lo
    // que evita el hueco entre ellos.
    var trozos = partirEnTrozos(texto);
    var ultimo = trozos.length - 1;

    var listo = false;
    var vigia = null;
    function finalizar() {
      if (listo) { return; }
      listo = true;
      window.clearTimeout(vigia);
      detenerLatido();
      // Respiro corto: si el microfono abre en el mismo instante en que calla
      // la voz, alcanza a capturar la cola de la propia frase.
      window.setTimeout(seguir, 250);
    }

    // Un vigia por trozo, no uno solo para toda la frase.
    //
    // Antes habia un unico setTimeout armado al principio, con el largo de
    // la frase COMPLETA. Pero trocear agrega una demora real por trozo -el
    // motor tarda un poco en arrancar cada locucion nueva, y las voces que
    // se sintetizan en un servidor ("Google...") de por medio necesitan ida
    // y vuelta a la red- que la formula de lectura no contaba. Con varios
    // trozos esos segundos se acumulan, y podian comerse el margen antes de
    // que el ULTIMO trozo alcanzara a sonar completo: el vigia lo cortaba a
    // medio decir ("Respond...") y abria el microfono encima, justo lo que
    // se reporto.
    //
    // Ahora cada trozo arma su propio vigia, con margen de sobra para EL
    // SOLO. El acumulado de los trozos anteriores ya no cuenta en contra
    // del ultimo.
    function armarVigia(textoDelTrozo) {
      window.clearTimeout(vigia);
      vigia = window.setTimeout(finalizar, tiempoDeLectura(textoDelTrozo) + 6000);
    }

    var arranco = false;
    function alArrancar() {
      arranco = true;
      algunaVozSono = true;
      callarAnuncio();
      var instruccion = document.getElementById("instruccion-visual");
      if (instruccion) { instruccion.classList.remove("visible"); }
    }

    // Los trozos se hablan de a uno, nunca varios encolados de una vez.
    //
    // El estandar dice que dos speak() seguidos deberian sonar uno detras
    // del otro sin ayuda. En la practica, varios motores de Android no
    // encolan de verdad: un speak() mientras otra locucion esta sonando la
    // corta a medias en vez de esperar su turno. De ahi el sintoma de "el
    // bot habla y de repente se queda callado": el segundo trozo cortaba al
    // primero antes de que terminara.
    //
    // Pidiendo el trozo siguiente solo cuando el anterior de verdad termino
    // (su propio "onend"), nunca hay mas de una locucion viva a la vez, que
    // es exactamente como sonaba la pagina antes de trocear nada.
    function encolar(vozAUsar) {
      var i = 0;
      function siguiente() {
        if (i >= trozos.length) { return; }
        var idx = i;
        var esUltimo = (idx === ultimo);
        var u = nuevaFrase(trozos[idx], vozAUsar, idioma);
        i++;
        if (idx === 0) { u.onstart = alArrancar; }
        if (esUltimo) {
          u.onend = finalizar;
          u.onerror = finalizar;
        } else {
          // Un tropiezo a mitad de camino no cierra el paso: se sigue con el
          // trozo siguiente en vez de dejar el resto de la frase sin decir.
          u.onend = siguiente;
          u.onerror = siguiente;
        }
        // Red de seguridad por trozo: en algunos Chrome "onend" no dispara
        // si la pestana pierde el foco. Sin esto el flujo quedaria colgado
        // para siempre. Se rearma en cada trozo, ver la nota de armarVigia.
        armarVigia(trozos[idx]);
        window._utterances.push(u);
        TTS.speak(u);
      }
      siguiente();
    }

    iniciarLatido();
    try { encolar(voz); } catch (e) { finalizar(); }

    // Si a los dos segundos y medio no ha empezado a sonar, se reintenta una
    // vez con una voz instalada en el aparato.
    //
    // Las mejores voces de Chrome, las de Google, se sintetizan en servidor:
    // necesitan internet y se quedan mudas si la red las bloquea o va mal.
    // Una voz local suena peor, pero suena. Esto cubre el caso de que la
    // pieza se abra desde una red distinta o restringida.
    window.setTimeout(function () {
      if (arranco || listo || !TTS) { return; }
      var local = vozLocal(idioma);
      if (!local || (voz && local.name === voz.name)) { return; }
      // Entre cancelar y volver a hablar va un respiro, por la misma razon
      // que en la locucion del toque: cancel() no vacia la cola en el acto,
      // y lo que se meta inmediatamente detras se va con la basura.
      try { TTS.cancel(); } catch (e) { /* sin efecto */ }
      window.setTimeout(function () {
        if (arranco || listo || !TTS) { return; }
        try { encolar(local); } catch (e) { finalizar(); }
      }, 150);
    }, 2500);
  }


  // Habla SIN temporizadores y SIN cancelar nada antes.
  //
  // iOS solo acepta la primera locucion de la sesion si speak() se llama de
  // forma sincrona dentro del manejador del gesto del usuario. hablar() no
  // sirve para eso: mete un setTimeout para dejar su silencio inicial, y ese
  // salto basta para que el navegador descarte la locucion y deje el motor de
  // voz mudo el resto de la sesion.
  //
  // Por eso el primer mensaje despues del toque, que es justo el que no puede
  // fallar, va por aqui. Tampoco hace falta el calentamiento contra el
  // recorte: el usuario acaba de tocar la pantalla, asi que el dispositivo de
  // audio ya esta despierto.
  function hablarDeInmediato(clave, despues, datos) {
    // Lo que anuncia el lector de pantalla va siempre en espanol.
    var texto = frase("es", clave, datos);
    anunciar(texto);

    function seguir() { if (despues) { despues(); } }

    if (!TTS || typeof window.SpeechSynthesisUtterance !== "function") {
      window.setTimeout(seguir, tiempoDeLectura(texto));
      return;
    }

    // Aqui no se puede esperar a que terminen de cargar las voces: la
    // locucion tiene que salir dentro del gesto o iOS la descarta. Se usa la
    // mejor voz que haya en este preciso instante, y su idioma manda.
    var voz = vozEspanol() || mejorVozVista;
    idiomaHablado = idiomaDeLaVoz(voz);

    var dicho = conArranqueDesechable(frase(idiomaHablado, clave, datos),
                                      idiomaHablado);

    // Troceado por la misma razon que en decirEnVozAlta: alguna de las
    // frases que pasan por aqui (la del toque, cuando incluye el aviso del
    // microfono) puede llegar a durar quince segundos, justo el limite en el
    // que Android deja de emitir si nadie lo empuja.
    var trozos = partirEnTrozos(dicho);
    var ultimo = trozos.length - 1;

    // El idioma se pide en la forma mas general que sirva. Con una voz
    // elegida se usa el suyo, que existe con seguridad. Sin ella se pide
    // "es" a secas y no "es-CO": el motor de un celular suele traer es-ES o
    // es-US, y pedirle un pais que no tiene es una forma de quedarse mudo.
    function armar(conVoz, texto2) {
      var f = new window.SpeechSynthesisUtterance(texto2);
      f.lang = (conVoz && conVoz.lang) ? conVoz.lang : idiomaHablado;
      f.rate = VELOCIDAD_VOZ;
      f.pitch = 1.02;
      f.volume = 1;
      if (conVoz) { f.voice = conVoz; }
      return f;
    }

    var listo = false;
    var arranco = false;
    var reintentado = false;
    var vigia = null;

    // cerrar() da la frase por dicha pase lo que pase. finalizar() solo la da
    // por dicha si ya no queda nada por intentar: un error instantaneo no
    // puede cerrar el paso mientras el reintento sigue vivo, porque entonces
    // el MP3 arrancaba encima de una voz que todavia iba a hablar.
    function cerrar() {
      if (listo) { return; }
      listo = true;
      window.clearTimeout(vigia);
      window.setTimeout(seguir, 250);
    }
    function finalizar() {
      if (listo) { return; }
      if (!arranco && !reintentado) { return; }
      cerrar();
    }
    function alArrancar() {
      arranco = true;
      algunaVozSono = true;
      callarAnuncio();
      var instruccion = document.getElementById("instruccion-visual");
      if (instruccion) { instruccion.classList.remove("visible"); }
    }

    // Un vigia por trozo, no uno solo para toda la frase. Ver la nota
    // identica en decirEnVozAlta: trocear agrega una demora real por trozo
    // que la formula de lectura, pensada para una sola locucion, no cuenta.
    // Con varios trozos esos segundos se acumulan y podian comerse el margen
    // antes de que el ULTIMO trozo alcanzara a sonar completo.
    function armarVigia(textoDelTrozo) {
      window.clearTimeout(vigia);
      vigia = window.setTimeout(cerrar, tiempoDeLectura(textoDelTrozo) + 5000);
    }

    // Habla los trozos desde el indice indicado, encadenados por "onend":
    // nunca hay dos locuciones vivas a la vez. Solo se llama DESPUES de que
    // el primer trozo ya demostro que el motor esta despierto, asi que estos
    // ya no necesitan ningun cuidado de gesto.
    function hablarDesde(vozAUsar, desde) {
      var i = desde;
      function siguiente() {
        if (i > ultimo) { cerrar(); return; }
        var idx = i;
        var u = armar(vozAUsar, trozos[idx]);
        i++;
        if (idx === ultimo) { u.onend = cerrar; u.onerror = cerrar; }
        else { u.onend = siguiente; u.onerror = siguiente; }
        armarVigia(trozos[idx]);
        window._utterances.push(u);
        try { TTS.speak(u); } catch (e) { siguiente(); }
      }
      siguiente();
    }

    var primerTrozo = armar(voz, trozos[0]);
    primerTrozo.onstart = alArrancar;
    primerTrozo.onend = function () {
      if (ultimo > 0) { hablarDesde(voz, 1); } else { finalizar(); }
    };
    primerTrozo.onerror = finalizar;

    armarVigia(trozos[0]);
    window._utterances.push(primerTrozo);

    try { TTS.speak(primerTrozo); } catch (e) { finalizar(); }
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

  // Los patrones aceptan los CINCO idiomas a la vez, no solo el que se este
  // hablando. Cuesta poco y cubre el caso real: la pagina puede terminar
  // preguntando en ingles, porque es la unica voz que hay en el equipo,
  // mientras quien responde sigue contestando en espanol.
  var PATRON_SI = /\b(si|sii|sip|yes|yeah|yep|yup|sure|sim|oui|ouais|ok|okey|okay|claro|correcto|correct|certo|esatto|exact|giusto|dale|listo|bueno|obvio|exacto|afirmativo|positivo|supuesto|hagale|vale|quiero|acepto|accord|isso|right)\b/;
  var PATRON_NO = /\b(no|nop|nope|nah|nel|nao|non|negativo|nunca|jamas|tampoco|incorrecto|incorrect|equivocado|wrong|sbagliato|faux)\b/;

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

  // Los numeros, en los cinco idiomas. Se mezclan todos en una sola tabla en
  // vez de tener una por idioma: apenas chocan entre si, y asi un usuario
  // puede dictar en espanol aunque la pagina le haya preguntado en ingles.
  var UNIDADES = {
    cero: "0", zero: "0",
    uno: "1", un: "1", una: "1", one: "1", um: "1",
    dos: "2", two: "2", dois: "2", due: "2", deux: "2",
    tres: "3", three: "3", tre: "3", trois: "3",
    cuatro: "4", four: "4", quatro: "4", quattro: "4", quatre: "4",
    cinco: "5", five: "5", cinque: "5", cinq: "5",
    seis: "6", six: "6", sei: "6",
    siete: "7", seven: "7", sete: "7", sette: "7", sept: "7",
    ocho: "8", eight: "8", oito: "8", otto: "8", huit: "8",
    nueve: "9", nine: "9", nove: "9", neuf: "9"
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
    var t = normalizar(texto);
    t = t.replace(/\bventicinco\b/g, "veinticinco");
    t = t.replace(/\bsiente\b/g, "siete");
    
    var partes = t.split(" ");
    var salida = [];
    var i, j, p, v;
    for (i = 0; i < partes.length; i++) {
      p = partes[i];
      if (!p || p === "y") { continue; }
      if (/^\d+$/.test(p)) { v = p; }
      else if (UNIDADES.hasOwnProperty(p)) { v = UNIDADES[p]; }
      else if (COMPUESTOS.hasOwnProperty(p)) { v = COMPUESTOS[p]; }
      else { continue; }
      
      if (v.length === 2 && v.endsWith("0") && parseInt(v) >= 30) {
        if (i + 2 < partes.length && partes[i+1] === "y" && UNIDADES.hasOwnProperty(partes[i+2])) {
          v = (parseInt(v) + parseInt(UNIDADES[partes[i+2]])).toString();
          i += 2;
        }
      }
      
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
  // Al confirmar el numero ya no se responde si o no, sino con el verbo de lo
  // que se quiere hacer. "Si" y "no" eran ambiguos justo donde mas caro sale
  // equivocarse: si a "el numero es 3, 1, 5..." se contesta "no", no queda
  // claro si se niega el numero o se niega la pregunta.
  //
  // Se siguen aceptando si y no como respaldo, porque mucha gente los va a
  // decir por costumbre, pero el orden de evaluacion protege: primero volver
  // a escuchar, que no cambia nada; despues corregir, que borra; y de ultimo
  // correcto, que es lo unico irreversible.
  var PATRON_CORRECTO = /\b(correcto|correcta|corretto|correct|exacto|exacta|exact|esta bien|asi es|quedo bien|perfecto|si|yes|sim|oui|certo|giusto|bon)\b/;
  var PATRON_CORREGIR = /\b(corregir|corrijalo|corrigelo|corrige|corriger|correggere|corrigir|cambiar|cambialo|mal|esta mal|quedo mal|incorrecto|incorrect|equivocado|errado|sbagliato|faux|wrong|fix|no)\b/;

  var PATRON_REPETIR = /\b(repit\w*|repet\w*|ripet\w*|repeat|again|encore|ancora|de novo|volver a (escuchar|oir|decir|leer)|volverlo a (escuchar|oir)|vuelv\w* a (escuchar|oir|decir|leer)|otra vez|de nuevo|nuevamente|no escuche|no oi|no entendi|que dijo|como dijo)\b/;
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
    // El tono de cierre solo suena si de verdad se estaba escuchando. Esta
    // funcion se llama tambien antes de cada frase de la pagina, por
    // seguridad, y ahi no hay ningun turno que cerrar.
    var estabaEscuchando = queremosEscuchar;
    queremosEscuchar = false;

    // El tono va PRIMERO. Antes estaba despues de un "return" que se dispara
    // cuando no hay objeto de reconocimiento, y en ese camino no sonaba nunca.
    if (estabaEscuchando) { tonoYaTeOi(); }

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

    // Se escucha en el mismo idioma en que se pregunto. Preguntar en un
    // idioma y escuchar en otro degrada mucho la transcripcion: "si" dictado
    // a un reconocedor en ingles suele volver como "see". Los patrones de
    // arriba aceptan los cinco de todas formas, por si la persona contesta
    // en otro.
    reconocimiento.lang = (IDIOMAS[idiomaHablado] || IDIOMAS.es || {}).lang || "es-CO";
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

    // El tono va ANTES de abrir el microfono, no despues: si sonara con el
    // microfono ya abierto, el propio reconocedor lo capturaria como si fuera
    // el usuario hablando.
    tonoTeToca();

    queremosEscuchar = true;
    window.setTimeout(function () {
      if (!queremosEscuchar || estado === "FIN") return;
      try {
        reconocimiento.start();
      } catch (e) {
        avisarSoloTeclado();
      }
    }, 450);
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
    hablar("soloTeclado");
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
      // En la confirmacion las teclas siguen a los verbos: ce de correcto, e
      // de corregir, erre de volver a escuchar. En las demas preguntas, que
      // si son de si o no, se mantienen ese y ene.
      if (estado === "CONFIRMA_NUMERO") {
        if (/^[cC]$/.test(k)) { e.preventDefault(); resolverConfirmacion("correcto"); }
        else if (/^[eE]$/.test(k)) { e.preventDefault(); resolverConfirmacion("corregir"); }
        else if (/^[rR]$/.test(k)) { e.preventDefault(); repetirNumero(); }
        else if (/^[sS]$/.test(k)) { e.preventDefault(); resolverConfirmacion("correcto"); }
        else if (/^[nN]$/.test(k)) { e.preventDefault(); resolverConfirmacion("corregir"); }
        return;
      }

      if (/^[sS]$/.test(k)) { e.preventDefault(); resolverSiNo("si"); }
      else if (/^[nN]$/.test(k)) { e.preventDefault(); resolverSiNo("no"); }
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
    // "no-cache" obliga a preguntarle al servidor si hay una version mas
    // nueva. Aqui estaba "force-cache", que hace lo contrario: usar la copia
    // guardada sin comprobar nada. El resultado fue que a quien ya hubiera
    // abierto la pagina antes se le descargaba el PDF viejo para siempre,
    // en cualquier navegador y en cualquier aparato.
    //
    // No implica volver a bajarlo cada vez: si el archivo no cambio, el
    // servidor responde 304 y se reutiliza el que ya estaba.
    window.fetch(enlacePdf.getAttribute("href"), { cache: "no-cache" })
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

  // El texto del aria-label va SIEMPRE en espanol: lo lee el lector de
  // pantalla del propio usuario, no la voz del navegador.
  function textoDeArranque() {
    return frase("es", "bienvenida");
  }

  function prepararArranque() {
    arranque.setAttribute("aria-label", frase("es", "etiquetaArranque"));
    arranque.focus();
    var instruccion = document.getElementById("instruccion-visual");
    if (instruccion) {
      instruccion.textContent = esMovil() ? "Toca la pantalla para empezar" : "Oprime cualquier tecla o haz clic para empezar";
      instruccion.classList.add("visible");
    }

    // El usuario solicito auto-arranque independiente del navegador.
    // Aunque Safari lo bloqueara, se lanza la peticion.
    window.setTimeout(function () {
      if (yaArranco) { return; }
      bienvenidaLanzada = true;
      hablar("bienvenida", alTerminarBienvenida);
    }, ESPERA_PRIMERA_FRASE);
  }

  // Arranca y pausa el audio en el acto, para dejarlo desbloqueado. Solo se
  // usa dentro del manejador del gesto del usuario.
  function desbloquearAudio() {
    try {
      var p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(function () {
          // Si para cuando resuelve ya estamos reproduciendo de verdad, no se
          // toca: pausar aqui cortaria la experiencia recien empezada.
          //
          // Solo se pausa, sin tocar la posicion. reproducir() ya la vuelve a
          // poner en cero por su cuenta justo antes de reproducir de verdad,
          // asi que hacerlo tambien aqui era superfluo. Y en Safari, mover la
          // posicion de un audio que todavia esta terminando su propio
          // arranque interno es una causa conocida de que la primera
          // reproduccion se corte sola y la segunda si salga completa, que es
          // justo lo reportado en iPhone.
          if (estado !== "REPRODUCIENDO") {
            audio.pause();
          }
        })["catch"](function () { /* bloqueado: se vera al reproducir */ });
      }
    } catch (e) { /* sin efecto */ }
  }

  var bienvenidaTerminada = false;
  var bienvenidaLanzada = false;
  var arrancarAlTerminar = false;

  // La bienvenida acabo de decirse. Si el usuario ya habia tocado la pantalla
  // mientras sonaba, es ahora cuando arranca la experiencia.
  function alTerminarBienvenida() {
    bienvenidaTerminada = true;
    if (arrancarAlTerminar) {
      arrancarAlTerminar = false;
      desbloquearAudio();
      hablarDeInmediato("arranca", reproducir);
    }
  }

  function comenzar() {
    if (yaArranco) { return; }
    yaArranco = true;

    if (algunaVozSono && !bienvenidaTerminada) {
      arrancarAlTerminar = true;
      desbloquearAudio();
      mantenerPantallaEncendida();
      arranque.blur();
      var instruccion = document.getElementById("instruccion-visual");
      if (instruccion) { instruccion.classList.remove("visible"); }
      return;
    }

    var instruccion = document.getElementById("instruccion-visual");
    if (instruccion) { instruccion.classList.remove("visible"); }

    despertarSalida();
    mantenerPantallaEncendida();

    arranque.setAttribute("aria-label", "Reproduciendo.");
    arranque.blur();

    desbloquearAudio();

    if (TTS) {
      try { TTS.cancel(); } catch (e) {}
    }

    var claveArranque = bienvenidaTerminada ? "arranca" : "bienvenida";
    hablarDeInmediato(claveArranque, reproducir);
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
        // El gesto no basto o se perdio. Se vuelve a pedir, pero con una
        // frase corta: repetir la bienvenida entera, que es lo que se hacia
        // antes, sonaba a que la pagina se hubiera reiniciado sola.
        yaArranco = false;
        estado = "ESPERA_GESTO";
        arranque.setAttribute("aria-label", frase("es", "tocaOtraVez"));
        arranque.focus();
        hablar("tocaOtraVez");
      });
    }
  }

  // Al terminar el audio entran las preguntas de una vez. El aviso del
  // microfono ya se dio en la bienvenida, antes de tocar la pantalla: alli es
  // donde el usuario decide si sigue o no, y por eso tiene que saber de
  // entrada a que se esta metiendo.
  audio.addEventListener("ended", function () { preguntarRepetir(); });

  audio.addEventListener("error", function () {
    hablar("errorAudio", preguntarContacto);
  });

  /* =====================================================================
     ESTADO 3 — "Quieres escuchar el mensaje otra vez?"
     ===================================================================== */

  function preguntarRepetir() {
    estado = "PREGUNTA_REPETIR";
    reintentos = 0;
    hablar("preguntaRepetir", function () { escuchar(oirSiNo); });
  }

  /* =====================================================================
     ESTADO 4 — "Quieres contactar a Tierra Fresca?"
     ===================================================================== */

  function preguntarContacto() {
    estado = "PREGUNTA_CONTACTO";
    reintentos = 0;
    hablar("preguntaContacto", function () { escuchar(oirSiNo); });
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
        hablar("noEntiendo", function () {
          escuchar(enConfirmacion ? oirConfirmacion : oirSiNo);
        });
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
      if (r === "si") { hablar("repitiendo", reproducir); }
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
      // Aqui solo se llega por teclado. Por voz manda oirConfirmacion, que
      // entiende los tres verbos.
      resolverConfirmacion(r === "si" ? "correcto" : "corregir");
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
  // "clave" dice cual de los tres pedidos toca: el largo de la primera vez,
  // el de despues de borrar, o el de cuando faltaron digitos. Los tres dicen
  // que paso y vuelven a pedir el numero en la MISMA frase: encadenar dos
  // locuciones dejaria al usuario varios segundos en silencio sin saber si
  // tiene que hablar o esperar.
  function pedirNumero(clave) {
    estado = "CAPTURA_NUMERO";
    digitos = [];
    reintentos = 0;
    // Solo se reinicia el contador de fallos en una entrada de verdad: la
    // primera vez, o cuando el usuario pidio borrar. La repregunta por falta
    // de digitos (clave "numeroFaltaron") NO lo reinicia, porque es
    // precisamente la que necesita que el contador seguna sumando.
    if (clave !== "numeroFaltaron") { intentosSinNumero = 0; }
    extensionesDictado = 0;

    hablar(clave || "pedirNumero", function () {
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
    // escuchando, sin decir nada. Llegar un digito nuevo prueba que el
    // dictado sigue vivo, asi que tambien se reinicia el contador de
    // extensiones: la tolerancia a pausas es por tramo, no acumulada para
    // todo el dictado entero.
    extensionesDictado = 0;
    esperarFinDelDictado();
  }

  // Si el usuario deja de hablar y ya hay digitos suficientes, se da el
  // dictado por terminado. Es lo que permite decir el celular de corrido sin
  // tener que anunciar que uno acabo.
  function esperarFinDelDictado() {
    window.clearTimeout(relojDictado);
    // Antes solo se cerraba el dictado si YA habia numeros suficientes. Si
    // el usuario decia cualquier cosa sin digitos ("hola, hola"), la cuenta
    // de silencio se cumplia y no pasaba nada: ni se repetia la pregunta, ni
    // se avisaba nada, y el microfono quedaba abierto para siempre. Ahora el
    // reloj SIEMPRE cierra el dictado al cumplirse; cerrarCaptura() ya sabe
    // que hacer segun cuantos digitos haya, y de eso encargarse es su trabajo,
    // no el de este reloj.
    relojDictado = window.setTimeout(function () {
      if (estado !== "CAPTURA_NUMERO") { return; }

      // Ya hay algunos digitos, pero no los suficientes, y el usuario se
      // quedo callado. Antes de hoy esto simplemente no hacia nada -tolerante
      // con cualquier pausa, pero tambien con el silencio total-. Se corrigio
      // para que SIEMPRE actuara, y esa correccion arreglo el silencio total
      // pero de paso convirtio una pausa normal entre "315" y "888" en un
      // intento fallido que borra lo ya dictado. Ahora, mientras haya digitos
      // de por medio, se le da mas tiempo en silencio -hasta dos veces mas-
      // antes de asumir que de verdad se detuvo.
      if (digitos.length > 0 && digitos.length < MINIMO_DIGITOS &&
          extensionesDictado < 2) {
        extensionesDictado++;
        esperarFinDelDictado();
        return;
      }
      extensionesDictado = 0;
      cerrarCaptura();
    }, PAUSA_FIN_DICTADO_MS);
  }

  function reiniciarNumero() {
    window.clearTimeout(relojDictado);
    pedirNumero("numeroBorrado");
  }

  function cerrarCaptura() {
    window.clearTimeout(relojDictado);
    detenerMicrofono();
    if (digitos.length < MINIMO_DIGITOS) {
      // Tres vueltas sin numero valido -incluido no decir nada- y se deja de
      // insistir: se sigue con la conversacion en vez de quedarse atascado.
      intentosSinNumero++;
      if (intentosSinNumero >= 3) {
        intentosSinNumero = 0;
        hablar("numeroImposible", despedirse);
        return;
      }
      pedirNumero("numeroFaltaron");
      return;
    }
    intentosSinNumero = 0;
    confirmarNumero();
  }

  /* =====================================================================
     ESTADO 6 — Confirmacion del numero
     ===================================================================== */

  function confirmarNumero() {
    estado = "CONFIRMA_NUMERO";
    reintentos = 0;
    hablar("confirmar", function () { escuchar(oirConfirmacion); },
           { numero: leerDigitos(digitos) });
  }

  // Manejador propio de la confirmacion.
  //
  // Pedir que se repita se evalua PRIMERO y sobre TODAS las transcripciones,
  // y gana aunque alguna traiga tambien un si o un no. La razon es de riesgo,
  // no de gramatica: repetir es reversible y no cuesta nada, mientras que
  // confirmar registra el numero y borrar lo pierde entero. Ante la duda,
  // conviene equivocarse hacia el lado que no rompe nada.
  function oirConfirmacion(alternativas) {
    // El orden importa, y es de riesgo y no de gramatica. Volver a escuchar
    // no cambia nada, corregir borra el numero, y confirmar lo da por bueno y
    // cierra. Ante una frase ambigua conviene equivocarse hacia el lado que
    // menos rompe.
    if (algunaCumple(alternativas, PATRON_REPETIR)) {
      repetirNumero();
      return true;
    }
    if (algunaCumple(alternativas, PATRON_CORREGIR)) {
      resolverConfirmacion("corregir");
      return true;
    }
    if (algunaCumple(alternativas, PATRON_CORRECTO)) {
      resolverConfirmacion("correcto");
      return true;
    }

    // Nada encaja: se vuelve a preguntar en vez de adivinar.
    reintentos++;
    if (reintentos >= 3) {
      reintentos = 0;
      hablar("confirmar", function () { escuchar(oirConfirmacion); },
             { numero: leerDigitos(digitos) });
    }
    return false;
  }

  function resolverConfirmacion(que) {
    detenerMicrofono();
    reintentos = 0;
    if (que === "correcto") { registrar(); }
    else { pedirNumero("numeroBorrado"); }
  }

  // Vuelve a leer el numero sin tocarlo y sin salir del estado.
  function repetirNumero() {
    detenerMicrofono();
    reintentos = 0;
    hablar("repetirNumero", function () { escuchar(oirConfirmacion); },
           { numero: leerDigitos(digitos) });
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


  var dejoNumero = false;

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
      hablar("whatsapp", function () { window.location.href = url; });
      window.setTimeout(function () { window.location.href = url; }, 9000);
      return;
    }

    dejoNumero = true;

    // Solo un acuse corto. El mensaje completo va en el cierre, que ademas
    // sabe si acepto el PDF: decirlo aqui y repetirlo al final alargaba el
    // silencio entre una cosa y otra sin aportar nada.
    hablar("numeroGuardado", preguntarPdf);
  }

  // Antes esto decia adios y acto seguido preguntaba "una ultima cosa", que
  // sonaba a que la conversacion se hubiera reabierto sola. Ahora solo hay
  // una despedida en toda la pieza, y esta al final de todo, en terminar().
  function despedirse() {
    window.clearTimeout(relojDictado);
    detenerMicrofono();
    preguntarPdf();
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
    hablar("preguntaPdf", function () { escuchar(oirSiNo); });
  }

  function terminar(conPdf) {
    estado = "FIN";
    detenerMicrofono();

    // El cierre reconoce lo que la persona acaba de decidir. No es lo mismo
    // despedir a quien dejo su numero y se llevo la propuesta que a quien
    // escucho y prefirio no dejar nada: un unico cierre para los cuatro
    // caminos sonaba a formulario, no a conversacion.
    var clave = dejoNumero
      ? (conPdf ? "cierreNumeroYPdf" : "cierreNumeroSinPdf")
      : (conPdf ? "cierrePdfSinNumero" : "cierreSinNada");

    // La descarga va DESPUES de hablar, no antes.
    //
    // Bajar el archivo genera una notificacion del sistema, y el lector de
    // pantalla la anuncia en cuanto aparece. Si eso ocurre mientras el bot
    // sigue despidiendose, se oyen las dos cosas encimadas: justo lo que se
    // ha estado evitando en toda la pieza. Ahora el cierre avisa de que la
    // descarga viene, termina de hablar, y solo entonces baja el archivo.
    hablar(clave, conPdf ? descargarPdf : null);
  }

  /* =====================================================================
     Arranque
     ===================================================================== */

  comprobarVersion();
  limpiarDireccion();

  // La descarga NO se dispara aqui. En un celular, el gestor de descargas se
  // toma la pantalla apenas empieza a bajar el archivo, y la pagina se queda
  // muda justo cuando iba a hablar: el usuario no entiende que esta pasando.
  // El PDF se ofrece al final, cuando la conversacion ya termino y que el
  // sistema tome el control no le quita nada a nadie.
  precargarPdf();

  // El aparato tarda en enumerar sus voces, y la locucion del gesto no puede
  // esperarlas: tiene que salir dentro del toque. Asi que se piden ya, y se
  // guarda la mejor en cuanto aparezcan. Si el usuario toca la pantalla antes
  // de que el motor termine, la locucion usa esta y no se queda sin ninguna.
  if (TTS && typeof TTS.getVoices === "function") {
    TTS.getVoices();
    recordarMejorVoz();
    if (typeof TTS.addEventListener === "function") {
      TTS.addEventListener("voiceschanged", recordarMejorVoz);
    }
  }
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
