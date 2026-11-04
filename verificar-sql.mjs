// ¿Postgres calcula lo mismo que mi coseno de la clase 6?   node --env-file=.env verificar-sql.mjs
import { embedding } from "./api.mjs";
import { buscar } from "./buscar.mjs";
import { consulta, cerrar } from "./db.mjs";
import { coseno } from "./similitud.mjs";

try {
  const vector = await embedding("¿cuánto sale la cuota mensual?");
  const top = await buscar(vector, 3);

  console.log("sección                           SQL        JavaScript");
  for (const f of top) {
    const { rows } = await consulta("SELECT embedding::text AS e FROM fragmentos WHERE id = $1", [f.id]);
    const propio = coseno(vector, JSON.parse(rows[0].e));
    console.log(`${String(f.seccion).padEnd(32)}  ${f.similitud.toFixed(6)}   ${propio.toFixed(6)}`);
  }
} finally {
  await cerrar();
}
