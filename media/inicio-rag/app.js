/* =========================================================
   Clase 5 — trocear y buscar
   Script clásico: sin import ni export, para que funcione
   abriendo index.html con doble clic, sin servidor.
   ========================================================= */

/* ---------- 1. LA PLANTILLA DEL PROMPT ---------- */
const PLANTILLA = `Sos un asistente que responde consultas sobre el reglamento
de alumnos de una facultad.

Respondé usando EXCLUSIVAMENTE los fragmentos del reglamento
que aparecen más abajo. No uses ningún conocimiento propio.
Si los fragmentos no contienen la respuesta, respondé
exactamente: "El reglamento no lo especifica."

Formato de la respuesta:
- Una respuesta breve, de dos oraciones como máximo.
- Después, el renglón "Fuente:" con el número de artículo
  del que sacaste la respuesta.

FRAGMENTOS:
{{fragmentos}}

PREGUNTA:
{{pregunta}}`;

/* ---------- 2. PALABRAS VACÍAS ----------
   Palabras frecuentes sin contenido propio. Se escriben SIN
   acento porque se comparan después de normalizar.
   Sin este filtro, una preposición como "para" le da puntaje
   a cualquier fragmento y la búsqueda devuelve basura. */
const VACIAS = new Set([
  "para", "como", "sobre", "entre", "desde", "hasta", "cuando", "donde",
  "cual", "cuales", "quien", "quienes", "este", "esta", "esto", "estos",
  "estas", "todo", "toda", "todos", "todas", "otro", "otra", "otros", "otras",
  "pero", "porque", "cuanto", "cuanta", "cuantos", "cuantas", "puedo",
  "tengo", "tener", "hacer", "quiero", "debo", "seria", "hay", "haber",
  "cada", "tambien"
]);

/* ---------- 3. TROCEAR ----------
   Parte el texto en fragmentos de tamaño fijo, donde cada uno
   arranca `solapamiento` caracteres antes de donde terminó el
   anterior, para que una respuesta cortada al medio quede
   completa en al menos uno de los dos. */
function trocear(texto, tamano = 800, solapamiento = 150) {
  if (solapamiento >= tamano) {
    throw new Error("el solapamiento no puede ser mayor o igual al tamaño");
  }

  const fragmentos = [];
  let inicio = 0;

  while (inicio < texto.length) {
    const fin = Math.min(inicio + tamano, texto.length);

    fragmentos.push({
      id: fragmentos.length,
      inicio,
      fin,
      texto: texto.slice(inicio, fin),
    });

    if (fin === texto.length) break;
    inicio = fin - solapamiento;
  }

  return fragmentos;
}

/* ---------- 4. NORMALIZAR ----------
   Lleva el texto a una forma comparable. El paso NFD descompone
   cada letra acentuada en letra + acento, y el replace siguiente
   borra el acento: "perderá" queda "perdera". */
function normalizar(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* ---------- 5. TÉRMINOS ÚTILES ----------
   De la pregunta, los que tienen más de tres letras y no son
   palabras vacías. */
function terminosUtiles(pregunta) {
  return normalizar(pregunta).filter(t => t.length > 3 && !VACIAS.has(t));
}

/* ---------- 6. BUSCAR ----------
   Cuenta cuántos términos útiles de la pregunta aparecen en cada
   fragmento y devuelve los k mejores. */
function buscar(pregunta, fragmentos, k = 3) {
  const terminos = terminosUtiles(pregunta);

  return fragmentos
    .map(f => {
      const palabras = normalizar(f.texto);
      let puntaje = 0;

      for (const t of terminos) {
        puntaje += palabras.filter(p => p === t).length;
      }

      return { id: f.id, puntaje, texto: f.texto };
    })
    .filter(r => r.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, k);
}

/* ---------- 7. ARMAR EL PROMPT ---------- */
function armarPrompt(pregunta, resultados) {
  const fragmentos = resultados
    .map(r => `--- fragmento ${r.id} ---\n${r.texto}`)
    .join("\n\n");

  return PLANTILLA
    .replace("{{fragmentos}}", fragmentos)
    .replace("{{pregunta}}", pregunta);
}

/* =========================================================
   INTERFAZ
   ========================================================= */
let CORPUS = "";
let FRAGMENTOS = [];

const $ = (id) => document.getElementById(id);

$("archivo").addEventListener("change", async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  CORPUS = await archivo.text();
  FRAGMENTOS = trocear(CORPUS, 800, 150);

  $("estado").textContent =
    `${CORPUS.length} caracteres → ${FRAGMENTOS.length} fragmentos`;
});

$("btn").addEventListener("click", () => {
  const campo = $("pregunta");
  const pregunta = campo.value.trim() || campo.placeholder;

  if (FRAGMENTOS.length === 0) {
    $("salida").textContent = "Primero cargá el reglamento.";
    return;
  }

  const resultados = buscar(pregunta, FRAGMENTOS);

  if (resultados.length === 0) {
    $("salida").textContent =
      `Pregunta: "${pregunta}"\n\n` +
      `SIN RESULTADOS.\n\n` +
      `Ningún fragmento contiene ninguno de estos términos: ` +
      terminosUtiles(pregunta).join(", ");
    return;
  }

  const resumen = resultados
    .map((r, i) => `#${i + 1}  fragmento ${r.id}  ·  puntaje ${r.puntaje}`)
    .join("\n");

  const linea = "=".repeat(58);

  $("salida").textContent =
    `Pregunta: "${pregunta}"\n\n${resumen}\n\n` +
    `${linea}\nPROMPT PARA PEGAR EN EL CHAT\n${linea}\n\n` +
    armarPrompt(pregunta, resultados);
});
