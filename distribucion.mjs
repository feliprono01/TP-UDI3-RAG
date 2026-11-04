// Calibra el umbral (Ficha 4) y mide la búsqueda (extra: medición propia).
//   node --env-file=.env distribucion.mjs
// Para cada pregunta de pruebas.json imprime la similitud del mejor fragmento.
// Si hay un hueco limpio entre las que están y las que no, propone un umbral en el medio.
import { readFile } from "node:fs/promises";
import { embeddingsEnLote } from "./api.mjs";
import { buscar } from "./buscar.mjs";
import { cerrar } from "./db.mjs";

try {
  const pruebas = JSON.parse(await readFile("pruebas.json", "utf8"));
  const vectores = await embeddingsEnLote(pruebas.map((p) => p.pregunta));

  const filas = [];
  for (let i = 0; i < pruebas.length; i++) {
    const [mejor] = await buscar(vectores[i], 3);
    filas.push({ ...pruebas[i], similitud: mejor.similitud, seccionHallada: mejor.seccion });
  }

  filas.sort((a, b) => b.similitud - a.similitud);
  console.log("similitud  ¿está?  sección que trajo primero            pregunta");
  for (const f of filas) {
    const ok = f.esta ? (f.seccionHallada === f.seccion ? " ✓" : " ✗ (esperaba: " + f.seccion + ")") : "";
    console.log(
      `${f.similitud.toFixed(3)}     ${f.esta ? "sí " : "no "}   ${String(f.seccionHallada).padEnd(32)}${f.pregunta}${ok}`
    );
  }

  const estan = filas.filter((f) => f.esta);
  const noEstan = filas.filter((f) => !f.esta);
  const minEstan = Math.min(...estan.map((f) => f.similitud));
  const maxNoEstan = Math.max(...noEstan.map((f) => f.similitud));

  console.log(`\nLa más baja de las que están:     ${minEstan.toFixed(3)}`);
  console.log(`La más alta de las que no están:  ${maxNoEstan.toFixed(3)}`);
  if (minEstan > maxNoEstan) {
    console.log(`Hay un hueco limpio. Umbral sugerido (en el medio): ${((minEstan + maxNoEstan) / 2).toFixed(2)}`);
  } else {
    console.log("Las nubes se pisan: no hay umbral perfecto. Elegí qué error preferís (ver LEEME.md)");
    console.log("y anotá cuáles quedaron del lado equivocado: es material para la exposición.");
  }

  const aciertos = estan.filter((f) => f.seccionHallada === f.seccion).length;
  console.log(`\nLa sección correcta salió primera en ${aciertos} de ${estan.length} preguntas que están.`);
} finally {
  await cerrar();
}
