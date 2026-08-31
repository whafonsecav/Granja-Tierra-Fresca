/**
 * Granja Tierra Fresca — intermediario de registro
 *
 * QUÉ PROBLEMA RESUELVE
 * ---------------------
 * La landing vive en GitHub Pages, que sirve archivos y nada más: no puede
 * guardar datos. Y escribir en el repositorio desde el navegador exigiría un
 * token de escritura dentro de script.js, que en un repositorio público queda
 * a la vista de cualquiera. GitHub además detecta los tokens filtrados y los
 * revoca solo, así que ni siquiera duraría.
 *
 * Este script es el intermediario que falta. Corre gratis en la cuenta de
 * Google del dueño de la campaña y hace dos cosas con cada número:
 *
 *   1. lo agrega a la hoja de cálculo, para consultarlo cómodo;
 *   2. lo escribe en registros.json de este repositorio, que se puede abrir
 *      y revisar desde GitHub.
 *
 * Si el paso 2 falla, el paso 1 ya quedó hecho. Nunca se pierde un número por
 * un problema de la API de GitHub.
 *
 * ====================================================================
 * CÓMO DESPLEGARLO (una sola vez)
 * ====================================================================
 *
 *  1. Cree una hoja de cálculo en Google Sheets, con la pestaña llamada
 *     "Registros".
 *
 *  2. Extensiones → Apps Script. Borre lo que haya y pegue este archivo.
 *
 *  3. Genere un token en github.com/settings/personal-access-tokens :
 *        - Repository access: sólo Granja-Tierra-Fresca
 *        - Permisos: Contents → Read and write
 *     Ése es el único permiso que necesita.
 *
 *  4. En Apps Script: Configuración del proyecto (el engranaje) →
 *     Propiedades de la secuencia de comandos → Agregar propiedad:
 *        Nombre:  GITHUB_TOKEN
 *        Valor:   el token del paso 3
 *     El token queda del lado del servidor, nunca en el navegador.
 *
 *  5. Ejecute la función probar() una vez, para comprobar que escribe en la
 *     hoja y en registros.json. Luego borre esa fila de prueba.
 *
 *  6. Implementar → Nueva implementación → "Aplicación web":
 *        Ejecutar como:        Yo
 *        Quién tiene acceso:   Cualquier usuario
 *     Copie la URL que termina en /exec.
 *
 *  7. Pegue esa URL en script.js, en la constante ENDPOINT_REGISTRO.
 *
 * NOTA: no hace falta "Publicar en la Web" la hoja. Eso la volvería legible
 * por cualquiera y expondría los números registrados. Son cosas distintas.
 */

// --------------------------------------------------------------------------
// Configuración
// --------------------------------------------------------------------------

// Token de GitHub, leido de las propiedades del proyecto. Nunca va escrito
// aqui: este archivo si esta en el repositorio publico. Ver el paso 4.
var GITHUB_TOKEN = PropertiesService.getScriptProperties()
                                    .getProperty('GITHUB_TOKEN');

// Escribir tambien en registros.json del repositorio.
//
// APAGADO A PROPOSITO. El repositorio es publico: cualquiera en internet
// puede leer ese archivo, y un celular es un dato personal de un tercero.
// Los numeros quedan solo en esta hoja, que es privada de su cuenta.
//
// Encenderlo solo tendria sentido con el repositorio en privado.
var ESCRIBIR_EN_GITHUB = false;

var REPO_DUENO  = 'whafonsecav';
var REPO_NOMBRE = 'Granja-Tierra-Fresca';
var REPO_RAMA   = 'main';
var ARCHIVO     = 'registros.json';

// ID de la hoja de calculo. Es el tramo largo de su URL, entre /d/ y /edit:
//   docs.google.com/spreadsheets/d/ESTO_DE_AQUI/edit
//
// Hace falta porque este proyecto de Apps Script es independiente, no esta
// creado desde dentro de la hoja. En un proyecto independiente
// getActiveSpreadsheet() devuelve nulo y no encontraria la hoja nunca.
var HOJA_ID = '';   // pegue aqui el ID de su hoja

// Nombre de la pestaña de la hoja. Si le cambia el nombre, cámbielo aquí.
var PESTANA = 'Registros';

var ZONA_HORARIA = 'America/Bogota';


// --------------------------------------------------------------------------
// Punto de entrada: la página envía aquí el número
// --------------------------------------------------------------------------

function doPost(e) {
  var registro;

  try {
    registro = leerPeticion(e);
  } catch (error) {
    return responder({ ok: false, error: 'Petición ilegible: ' + error });
  }

  var numero = String(registro.numero || '').replace(/\D/g, '');
  if (numero.length < 7 || numero.length > 15) {
    return responder({ ok: false, error: 'Número inválido: ' + numero });
  }

  var fecha = Utilities.formatDate(new Date(), ZONA_HORARIA, 'dd/MM/yyyy HH:mm');
  var resultado = { ok: true, hoja: false, github: false };

  // Paso 1: la hoja de cálculo. Es el registro que no puede fallar.
  try {
    guardarEnHoja(fecha, numero);
    resultado.hoja = true;
  } catch (error) {
    resultado.ok = false;
    resultado.error = 'Hoja: ' + error;
  }

  // Paso 2: el repositorio, solo si esta encendido. Ver ESCRIBIR_EN_GITHUB.
  if (ESCRIBIR_EN_GITHUB) {
    try {
      guardarEnGitHub(fecha, numero);
      resultado.github = true;
    } catch (error) {
      resultado.errorGitHub = String(error);
    }
  } else {
    resultado.github = 'desactivado';
  }

  return responder(resultado);
}


/** Abrir la URL en el navegador sirve para comprobar que está viva. */
function doGet() {
  return responder({ ok: true, mensaje: 'Intermediario de Tierra Fresca activo.' });
}


// --------------------------------------------------------------------------
// Lectura de la petición
// --------------------------------------------------------------------------

function leerPeticion(e) {
  // La página manda JSON como texto plano: es uno de los pocos tipos de
  // contenido que el navegador permite en una petición sin CORS.
  if (e && e.postData && e.postData.contents) {
    var crudo = e.postData.contents;
    if (crudo.charAt(0) === '{') { return JSON.parse(crudo); }
  }
  // Formulario clásico, por si se prueba desde otra herramienta.
  if (e && e.parameter && e.parameter.numero) {
    return { numero: e.parameter.numero };
  }
  throw new Error('sin datos');
}


// --------------------------------------------------------------------------
// Hoja de cálculo
// --------------------------------------------------------------------------

// Abre la hoja funcione como funcione el proyecto: si esta creado desde la
// hoja, getActiveSpreadsheet() la devuelve; si es independiente, devuelve nulo
// y hay que abrirla por su ID.
function abrirLibro() {
  var libro = null;
  try { libro = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { libro = null; }
  if (libro) { return libro; }

  if (!HOJA_ID) {
    throw new Error('Proyecto independiente y HOJA_ID vacio. Pegue el ID de ' +
                    'su hoja en la constante HOJA_ID.');
  }
  try {
    return SpreadsheetApp.openById(HOJA_ID);
  } catch (e) {
    throw new Error('No pude abrir la hoja con ese HOJA_ID. Copielo de nuevo ' +
                    'desde la URL de su hoja, entre /d/ y /edit. Detalle: ' + e);
  }
}


function guardarEnHoja(fecha, numero) {
  var libro = abrirLibro();
  var hoja = libro.getSheetByName(PESTANA) || libro.getSheets()[0];

  if (hoja.getLastRow() === 0) {
    hoja.appendRow(['Fecha y Hora', 'Telefono']);
    hoja.getRange(1, 1, 1, 2).setFontWeight('bold');
  }

  // El apóstrofo obliga a Sheets a tratarlo como texto. Sin él, un celular
  // se guardaría como número y perdería cualquier cero a la izquierda.
  hoja.appendRow([fecha, "'" + numero]);
}


// --------------------------------------------------------------------------
// Archivo registros.json en el repositorio
// --------------------------------------------------------------------------

function guardarEnGitHub(fecha, numero) {
  if (!GITHUB_TOKEN) {
    throw new Error('Falta la propiedad GITHUB_TOKEN. Ver el paso 4 del encabezado.');
  }

  var url = 'https://api.github.com/repos/' + REPO_DUENO + '/' + REPO_NOMBRE +
            '/contents/' + ARCHIVO;

  var cabeceras = {
    Authorization: 'Bearer ' + GITHUB_TOKEN,
    Accept: 'application/vnd.github+json'
  };

  var lista = [];
  var sha = null;

  // Se lee el archivo actual para conservar su SHA: la API de GitHub lo exige
  // para actualizar un archivo existente, y es lo que evita que dos registros
  // seguidos se pisen el uno al otro.
  var actual = UrlFetchApp.fetch(url + '?ref=' + REPO_RAMA, {
    headers: cabeceras,
    muteHttpExceptions: true
  });

  if (actual.getResponseCode() === 200) {
    var datos = JSON.parse(actual.getContentText());
    sha = datos.sha;
    try {
      lista = JSON.parse(Utilities.newBlob(
        Utilities.base64Decode(datos.content)).getDataAsString());
    } catch (error) {
      lista = [];
    }
    if (!(lista instanceof Array)) { lista = []; }
  } else if (actual.getResponseCode() !== 404) {
    throw new Error('Al leer, GitHub respondió ' + actual.getResponseCode() +
                    ': ' + actual.getContentText());
  }

  lista.push({ fecha: fecha, numero: numero });

  var cuerpo = {
    message: 'Registro de contacto: ' + numero,
    content: Utilities.base64Encode(JSON.stringify(lista, null, 2),
                                    Utilities.Charset.UTF_8),
    branch: REPO_RAMA
  };
  if (sha) { cuerpo.sha = sha; }

  var escritura = UrlFetchApp.fetch(url, {
    method: 'put',
    headers: cabeceras,
    contentType: 'application/json',
    payload: JSON.stringify(cuerpo),
    muteHttpExceptions: true
  });

  var codigo = escritura.getResponseCode();
  if (codigo !== 200 && codigo !== 201) {
    throw new Error('Al escribir, GitHub respondió ' + codigo + ': ' +
                    escritura.getContentText());
  }
}


function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}


// --------------------------------------------------------------------------
// Prueba
// --------------------------------------------------------------------------

/**
 * Ejecute esta función UNA VEZ desde el editor de Apps Script (selecciónela
 * arriba y pulse Ejecutar) para comprobar que todo funciona antes de
 * desplegar. Debe aparecer una fila en la hoja y un número en registros.json.
 *
 * Después bórrela de la hoja y del JSON: es un número de prueba.
 */
function probar() {
  var respuesta = doPost({
    postData: { contents: JSON.stringify({ numero: '3001234567' }) }
  });
  var texto = respuesta.getContent();
  Logger.log(texto);

  // Se lee el resultado y se traduce a algo legible, para no tener que
  // interpretar el JSON crudo en el registro de ejecucion.
  var r = JSON.parse(texto);
  if (r.hoja)   { Logger.log('HOJA: escrita. Revise la fila nueva.'); }
  else          { Logger.log('HOJA: FALLO -> ' + r.error); }
  if (r.github === 'desactivado') { Logger.log('GITHUB: desactivado a proposito. Los numeros van solo a la hoja.'); }
  else if (r.github)              { Logger.log('GITHUB: escrito en registros.json.'); }
  else                            { Logger.log('GITHUB: FALLO -> ' + r.errorGitHub); }
}
