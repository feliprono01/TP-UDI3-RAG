// Trocear = partir un documento en fragmentos que se puedan buscar y citar.

const MAXIMO = 2000; // caracteres por fragmento

function parrafosDe(texto) {
  return texto.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

// Si un grupo de párrafos pasa del máximo, se corta entre párrafos y cada
// pedazo repite el título de la sección (así nunca queda "huérfano").
// Qué se pierde: el hilo entre pedazos; el segundo ya no ve lo que dijo el primero.
function cortarSiHaceFalta(parrafos, titulo, maximo) {
  const piezas = [];
  let actual = "";
  for (const p of parrafos) {
    if (actual && (actual + "\n\n" + p).length > maximo) {
      piezas.push(actual);
      actual = titulo ? `${titulo}\n\n${p}` : p;
    } else {
      actual = actual ? `${actual}\n\n${p}` : p;
    }
  }
  if (actual) piezas.push(actual);
  return piezas;
}

// Por marca: cada vez que un párrafo arranca con la marca, empieza un fragmento nuevo.
// Devuelve [{ seccion, posicion, texto }].
export function trocearPorMarca(texto, marca, maximo = MAXIMO) {
  const grupos = [];
  let actual = { seccion: null, titulo: null, parrafos: [] };

  for (const p of parrafosDe(texto)) {
    const primerRenglon = p.split("\n")[0];
    if (marca.test(primerRenglon)) {
      if (actual.parrafos.length) grupos.push(actual);
      actual = {
        seccion: primerRenglon.replace(/^#+\s*/, "").trim(),
        titulo: primerRenglon,
        parrafos: [p],
      };
    } else {
      actual.parrafos.push(p);
    }
  }
  if (actual.parrafos.length) grupos.push(actual);

  const fragmentos = [];
  for (const g of grupos) {
    for (const pieza of cortarSiHaceFalta(g.parrafos, g.titulo, maximo)) {
      fragmentos.push({ seccion: g.seccion, posicion: fragmentos.length, texto: pieza });
    }
  }
  return fragmentos;
}

// Plan B si un corpus no tiene marca: tamaño fijo con solapamiento (clase 5).
export function trocearFijo(texto, tamano = 800, solapamiento = 150) {
  const fragmentos = [];
  for (let inicio = 0; inicio < texto.length; inicio += tamano - solapamiento) {
    fragmentos.push({
      seccion: null,
      posicion: fragmentos.length,
      texto: texto.slice(inicio, inicio + tamano),
    });
    if (inicio + tamano >= texto.length) break;
  }
  return fragmentos;
}
