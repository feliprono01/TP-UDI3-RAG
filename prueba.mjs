// Ficha 1: ¿cuántos números devuelve el modelo de embeddings?   node --env-file=.env prueba.mjs
import { embeddingsEnLote, totalPedidos } from "./api.mjs";

const [a, b] = await embeddingsEnLote(["¿cuánto sale la cuota?", "el precio mensual de ser socio"]);
console.log("Números en el primer vector:", a.length);
console.log("Números en el segundo vector:", b.length);
console.log("Primeros cinco:", a.slice(0, 5).map((n) => n.toFixed(4)).join(", "));
console.log("Pedidos:", totalPedidos());
