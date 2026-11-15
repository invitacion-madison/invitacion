/* =========================================================
   INVITACIÓN — lógica compartida por las dos páginas
   - cumpleanos.html -> <body data-pagina="cumpleanos">
   - bautizo.html    -> <body data-pagina="bautizo">
   Incluye: mensaje inicial, música, video (solo cumpleaños,
   siempre silenciado) y confirmación de asistencia (Firebase).
   ========================================================= */

import {
  db,
  auth,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  signInAnonymously
} from "./firebase.js";


/* =========================
   CONFIGURACIÓN DE LA PÁGINA
   ========================= */

const PAGINA = document.body.dataset.pagina || "cumpleanos";

const EVENTO_PAGINA =
  PAGINA === "bautizo" ? "Bautizo" : "Cumpleaños";

const EVENTOS_VALIDOS = [
  "Ambas celebraciones",
  "Cumpleaños",
  "Bautizo"
];

/* Claves de almacenamiento local (compartidas entre ambas páginas) */
const claveConfirmacion = "confirmacion_invitacion_id";
const claveOwnerUid = "confirmacion_owner_uid";


/* =========================
   VARIABLES
   ========================= */

let usuarioAnonimo = null;
let musicaPendiente = false;
let videoPendiente = false;


/* =========================
   ELEMENTOS DEL DOM
   ========================= */

const musica = document.getElementById("musica");
const video = document.getElementById("videoInvitacion"); /* solo en cumpleaños */
const imagenBautizo = document.getElementById("imgBautizo"); /* solo en bautizo */
const avisoMedio = document.getElementById("avisoMedio");
const portada = document.getElementById("portadaCumple"); /* solo en cumpleaños */
const botonRepetir = document.getElementById("btnRepetir"); /* solo en cumpleaños */

const accionesIniciales = document.getElementById("accionesIniciales");
const formulario = document.getElementById("formulario");
const estadoConfirmacion = document.getElementById("estadoConfirmacion");

const nombreInput = document.getElementById("nombre");
const personasInput = document.getElementById("personas");
const eventoInput = document.getElementById("evento");
const mensajeInput = document.getElementById("mensaje");
const botonGuardar = document.getElementById("btnConfirmar");

const popup = document.getElementById("popup");
const popupTitulo = document.getElementById("popupTitulo");
const popupTexto = document.getElementById("popupTexto");
const popupBoton = document.getElementById("btnCerrarPopup");

/* Celebración preseleccionada según la página */
eventoInput.value = EVENTO_PAGINA;


/* =========================
   MENSAJES EMERGENTES
   ========================= */

function mostrarPopup(titulo, texto) {

  popupTitulo.textContent = titulo;
  popupTexto.textContent = texto;
  popup.hidden = false;

  popupBoton.focus();

}

function mostrarAdvertencia(titulo, texto) {

  mostrarPopup("⚠️ " + titulo, texto);

}

function cerrarPopup() {

  popup.hidden = true;

  /* La música y el video comienzan juntos, únicamente al aceptar
     el mensaje inicial (los navegadores exigen una interacción). */

  if (musicaPendiente) {
    musicaPendiente = false;
    iniciarMusica();
  }

  if (videoPendiente) {
    videoPendiente = false;
    iniciarVideo();
  }

}


/* =========================
   MÚSICA DE FONDO
   ========================= */

async function iniciarMusica() {

  try {
    await musica.play();
  } catch (error) {
    console.error("No fue posible iniciar la música:", error);
  }

}


/* =========================
   VIDEO (siempre sin sonido)
   ========================= */

function iniciarVideo() {

  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.autoplay = true;
  video.playsInline = true;

  const intento = video.play();

  if (intento && typeof intento.catch === "function") {

    intento.catch(() => {

      /* Si el navegador lo bloquea, se reintenta con el primer
         toque o clic del visitante. */

      const reintentar = () => {
        video.play().catch(() => {});
      };

      document.addEventListener("touchstart", reintentar, { once: true });
      document.addEventListener("click", reintentar, { once: true });

    });

  }

}

/* Al terminar el video: se muestra la portada y el botón para
   verlo de nuevo. Si no lo presionan, la portada se queda fija. */

function mostrarPortada() {

  if (portada) portada.hidden = false;
  if (botonRepetir) botonRepetir.hidden = false;

}

function repetirVideo() {

  if (!video) return;

  if (portada) portada.hidden = true;
  if (botonRepetir) botonRepetir.hidden = true;

  video.muted = true;
  video.currentTime = 0;

  video.play().catch(() => {
    /* Si algo lo impide, se vuelve a mostrar la portada y el botón */
    mostrarPortada();
  });

}

function mostrarAvisoMedio() {

  if (!avisoMedio) return;

  if (portada) portada.hidden = true;
  if (botonRepetir) botonRepetir.hidden = true;
  if (video) video.hidden = true;
  if (imagenBautizo) imagenBautizo.hidden = true;

  avisoMedio.hidden = false;

}

if (video) {

  const fuente = video.querySelector("source");

  if (fuente) fuente.addEventListener("error", mostrarAvisoMedio);

  video.addEventListener("error", mostrarAvisoMedio);

  video.addEventListener("ended", mostrarPortada);

  if (botonRepetir) botonRepetir.addEventListener("click", repetirVideo);

  /* NETWORK_NO_SOURCE = 3 */
  if (video.networkState === 3) mostrarAvisoMedio();

}

if (imagenBautizo) {

  imagenBautizo.addEventListener("error", mostrarAvisoMedio);

  if (imagenBautizo.complete && imagenBautizo.naturalWidth === 0) {
    mostrarAvisoMedio();
  }

}


/* =========================
   MENSAJE INICIAL
   ========================= */

function mostrarMensajeInicial() {

  musicaPendiente = true;
  videoPendiente = Boolean(video);

  mostrarPopup(
    "Una pequeña recomendación",
    "Esta invitación cuenta con música de fondo que acompañará este momento especial. Te recomendamos ajustar el volumen de tu dispositivo a un nivel cómodo antes de continuar."
  );

}

setTimeout(mostrarMensajeInicial, 500);


/* =========================
   UTILIDADES DE ESTADO
   ========================= */

function olvidarRegistro() {

  localStorage.removeItem(claveConfirmacion);
  localStorage.removeItem(claveOwnerUid);

}

function guardarRegistroLocal(id) {

  localStorage.setItem(claveConfirmacion, id);
  localStorage.setItem(claveOwnerUid, usuarioAnonimo.uid);

}

function limpiarFormulario() {

  nombreInput.value = "";
  personasInput.value = "";
  mensajeInput.value = "";
  eventoInput.value = EVENTO_PAGINA;

}

function manejarError(error, contexto) {

  console.error(contexto, error);

  if (error && error.code === "permission-denied") {

    mostrarAdvertencia(
      "Error de permisos",
      "Firebase rechazó el registro. UID: " +
      (usuarioAnonimo ? usuarioAnonimo.uid : "sin UID")
    );

  } else {

    mostrarAdvertencia(
      "Error",
      ((error && error.code) || "sin código") +
      " - " +
      ((error && error.message) || "Error desconocido")
    );

  }

}

/* Devuelve el registro guardado en este navegador si existe y
   pertenece al usuario actual; si no, limpia las claves locales. */

async function obtenerRegistroPropio() {

  const id = localStorage.getItem(claveConfirmacion);

  if (!id || !usuarioAnonimo) return null;

  const referencia = doc(db, "invitados", id);

  try {

    const resultado = await getDoc(referencia);

    if (
      resultado.exists() &&
      resultado.data().ownerUid === usuarioAnonimo.uid
    ) {
      return { referencia, datos: resultado.data() };
    }

  } catch (error) {

    if (error.code !== "permission-denied") throw error;

  }

  olvidarRegistro();

  return null;

}


/* =========================
   PANTALLAS DE ESTADO
   ========================= */

function mostrarAccionesIniciales() {

  accionesIniciales.hidden = false;
  formulario.hidden = true;
  estadoConfirmacion.innerHTML = "";

}

function mostrarEstadoConfirmado() {

  accionesIniciales.hidden = true;
  formulario.hidden = true;

  estadoConfirmacion.innerHTML = `
    <p>💛 Ya registraste tu asistencia</p>

    <button type="button" class="btn btn-negro" data-accion="editar">
      Editar mi confirmación
    </button>

    <button type="button" class="btn btn-linea" data-accion="no-asiste">
      No podré acompañarlos en ninguna de las dos celebraciones
    </button>
  `;

}

function mostrarEstadoNoAsiste() {

  accionesIniciales.hidden = true;
  formulario.hidden = true;

  estadoConfirmacion.innerHTML = `
    <p>💛 No podrás acompañarnos</p>

    <button type="button" class="btn btn-amarillo" data-accion="cambiar">
      Cambiar de opinión
    </button>
  `;

}


/* =========================
   FORMULARIO
   ========================= */

function mostrarFormulario() {

  accionesIniciales.hidden = true;
  estadoConfirmacion.innerHTML = "";
  formulario.hidden = false;

  if (!eventoInput.value) eventoInput.value = EVENTO_PAGINA;

  botonGuardar.textContent = "Confirmar asistencia";

  nombreInput.focus();

}

function cambiarOpinion() {

  mostrarAccionesIniciales();

}

async function editarConfirmacion() {

  try {

    if (!usuarioAnonimo) {
      mostrarAdvertencia(
        "Conexión no disponible",
        "Espera unos segundos e intenta nuevamente."
      );
      return;
    }

    const registro = await obtenerRegistroPropio();

    if (!registro) {
      mostrarAccionesIniciales();
      return;
    }

    const datos = registro.datos;

    nombreInput.value = datos.nombre || "";
    personasInput.value = datos.personas || "";
    mensajeInput.value = datos.mensaje || "";

    eventoInput.value =
      EVENTOS_VALIDOS.includes(datos.evento)
        ? datos.evento
        : EVENTO_PAGINA;

    accionesIniciales.hidden = true;
    estadoConfirmacion.innerHTML = "";
    formulario.hidden = false;

    botonGuardar.textContent = "Guardar cambios";

  } catch (error) {

    console.error("Error al editar:", error);

    mostrarAdvertencia(
      "No fue posible editar",
      "Ocurrió un problema al cargar tu confirmación. Intenta nuevamente."
    );

  }

}


/* =========================
   NO ASISTIRÉ
   ========================= */

function noAsiste() {

  mostrarPopup(
    "Confirmación",
    "Si seleccionas esta opción, registraremos que no podrás acompañarnos. Puedes cambiar tu respuesta posteriormente."
  );

  accionesIniciales.hidden = true;
  formulario.hidden = true;

  estadoConfirmacion.innerHTML = `
    <button type="button" class="btn btn-negro" data-accion="confirmar-no">
      Confirmar que no asistiré
    </button>

    <button type="button" class="btn btn-linea" data-accion="volver">
      Volver
    </button>
  `;

}

async function crearNoAsistencia() {

  const nuevoRegistro = await addDoc(
    collection(db, "invitados"),
    {
      nombre: "Sin confirmar nombre",
      asistencia: false,
      personas: 0,
      evento: "No podrá asistir",
      mensaje: "",
      ownerUid: usuarioAnonimo.uid,
      fechaRegistro: serverTimestamp(),
      ultimaModificacion: serverTimestamp()
    }
  );

  guardarRegistroLocal(nuevoRegistro.id);

}

async function noAsistireDefinitivo() {

  try {

    if (!usuarioAnonimo) {
      mostrarAdvertencia(
        "No fue posible continuar",
        "La conexión todavía no está disponible. Intenta nuevamente."
      );
      return;
    }

    const registro = await obtenerRegistroPropio();

    if (registro) {

      await updateDoc(registro.referencia, {
        asistencia: false,
        evento: "No podrá asistir",
        ultimaModificacion: serverTimestamp()
      });

    } else {

      await crearNoAsistencia();

    }

    mostrarEstadoNoAsiste();

    mostrarPopup(
      "Muchas gracias",
      "Hemos registrado tu respuesta. Si posteriormente deseas cambiarla, podrás hacerlo desde esta misma invitación."
    );

  } catch (error) {

    manejarError(error, "Error al registrar que no asistirá:");

  }

}


/* =========================
   CONFIRMAR ASISTENCIA
   ========================= */

async function confirmarAsistencia() {

  try {

    const nombre = nombreInput.value.trim();
    const personas = Number(personasInput.value);
    const evento = eventoInput.value;
    const mensaje = mensajeInput.value.trim();

    if (!nombre) {
      mostrarAdvertencia(
        "Falta tu nombre",
        "Por favor, escribe el nombre de la familia."
      );
      return;
    }

    if (!personas || personas < 1 || !Number.isInteger(personas)) {
      mostrarAdvertencia(
        "Cantidad de personas",
        "Indica cuántas personas asistirán (número entero, mínimo 1)."
      );
      return;
    }

    if (!EVENTOS_VALIDOS.includes(evento)) {
      mostrarAdvertencia(
        "Falta seleccionar",
        "Indica a qué celebración nos acompañarás."
      );
      return;
    }

    if (!usuarioAnonimo) {
      mostrarAdvertencia(
        "Conexión no disponible",
        "Espera unos segundos e intenta nuevamente."
      );
      return;
    }

    botonGuardar.disabled = true;

    const registro = await obtenerRegistroPropio();

    /* ----- Ya existe registro: se actualiza (sin duplicar) ----- */

    if (registro) {

      await updateDoc(registro.referencia, {
        nombre,
        personas,
        evento,
        mensaje,
        asistencia: true,
        ultimaModificacion: serverTimestamp()
      });

      limpiarFormulario();
      mostrarEstadoConfirmado();

      mostrarPopup(
        "¡Muchas gracias!",
        "Tu confirmación ha sido actualizada correctamente. Será un gusto contar contigo en este momento tan especial."
      );

      return;

    }

    /* ----- Primer registro ----- */

    const nuevoRegistro = await addDoc(
      collection(db, "invitados"),
      {
        nombre,
        asistencia: true,
        personas,
        evento,
        mensaje,
        ownerUid: usuarioAnonimo.uid,
        fechaRegistro: serverTimestamp(),
        ultimaModificacion: serverTimestamp()
      }
    );

    guardarRegistroLocal(nuevoRegistro.id);

    limpiarFormulario();
    mostrarEstadoConfirmado();

    mostrarPopup(
      "💛 ¡Muchas gracias!",
      "Tu asistencia ha sido confirmada correctamente. Será un gusto compartir este momento tan especial contigo."
    );

  } catch (error) {

    manejarError(error, "Error al guardar:");

  } finally {

    botonGuardar.disabled = false;

  }

}


/* =========================
   COMPROBAR CONFIRMACIÓN AL INICIAR
   ========================= */

async function comprobarConfirmacion() {

  try {

    if (!usuarioAnonimo) return;

    const registro = await obtenerRegistroPropio();

    if (!registro) {
      mostrarAccionesIniciales();
      return;
    }

    if (registro.datos.asistencia === false) {
      mostrarEstadoNoAsiste();
    } else {
      mostrarEstadoConfirmado();
    }

  } catch (error) {

    console.error("Error comprobando confirmación:", error);
    mostrarAccionesIniciales();

  }

}


/* =========================
   EVENTOS (sin onclick en el HTML)
   Se registran ANTES de la autenticación para que los botones
   respondan aunque Firebase tarde en conectar.
   ========================= */

popupBoton.addEventListener("click", cerrarPopup);

document.getElementById("btnSi").addEventListener("click", mostrarFormulario);
document.getElementById("btnNo").addEventListener("click", noAsiste);

document.getElementById("btnCancelar").addEventListener("click", () => {
  limpiarFormulario();
  comprobarConfirmacion();
});

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  confirmarAsistencia();
});

estadoConfirmacion.addEventListener("click", (evento) => {

  const boton = evento.target.closest("[data-accion]");

  if (!boton) return;

  switch (boton.dataset.accion) {
    case "editar":        editarConfirmacion();     break;
    case "no-asiste":     noAsiste();               break;
    case "confirmar-no":  noAsistireDefinitivo();   break;
    case "cambiar":       cambiarOpinion();         break;
    case "volver":        comprobarConfirmacion();  break;
  }

});


/* =========================
   AUTENTICACIÓN ANÓNIMA
   ========================= */

try {

  if (auth.currentUser) {

    usuarioAnonimo = auth.currentUser;

  } else {

    const resultado = await signInAnonymously(auth);
    usuarioAnonimo = resultado.user;

  }

  console.log("Usuario anónimo conectado:", usuarioAnonimo.uid);

  const ownerUidGuardado = localStorage.getItem(claveOwnerUid);
  const idGuardado = localStorage.getItem(claveConfirmacion);

  if (idGuardado && !ownerUidGuardado) {
    localStorage.removeItem(claveConfirmacion);
  }

  if (ownerUidGuardado && ownerUidGuardado !== usuarioAnonimo.uid) {
    olvidarRegistro();
  }

} catch (error) {

  console.error("Error de autenticación:", error);

  mostrarPopup(
    "Aviso",
    "No fue posible conectar correctamente con el sistema de confirmaciones. Por favor, intenta nuevamente."
  );

}

await comprobarConfirmacion();
