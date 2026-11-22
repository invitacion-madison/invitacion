/* =========================================================
   PANEL ADMINISTRATIVO — invitados
   Guardar como: js/admin.js
   Usa el mismo Firebase (js/firebase.js) y la colección "invitados".
   ========================================================= */

import { db, auth } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


/* =========================
   ELEMENTOS
   ========================= */

const $ = (id) => document.getElementById(id);

const seccionLogin = $("login");
const seccionPanel = $("panel");
const formLogin = $("formLogin");
const errorLogin = $("errorLogin");
const btnEntrar = $("btnEntrar");
const btnSalir = $("btnSalir");
const buscador = $("buscador");
const lista = $("lista");
const contador = $("contador");


/* =========================
   ESTADO
   ========================= */

let registros = [];
let filtroActual = "todos";
let dejarDeEscuchar = null;


/* =========================
   CLASIFICACIÓN DE REGISTROS
   ========================= */

const noAsiste = (r) => r.asistencia === false;

const esAmbas = (r) =>
  !noAsiste(r) && r.evento === "Ambas celebraciones";

const vaAlCumple = (r) =>
  !noAsiste(r) && (r.evento === "Cumpleaños" || r.evento === "Ambas celebraciones");

const vaAlBautizo = (r) =>
  !noAsiste(r) && (r.evento === "Bautizo" || r.evento === "Ambas celebraciones");

const personasDe = (r) => Number(r.personas) || 0;

const sumar = (arreglo) =>
  arreglo.reduce((total, r) => total + personasDe(r), 0);


/* =========================
   UTILIDADES
   ========================= */

function nombreMostrado(r) {

  if (noAsiste(r) && (!r.nombre || r.nombre === "Sin confirmar nombre")) {
    return "(Sin nombre)";
  }

  return r.nombre || "(Sin nombre)";

}

function etiquetaEvento(r) {

  if (noAsiste(r)) return "No asistirá";
  if (r.evento === "Ambas celebraciones") return "🎂🕊️ Ambas";
  if (r.evento === "Cumpleaños") return "🎂 Cumpleaños";
  if (r.evento === "Bautizo") return "🕊️ Bautizo";

  return r.evento || "—";

}

function textoFecha(marca) {

  try {

    if (marca && typeof marca.toDate === "function") {
      return marca.toDate().toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short"
      });
    }

  } catch (error) {
    /* se ignora: se muestra vacío */
  }

  return "";

}


/* =========================
   FILTROS
   ========================= */

function pasaFiltro(r) {

  switch (filtroActual) {
    case "cumple":  return vaAlCumple(r);
    case "bautizo": return vaAlBautizo(r);
    case "ambas":   return esAmbas(r);
    case "no":      return noAsiste(r);
    default:        return true;
  }

}

function pasaBusqueda(r) {

  const texto = buscador.value.trim().toLowerCase();

  if (!texto) return true;

  return (
    String(r.nombre || "").toLowerCase().includes(texto) ||
    String(r.mensaje || "").toLowerCase().includes(texto)
  );

}


/* =========================
   PINTAR RESUMEN
   ========================= */

function pintarResumen() {

  const confirmados = registros.filter(r => !noAsiste(r));
  const noVan = registros.filter(noAsiste);

  $("totPersonas").textContent = sumar(confirmados);
  $("totFamilias").textContent = confirmados.length;
  $("totNo").textContent = noVan.length;
  $("totCumple").textContent = sumar(registros.filter(vaAlCumple));
  $("totBautizo").textContent = sumar(registros.filter(vaAlBautizo));

  const soloCumple = sumar(confirmados.filter(r => r.evento === "Cumpleaños"));
  const soloBautizo = sumar(confirmados.filter(r => r.evento === "Bautizo"));
  const ambas = sumar(confirmados.filter(esAmbas));

  $("desglose").textContent =
    `Solo cumpleaños: ${soloCumple} · Solo bautizo: ${soloBautizo} · Ambas: ${ambas}`;

}


/* =========================
   PINTAR LISTA (sin innerHTML: los textos de los invitados
   se insertan como texto para evitar código malicioso)
   ========================= */

function crearTarjeta(r) {

  const tarjeta = document.createElement("article");
  tarjeta.className = "invitado" + (noAsiste(r) ? " no" : "");

  const fila = document.createElement("div");
  fila.className = "fila";

  const nombre = document.createElement("span");
  nombre.className = "nombre";
  nombre.textContent = nombreMostrado(r);

  const insignia = document.createElement("span");
  insignia.className = "badge";
  insignia.textContent = etiquetaEvento(r);

  fila.append(nombre, insignia);
  tarjeta.appendChild(fila);

  if (!noAsiste(r)) {

    const personas = document.createElement("span");
    personas.className = "personas";

    const n = personasDe(r);
    personas.textContent = `👥 ${n} ${n === 1 ? "persona" : "personas"}`;

    tarjeta.appendChild(personas);

  }

  if (r.mensaje) {

    const mensaje = document.createElement("p");
    mensaje.className = "mensaje";
    mensaje.textContent = "“" + r.mensaje + "”";

    tarjeta.appendChild(mensaje);

  }

  const fecha = textoFecha(r.ultimaModificacion || r.fechaRegistro);

  if (fecha) {

    const marca = document.createElement("span");
    marca.className = "fecha";
    marca.textContent = "Actualizado: " + fecha;

    tarjeta.appendChild(marca);

  }

  return tarjeta;

}

function pintarLista() {

  const visibles = registros.filter(r => pasaFiltro(r) && pasaBusqueda(r));

  lista.replaceChildren();

  if (visibles.length === 0) {

    const vacio = document.createElement("p");
    vacio.className = "vacio";
    vacio.textContent = "No hay registros para mostrar.";

    lista.appendChild(vacio);

  } else {

    visibles.forEach(r => lista.appendChild(crearTarjeta(r)));

  }

  contador.textContent =
    `Mostrando ${visibles.length} de ${registros.length}`;

}

function pintar() {

  pintarResumen();
  pintarLista();

}


/* =========================
   LECTURA EN VIVO DE FIRESTORE
   ========================= */

function empezarAEscuchar() {

  if (dejarDeEscuchar) return;

  const consulta = query(
    collection(db, "invitados"),
    orderBy("fechaRegistro", "desc")
  );

  dejarDeEscuchar = onSnapshot(
    consulta,

    (instantanea) => {

      registros = instantanea.docs.map(d => ({ id: d.id, ...d.data() }));
      pintar();

    },

    (error) => {

      console.error("Error leyendo invitados:", error);

      lista.replaceChildren();

      const aviso = document.createElement("p");
      aviso.className = "error";

      aviso.textContent =
        error.code === "permission-denied"
          ? "Esta cuenta no tiene permiso para ver los invitados. Revisa las reglas de Firestore (ver instrucciones)."
          : "No fue posible cargar los invitados. Intenta nuevamente.";

      lista.appendChild(aviso);

    }
  );

}

function dejarDeEscucharFirestore() {

  if (dejarDeEscuchar) {
    dejarDeEscuchar();
    dejarDeEscuchar = null;
  }

  registros = [];

}


/* =========================
   SESIÓN
   ========================= */

onAuthStateChanged(auth, (usuario) => {

  /* Las sesiones anónimas (invitados) NO cuentan como administrador */

  if (usuario && !usuario.isAnonymous) {

    seccionLogin.hidden = true;
    seccionPanel.hidden = false;
    btnSalir.hidden = false;

    empezarAEscuchar();

  } else {

    dejarDeEscucharFirestore();

    seccionPanel.hidden = true;
    btnSalir.hidden = true;
    seccionLogin.hidden = false;

  }

});

formLogin.addEventListener("submit", async (evento) => {

  evento.preventDefault();

  errorLogin.hidden = true;

  const correo = $("correo").value.trim();
  const clave = $("clave").value;

  if (!correo || !clave) {
    errorLogin.textContent = "Escribe tu correo y contraseña.";
    errorLogin.hidden = false;
    return;
  }

  btnEntrar.disabled = true;

  try {

    await signInWithEmailAndPassword(auth, correo, clave);

    $("clave").value = "";

  } catch (error) {

    console.error("Error de acceso:", error);

    const mensajes = {
      "auth/invalid-credential": "Correo o contraseña incorrectos.",
      "auth/wrong-password": "Correo o contraseña incorrectos.",
      "auth/user-not-found": "Correo o contraseña incorrectos.",
      "auth/invalid-email": "El correo no es válido.",
      "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
      "auth/operation-not-allowed": "Falta habilitar el acceso con correo y contraseña en Firebase."
    };

    errorLogin.textContent =
      mensajes[error.code] || "No fue posible iniciar sesión.";

    errorLogin.hidden = false;

  } finally {

    btnEntrar.disabled = false;

  }

});

btnSalir.addEventListener("click", async () => {

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al salir:", error);
  }

});


/* =========================
   FILTROS Y BÚSQUEDA
   ========================= */

$("chips").addEventListener("click", (evento) => {

  const chip = evento.target.closest(".chip");

  if (!chip) return;

  filtroActual = chip.dataset.filtro;

  document.querySelectorAll(".chip").forEach(c => {
    c.setAttribute("aria-pressed", String(c === chip));
  });

  pintarLista();

});

buscador.addEventListener("input", pintarLista);


/* =========================
   DESCARGAR CSV (abre en Excel)
   ========================= */

function celdaCsv(valor) {

  let texto = String(valor ?? "");

  /* Evita que Excel interprete un texto como fórmula */
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;

  return '"' + texto.replace(/"/g, '""') + '"';

}

$("btnCsv").addEventListener("click", () => {

  const encabezado = [
    "Nombre", "Asistencia", "Personas", "Celebración", "Mensaje", "Fecha de registro"
  ];

  const filas = registros.map(r => [
    nombreMostrado(r),
    noAsiste(r) ? "No" : "Sí",
    noAsiste(r) ? 0 : personasDe(r),
    noAsiste(r) ? "No asistirá" : (r.evento || ""),
    r.mensaje || "",
    textoFecha(r.fechaRegistro)
  ]);

  const contenido = [encabezado, ...filas]
    .map(fila => fila.map(celdaCsv).join(","))
    .join("\r\n");

  /* \ufeff = marca para que Excel respete los acentos */
  const archivo = new Blob(["\ufeff" + contenido], {
    type: "text/csv;charset=utf-8;"
  });

  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = "invitados.csv";

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);

});
