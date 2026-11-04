// Corre esquema.sql entero.   node --env-file=.env crear-tabla.mjs
import { readFile } from "node:fs/promises";
import { consulta, cerrar } from "./db.mjs";

try {
  await consulta(await readFile("esquema.sql", "utf8"));
  console.log("Listo: extensión vector activa, tabla fragmentos e índice HNSW creados.");
} finally {
  await cerrar();
}
