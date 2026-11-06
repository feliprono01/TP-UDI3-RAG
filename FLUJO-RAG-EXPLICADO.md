# Flujo completo del RAG — PROSEBA automotores

> Este documento explica cómo funciona el sistema de principio a fin, con definiciones de cada concepto técnico que aparece en el camino.

---

## ¿Qué es un RAG?

**RAG** = *Retrieval-Augmented Generation* (Generación con Recuperación de Información).

Es una técnica que combina dos cosas:
1. **Buscar** fragmentos relevantes en una base de datos propia.
2. **Generar** una respuesta usando un modelo de lenguaje (IA), pero *solo* basándose en lo que encontró.

La ventaja es que el modelo no inventa: solo puede responder con lo que está en tus documentos.

---

## Vista general del flujo

```
Documentos (.md/.txt)
        ↓
   [Troceado]           ← Se parten en fragmentos pequeños
        ↓
   [Embedding]          ← Cada fragmento se convierte en un vector numérico
        ↓
   [Base de datos]      ← Los vectores se guardan en Postgres con pgvector
        ↓ ↓ ↓  (esto es el ÍNDICE — se hace una sola vez)

   Usuario pregunta
        ↓
   [Embedding]          ← La pregunta también se convierte en vector
        ↓
   [Búsqueda vectorial] ← Se buscan los fragmentos más parecidos al vector de la pregunta
        ↓
   [Umbral]             ← Si la similitud es muy baja, se descarta (evita inventar)
        ↓
   [Prompt]             ← Se arma un mensaje combinando los fragmentos + la pregunta
        ↓
   [Gemini (Google)]    ← El modelo genera la respuesta final
        ↓
   Respuesta al usuario
```

---

## Fase 1: Indexación (se hace una sola vez)

Este es el proceso de preparar los documentos para que puedan buscarse.

### Paso 1 — Los documentos del corpus

Los archivos `.md` dentro de la carpeta `corpus/` son la **fuente de conocimiento** del sistema:
- `financiacion.md`
- `garantia-service.md`
- `politicas-y-catalogo.md`

Son documentos de texto que contienen toda la información que Pancho (el asistente) puede usar para responder.

---

### Paso 2 — Troceado (`trocear.mjs`)

Los documentos son largos. No se pueden mandar completos al modelo en cada consulta, entonces se parten en **fragmentos** más pequeños.

**¿Cómo se trocean?**
- **Por sección** (método principal): cada vez que aparece un título Markdown (`## Título`), empieza un fragmento nuevo. Si la sección es muy larga (más de 2000 caracteres), se corta en partes más chicas repitiendo el título para que el fragmento no quede huérfano de contexto.
- **Por tamaño fijo** (plan B): si el corpus no tiene títulos, se cortan bloques de 800 caracteres con un solapamiento de 150 caracteres entre uno y el siguiente.

Cada fragmento tiene:
| Campo | Descripción |
|---|---|
| `fuente` | De qué archivo viene (ej: `financiacion.md`) |
| `seccion` | El título de la sección (ej: `Planes de financiación propia`) |
| `posicion` | Número de orden dentro del archivo |
| `texto` | El contenido del fragmento |

---

### Paso 3 — Embedding (`api.mjs` → Ollama)

Acá ocurre la "magia". Cada fragmento de texto se convierte en un **vector de números**.

**¿Por qué?** Porque las computadoras no entienden texto directamente. Al convertir el texto en números, se puede comparar matemáticamente qué tan parecidos son dos fragmentos.

El modelo que hace esto se llama **`bge-m3`** y corre localmente en tu máquina con **Ollama**. Genera **1024 números** (dimensiones) por cada fragmento.

```
"PROSEBA automotores financia directamente hasta el 70%..." 
         ↓  (bge-m3 en Ollama)
[ 0.023, -0.187, 0.441, 0.009, ... ]  ← 1024 números
```

Dos textos con significado similar van a tener vectores parecidos, aunque usen palabras distintas.

---

### Paso 4 — Guardado en la base de datos (`db.mjs` → Postgres + pgvector)

Los fragmentos (texto + vector) se guardan en una tabla llamada `fragmentos` en **PostgreSQL**.

La extensión **pgvector** le agrega a Postgres la capacidad de guardar y buscar vectores eficientemente.

También se crea un **índice HNSW** sobre los vectores, que es una estructura que acelera enormemente las búsquedas (como el índice de un libro, pero para vectores).

```sql
-- Así se ve una fila en la tabla:
id | fuente              | seccion     | posicion | texto           | embedding
---+---------------------+-------------+----------+-----------------+-----------
 1 | financiacion.md     | Planes de financiación propia |    0     | "PROSEBA automotores financia..." | [0.023, -0.187, ...]
```

---

## Fase 2: Consulta (ocurre cada vez que el usuario pregunta)

### Paso 5 — Embedding de la pregunta

Cuando el usuario escribe una pregunta, **se le aplica el mismo proceso de embedding** que a los fragmentos.

```
"¿Cuánto necesito de anticipo para financiar un auto?"
         ↓  (bge-m3 en Ollama)
[ 0.019, -0.201, 0.438, ... ]  ← 1024 números
```

Ahora tenemos la pregunta como vector y podemos compararla con los vectores de los fragmentos.

---

### Paso 6 — Búsqueda vectorial (`buscar.mjs`)

Postgres compara el vector de la pregunta contra todos los vectores de la tabla `fragmentos` y devuelve los más cercanos (por defecto, los **3 más parecidos**, `k = 3`).

La comparación usa la **distancia coseno** (`<=>` en pgvector): mide el ángulo entre dos vectores. A menor ángulo → mayor similitud.

```sql
SELECT fuente, seccion, texto,
       1 - (embedding <=> $1::vector) AS similitud
FROM fragmentos
ORDER BY embedding <=> $1::vector
LIMIT 3
```

El resultado es una lista de fragmentos con su **puntaje de similitud** (un número entre 0 y 1, donde 1 es idéntico).

---

### Paso 7 — Filtro por umbral (`rag.mjs`)

No todos los fragmentos encontrados son útiles. Si el más parecido tiene una similitud de 0.3, probablemente no tiene nada que ver con la pregunta.

El **UMBRAL** es un número mínimo de similitud (configurado en el `.env`). Si ningún fragmento supera el umbral, el sistema responde directamente: `"No lo encuentro en los documentos."` y **no llama al modelo de IA**.

Esto evita que el modelo invente respuestas cuando no hay información relevante.

---

### Paso 8 — Armado del prompt (`rag.mjs` → `prompt.txt`)

Con los fragmentos útiles, se arma el **prompt**: el mensaje completo que se le manda al modelo de IA.

La plantilla (`prompt.txt`) define el personaje (Pancho) y las instrucciones:

```
Sos Pancho, asesor de ventas de PROSEBA automotores...
Respondé usando EXCLUSIVAMENTE los fragmentos que aparecen más abajo.
Si los fragmentos no contienen la respuesta, respondé exactamente: "No lo encuentro en los documentos."

FRAGMENTOS:
--- financiacion.md — Planes de financiación propia ---
PROSEBA automotores financia directamente hasta el 70% del valor del vehículo...

PREGUNTA:
¿Cuánto necesito de anticipo para financiar un auto?
```

---

### Paso 9 — Respuesta de Gemini (`api.mjs` → Google)

El prompt completo se manda a **Gemini** (modelo de Google) vía API. Gemini genera la respuesta final, respetando las instrucciones del prompt: personaje, tono, límite de dos oraciones, y citar la fuente.

```
Pancho responde:
"Necesitás un anticipo mínimo del 30% para acceder al plan propio.
Fuente: financiacion.md — Planes de financiación propia"
```

---

### Paso 10 — Lo que ve el usuario (`public/index.html`)

El navegador solo manda la pregunta a `POST /preguntar`. El servidor devuelve la respuesta, si llamó o no al modelo, el umbral y la lista de fragmentos con su similitud. El front muestra:

- La respuesta de Pancho, con la hora y los chips de **fuente** (`Fuente: archivo — sección`).
- Si ningún fragmento llegó al umbral (o el modelo no encontró el dato): un globo ámbar con el sello **"No figura en los documentos"** y una nota con la mejor similitud (ej.: "Ningún documento llegó al umbral (0.5); el más parecido llegó a 0.486").
- Un desplegable **"Ver los documentos consultados"**: para cada fragmento, si fue *usado* o *descartado por el umbral*, su similitud, una barra con la raya roja del umbral y el texto completo. Es lo que se usa en la exposición para mostrar cómo decide el sistema.
- En el lateral, **"Preguntas para probar"** (se tocan y se envían) y **"Cómo responde Pancho"**.

La clave de Google nunca llega al navegador: queda en `.env` y la usa el servidor.

---

## Mapa de archivos del proyecto

| Archivo | Qué hace |
|---|---|
| `corpus/` | Los documentos fuente de conocimiento |
| `trocear.mjs` | Parte los documentos en fragmentos |
| `marca.mjs` | Define qué patrón de texto marca el inicio de un fragmento (títulos `#`, `##` y `###`) |
| `api.mjs` | Llama a Ollama (embeddings) y a Google (respuesta) |
| `db.mjs` | Conexión a Postgres |
| `crear-tabla.mjs` | Crea la tabla `fragmentos` y el índice HNSW en la base |
| `indexar.mjs` | Lee el corpus, trocéa, calcula embeddings y guarda todo en la base |
| `buscar.mjs` | Hace la búsqueda vectorial en SQL |
| `rag.mjs` | Orquesta todo: embedding → búsqueda → umbral → prompt → respuesta |
| `prompt.txt` | Plantilla del prompt con el personaje Pancho |
| `servidor.mjs` | Servidor web: sirve el chat en http://localhost:3000 y expone `/estado` y `/preguntar` |
| `public/index.html` | El front: una sola página (HTML, CSS y JS) con el chat de Pancho |
| `preguntar.mjs` | Versión de consola para hacer preguntas sin el front |
| `distribucion.mjs` | Ayuda a elegir el umbral correcto |

---

## Glosario de términos técnicos

| Término | Definición simple |
|---|---|
| **RAG** | Técnica que busca información en documentos propios antes de responder con IA, para no inventar. |
| **Embedding** | Proceso de convertir texto en una lista de números que representa su significado semántico. |
| **Vector** | La lista de números que resulta del embedding. Texto similar → vectores cercanos. |
| **Dimensiones** | Cantidad de números en cada vector. En este proyecto: 1024. |
| **bge-m3** | El modelo de embeddings que corre en Ollama. Convierte texto en vectores. |
| **Ollama** | Programa que corre modelos de IA localmente en tu computadora, sin internet. |
| **Postgres / PostgreSQL** | Base de datos relacional donde se guardan los fragmentos y sus vectores. |
| **pgvector** | Extensión de Postgres que le agrega soporte para guardar y buscar vectores. |
| **Índice HNSW** | Estructura de datos que acelera la búsqueda de vectores similares (como el índice de un libro). |
| **Distancia coseno** | Medida matemática del ángulo entre dos vectores. Menor ángulo = más similares. |
| **Similitud** | Número entre 0 y 1 que indica qué tan parecido es un fragmento a la pregunta. 1 = idéntico. |
| **Umbral** | Similitud mínima aceptada. Fragmentos por debajo de este valor se ignoran. |
| **Corpus** | El conjunto de documentos que forman la base de conocimiento del sistema. |
| **Troceado / Chunking** | Partir documentos largos en partes más pequeñas para poder indexarlas y buscarlas. |
| **Fragmento / Chunk** | Cada una de las partes en que se divide un documento. |
| **Solapamiento** | Zona de texto que se repite entre dos fragmentos consecutivos, para no perder contexto en los bordes. |
| **Prompt** | El mensaje completo que se le manda al modelo de IA, incluyendo contexto, instrucciones y pregunta. |
| **Gemini** | El modelo de lenguaje de Google que genera las respuestas finales del asistente. |
| **LLM** | *Large Language Model* — modelo de lenguaje grande, como Gemini. Genera texto a partir de un prompt. |
| **Temperature 0** | Configuración del modelo que hace las respuestas lo más consistentes y predecibles posible (sin creatividad). |
| **API Key** | Clave secreta que identifica al usuario ante el servicio de Google para poder usar Gemini. |
| **Docker** | Programa que corre aplicaciones en contenedores aislados. Acá se usa para correr Postgres. |
| **`.env`** | Archivo de configuración con variables secretas (claves, URLs, umbrales) que no se suben a git. |

