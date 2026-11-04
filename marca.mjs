// La MARCA de mi corpus: la expresión regular que reconoce dónde empieza cada parte.
// Mis documentos son Markdown, y cada parte arranca con un título (#, ## o ###).
// Termina en `.+` para que la sección se llame como el título entero ("Cuota social"),
// y no solo "##". Lo que la marca reconoce es lo que se cita como fuente.
export const MARCA = /^#{1,3} .+/;
