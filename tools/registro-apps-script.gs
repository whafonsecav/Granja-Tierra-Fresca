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
 * Google del dueño de la campaña, guarda el token en las propiedades del
 * proyecto (nunca sale al navegador) y hace dos cosas con cada número:
 *
 *   1. lo agrega a una hoja de cálculo, para consultarlo cómodo;
 *   2. lo escribe en registros.json dentro del repositorio de GitHub,
 *      que es la "base de datos" que se puede abrir y revisar desde el sitio.
 *
 * Si algo falla en el paso 2, el paso 1 ya quedó hecho. Nunca se pierde un
 * número por un problema de la API de GitHub.
 *
 * ====================================================================
 * CÓMO DESPLEGARLO (una sola vez, unos cinco minutos)
 * ====================================================================
 *
 *  1. Cree una hoja de cálculo nueva en Google Sheets. Póngale
 *     "Registros Tierra Fresca".
 *
 *  2. Dentro de la hoja: Extensiones → Apps Script. Borre lo que haya y
 *     pegue este archivo completo.
 *
 *  3. Genere un token de GitHub de alcance mínimo, en
 *     github.com/settings/personal-access-tokens :
 *        - Repository access: sólo Granja-Tierra-Fresca
 *        - Permisos: Contents → Read and write
 *     Ese es el único permiso que necesita. Nada más.
 *
 *  4. En Apps Script: Configuración del proyecto (el engranaje) →
 *     Propiedades de la secuencia de comandos → Agregar propiedad:
 *        Nombre:  GITHUB_TOKEN
 *        Valor:   el token del paso 3
 *     Guardar. El token queda del lado del servidor, nunca en el navegador.
 *
 *  5. Implementar → Nueva implementación → tipo "Aplicación web":
 *        Ejecutar como:        Yo
 *        Quién tiene acceso:   Cualquier usuario
 *     Implementar, aceptar los permisos, y copiar la URL que termina en
 *     /exec.
 *
 *  6. Pegue esa URL en script.js, en la constante ENDPOINT_REGISTRO.
 *     Suba el cambio y listo.
 *
 *  7. Pruebe: abra la página, complete el flujo con un número de prueba, y
 *     revise que aparezca en la hoja y en registros.json.
 *
 * Para cambiar el token después, repita el paso 4. Nunca hay que tocar el
 * código de la página.
 */

// Repositorio donde se escribe la base de datos.
var REPO_DUENO  = 'whafonsecav';
var REPO_NOMBRE = 'Granja-Tierra-Fresca';
var REPO_RAMA   = 'main';
var ARCHIVO     = 'registros.json';


/**
 * Punto de entrada. La página envía aquí un POST con el número.
 *
 * Se acepta tanto JSON como formulario codificado, porque el navegador manda
 * la petición en modo no-cors y en ese modo sólo se pueden usar unos pocos
 * tipos de contenido.
 */
function doPost(e) {
  var registro;

  try {
    registro = leerPeticion(e);
  } catch (error) {
    return responder({ ok: false, error: 'Petición ilegible: ' + error });
  }

  if (!registro.numero || !/^\d{7,15}$/.test(String(registro.numero))) {
    return responder({ ok: false, error: 'Número inválido' });
  }

  registro.fecha = registro.fecha || new Date().toISOString();

  var resultado = { ok: true, hoja: false, github: false };

  // Paso 1: la hoja de cálculo. Es el registro que no puede fallar.
  try {
    guardarEnHoja(registro);
    resultado.hoja = true;
  } catch (error) {
    resultado.ok = false;
    resultado.error = 'Hoja: ' + error;
  }

  // Paso 2: el repositorio. Si falla, el número ya quedó en la hoja.
  try {
    guardarEnGitHub(registro);
    resultado.github = true;
  } catch (error) {
    resultado.errorGitHub = String(error);
  }

  return responder(resultado);
}


/** Permite abrir la URL en el navegador para comprobar que está viva. */
function doGet() {
  return responder({ ok: true, mensaje: 'Intermediario de registro activo.' });
}


function leerPeticion(e) {
  if (e && e.postData && e.postData.contents) {
    var crudo = e.postData.contents;
    // Cuerpo JSON (lo que manda la página).
    if (crudo.charAt(0) === '{') {
      return JSON.parse(crudo);
    }
  }
  // Formulario clásico, por si se prueba desde otra herramienta.
  if (e && e.parameter && e.parameter.numero) {
    return {
      numero: e.parameter.numero,
      origen: e.parameter.origen || '',
      dispositivo: e.parameter.dispositivo || ''
    };
  }
  throw new Error('sin datos');
}


function guardarEnHoja(registro) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  // Encabezados la primera vez.
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(['Fecha', 'Número', 'Dispositivo', 'Origen']);
    hoja.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  hoja.appendRow([
    registro.fecha,
    // Apóstrofo al inicio: obliga a Sheets a tratarlo como texto y no
    // borrar el cero de un número que empiece por cero.
    "'" + registro.numero,
    registro.dispositivo || '',
    registro.origen || ''
  ]);
}


/**
 * Escribe registros.json en el repositorio.
 *
 * Se lee el archivo actual para conservar su SHA: la API de GitHub lo exige
 * para actualizar un archivo existente, y es lo que evita que dos registros
 * simultáneos se pisen el uno al otro.
 */
function guardarEnGitHub(registro) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('Falta la propiedad GITHUB_TOKEN. Ver el paso 4 de arriba.');
  }

  var url = 'https://api.github.com/repos/' + REPO_DUENO + '/' + REPO_NOMBRE +
            '/contents/' + ARCHIVO;

  var cabeceras = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json'
  };

  var lista = [];
  var sha = null;

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
      lista = [];   // archivo corrupto o vacío: se empieza de nuevo
    }
    if (!(lista instanceof Array)) { lista = []; }
  } else if (actual.getResponseCode() !== 404) {
    throw new Error('GitHub respondió ' + actual.getResponseCode() +
                    ': ' + actual.getContentText());
  }

  lista.push({
    fecha: registro.fecha,
    numero: String(registro.numero),
    dispositivo: registro.dispositivo || '',
    origen: registro.origen || ''
  });

  var contenido = Utilities.base64Encode(
    JSON.stringify(lista, null, 2), Utilities.Charset.UTF_8);

  var cuerpo = {
    message: 'Registro de contacto: ' + registro.numero,
    content: contenido,
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
    throw new Error('GitHub respondió ' + codigo + ': ' + escritura.getContentText());
  }
}


function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
