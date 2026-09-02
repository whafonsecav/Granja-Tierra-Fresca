/* =========================================================================
   Granja Tierra Fresca â€” los textos de la voz, en cinco idiomas

   POR QUE EXISTE ESTE ARCHIVO
   ---------------------------
   La voz sintetica no la pone la pagina: la pone el equipo. Y cada equipo
   trae las suyas. Windows suele venir solo con voces en ingles; Chrome trae
   las propias de Google, con espanol incluido; Edge usa unicamente las del
   sistema; y un iPhone configurado en ingles no trae ninguna en espanol.

   Resultado: la misma pagina sonaba bien en Chrome y mal en Edge, en el mismo
   computador. Forzar el texto espanol por una voz inglesa no lo arregla, solo
   lo vuelve audible: suena a maquina leyendo un idioma que no sabe.

   La salida es no pelear con la voz disponible sino hablarle en su idioma. Si
   el equipo solo tiene una voz inglesa, la guia se dice en ingles, bien
   pronunciada, en vez de en un espanol destrozado.

   QUE NO CAMBIA DE IDIOMA
   -----------------------
   Solo cambia lo que dice la voz sintetica. El audio de Natalia, el PDF, el
   correo y todo lo que anuncia el lector de pantalla siguen en espanol: el
   lector de pantalla es del propio usuario, esta en su idioma y no depende de
   lo que tenga instalado el navegador.

   COMO SE AMPLIA
   --------------
   Se agrega una entrada nueva con el codigo de dos letras del idioma y las
   mismas claves. Si a un idioma le falta alguna, se usa la espanola: no hay
   forma de que la pagina se quede muda por una traduccion incompleta.

   Marcadores admitidos dentro de los textos:
     {gesto}   se sustituye por "Toca la pantalla" u "Oprime cualquier tecla",
               segun el aparato, y en el idioma que corresponda
     {aviso}   el parrafo que anuncia las preguntas y el permiso del microfono
     {numero}  los digitos dictados, separados para que se lean uno a uno
   ========================================================================= */

window.TIERRA_FRESCA_IDIOMAS = {

  /* ---------------------------------------------------------------- ESPANOL
     Es el idioma de la campana y el del destinatario. Los demas existen solo
     para cuando el equipo no tenga ninguna voz espanola instalada.          */
  es: {
    lang: "es-CO",
    saludo: "Hola.",
    conectores: ["", "", "", ""],

    gestoMovil: "toca la pantalla",
    gestoEscritorio: "oprime cualquier tecla",
    aviso: "",

    etiquetaArranque: "Empezar a escuchar el mensaje de la Granja Tierra Fresca.",
    etiquetaArranqueMovil: "Por favor, toca dos veces tu pantalla para iniciar.",
    
    bienvenida: "Hola. Tenemos un mensaje especial para ti. Al final te haré unas preguntas breves y te ofreceré descargar automáticamente nuestra propuesta en PDF. Si te pide permisos de micrófono, acéptalos. Ahora sí, aquí va el mensaje:",
    bienvenidaMovil: "Hola. Tenemos un mensaje especial para ti. Al final te haré unas preguntas breves y te ofreceré descargar automáticamente nuestra propuesta en PDF. Si te pide permisos de micrófono, acéptalos. Ahora sí, aquí va el mensaje:",
    puente: "Hola. Tenemos un mensaje especial para ti. Al final te haré unas preguntas breves y te ofreceré descargar automáticamente nuestra propuesta en PDF. Si te pide permisos de micrófono, acéptalos. Ahora sí, aquí va el mensaje:",
    arranca: "Hola. Tenemos un mensaje especial para ti. Al final te haré unas preguntas breves y te ofreceré descargar automáticamente nuestra propuesta en PDF. Si te pide permisos de micrófono, acéptalos. Ahora sí, aquí va el mensaje:",
    arrancaConAviso: "Hola. Tenemos un mensaje especial para ti. Al final te haré unas preguntas breves y te ofreceré descargar automáticamente nuestra propuesta en PDF. Si te pide permisos de micrófono, acéptalos. Ahora sí, aquí va el mensaje:",
    pideToqueMic: "Por favor, toca tu pantalla para habilitar el micrófono y continuar.",
    tocaOtraVez: "Por favor, {gesto} otra vez.",

    soloTeclado: "Parece que no podemos usar tu micrófono. Si quieres escuchar el mensaje otra vez, por favor {gesto} en los próximos 5 segundos. Si no haces nada, entenderemos que no.",
    errorAudio: "No fue posible cargar el audio, y te pido disculpas. De todas formas quisiera saber si quieres contactar a Tierra Fresca.",

    preguntaRepetir: "Listo. ¿Quieres escuchar el mensaje otra vez? Responde sí, o no.",
    repitiendo: "Aquí va otra vez.",
    preguntaContacto: "¿Quieres contactar a Tierra Fresca? Responde sí, o no.",
    noEntiendo: "No logro entenderte. Responde sí o no.",

    pedirNumero: "Dime tu número de celular completo de diez dígitos. Dilo de corrido y con calma. Yo te lo repito al final para que me confirmes que quedó bien.",
    numeroBorrado: "Ya lo borré. Dime nuevamente tu número de celular de diez dígitos otra vez, por favor.",
    numeroSilencio: "No escuché ningún número. Dime tu número de celular completo otra vez, por favor.",
    numeroFaltaron: "Me dijiste menos de diez dígitos. Dime tu número de celular completo de diez dígitos otra vez, por favor.",
    numeroInvalido: "Me dijiste más de diez dígitos. Recuerda que deben ser exactamente diez. Dime tu número de celular completo otra vez, por favor.",
    numeroImposible: "No logré entender tu número. Lo dejamos así por ahora.",

    confirmar: "El número de celular que entendí es: {numero}. Si quedó bien, di: correcto. Si quedó mal, di: corregir. Y si quieres oírlo otra vez, di: repetir.",
    repetirNumero: "{numero}. ¿Quedó bien? Di: correcto, corregir, o repetir",

    numeroGuardado: "Tu número de celular quedó guardado. Uno de nuestros aliados se va a comunicar contigo para coordinar tu envío.",
    
    preguntaPdf: "Una última cosa. ¿Quieres descargar nuestra propuesta? Es un solo párrafo, de diez líneas, escrito para que tu lector de pantalla te lo lea de corrido. Responde sí, o no.",
    
    cierreNumeroYPdf: "Perfecto. La propuesta ya se está descargando en tu equipo y te llamaremos muy pronto para coordinar los detalles. ¡Gracias por tu tiempo!",
    cierreNumeroSinPdf: "Entendido. Ya guardamos tu número, así que te llamaremos muy pronto para conversar directamente. ¡Que tengas un excelente día!",
    cierrePdfSinNumero: "Claro, la descarga iniciará en un instante. Esperamos que la propuesta te anime a contactarnos más adelante para coordinar tu envío. Aquí estamos para cuando lo requieras.",
    cierreSinNada: "Todo claro. Gracias por tu tiempo hoy. Si más adelante cambias de opinión y nos requieres, las puertas de Tierra Fresca están abiertas. ¡Hasta pronto!",
    despedida: "Todo claro. Gracias por tu tiempo hoy. Si más adelante cambias de opinión y nos requieres, las puertas de Tierra Fresca están abiertas. ¡Hasta pronto!"
  },

  /* ----------------------------------------------------------------- INGLES
     El caso mas frecuente: un Windows sin paquete de voz espanol instalado. */
  en: {
    lang: "en-US",
    saludo: "Hello.",
    conectores: ["Alright.", "Okay.", "Now.", "So."],

    gestoMovil: "tap the screen",
    gestoEscritorio: "press any key",
    aviso: "At the end I'll ask you a couple of very short questions that you " +
           "can answer with your microphone. When the browser asks for " +
           "permission, allow it.",

    etiquetaArranque: "Start listening to the message from Granja Tierra Fresca.",
    bienvenida: "We have a special message for you. {aviso} Please, {gesto} to hear this message we have for you.",
    puente: "We have a special message for you. {aviso} Here it goes.",
    arranca: "Here comes the message we prepared especially for you.",
    arrancaConAviso: "{aviso} Here comes the message we prepared especially for you.",
    tocaOtraVez: "Please, {gesto} again.",

    soloTeclado: "I can't use the microphone, so let's go with the keyboard. " +
                 "Press the S key for yes, and the N key for no. When I ask " +
                 "for your phone number, type it with the number keys. And if " +
                 "confirming it, press C if it is correct, E to fix it, or R to hear it again.",
    errorAudio: "I couldn't load the audio, and I'm sorry. I'd still like to " +
                "know whether you want to contact Tierra Fresca.",

    preguntaRepetir: "Would you like to hear the message again? Answer yes, or no.",
    repitiendo: "Here it goes again.",
    preguntaContacto: "Would you like to contact Tierra Fresca? Answer yes, or no.",
    noEntiendo: "I can't quite understand you, and that's on me, not on you. " +
                "If you're on a computer, press the S key for yes, or the N " +
                "key for no.",

    pedirNumero: "Tell me your full phone number, straight through " +
                 "and calmly. I'll read it back at the end so you can confirm it.",
    numeroBorrado: "I deleted it. Tell me your full phone number again, please.",
    numeroFaltaron: "I'm missing some digits. Tell me your full phone number " +
                    "again, please.",
    numeroImposible: "I couldn't make out your number, and that's on me, not you. We'll leave it for now.",

    confirmar: "The number I got is: {numero}. If it is right, say: correct. If it is wrong, say: fix it. And if you want to hear it again, say: repeat.",
    repetirNumero: "{numero}. Is it right? Say: correct, fix it, or repeat.",

    whatsapp: "Perfect. I'll open WhatsApp with the message already written, so " +
              "all you have to do is press send.",
    registrado: "Done. Your number is registered. One of our partners will get " +
                "in touch with you to arrange your delivery.",
    despedida: "Gladly. Thank you for giving us a bit of your time and your " +
               "attention.",

    preguntaPdf: "One last thing. Would you like to download our proposal? " +
                 "It's a single paragraph, ten lines, written so your screen " +
                 "reader can read it straight through. Answer yes, or no.",
    cierreNumeroYPdf: "When I finish speaking, the proposal will download on its own. Thank you for listening all the way through. See you very soon.",
    cierreNumeroSinPdf: "No problem at all. Thank you for listening all the way through. See you very soon.",
    cierrePdfSinNumero: "Thank you for giving us your time. When I finish speaking, the proposal will download on its own, for whenever you want to hear it calmly. See you soon.",
    cierreSinNada: "Thank you for giving us your time and your attention. We are here, in case you ever want to come back. See you soon.",
    numeroGuardado: "Your number is saved. One of our partners will get in touch with you to arrange your delivery.",
    cierreConPdf: "Done, it's in your downloads folder. May that stew taste " +
                  "like home. See you soon.",
    cierreSinPdf: "Perfect, I'll leave it. May that stew taste like home. " +
                  "See you soon."
  },

  /* ------------------------------------------------------------- PORTUGUES */
  pt: {
    lang: "pt-BR",
    saludo: "OlÃ¡.",
    conectores: ["Bom.", "Pronto.", "Agora.", "EntÃ£o."],

    gestoMovil: "toque na tela",
    gestoEscritorio: "aperte qualquer tecla",
    aviso: "No final vou te fazer umas perguntas bem curtas que vocÃª pode " +
           "responder com o seu microfone. Quando o navegador pedir permissÃ£o, " +
           "autorize.",

    etiquetaArranque: "ComeÃ§ar a ouvir a mensagem da Granja Tierra Fresca.",
    bienvenida: "Temos uma mensagem especial para vocÃª. {aviso} Por favor, {gesto} para ouvir esta mensagem que temos para vocÃª.",
    puente: "Temos uma mensagem especial para vocÃª. {aviso} LÃ¡ vai.",
    arranca: "A seguir vou reproduzir a mensagem que preparamos especialmente para vocÃª.",
    arrancaConAviso: "{aviso} A seguir vou reproduzir a mensagem que preparamos especialmente para vocÃª.",
    tocaOtraVez: "Por favor, {gesto} de novo.",

    soloTeclado: "NÃ£o consigo usar o microfone, entÃ£o vamos pelo teclado. " +
                 "Aperte a tecla S para sim, e a tecla N para nÃ£o. Quando eu " +
                 "pedir seu celular, digite com as teclas numÃ©ricas. E se " +
                 "quiser que eu repita o nÃºmero, aperte a tecla R.",
    errorAudio: "NÃ£o consegui carregar o Ã¡udio, e peÃ§o desculpas. Mesmo assim, " +
                "gostaria de saber se vocÃª quer entrar em contato com a Tierra " +
                "Fresca.",

    preguntaRepetir: "Quer ouvir a mensagem de novo? Responda sim, ou nÃ£o.",
    repitiendo: "LÃ¡ vai de novo.",
    preguntaContacto: "Quer entrar em contato com a Tierra Fresca? Responda sim, ou nÃ£o.",
    noEntiendo: "NÃ£o estou conseguindo te entender, e a culpa Ã© minha, nÃ£o sua. " +
                "Se estiver num computador, aperte a tecla S para sim, ou a " +
                "tecla N para nÃ£o.",

    pedirNumero: "Me diga seu nÃºmero de celular completo, de uma " +
                 "vez e com calma. Eu repito no final para vocÃª confirmar.",
    numeroBorrado: "JÃ¡ apaguei. Me diga seu nÃºmero de celular completo outra vez, " +
                   "por favor.",
    numeroFaltaron: "Faltaram nÃºmeros. Me diga seu nÃºmero de celular completo " +
                    "outra vez, por favor.",
    numeroImposible: "NÃ£o consegui entender o seu nÃºmero, e a culpa Ã© minha, nÃ£o sua. Vamos deixar assim por enquanto.",

    confirmar: "O nÃºmero que entendi Ã©: {numero}. Se ficou certo, diga: correto. Se ficou errado, diga: corrigir. E se quiser ouvir de novo, diga: repetir.",
    repetirNumero: "{numero}. Ficou certo? Diga: correto, corrigir, ou repetir.",

    whatsapp: "Perfeito. Vou abrir o WhatsApp com a mensagem jÃ¡ escrita, para " +
              "vocÃª sÃ³ apertar enviar.",
    registrado: "Pronto. Seu nÃºmero jÃ¡ ficou registrado. Um dos nossos parceiros " +
                "vai entrar em contato para combinar o envio.",
    despedida: "Com muito prazer. Obrigado por nos dar um pouco do seu tempo e " +
               "da sua atenÃ§Ã£o.",

    preguntaPdf: "Uma Ãºltima coisa. Quer baixar a nossa proposta? Ã‰ um parÃ¡grafo " +
                 "sÃ³, de dez linhas, escrito para o seu leitor de tela ler de " +
                 "uma vez. Responda sim, ou nÃ£o.",
    cierreNumeroYPdf: "Quando eu terminar de falar, a proposta serÃ¡ baixada sozinha. Obrigado por ouvir atÃ© o final. AtÃ© muito breve.",
    cierreNumeroSinPdf: "Sem problema nenhum. Obrigado por ouvir atÃ© o final. AtÃ© muito breve.",
    cierrePdfSinNumero: "Obrigado por nos dar o seu tempo. Quando eu terminar de falar, a proposta serÃ¡ baixada sozinha, para quando quiser ouvir com calma. AtÃ© logo.",
    cierreSinNada: "Obrigado por nos dar o seu tempo e a sua atenÃ§Ã£o. Ficamos por aqui, caso um dia queira voltar. AtÃ© logo.",
    numeroGuardado: "O seu nÃºmero ficou guardado. Um dos nossos parceiros vai entrar em contato para combinar o envio.",
    cierreConPdf: "Pronto, jÃ¡ estÃ¡ na sua pasta de downloads. Que esse refogado " +
                  "fique com gosto de casa. AtÃ© logo.",
    cierreSinPdf: "Perfeito, deixo assim. Que esse refogado fique com gosto de " +
                  "casa. AtÃ© logo."
  },

  /* ---------------------------------------------------------------- ITALIANO */
  it: {
    lang: "it-IT",
    saludo: "Ciao.",
    conectores: ["Bene.", "Allora.", "Ecco.", "Adesso."],

    gestoMovil: "tocca lo schermo",
    gestoEscritorio: "premi un tasto qualsiasi",
    aviso: "Alla fine ti farÃ² qualche domanda molto breve a cui potrai " +
           "rispondere con il microfono. Quando il browser ti chiede il " +
           "permesso, autorizzalo.",

    etiquetaArranque: "Inizia ad ascoltare il messaggio di Granja Tierra Fresca.",
    bienvenida: "Abbiamo un messaggio speciale per te. {aviso} Per favore, {gesto} per ascoltare questo messaggio che abbiamo per te.",
    puente: "Abbiamo un messaggio speciale per te. {aviso} Eccolo.",
    arranca: "Adesso ti riproduco il messaggio che abbiamo preparato apposta per te.",
    arrancaConAviso: "{aviso} Adesso ti riproduco il messaggio che abbiamo preparato apposta per te.",
    tocaOtraVez: "Per favore, {gesto} di nuovo.",

    soloTeclado: "Non riesco a usare il microfono, quindi andiamo con la " +
                 "tastiera. Premi il tasto S per sÃ¬, e il tasto N per no. " +
                 "Quando ti chiedo il numero, digitalo con i tasti numerici. " +
                 "E se vuoi che te lo ripeta, premi il tasto R.",
    errorAudio: "Non sono riuscita a caricare l'audio, e mi dispiace. Vorrei " +
                "comunque sapere se vuoi contattare Tierra Fresca.",

    preguntaRepetir: "Vuoi riascoltare il messaggio? Rispondi sÃ¬, o no.",
    repitiendo: "Eccolo di nuovo.",
    preguntaContacto: "Vuoi contattare Tierra Fresca? Rispondi sÃ¬, o no.",
    noEntiendo: "Non riesco a capirti, ed Ã¨ colpa mia, non tua. Se sei al " +
                "computer, premi il tasto S per sÃ¬, o il tasto N per no.",

    pedirNumero: "Dimmi il tuo numero di cellulare per intero, tutto " +
                 "di seguito e con calma. Te lo ripeto alla fine cosÃ¬ me lo " +
                 "confermi.",
    numeroBorrado: "L'ho cancellato. Dimmi di nuovo il tuo numero di cellulare per " +
                   "intero, per favore.",
    numeroFaltaron: "Mi mancano delle cifre. Dimmi di nuovo il tuo numero di " +
                    "cellulare per intero, per favore.",
    numeroImposible: "Non sono riuscito a capire il tuo numero, ed Ã¨ colpa mia, non tua. Lo lasciamo cosÃ¬ per ora.",

    confirmar: "Il numero che ho capito Ã¨: {numero}. Se Ã¨ giusto, di': corretto. Se Ã¨ sbagliato, di': correggere. E se vuoi risentirlo, di': ripetere.",
    repetirNumero: "{numero}. Ãˆ giusto? Di': corretto, correggere, o ripetere.",

    whatsapp: "Perfetto. Ti apro WhatsApp con il messaggio giÃ  scritto, cosÃ¬ " +
              "devi solo premere invia.",
    registrado: "Fatto. Il tuo numero Ã¨ registrato. Uno dei nostri partner ti " +
                "contatterÃ  per organizzare la consegna.",
    despedida: "Volentieri. Grazie per averci dato un po' del tuo tempo e della " +
               "tua attenzione.",

    preguntaPdf: "Un'ultima cosa. Vuoi scaricare la nostra proposta? Ãˆ un solo " +
                 "paragrafo, di dieci righe, scritto perchÃ© il tuo lettore di " +
                 "schermo lo legga tutto di seguito. Rispondi sÃ¬, o no.",
    cierreNumeroYPdf: "Quando finisco di parlare, la proposta si scaricherÃ  da sola. Grazie per averci ascoltato fino in fondo. A prestissimo.",
    cierreNumeroSinPdf: "Nessun problema. Grazie per averci ascoltato fino in fondo. A prestissimo.",
    cierrePdfSinNumero: "Grazie per averci dato il tuo tempo. Quando finisco di parlare, la proposta si scaricherÃ  da sola, per quando vorrai ascoltarla con calma. A presto.",
    cierreSinNada: "Grazie per averci dato il tuo tempo e la tua attenzione. Restiamo qui, se un giorno vorrai tornare. A presto.",
    numeroGuardado: "Il tuo numero Ã¨ salvato. Uno dei nostri partner ti contatterÃ  per organizzare la consegna.",
    cierreConPdf: "Fatto, ce l'hai nella cartella dei download. Che quel sugo " +
                  "sappia di casa. A presto.",
    cierreSinPdf: "Perfetto, lo lascio cosÃ¬. Che quel sugo sappia di casa. A presto."
  },

  /* ---------------------------------------------------------------- FRANCES */
  fr: {
    lang: "fr-FR",
    saludo: "Bonjour.",
    conectores: ["Bien.", "VoilÃ .", "Alors.", "Bon."],

    gestoMovil: "touche l'Ã©cran",
    gestoEscritorio: "appuie sur n'importe quelle touche",
    aviso: "Ã€ la fin je te poserai quelques questions trÃ¨s courtes auxquelles " +
           "tu pourras rÃ©pondre avec ton micro. Quand le navigateur demandera " +
           "l'autorisation, accepte-la.",

    etiquetaArranque: "Commencer Ã  Ã©couter le message de Granja Tierra Fresca.",
    bienvenida: "Nous avons un message spÃ©cial pour toi. {aviso} S'il te plaÃ®t, {gesto} pour Ã©couter ce message que nous avons pour toi.",
    puente: "Nous avons un message spÃ©cial pour toi. {aviso} Le voici.",
    arranca: "Je te passe maintenant le message que nous avons prÃ©parÃ© spÃ©cialement pour toi.",
    arrancaConAviso: "{aviso} Je te passe maintenant le message que nous avons prÃ©parÃ© spÃ©cialement pour toi.",
    tocaOtraVez: "S'il te plaÃ®t, {gesto} encore une fois.",

    soloTeclado: "Je ne peux pas utiliser le micro, alors passons au clavier. " +
                 "Appuie sur la touche S pour oui, et sur la touche N pour non. " +
                 "Quand je te demanderai ton numÃ©ro, tape-le avec les touches " +
                 "numÃ©riques. Et si tu veux que je le rÃ©pÃ¨te, appuie sur la " +
                 "touche R.",
    errorAudio: "Je n'ai pas pu charger l'audio, et je m'en excuse. J'aimerais " +
                "quand mÃªme savoir si tu veux contacter Tierra Fresca.",

    preguntaRepetir: "Veux-tu rÃ©Ã©couter le message ? RÃ©ponds oui, ou non.",
    repitiendo: "Le voici Ã  nouveau.",
    preguntaContacto: "Veux-tu contacter Tierra Fresca ? RÃ©ponds oui, ou non.",
    noEntiendo: "Je n'arrive pas Ã  te comprendre, et c'est ma faute, pas la " +
                "tienne. Si tu es sur un ordinateur, appuie sur la touche S " +
                "pour oui, ou sur la touche N pour non.",

    pedirNumero: "Dis-moi ton numÃ©ro de portable en entier, d'un " +
                 "trait et tranquillement. Je te le rÃ©pÃ¨te Ã  la fin pour que tu " +
                 "me le confirmes.",
    numeroBorrado: "Je l'ai effacÃ©. Dis-moi ton numÃ©ro de portable en entier encore une " +
                   "fois, s'il te plaÃ®t.",
    numeroFaltaron: "Il me manque des chiffres. Dis-moi ton numÃ©ro de portable " +
                    "en entier encore une fois, s'il te plaÃ®t.",
    numeroImposible: "Je n'ai pas rÃ©ussi Ã  comprendre ton numÃ©ro, et c'est ma faute, pas la tienne. On laisse Ã§a pour le moment.",

    confirmar: "Le numÃ©ro que j'ai compris est : {numero}. S'il est bon, dis : correct. S'il est faux, dis : corriger. Et si tu veux l'entendre encore, dis : rÃ©pÃ©ter.",
    repetirNumero: "{numero}. C'est bon ? Dis : correct, corriger, ou rÃ©pÃ©ter.",

    whatsapp: "Parfait. Je t'ouvre WhatsApp avec le message dÃ©jÃ  Ã©crit, tu " +
              "n'auras qu'Ã  appuyer sur envoyer.",
    registrado: "VoilÃ . Ton numÃ©ro est enregistrÃ©. Un de nos partenaires te " +
                "contactera pour organiser ta livraison.",
    despedida: "Avec plaisir. Merci de nous avoir donnÃ© un peu de ton temps et " +
               "de ton attention.",

    preguntaPdf: "Une derniÃ¨re chose. Veux-tu tÃ©lÃ©charger notre proposition ? " +
                 "C'est un seul paragraphe, de dix lignes, Ã©crit pour que ton " +
                 "lecteur d'Ã©cran le lise d'un trait. RÃ©ponds oui, ou non.",
    cierreNumeroYPdf: "Quand j'aurai fini de parler, la proposition se tÃ©lÃ©chargera toute seule. Merci de nous avoir Ã©coutÃ©s jusqu'au bout. Ã€ trÃ¨s bientÃ´t.",
    cierreNumeroSinPdf: "Pas de souci du tout. Merci de nous avoir Ã©coutÃ©s jusqu'au bout. Ã€ trÃ¨s bientÃ´t.",
    cierrePdfSinNumero: "Merci de nous avoir donnÃ© ton temps. Quand j'aurai fini de parler, la proposition se tÃ©lÃ©chargera toute seule, pour quand tu voudras l'Ã©couter tranquillement. Ã€ bientÃ´t.",
    cierreSinNada: "Merci de nous avoir donnÃ© ton temps et ton attention. Nous restons lÃ , si un jour tu veux revenir. Ã€ bientÃ´t.",
    numeroGuardado: "Ton numÃ©ro est enregistrÃ©. Un de nos partenaires te contactera pour organiser ta livraison.",
    cierreConPdf: "VoilÃ , tu l'as dans ton dossier de tÃ©lÃ©chargements. Que ce " +
                  "plat ait le goÃ»t de la maison. Ã€ bientÃ´t.",
    cierreSinPdf: "Parfait, je te le laisse comme Ã§a. Que ce plat ait le goÃ»t " +
                  "de la maison. Ã€ bientÃ´t."
  }
};
