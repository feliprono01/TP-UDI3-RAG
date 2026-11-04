// El sistema completo en la terminal.
//   node --env-file=.env preguntar.mjs "¿cuánto sale la cuota?"
//   node --env-file=.env preguntar.mjs --sin-modelo "¿cuánto sale la cuota?"   (solo la búsqueda)
//   node --env-file=.env preguntar.mjs                                          (modo conversación)
import readline from "node:readline/promises";
import { preguntarRAG, etiqueta } from "./rag.mjs";
import { totalPedidos } from "./api.mjs";
import { cerrar } from "./db.mjs";

const args = process.argv.slice(2);
const sinModelo = args.includes("--sin-modelo");
const pregunta = args.filter((a) => !a.startsWith("--")).join(" ").trim();

async function preguntar(texto) {
  const r = await preguntarRAG(texto, { sinModelo });
  console.log(`\nPregunta: ${texto}`);
  console.log(`Umbral: ${r.umbral}\n`);
  for (const f of r.fragmentos) {
    console.log(`  ${f.util ? "✓" : "✗"} ${f.similitud.toFixed(3)}  ${etiqueta(f)}`);
  }
  console.log(`\n${r.respuesta ?? "(--sin-modelo: no se llamó al modelo)"}\n`);
}

try {
  if (pregunta) {
    await preguntar(pregunta);
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("Rodolfo te escucha. Escribí tu pregunta (vacío para salir).");
    for (;;) {
      const texto = (await rl.question("\n> ")).trim();
      if (!texto) break;
      await preguntar(texto);
    }
    rl.close();
  }
  console.log(`Pedidos a la API: ${totalPedidos()}`);
} finally {
  await cerrar();
}
