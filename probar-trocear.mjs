// Ficha 2: ¿cómo troceó mi marca? No necesita Docker ni Ollama.   node probar-trocear.mjs
import { readdir, readFile } from "node:fs/promises";
import { MARCA } from "./marca.mjs";
import { trocearPorMarca } from "./trocear.mjs";

for (const archivo of (await readdir("corpus")).filter((f) => /\.(txt|md)$/.test(f)).sort()) {
  const fragmentos = trocearPorMarca(await readFile(`corpus/${archivo}`, "utf8"), MARCA);
  const largos = fragmentos.map((f) => f.texto.length);
  console.log(`\n${archivo}: ${fragmentos.length} fragmentos`);
  console.log(`  con sección reconocida: ${fragmentos.filter((f) => f.seccion).length} de ${fragmentos.length}`);
  console.log(`  más corto: ${Math.min(...largos)} caracteres · más largo: ${Math.max(...largos)} caracteres`);
  for (const f of fragmentos) {
    console.log(`  [${String(f.posicion).padStart(2)}] ${String(f.texto.length).padStart(4)}  ${f.seccion}`);
  }
}
