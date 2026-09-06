setTimeout(() => {

document.getElementById("intro").style.display = "none";

document.getElementById("invitacion").style.display = "block";

}, 3000);

function mostrarFormulario() {

document.getElementById("formulario").style.display = "block";

document.getElementById("gracias").innerHTML = "";

}

function mostrarPopup(titulo, mensaje) {

document.getElementById("popupTitulo").innerHTML = titulo;

document.getElementById("popupTexto").innerHTML = mensaje;

document.getElementById("popup").style.display = "block";

}

function cerrarPopup() {

document.getElementById("popup").style.display = "none";

}

function noAsiste() {

document.getElementById("formulario").style.display = "none";

mostrarPopup(
"💛 Gracias por avisarnos",
"Te entendemos y esperamos verte pronto."
);

}
function reproducirMusica() {
  const musica = document.getElementById("musica");
  musica.play();
}
function controlarMusica() {
  const musica = document.getElementById("musica");
  const boton = document.getElementById("botonMusica");

  if (musica.paused) {
    musica.play();
    boton.innerHTML = "🎵 ⏸ Pausar";
  } else {
    musica.pause();
    boton.innerHTML = "🎵 ▶ Reanudar";
  }
}