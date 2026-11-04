// El RAG convertido en una función, para usarlo desde la terminal, la web o un bot.
//   pregunta -> embedding (Ollama) -> búsqueda (Postgres) -> umbral -> prompt -> respuesta (Google)
import { readFile } from "node:fs/promises";
import { embedding, responder } from "./api.mjs";
import { buscar } from "./buscar.mjs";

const PLANTILLA = await readFile(new URL("./prompt.txt", import.meta.url), "utf8");
export const NO_ESTA = "No lo encuentro en los documentos.";

// Cómo se cita un fragmento: archivo + sección (o su posición si no tiene sección).
export const etiqueta = (f) => `${f.fuente} — ${f.seccion ?? `fragmento ${f.posicion}`}`;

// AQUÍ SE ARMA EL PROMPT: la plantilla de prompt.txt con los fragmentos y la pregunta.
// (con una función en el replace, para que un "$" del texto no se interprete como patrón)
export function armarPrompt(pregunta, fragmentos) {
  const texto = fragmentos.map((f) => `--- ${etiqueta(f)} ---\n${f.texto}`).join("\n\n");
  return PLANTILLA.replace("{{fragmentos}}", () => texto).replace("{{pregunta}}", () => pregunta);
}

export async function preguntarRAG(pregunta, { sinModelo = false, k = 3 } = {}) {
  const umbral = Number(process.env.UMBRAL ?? 0);

  const encontrados = await buscar(await embedding(pregunta), k);
  const fragmentos = encontrados.map((f) => ({ ...f, util: f.similitud >= umbral }));
  const utiles = fragmentos.filter((f) => f.util);

  // El UMBRAL decide si hay algo que valga la pena mandarle al modelo.
  // Si no hay, ni lo llamamos: es la defensa más barata contra inventar.
  if (utiles.length === 0) {
    return { respuesta: NO_ESTA, fragmentos, umbral, llamoAlModelo: false };
  }

  const prompt = armarPrompt(pregunta, utiles);
  if (sinModelo) return { respuesta: null, fragmentos, umbral, prompt, llamoAlModelo: false };

  return { respuesta: await responder(prompt), fragmentos, umbral, prompt, llamoAlModelo: true };
}
