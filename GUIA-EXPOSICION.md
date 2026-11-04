# Guía de estudio — Exposición final (Tu RAG, con cara)

Para estudiar, no para leer en voz alta: la idea es que lo digas con tus palabras.

## 1. Guion de la demo (en este orden)

1. **Mi corpus.** El reglamento de socios y la guía de instalaciones de un club (Los Ceibos). Lo usaría un socio que quiere saber cuánto paga, a qué hora puede ir o qué puede reservar, sin buscar en dos documentos. Elegí dos documentos para poder hacer preguntas que necesiten datos de los dos.
2. **El front.** "La ventanilla de Don Aníbal": el conserje del club contesta. Tiene la identidad del club (colores, papelitos de corcho, sello de fuente), muestra los fragmentos que sacó del archivo con su similitud y una raya roja que marca el umbral, y guarda un historial en pantalla.
3. **Pregunta que funciona:** *"¿Cuánto sale la cuota de un socio cadete?"* → $9.000, fuente `reglamento-socios.md — Cuota social` (similitud 0,761). **Abrir el documento en esa sección y mostrar que dice lo mismo.**
4. **Pregunta que no está:** *"¿Quién ganó el último mundial?"* → similitud 0,260, muy debajo del umbral. Contesta "No lo encuentro en los documentos." **sin llamar al modelo.**
5. **Pregunta que falla (en el límite):** *"¿Cuánto cuesta alquilar la cancha de tenis?"*
   - La **búsqueda falló**: trajo fútbol 5 (0,608) y pádel (0,596), que se parecen pero no son tenis, y el umbral (0,58) las dejó pasar.
   - Lo salvó el **modelo**: el prompt le exige usar solo los fragmentos y decir "No lo encuentro" si no está, y lo hizo.
   - Por qué pasa: "cancha de ___ cuánto cuesta" se parece mucho a las canchas del club, aunque falte la palabra clave "tenis". El embedding captura el tema, no el dato exacto.
6. **Mis estrategias** (ver sección 2).

## 2. Mis estrategias, con evidencia

- **Troceado: por título Markdown** (`marca.mjs`: `/^#{1,3} .+/`). Cada sección del documento es un fragmento, y esa sección es la fuente que se cita. Salieron 19 fragmentos, todos con sección reconocida (el más largo, 528 caracteres). Si un fragmento pasara de 2000, se corta entre párrafos y repite el título; lo que se pierde es el hilo entre pedazos.
- **Umbral: 0,58.** Medí 15 preguntas (10 que están y 5 que no). Las que están dieron entre 0,584 y 0,777; las que no, entre 0,260 y 0,608. Se pisan: la peor que está (votar en la asamblea, 0,584) queda debajo de la mejor que no está (cancha de tenis, 0,608).
- **Qué error elegí cometer:** dejar pasar una pregunta que no está (la del tenis) antes que descartar una respuesta válida. Un falso "no" le niega información real al socio y no tiene arreglo; un falso "sí" todavía lo puede frenar el modelo con el prompt.
- **Prompt (`prompt.txt`):** lo adapté al club y le di personaje (Don Aníbal, voseo). Mantuve las tres restricciones: usar *exclusivamente* los fragmentos, la frase exacta cuando no está, y el renglón `Fuente:` con archivo y sección.
- **Lo que medí:** la sección correcta salió primera en 10 de 10 preguntas que están.
- **Lo que probé y descarté / cambié:** el modelo `gemini-2.5-flash` ya no estaba disponible para cuentas nuevas (404), así que pasé a `gemini-3.5-flash`. Un umbral de 0,5 provisorio lo reemplacé por 0,58 tras medir.

## 3. Preguntas sobre mi sistema

**¿Qué corre en mi compu y qué en la nube? ¿Por qué?**
En mi compu: Postgres con pgvector (en Docker), el modelo de embeddings bge-m3 (en Ollama) y el servidor Node. En la nube: solo el modelo que escribe la respuesta (Gemini de Google). Un modelo de embeddings lee el texto una sola vez y corre en cualquier compu; un modelo de chat genera token por token y necesita mucho más hardware. Además indexar hace muchos pedidos (uno por lote) y así no gasto el cupo gratuito de Google.

**¿Qué pasa si cambio el modelo de embeddings y no vuelvo a indexar?**
Si la dimensión es distinta, la base rechaza el dato con error (`expected 1024 dimensions…`). Si la dimensión coincide, no hay error pero los resultados no significan nada: cada modelo ubica los textos en un mapa distinto, y la pregunta y el corpus tienen que estar en el mismo. Además habría que volver a calibrar el umbral.

**¿Qué pasa si corro `indexar.mjs` dos veces? ¿Cómo lo resolví?**
Un `INSERT` agrega, no reemplaza: quedarían 38 filas con cada fragmento duplicado. Lo resolví con `TRUNCATE TABLE fragmentos RESTART IDENTITY` al principio de `indexar.mjs`. Sigue dando 19 sin importar cuántas veces lo corra. (Los sistemas grandes hacen actualización incremental.)

**¿Por qué la clave de API no puede ir en el navegador? ¿Dónde está en mi front?**
Cualquiera la lee con F12 (código, pestaña de red). En mi front el navegador solo manda la pregunta a `/preguntar`; la clave está en `.env`, la lee `api.mjs` y corre en el servidor (`servidor.mjs`), nunca viaja a la página.

**¿Por qué el `ORDER BY` va por la distancia y no por la similitud?**
Da el mismo orden, pero el índice HNSW solo se usa cuando el `ORDER BY` es exactamente la distancia (`embedding <=> $1`). La similitud (`1 - distancia`) la calculo solo para mostrarla y comparar con el umbral.

**¿Qué error preferí cometer con mi umbral, y por qué?**
Dejar pasar una pregunta que no está, antes que descartar una que sí. Ver sección 2.

**Mostrame en el código dónde se arma el prompt.**
`armarPrompt()` en `rag.mjs`. Toma la plantilla de `prompt.txt` y reemplaza `{{fragmentos}}` y `{{pregunta}}`. Cada fragmento va con su encabezado `archivo — sección`, que es lo que el modelo cita en `Fuente:`.

## 4. Preguntas sobre cómo funciona un RAG

**¿Qué es un embedding? ¿Por qué textos sin palabras en común pueden quedar cerca?**
Una lista de números (1024 en bge-m3) que representa el significado del texto. El modelo se entrenó para que textos con significado parecido den vectores que apuntan para el mismo lado, aunque usen palabras distintas ("cuántas veces puedo faltar" y "porcentaje de ausencias"). Por eso sirve donde la búsqueda por palabras de la clase 5 fallaba.

**¿Qué mide la similitud coseno?**
El ángulo entre dos vectores, sin importar su largo: 1 si apuntan igual, 0 si son perpendiculares. En pgvector se usa la distancia coseno (`<=>`), que es 1 menos la similitud.

**¿Por qué no alcanza con pegarle el corpus entero al modelo en cada pregunta?**
Cuesta más (se paga por cada token), es más lento, tiene un límite de contexto que un corpus grande excede, y el modelo se distrae con información irrelevante. Con búsqueda le paso solo los 3 fragmentos que importan, y además sé de dónde salió la respuesta.

**¿Cómo encuentra HNSW los más cercanos sin mirarlos a todos? ¿Por qué es aproximado?**
Arma un grafo donde cada vector se conecta con unos vecinos cercanos, en varios pisos (arriba pocos puntos y conexiones largas, abajo todos y conexiones cortas). La búsqueda arranca arriba, salta de vecino en vecino al que está más cerca de la pregunta y baja de piso para afinar. Puede quedar trabada en un punto cercano que no es el más cercano de todos: cambia un poco de exactitud por mucha velocidad. Con 19 fragmentos no se nota; importa con miles o millones.

**¿Quién evita que el modelo invente: la búsqueda, el umbral o el prompt?**
Los tres, en capas. El **umbral** corta antes de llamar al modelo si nada se parece (el mundial). La **búsqueda** limita lo que el modelo puede ver. El **prompt** le ordena usar solo esos fragmentos y decir "No lo encuentro" si no está (lo que salvó la pregunta del tenis). Ninguna sola es perfecta, y la del tenis lo demuestra.

**¿Qué le falta a mi sistema para usarse en serio? (las cuatro cosas de la clase 8)**
1. **Reranking:** un modelo más preciso que reordene los fragmentos mirando pregunta y fragmento juntos (habría separado tenis de fútbol 5).
2. **Búsqueda híbrida:** combinar significado con palabras exactas (BM25), útil para nombres y datos como "tenis".
3. **Actualización incremental:** reindexar solo los documentos que cambiaron, no todo.
4. **Medición formal:** un conjunto grande de preguntas con su respuesta correcta para medir el porcentaje de aciertos (yo medí 15).

## 5. Antes de que te toque (checklist)

- [ ] Docker Desktop abierto y `docker start rag-db`
- [ ] Ollama abierto
- [ ] `.env` con la clave de Google y conexión a internet
- [ ] `node --env-file=.env servidor.mjs` y http://localhost:3000 probado esa mañana
- [ ] Mis tres preguntas anotadas: cuota del socio cadete / mundial / cancha de tenis
- [ ] `reglamento-socios.md` abierto en "Cuota social" para mostrar la fuente
- [ ] Plan B: capturas o video corto
- [ ] Fichas 1 a 5 completas a mano

Si Google da error 503 ("alta demanda"), reintentar. Si persiste, `MODELO_CHAT` en `.env` se puede cambiar por otro modelo disponible.
