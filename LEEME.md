# Austral Motors — RAG propio (Desarrollo con IA, exposición final)

Un asistente (Rodolfo, asesor de ventas) que responde sobre financiación, garantía y service, políticas de venta y catálogo de modelos de una concesionaria de autos.
`pregunta → embedding (Ollama) → búsqueda SQL (Postgres + pgvector) → umbral → prompt → respuesta (Gemini)`

## Puesta en marcha (una sola vez)

1. Abrir **Docker Desktop** y esperar a que diga que está corriendo.
2. Instalar **Ollama** (https://ollama.com/download) y abrirlo. Luego: `ollama pull bge-m3` (~1 GB).
3. Crear la base (se corre una sola vez):
   ```
   docker run -d --name rag-db -e POSTGRES_PASSWORD=rag -p 5433:5432 -v rag-datos:/var/lib/postgresql/data pgvector/pgvector:pg17
   ```
4. Poner la clave de Google en `.env` (`GOOGLE_API_KEY`).
5. `npm install`

## Orden de trabajo

| Paso | Comando | Qué mirar |
|---|---|---|
| Ficha 1 | `node --env-file=.env prueba.mjs` | Debe decir 1024 números (coincide con `DIMENSIONES` y con `esquema.sql`). |
| Tabla | `node --env-file=.env crear-tabla.mjs` | "Listo: extensión vector activa…" |
| Ficha 2 | `node probar-trocear.mjs` | 26 fragmentos, todos con sección. |
| Indexar | `node --env-file=.env indexar.mjs` | 7 + 7 + 12 fragmentos. Correrlo dos veces da lo mismo (el TRUNCATE). |
| Verificar | `node --env-file=.env verificar-sql.mjs` | SQL y JavaScript coinciden en los decimales. |
| Ficha 4 | `node --env-file=.env distribucion.mjs` | Elegir el UMBRAL y ponerlo en `.env`. |
| Ficha 5 | `node --env-file=.env preguntar.mjs "¿…?"` | Con `--sin-modelo` se ve solo la búsqueda. |
| Front | `node --env-file=.env servidor.mjs` | http://localhost:3000 |

## Antes de exponer

1. Docker abierto y `docker start rag-db`. 2. Ollama abierto. 3. `.env` con la clave. 4. El front probado esa mañana.
5. Tres preguntas anotadas: una que funciona, una que no está, una que falla. 6. El documento abierto en la sección de la fuente.
7. Capturas o un video como plan B.

## Dónde está cada decisión (para defender en la exposición)

- **Marca / troceado:** `marca.mjs` y `trocear.mjs` (por título Markdown; si un fragmento pasa de 2000 caracteres se corta entre párrafos y repite el título).
- **Umbral:** `UMBRAL` en `.env`, calibrado con `distribucion.mjs` y `pruebas.json`.
- **Dónde se arma el prompt:** `armarPrompt()` en `rag.mjs`, con la plantilla `prompt.txt`.
- **Búsqueda:** `buscar.mjs` (el `ORDER BY` va por distancia para poder usar el índice HNSW).
- **La clave no está en el navegador:** solo la lee `api.mjs`, que corre en el servidor (`servidor.mjs`).
- **Indexar dos veces:** `TRUNCATE … RESTART IDENTITY` al principio de `indexar.mjs`.
