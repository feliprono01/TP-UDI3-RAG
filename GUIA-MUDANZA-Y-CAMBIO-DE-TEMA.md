# Guía: llevar el RAG a otra PC y cambiarle el tema

Todo lo que necesitás saber, en orden. Los comandos se corren en una terminal parada **dentro de la carpeta `rag-propio`**.

---

# PARTE A — Arrancarlo en otra PC

## A.0 Cómo está armado (para entender qué viaja y qué no)

| Pieza | Dónde vive | ¿Viaja con la carpeta? |
|---|---|---|
| Código (`.mjs`), `corpus/`, `prompt.txt`, `public/` | La carpeta `rag-propio` | **Sí** |
| `.env` (clave de Google, umbral, modelo) | La carpeta | **Sí**, pero es secreto |
| `node_modules/` | La carpeta | No hace falta: se regenera con `npm install` |
| La base de datos con los vectores | Docker (volumen `rag-datos`) | **No**: se vuelve a armar |
| El modelo `bge-m3` | Ollama | **No**: se vuelve a bajar |
| La clave de Google | Google (la cuenta) | Sirve en cualquier PC |

## A.1 Qué llevar
- Copiá la carpeta `rag-propio` **sin `node_modules`** (pendrive, nube o `robocopy`). Pesa muy poco.
- Cuidado con el `.env`: tiene tu clave. Si la PC no es tuya, borrala del `.env` al terminar.

## A.2 Instalación en la PC nueva (se hace una sola vez)

| # | Qué | Cómo se comprueba |
|---|---|---|
| 1 | **Node 20.6 o más** (https://nodejs.org) | `node -v` |
| 2 | **Docker Desktop** (https://www.docker.com) y abrirlo | `docker -v` y `docker info` sin errores |
| 3 | **Ollama** (https://ollama.com/download) y abrirlo | http://localhost:11434 dice "Ollama is running" |
| 4 | `ollama pull bge-m3` (~1 GB) | `ollama list` muestra `bge-m3` |
| 5 | En la carpeta: `npm install` | aparece `node_modules` |
| 6 | Editar `.env`: revisar `GOOGLE_API_KEY` | ver A.5 |

> En Windows puede hacer falta abrir una terminal nueva después de instalar Node u Ollama para que los reconozca.

## A.3 Crear la base (una sola vez en esa PC)
```
docker run -d --name rag-db -e POSTGRES_PASSWORD=rag -p 5433:5432 -v rag-datos:/var/lib/postgresql/data pgvector/pgvector:pg17
```
- Es un solo comando, largo: copialo, no lo escribas.
- Se corre **una sola vez**. Los días siguientes: `docker start rag-db`.
- Verificación: `docker ps` muestra `rag-db`, estado `Up` y `0.0.0.0:5433->5432/tcp`.

## A.4 Cargar los datos
```
node --env-file=.env crear-tabla.mjs
node --env-file=.env indexar.mjs
```
Tiene que decir: `financiacion.md: 7 fragmentos`, `garantia-service.md: 7 fragmentos` y `politicas-y-catalogo.md: 12 fragmentos`.
Comprobación opcional: `node --env-file=.env verificar-sql.mjs` (las dos columnas deben coincidir).

## A.5 La clave de Google
- Se crea en https://aistudio.google.com/apikey → **Crear clave** → copiarla.
- Va en el `.env`, en el renglón `GOOGLE_API_KEY=` (sin comillas ni espacios).
- **Nunca** la pegues en un chat, un mail ni un repositorio. `.env` ya está en `.gitignore`.
- Si ves `La API respondió 404` con el modelo: el nombre en `MODELO_CHAT` cambió. Listá los disponibles con la clave y elegí uno (hoy funciona `gemini-3.5-flash`).
- Si ves `503` o `429`: es demanda alta o cupo diario; reintentá o cambiá de modelo.

## A.6 Levantar el front
```
node --env-file=.env servidor.mjs
```
Abrir http://localhost:3000. Abajo a la derecha de la cartelera tiene que decir "Archivo al día: 19 papeles indexados."

## A.7 Las veces siguientes (rutina diaria, en la misma PC)
1. Abrir **Docker Desktop** → esperar que diga que está corriendo.
2. `docker start rag-db`
3. Abrir **Ollama**.
4. `node --env-file=.env servidor.mjs` → http://localhost:3000

## A.8 Si algo falla

| Síntoma | Causa | Arreglo |
|---|---|---|
| `Cannot connect to the Docker daemon` / `failed to connect to the docker API` | Docker Desktop cerrado | Abrirlo y esperar |
| Docker dice **"Virtualization is disabled in firmware"** | Virtualización apagada en el BIOS | Activar **SVM Mode** (AMD) o **Intel VT-x** en el BIOS y reiniciar |
| `connect ECONNREFUSED 127.0.0.1:5433` | La base no está corriendo | `docker start rag-db` |
| `No contesta nadie en http://localhost:11434/v1. ¿Está abierto Ollama?` | Ollama cerrado | Abrir Ollama |
| `model "bge-m3" not found` | No se bajó el modelo | `ollama pull bge-m3` |
| `Cannot find package 'pg'` | Falta instalar | `npm install` |
| `Falta DATABASE_URL…` / `Falta GOOGLE_API_KEY…` | Corriste sin `--env-file=.env` o no existe `.env` | Revisar el comando y el archivo |
| `The container name "/rag-db" is already in use` | La base ya existe | `docker start rag-db` (no repetir el `docker run`) |
| `port is already allocated` (5433) | Otro programa usa el puerto | Repetir con `-p 5434:5432` y poner `5434` en `DATABASE_URL` |
| Siempre dice "No lo encuentro", aun para lo que está | Umbral alto, o tabla vacía | Revisar `UMBRAL` (con punto, no coma) y correr `indexar.mjs` |
| El front dice "El archivo está vacío" | No se indexó en esa PC | `node --env-file=.env indexar.mjs` |
| `expected 1024 dimensions, not …` | Modelo y columna no coinciden | `DIMENSIONES` en `.env` y `VECTOR(n)` en `esquema.sql` deben ser iguales; luego `crear-tabla.mjs` e `indexar.mjs` |

---

# PARTE B — Cambiar el tema

El núcleo del RAG (`api.mjs`, `buscar.mjs`, `rag.mjs`, `db.mjs`, `trocear.mjs`) **no se toca**. Cambian el contenido, la marca, el prompt, las pruebas, el umbral y la cara.

## B.1 Elegir un buen corpus
- **De 1 a 3 documentos** en texto (`.txt` o `.md`).
- Que tengan **partes bien marcadas**: títulos de Markdown, artículos, capítulos, preguntas frecuentes, reglas numeradas. Lo que marques es lo que se cita como fuente.
- Que alguien lo use de verdad, y que puedas escribir **preguntas cuya respuesta conocés** (sin eso no se puede calibrar).
- Si es PDF o Word, convertilo primero a texto. Revisá que no se rompan los renglones ni se pierdan los títulos.
- Un corpus de 10 a 40 secciones alcanza. Si es muy chico o muy parejo, las similitudes salen todas parecidas y el umbral no separa nada.

## B.2 Paso a paso

**1. Reemplazar el corpus.** Vaciá la carpeta `corpus/` y copiá tus archivos nuevos. Si dejás los de la concesionaria, se mezclan con el tema nuevo.

**2. Escribir la marca (`marca.mjs`).** Es una expresión regular que reconoce el primer renglón de cada parte. Tiene que empezar con `^`.

| Tu corpus tiene… | La marca |
|---|---|
| Títulos de Markdown: `## Requisitos` | `/^#{1,3} .+/` (la actual) |
| Capítulos: `Capítulo 3` | `/^Capítulo \d+/` |
| Artículos: `Artículo 7.` | `/^Artículo \d+\./` |
| Secciones numeradas: `2.1 Configuración` | `/^\d+(\.\d+)* \S.*/` |
| Preguntas frecuentes: `P: ¿Cómo…?` | `/^P:.*/` |
| Reglas numeradas: `Regla 12.` | `/^Regla \d+\./` |

Comprobala sin gastar nada: `node probar-trocear.mjs`. Tiene que mostrar cuántos fragmentos salieron y que **todos tengan sección** (`con sección reconocida: N de N`).
- Si sale un solo fragmento enorme: tus párrafos no están separados por renglones vacíos.
- Si dice `0 de N`: la marca no coincide con nada (revisá mayúsculas, tildes y el `^`).
- Si tu corpus no tiene ninguna marca posible: poné `export const MARCA = null;` (corta por tamaño fijo y las fuentes salen como "fragmento N", con menos precisión).

**3. Adaptar el prompt (`prompt.txt`).** Cambiá **solo el primer párrafo**: quién habla y de qué tema. Dejá intactas las tres reglas: usar *exclusivamente* los fragmentos, la frase exacta de "No lo encuentro en los documentos.", y el renglón `Fuente:`. Si cambiás esa frase, cambiá también `NO_ESTA` en `rag.mjs`.

**4. Escribir las preguntas de prueba (`pruebas.json`).**
- **8 a 10 que sí están:** variadas, redactadas como las haría un usuario (no copiando el texto), cada una con la `seccion` donde está la respuesta, **escrita exactamente igual que el título**.
- **4 a 5 que no están:** 2 totalmente ajenas ("¿quién ganó el mundial?") y 2 o 3 *parecidas pero ausentes* (sobre el mismo tema, pero algo que el documento no dice). Estas últimas son las que ponen a prueba el umbral y las que dan material para la exposición.

**5. Indexar y medir.**
```
node --env-file=.env indexar.mjs
node --env-file=.env distribucion.mjs
```
`indexar.mjs` vacía la tabla solo (no hace falta `crear-tabla.mjs`, salvo que cambies el modelo de embeddings). `distribucion.mjs` imprime la similitud de cada pregunta y propone un umbral.

**6. Elegir el umbral.**
- Si hay un hueco entre las que están y las que no, poné un número en el medio.
- Si se pisan (lo normal), elegí qué error preferís: dejar pasar una que no está, o perder una que sí. Para consultas de información, conviene dejar pasar de más (el prompt todavía puede frenar). Anotá cuáles quedaron del lado equivocado: son tu material para la exposición.
- Ponelo en `.env` como `UMBRAL=0.50` (con punto decimal).

**7. Cambiar la cara (`public/index.html`).** Buscá y cambiá:
- Los textos: nombre del negocio, el personaje ("Pancho"), el saludo, la sección "Cómo responde…".
- Las preguntas sugeridas: constante `SUGERENCIAS` al principio del script.
- Los colores: variables `--verde`, `--ceibo`, `--crema`, `--papel`, `--amarillo` en `:root`.
- El escudo (el `<svg>` de la cabecera) y el avatar (la constante `AVATAR`).
- La clave de la memoria del historial: `CLAVE = "proseba-automotores-historial"` (cambiala para que no mezcle charlas viejas).
- Tiene que seguir mostrando la **fuente** y los fragmentos con su similitud: es requisito de la consigna.

**8. Probar.**
```
node --env-file=.env preguntar.mjs "una pregunta que está"
node --env-file=.env preguntar.mjs "una que no está"
node --env-file=.env preguntar.mjs --sin-modelo "una dudosa"
```
`--sin-modelo` muestra solo la búsqueda: sirve para saber si falló la búsqueda (el fragmento correcto no está entre los tres) o el modelo (está, pero la respuesta es mala).

**9. Levantar el front:** `node --env-file=.env servidor.mjs`.

## B.3 Lo que hay que rehacer al cambiar de tema
- **Las fichas 2, 4 y 5** de la clase 8: el troceado, las similitudes, el umbral y las cuatro preguntas son otros.
- **La guía de la exposición**: los ejemplos (anticipo, mundial, service de la Vela) y los números cambian.
- **Siempre se vuelve a medir el umbral.** Un número calibrado para otro corpus o modelo no sirve.

## B.4 Qué NO cambiar sin pensarlo
- **El modelo de embeddings** (`MODELO_EMBEDDINGS`): si lo cambiás, cambia la dimensión → actualizá `DIMENSIONES` y `VECTOR(n)` en `esquema.sql`, corré `crear-tabla.mjs` e `indexar.mjs`, y recalibrá. Cambiarlo sin reindexar da resultados sin sentido, sin errores.
- **`DIMENSIONES` y `VECTOR(1024)`**: tienen que ser siempre el mismo número.
- **El `ORDER BY` por distancia** en `buscar.mjs`: es lo que permite usar el índice HNSW.
- **`TRUNCATE` en `indexar.mjs`**: sin eso, indexar dos veces duplica los fragmentos.
- **La clave de API**: siempre del lado del servidor, nunca en `index.html`.

## B.5 Si querés sumar puntos extra con el cambio de tema
- Dos o más documentos y una pregunta que necesite datos de los dos.
- Más preguntas de prueba y decir cuántas acierta (`distribucion.mjs` ya cuenta la sección correcta en primer lugar).
- Comparar dos umbrales o dos troceados (por ejemplo, por título vs. tamaño fijo) y poder decir cuál anduvo mejor y por qué.

---

# Checklist rápido

**Mudanza**
- [ ] Node, Docker Desktop, Ollama instalados y abiertos
- [ ] `ollama pull bge-m3`
- [ ] Carpeta copiada (sin `node_modules`) y `npm install`
- [ ] `docker run …` (una sola vez)
- [ ] `.env` con la clave
- [ ] `crear-tabla.mjs` e `indexar.mjs`
- [ ] `servidor.mjs` y probar una pregunta

**Cambio de tema**
- [ ] Corpus nuevo en `corpus/`
- [ ] `marca.mjs` y `probar-trocear.mjs` en verde
- [ ] `prompt.txt` adaptado
- [ ] `pruebas.json` con preguntas nuevas
- [ ] `indexar.mjs` y `distribucion.mjs`
- [ ] `UMBRAL` nuevo en `.env`
- [ ] `index.html` con la identidad del tema
- [ ] Fichas 2, 4 y 5 rehechas
