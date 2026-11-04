// Las dos llamadas de red del sistema:
//   - embeddings -> Ollama, en tu compu (modelo bge-m3)
//   - respuesta  -> Google (Gemini), por API
// Las dos hablan el mismo formato (el de OpenAI), por eso el código es casi igual.

let pedidos = 0;
export const totalPedidos = () => pedidos;

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434/v1";
const GOOGLE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

function requerido(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre}. ¿Corriste node con --env-file=.env?`);
  return valor;
}

async function pedir(url, cuerpo, clave, servicio) {
  const esperas = [1000, 3000, 8000]; // reintentos ante 429 / 5xx
  for (let intento = 0; ; intento++) {
    let res;
    try {
      pedidos++;
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clave ? { Authorization: `Bearer ${clave}` } : {}),
        },
        body: JSON.stringify(cuerpo),
      });
    } catch {
      throw new Error(`No contesta nadie en ${url}. ¿Está abierto ${servicio}?`);
    }
    if (res.ok) return res.json();
    const reintentable = res.status === 429 || res.status >= 500;
    if (reintentable && intento < esperas.length) {
      await new Promise((r) => setTimeout(r, esperas[intento]));
      continue;
    }
    const detalle = (await res.text()).slice(0, 300);
    throw new Error(`La API respondió ${res.status} (${servicio}): ${detalle}`);
  }
}

// Varios textos en un solo pedido. Devuelve un vector por texto, en el mismo orden.
export async function embeddingsEnLote(textos) {
  const datos = await pedir(
    `${OLLAMA_URL}/embeddings`,
    { model: requerido("MODELO_EMBEDDINGS"), input: textos },
    null,
    "Ollama"
  );
  const vectores = datos.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);

  // Protección: si el modelo devuelve otra cantidad de números, avisamos
  // en lugar de guardar basura en la base.
  const esperado = Number(process.env.DIMENSIONES);
  if (esperado) {
    for (const v of vectores) {
      if (v.length !== esperado) {
        throw new Error(`El modelo devolvió ${v.length} números y el .env dice DIMENSIONES=${esperado}`);
      }
    }
  }
  return vectores;
}

export async function embedding(texto) {
  return (await embeddingsEnLote([texto]))[0];
}

// La respuesta la genera un modelo de Google. temperature 0 = lo más estable posible.
export async function responder(prompt) {
  const datos = await pedir(
    `${GOOGLE_URL}/chat/completions`,
    {
      model: requerido("MODELO_CHAT"),
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    },
    requerido("GOOGLE_API_KEY"),
    "Google"
  );
  return datos.choices[0].message.content.trim();
}
