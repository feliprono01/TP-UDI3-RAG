// El servidor del front.   node --env-file=.env servidor.mjs   ->   http://localhost:3000
// La clave de Google vive acá, en tu compu. El navegador solo manda la pregunta
// y recibe la respuesta: nunca ve la clave (F12 no la encuentra).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { preguntarRAG, etiqueta } from "./rag.mjs";
import { consulta } from "./db.mjs";

const PUERTO = Number(process.env.PORT ?? 3000);
const MAX_CUERPO = 10_000;
const MAX_PREGUNTA = 500;

const json = (res, estado, objeto) => {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(objeto));
};

async function leerCuerpo(req) {
  let cuerpo = "";
  for await (const pedazo of req) {
    cuerpo += pedazo;
    if (cuerpo.length > MAX_CUERPO) throw Object.assign(new Error("Pedido demasiado grande"), { estado: 413 });
  }
  return cuerpo;
}

http
  .createServer(async (req, res) => {
    try {
      if (req.method === "POST" && req.url === "/preguntar") {
        const { pregunta } = JSON.parse(await leerCuerpo(req));
        if (typeof pregunta !== "string" || !pregunta.trim()) {
          return json(res, 400, { error: "Escribí una pregunta." });
        }
        if (pregunta.length > MAX_PREGUNTA) {
          return json(res, 400, { error: `La pregunta pasa de ${MAX_PREGUNTA} caracteres.` });
        }
        const r = await preguntarRAG(pregunta.trim());
        // Mandamos todo lo que el front necesita para mostrar la fuente y los fragmentos.
        return json(res, 200, {
          respuesta: r.respuesta,
          llamoAlModelo: r.llamoAlModelo,
          umbral: r.umbral,
          fragmentos: r.fragmentos.map((f) => ({
            etiqueta: etiqueta(f),
            fuente: f.fuente,
            seccion: f.seccion,
            similitud: f.similitud,
            util: f.util,
            texto: f.texto,
          })),
        });
      }

      if (req.method === "GET" && req.url === "/estado") {
        const { rows } = await consulta("SELECT COUNT(*)::int AS n FROM fragmentos");
        return json(res, 200, { fragmentos: rows[0].n, umbral: Number(process.env.UMBRAL ?? 0) });
      }

      if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(await readFile(new URL("./public/index.html", import.meta.url)));
      }

      json(res, 404, { error: "No existe esa dirección." });
    } catch (e) {
      console.error(e.message);
      json(res, e.estado ?? 500, { error: e.message });
    }
  })
  .listen(PUERTO, "127.0.0.1", () => console.log(`Listo: http://localhost:${PUERTO}`));
