// corpus/ -> tabla fragmentos.   node --env-file=.env indexar.mjs
import { readdir, readFile } from "node:fs/promises";
import { embeddingsEnLote, totalPedidos } from "./api.mjs";
import { consulta, cerrar } from "./db.mjs";
import { enLotes } from "./lotes.mjs";
import { MARCA } from "./marca.mjs";
import { comoVector } from "./buscar.mjs";
import { trocearPorMarca, trocearFijo } from "./trocear.mjs";

const TAMANO_LOTE = 16;

try {
  // Un INSERT agrega; no reemplaza. Si no vaciamos la tabla, indexar dos veces
  // duplica cada fragmento. RESTART IDENTITY hace que el id vuelva a empezar en 1.
  await consulta("TRUNCATE TABLE fragmentos RESTART IDENTITY");

  const archivos = (await readdir("corpus")).filter((f) => /\.(txt|md)$/.test(f)).sort();
  if (archivos.length === 0) throw new Error("La carpeta corpus/ no tiene archivos .txt ni .md");

  for (const archivo of archivos) {
    const texto = await readFile(`corpus/${archivo}`, "utf8");
    const fragmentos = MARCA ? trocearPorMarca(texto, MARCA) : trocearFijo(texto);

    for (const lote of enLotes(fragmentos, TAMANO_LOTE)) {
      const vectores = await embeddingsEnLote(lote.map((f) => f.texto));
      for (let i = 0; i < lote.length; i++) {
        const f = lote[i];
        await consulta(
          `INSERT INTO fragmentos (fuente, seccion, posicion, texto, embedding)
           VALUES ($1, $2, $3, $4, $5)`,
          [archivo, f.seccion, f.posicion, f.texto, comoVector(vectores[i])]
        );
      }
    }
    console.log(`${archivo}: ${fragmentos.length} fragmentos`);
  }

  const { rows } = await consulta(
    "SELECT fuente, COUNT(*)::int AS n FROM fragmentos GROUP BY fuente ORDER BY fuente"
  );
  console.log("\nQué hay en la base:");
  for (const r of rows) console.log(`  ${r.fuente}: ${r.n}`);
  console.log(`Pedidos a la API: ${totalPedidos()}`);
} finally {
  await cerrar();
}
