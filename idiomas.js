/* =========================================================================
   Granja Tierra Fresca — los textos de la voz, en cinco idiomas

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
    conectores: ["Bien.", "Listo.", "Ahora.", "A ver."],

    gestoMovil: "Toca la pantalla",
    gestoEscritorio: "Oprime cualquier tecla",
    aviso: "Al final te haré unas preguntas muy breves que podrás responder " +
           "con tu micrófono. Cuando el navegador te pida permiso, actívalo.",

    etiquetaArranque: "Empezar a escuchar el mensaje de la Granja Tierra Fresca.",
    bienvenida: "Tenemos un mensaje especial para ti. {aviso} {gesto} para escucharlo.",
    puente: "Tenemos un mensaje especial para ti. {aviso} Aquí va.",
    arranca: "Aquí va.",
    tocaOtraVez: "{gesto} otra vez, por favor.",

    soloTeclado: "No puedo usar el micrófono, así que vamos por el teclado. " +
                 "Presiona la tecla ese para decir sí, y la tecla ene para " +
                 "decir no. Cuando te pida tu celular, márcalo con las teclas " +
                 "de números. Y si quieres que te repita el número, presiona " +
                 "la tecla erre.",
    errorAudio: "No fue posible cargar el audio, y te pido disculpas. De todas " +
                "formas quisiera saber si quieres contactar a Tierra Fresca.",

    preguntaRepetir: "¿Quieres escuchar el mensaje otra vez? Responde sí, o no.",
    repitiendo: "Con mucho gusto. Aquí va otra vez.",
    preguntaContacto: "¿Quieres contactar a Tierra Fresca? Responde sí, o no.",
    noEntiendo: "No logro entenderte, y la culpa es mía, no tuya. Si estás en " +
                "un computador, presiona la tecla ese para sí, o la tecla ene " +
                "para no.",

    pedirNumero: "Qué alegría. Dime tu número de celular completo, de corrido " +
                 "y con calma. Yo te lo repito al final para que me confirmes " +
                 "que quedó bien.",
    numeroBorrado: "Borrado. Dime tu número de celular completo otra vez, por favor.",
    numeroFaltaron: "Me faltaron números. Dime tu número de celular completo " +
                    "otra vez, por favor.",

    confirmar: "El número que entendí es: {numero}. Si está correcto, di sí. " +
               "Si está mal, di no, y lo tomamos otra vez. Y si prefieres que " +
               "te lo repita, dime: repítelo.",
    repetirNumero: "Claro. Escúchalo otra vez: {numero}. ¿Está correcto? Di sí, o no.",

    whatsapp: "Perfecto. Te voy a abrir WhatsApp con el mensaje ya escrito, " +
              "para que solo tengas que pulsar enviar.",
    registrado: "Listo. Tu número ya quedó registrado. Uno de nuestros aliados " +
                "se va a comunicar contigo para coordinar tu envío.",
    despedida: "Con mucho gusto. Gracias por darnos un rato de tu tiempo y de " +
               "tu atención.",

    preguntaPdf: "Una última cosa. ¿Quieres descargar nuestra propuesta? Es un " +
                 "solo párrafo, de diez líneas, escrito para que tu lector de " +
                 "pantalla te lo lea de corrido. Responde sí, o no.",
    cierreConPdf: "Listo, ya lo tienes en tu carpeta de descargas. Que ese guiso " +
                  "te quede como en casa. Hasta pronto.",
    cierreSinPdf: "Perfecto, te lo dejo así. Que ese guiso te quede como en casa. " +
                  "Hasta pronto."
  },

  /* ----------------------------------------------------------------- INGLES
     El caso mas frecuente: un Windows sin paquete de voz espanol instalado. */
  en: {
    lang: "en-US",
    saludo: "Hello.",
    conectores: ["Alright.", "Okay.", "Now.", "So."],

    gestoMovil: "Tap the screen",
    gestoEscritorio: "Press any key",
    aviso: "At the end I'll ask you a couple of very short questions that you " +
           "can answer with your microphone. When the browser asks for " +
           "permission, allow it.",

    etiquetaArranque: "Start listening to the message from Granja Tierra Fresca.",
    bienvenida: "We have a special message for you. {aviso} {gesto} to hear it.",
    puente: "We have a special message for you. {aviso} Here it goes.",
    arranca: "Here it goes.",
    tocaOtraVez: "{gesto} again, please.",

    soloTeclado: "I can't use the microphone, so let's go with the keyboard. " +
                 "Press the S key for yes, and the N key for no. When I ask " +
                 "for your phone number, type it with the number keys. And if " +
                 "you want me to repeat the number, press the R key.",
    errorAudio: "I couldn't load the audio, and I'm sorry. I'd still like to " +
                "know whether you want to contact Tierra Fresca.",

    preguntaRepetir: "Would you like to hear the message again? Answer yes, or no.",
    repitiendo: "Gladly. Here it goes again.",
    preguntaContacto: "Would you like to contact Tierra Fresca? Answer yes, or no.",
    noEntiendo: "I can't quite understand you, and that's on me, not on you. " +
                "If you're on a computer, press the S key for yes, or the N " +
                "key for no.",

    pedirNumero: "Wonderful. Tell me your full phone number, straight through " +
                 "and calmly. I'll read it back at the end so you can confirm it.",
    numeroBorrado: "Deleted. Tell me your full phone number again, please.",
    numeroFaltaron: "I'm missing some digits. Tell me your full phone number " +
                    "again, please.",

    confirmar: "The number I got is: {numero}. If it's right, say yes. If it's " +
               "wrong, say no and we'll take it again. And if you'd rather hear " +
               "it once more, say: repeat.",
    repetirNumero: "Sure. Listen again: {numero}. Is it right? Say yes, or no.",

    whatsapp: "Perfect. I'll open WhatsApp with the message already written, so " +
              "all you have to do is press send.",
    registrado: "Done. Your number is registered. One of our partners will get " +
                "in touch with you to arrange your delivery.",
    despedida: "Gladly. Thank you for giving us a bit of your time and your " +
               "attention.",

    preguntaPdf: "One last thing. Would you like to download our proposal? " +
                 "It's a single paragraph, ten lines, written so your screen " +
                 "reader can read it straight through. Answer yes, or no.",
    cierreConPdf: "Done, it's in your downloads folder. May that stew taste " +
                  "like home. See you soon.",
    cierreSinPdf: "Perfect, I'll leave it. May that stew taste like home. " +
                  "See you soon."
  },

  /* ------------------------------------------------------------- PORTUGUES */
  pt: {
    lang: "pt-BR",
    saludo: "Olá.",
    conectores: ["Bom.", "Pronto.", "Agora.", "Então."],

    gestoMovil: "Toque na tela",
    gestoEscritorio: "Aperte qualquer tecla",
    aviso: "No final vou te fazer umas perguntas bem curtas que você pode " +
           "responder com o seu microfone. Quando o navegador pedir permissão, " +
           "autorize.",

    etiquetaArranque: "Começar a ouvir a mensagem da Granja Tierra Fresca.",
    bienvenida: "Temos uma mensagem especial para você. {aviso} {gesto} para ouvir.",
    puente: "Temos uma mensagem especial para você. {aviso} Lá vai.",
    arranca: "Lá vai.",
    tocaOtraVez: "{gesto} de novo, por favor.",

    soloTeclado: "Não consigo usar o microfone, então vamos pelo teclado. " +
                 "Aperte a tecla S para sim, e a tecla N para não. Quando eu " +
                 "pedir seu celular, digite com as teclas numéricas. E se " +
                 "quiser que eu repita o número, aperte a tecla R.",
    errorAudio: "Não consegui carregar o áudio, e peço desculpas. Mesmo assim, " +
                "gostaria de saber se você quer entrar em contato com a Tierra " +
                "Fresca.",

    preguntaRepetir: "Quer ouvir a mensagem de novo? Responda sim, ou não.",
    repitiendo: "Com muito prazer. Lá vai de novo.",
    preguntaContacto: "Quer entrar em contato com a Tierra Fresca? Responda sim, ou não.",
    noEntiendo: "Não estou conseguindo te entender, e a culpa é minha, não sua. " +
                "Se estiver num computador, aperte a tecla S para sim, ou a " +
                "tecla N para não.",

    pedirNumero: "Que alegria. Me diga seu número de celular completo, de uma " +
                 "vez e com calma. Eu repito no final para você confirmar.",
    numeroBorrado: "Apagado. Me diga seu número de celular completo outra vez, " +
                   "por favor.",
    numeroFaltaron: "Faltaram números. Me diga seu número de celular completo " +
                    "outra vez, por favor.",

    confirmar: "O número que entendi é: {numero}. Se estiver certo, diga sim. " +
               "Se estiver errado, diga não, e a gente repete. E se preferir " +
               "ouvir de novo, diga: repita.",
    repetirNumero: "Claro. Escute outra vez: {numero}. Está certo? Diga sim, ou não.",

    whatsapp: "Perfeito. Vou abrir o WhatsApp com a mensagem já escrita, para " +
              "você só apertar enviar.",
    registrado: "Pronto. Seu número já ficou registrado. Um dos nossos parceiros " +
                "vai entrar em contato para combinar o envio.",
    despedida: "Com muito prazer. Obrigado por nos dar um pouco do seu tempo e " +
               "da sua atenção.",

    preguntaPdf: "Uma última coisa. Quer baixar a nossa proposta? É um parágrafo " +
                 "só, de dez linhas, escrito para o seu leitor de tela ler de " +
                 "uma vez. Responda sim, ou não.",
    cierreConPdf: "Pronto, já está na sua pasta de downloads. Que esse refogado " +
                  "fique com gosto de casa. Até logo.",
    cierreSinPdf: "Perfeito, deixo assim. Que esse refogado fique com gosto de " +
                  "casa. Até logo."
  },

  /* ---------------------------------------------------------------- ITALIANO */
  it: {
    lang: "it-IT",
    saludo: "Ciao.",
    conectores: ["Bene.", "Allora.", "Ecco.", "Adesso."],

    gestoMovil: "Tocca lo schermo",
    gestoEscritorio: "Premi un tasto qualsiasi",
    aviso: "Alla fine ti farò qualche domanda molto breve a cui potrai " +
           "rispondere con il microfono. Quando il browser ti chiede il " +
           "permesso, autorizzalo.",

    etiquetaArranque: "Inizia ad ascoltare il messaggio di Granja Tierra Fresca.",
    bienvenida: "Abbiamo un messaggio speciale per te. {aviso} {gesto} per ascoltarlo.",
    puente: "Abbiamo un messaggio speciale per te. {aviso} Eccolo.",
    arranca: "Eccolo.",
    tocaOtraVez: "{gesto} di nuovo, per favore.",

    soloTeclado: "Non riesco a usare il microfono, quindi andiamo con la " +
                 "tastiera. Premi il tasto S per sì, e il tasto N per no. " +
                 "Quando ti chiedo il numero, digitalo con i tasti numerici. " +
                 "E se vuoi che te lo ripeta, premi il tasto R.",
    errorAudio: "Non sono riuscita a caricare l'audio, e mi dispiace. Vorrei " +
                "comunque sapere se vuoi contattare Tierra Fresca.",

    preguntaRepetir: "Vuoi riascoltare il messaggio? Rispondi sì, o no.",
    repitiendo: "Volentieri. Eccolo di nuovo.",
    preguntaContacto: "Vuoi contattare Tierra Fresca? Rispondi sì, o no.",
    noEntiendo: "Non riesco a capirti, ed è colpa mia, non tua. Se sei al " +
                "computer, premi il tasto S per sì, o il tasto N per no.",

    pedirNumero: "Che bello. Dimmi il tuo numero di cellulare per intero, tutto " +
                 "di seguito e con calma. Te lo ripeto alla fine così me lo " +
                 "confermi.",
    numeroBorrado: "Cancellato. Dimmi di nuovo il tuo numero di cellulare per " +
                   "intero, per favore.",
    numeroFaltaron: "Mi mancano delle cifre. Dimmi di nuovo il tuo numero di " +
                    "cellulare per intero, per favore.",

    confirmar: "Il numero che ho capito è: {numero}. Se è giusto, di' sì. Se è " +
               "sbagliato, di' no, e lo riprendiamo. E se preferisci che te lo " +
               "ripeta, dimmi: ripeti.",
    repetirNumero: "Certo. Ascolta di nuovo: {numero}. È giusto? Di' sì, o no.",

    whatsapp: "Perfetto. Ti apro WhatsApp con il messaggio già scritto, così " +
              "devi solo premere invia.",
    registrado: "Fatto. Il tuo numero è registrato. Uno dei nostri partner ti " +
                "contatterà per organizzare la consegna.",
    despedida: "Volentieri. Grazie per averci dato un po' del tuo tempo e della " +
               "tua attenzione.",

    preguntaPdf: "Un'ultima cosa. Vuoi scaricare la nostra proposta? È un solo " +
                 "paragrafo, di dieci righe, scritto perché il tuo lettore di " +
                 "schermo lo legga tutto di seguito. Rispondi sì, o no.",
    cierreConPdf: "Fatto, ce l'hai nella cartella dei download. Che quel sugo " +
                  "sappia di casa. A presto.",
    cierreSinPdf: "Perfetto, lo lascio così. Che quel sugo sappia di casa. A presto."
  },

  /* ---------------------------------------------------------------- FRANCES */
  fr: {
    lang: "fr-FR",
    saludo: "Bonjour.",
    conectores: ["Bien.", "Voilà.", "Alors.", "Bon."],

    gestoMovil: "Touche l'écran",
    gestoEscritorio: "Appuie sur n'importe quelle touche",
    aviso: "À la fin je te poserai quelques questions très courtes auxquelles " +
           "tu pourras répondre avec ton micro. Quand le navigateur demandera " +
           "l'autorisation, accepte-la.",

    etiquetaArranque: "Commencer à écouter le message de Granja Tierra Fresca.",
    bienvenida: "Nous avons un message spécial pour toi. {aviso} {gesto} pour l'écouter.",
    puente: "Nous avons un message spécial pour toi. {aviso} Le voici.",
    arranca: "Le voici.",
    tocaOtraVez: "{gesto} encore une fois, s'il te plaît.",

    soloTeclado: "Je ne peux pas utiliser le micro, alors passons au clavier. " +
                 "Appuie sur la touche S pour oui, et sur la touche N pour non. " +
                 "Quand je te demanderai ton numéro, tape-le avec les touches " +
                 "numériques. Et si tu veux que je le répète, appuie sur la " +
                 "touche R.",
    errorAudio: "Je n'ai pas pu charger l'audio, et je m'en excuse. J'aimerais " +
                "quand même savoir si tu veux contacter Tierra Fresca.",

    preguntaRepetir: "Veux-tu réécouter le message ? Réponds oui, ou non.",
    repitiendo: "Avec plaisir. Le voici à nouveau.",
    preguntaContacto: "Veux-tu contacter Tierra Fresca ? Réponds oui, ou non.",
    noEntiendo: "Je n'arrive pas à te comprendre, et c'est ma faute, pas la " +
                "tienne. Si tu es sur un ordinateur, appuie sur la touche S " +
                "pour oui, ou sur la touche N pour non.",

    pedirNumero: "Quelle joie. Dis-moi ton numéro de portable en entier, d'un " +
                 "trait et tranquillement. Je te le répète à la fin pour que tu " +
                 "me le confirmes.",
    numeroBorrado: "Effacé. Dis-moi ton numéro de portable en entier encore une " +
                   "fois, s'il te plaît.",
    numeroFaltaron: "Il me manque des chiffres. Dis-moi ton numéro de portable " +
                    "en entier encore une fois, s'il te plaît.",

    confirmar: "Le numéro que j'ai compris est : {numero}. Si c'est correct, dis " +
               "oui. Si c'est faux, dis non, et on recommence. Et si tu préfères " +
               "que je le répète, dis : répète.",
    repetirNumero: "Bien sûr. Écoute encore : {numero}. C'est correct ? Dis oui, ou non.",

    whatsapp: "Parfait. Je t'ouvre WhatsApp avec le message déjà écrit, tu " +
              "n'auras qu'à appuyer sur envoyer.",
    registrado: "Voilà. Ton numéro est enregistré. Un de nos partenaires te " +
                "contactera pour organiser ta livraison.",
    despedida: "Avec plaisir. Merci de nous avoir donné un peu de ton temps et " +
               "de ton attention.",

    preguntaPdf: "Une dernière chose. Veux-tu télécharger notre proposition ? " +
                 "C'est un seul paragraphe, de dix lignes, écrit pour que ton " +
                 "lecteur d'écran le lise d'un trait. Réponds oui, ou non.",
    cierreConPdf: "Voilà, tu l'as dans ton dossier de téléchargements. Que ce " +
                  "plat ait le goût de la maison. À bientôt.",
    cierreSinPdf: "Parfait, je te le laisse comme ça. Que ce plat ait le goût " +
                  "de la maison. À bientôt."
  }
};
