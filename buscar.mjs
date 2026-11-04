// La búsqueda, escrita en SQL: Postgres hace la cuenta.
import { consulta } from "./db.mjs";

// pgvector recibe el vector como texto entre corchetes: [0.12,-0.03,...]
// (si le pasáramos el arreglo de JS directo, pg lo escribiría con llaves y no lo entendería)
export const comoVector = (v) => JSON.stringify(v);

export async function buscar(vectorPregunta, k = 3) {
  const { rows } = await consulta(
    `SELECT id, fuente, seccion, posicion, texto,
            1 - (embedding <=> $1::vector) AS similitud
       FROM fragmentos
      ORDER BY embedding <=> $1::vector
      LIMIT $2`,
    [comoVector(vectorPregunta), k]
  );
  // ORDER BY va por la DISTANCIA (no por la similitud): da el mismo orden,
  // pero solo así Postgres puede usar el índice HNSW.
  return rows.map((r) => ({ ...r, similitud: Number(r.similitud) }));
}
