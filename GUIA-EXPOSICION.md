# Guía de estudio — Exposición final (Tu RAG, con cara)

Para estudiar, no para leer en voz alta: la idea es que lo digas con tus palabras.

## 1. Guion de la demo (en este orden)

1. **Mi corpus.** Financiación, garantía y service, políticas de venta y catálogo de modelos de PROSEBA automotores, una concesionaria de autos. Lo usaría un cliente que quiere saber cuánto necesita de anticipo, qué cubre la garantía o qué auto le conviene, sin buscar en varios documentos. Elegí tres documentos (en vez de uno o dos) para poder hacer preguntas que a veces mezclan temas y ver cómo responde la búsqueda en ese caso.
2. **El front.** El asesor virtual "Pancho" de PROSEBA automotores: tiene la identidad de la concesionaria (paleta slate oscuro + rojo, tipografía legible para chat), muestra los fragmentos que sacó de los documentos con su similitud y una raya roja que marca el umbral, y guarda un historial en pantalla.
3. **Pregunta que funciona:** *"¿Cuánto necesito de anticipo para financiar un auto?"* → 30% mínimo, fuente `financiacion.md — Planes de financiación propia` (similitud 0,646; en la pantalla a veces "Anticipo y cuotas" queda apenas primero, 0,64, y "Planes de financiación propia" segundo: las dos están en los 3 resultados y el modelo cita la correcta). **Abrir el documento en esa sección y mostrar que dice lo mismo.**
4. **Pregunta que no está:** *"¿Quién ganó el último mundial?"* → similitud 0,247, muy debajo del umbral. Contesta "No lo encuentro en los documentos." **sin llamar al modelo.**
5. **Pregunta que falla (en el límite):** *"¿Cuánto cuesta el service de la Vela 1.6?"*
   - La **búsqueda falló a medias**: trajo el modelo Vela 1.6 (0,70), la de mantenimiento programado (0,525) y la de reserva (0,523), todas por encima del umbral, pero ninguna tiene el precio puntual.
   - Lo salvó el **modelo**: el prompt le exige usar solo los fragmentos y decir "No lo encuentro" si no está, y en general lo hace, en vez de inventar un número. Ojo: el modelo no es 100% determinista; a veces, en vez de "No lo encuentro", contesta solo lo que sí dice el documento (el primer service es gratis y el costo depende del modelo) **sin inventar ningún precio**. Las dos respuestas son aceptables: lo importante es que nunca da un número inventado.
   - Por qué pasa: el documento de garantía y service dice textualmente que el costo "depende del modelo y se informa al momento del turno"; no hay un precio fijo que citar, y el embedding igual acerca la pregunta al modelo correcto porque el tema general coincide.
6. **Extra — pregunta que cruza dos documentos y funciona:** *"Compré un usado certificado y lo quiero entregar como parte de pago de un 0km: ¿qué garantía tiene el usado certificado y hasta qué antigüedad me lo reciben?"* → la búsqueda trae un fragmento de `garantia-service.md` (garantía de usados: 6 meses o 10.000 km) y uno de `financiacion.md` (no se reciben usados de más de 15 años), y el modelo combina los dos en una sola respuesta, citando las dos fuentes. Es el extra de "más de un documento, con una pregunta que necesita datos de los dos".
7. **Mis estrategias** (ver sección 2).

## 2. Mis estrategias, con evidencia

- **Troceado: por título Markdown** (`marca.mjs`: `/^#{1,3} .+/`). Cada sección del documento es un fragmento, y esa sección es la fuente que se cita. En el catálogo, cada modelo de auto es un `###` propio, así que queda como su propio fragmento citable. Salieron 26 fragmentos (7 + 7 + 12), todos con sección reconocida (el más largo, 729 caracteres). Si un fragmento pasara de 2000, se corta entre párrafos y repite el título; lo que se pierde es el hilo entre pedazos.
- **Umbral: 0,50.** Medí 16 preguntas (11 que están y 5 que no). Las que están dieron entre 0,505 y 0,786; las que no, entre 0,247 y 0,693. Se pisan: la peor que está (caballos de fuerza de la Travesía, 0,505) queda por debajo de la mejor que no está (service de la Vela, 0,693).
- **Qué error elegí cometer:** dejar pasar una pregunta que no está (la del service de la Vela) antes que descartar una respuesta válida. Un falso "no" le niega información real al cliente y no tiene arreglo; un falso "sí" todavía lo puede frenar el modelo con el prompt.
- **Prompt (`prompt.txt`):** lo adapté a la concesionaria y le di personaje (Pancho, asesor de ventas, voseo). Mantuve las tres restricciones: usar *exclusivamente* los fragmentos, la frase exacta cuando no está, y el renglón `Fuente:` con archivo y sección.
- **Lo que medí:** la sección correcta salió primera en 11 de 11 preguntas que están.
- **Lo que probé y descarté / cambié:** al cambiar el corpus del club por el de la concesionaria tuve que recalibrar el umbral desde cero: el 0,58 que había medido para el club no servía (habría descartado la pregunta de la Travesía, que sí está). El modelo de chat (`gemini-3.5-flash`) y el de embeddings (`bge-m3`) no cambiaron.

## 3. Preguntas sobre mi sistema

**¿Qué corre en mi compu y qué en la nube? ¿Por qué?**
En mi compu: Postgres con pgvector (en Docker), el modelo de embeddings bge-m3 (en Ollama) y el servidor Node. En la nube: solo el modelo que escribe la respuesta (Gemini de Google). Un modelo de embeddings lee el texto una sola vez y corre en cualquier compu; un modelo de chat genera token por token y necesita mucho más hardware. Además indexar hace muchos pedidos (uno por lote) y así no gasto el cupo gratuito de Google.

**¿Qué pasa si cambio el modelo de embeddings y no vuelvo a indexar?**
Si la dimensión es distinta, la base rechaza el dato con error (`expected 1024 dimensions…`). Si la dimensión coincide, no hay error pero los resultados no significan nada: cada modelo ubica los textos en un mapa distinto, y la pregunta y el corpus tienen que estar en el mismo. Además habría que volver a calibrar el umbral.

**¿Qué pasa si corro `indexar.mjs` dos veces? ¿Cómo lo resolví?**
Un `INSERT` agrega, no reemplaza: quedarían 52 filas con cada fragmento duplicado. Lo resolví con `TRUNCATE TABLE fragmentos RESTART IDENTITY` al principio de `indexar.mjs`. Sigue dando 26 sin importar cuántas veces lo corra. (Los sistemas grandes hacen actualización incremental.)

**¿Por qué la clave de API no puede ir en el navegador? ¿Dónde está en mi front?**
Cualquiera la lee con F12 (código, pestaña de red). En mi front el navegador solo manda la pregunta a `/preguntar`; la clave está en `.env`, la lee `api.mjs` y corre en el servidor (`servidor.mjs`), nunca viaja a la página.

**¿Por qué el `ORDER BY` va por la distancia y no por la similitud?**
Da el mismo orden, pero el índice HNSW solo se usa cuando el `ORDER BY` es exactamente la distancia (`embedding <=> $1`). La similitud (`1 - distancia`) la calculo solo para mostrarla y comparar con el umbral.

**¿Qué error preferí cometer con mi umbral, y por qué?**
Dejar pasar una pregunta que no está, antes que descartar una que sí. Ver sección 2.

**¿Cómo cambiaste el sistema de tema (del club a la concesionaria)? ¿Qué tocaste y qué no?**
Reemplacé el corpus en `corpus/`, adapté el primer párrafo de `prompt.txt` (persona y tema, sin tocar las reglas), reescribí `pruebas.json` con preguntas nuevas, reindexé y volví a calibrar el umbral con `distribucion.mjs`. No toqué el núcleo: `api.mjs`, `buscar.mjs`, `rag.mjs`, `db.mjs`, `trocear.mjs` y la marca (`/^#{1,3} .+/`) siguen siendo los mismos, porque mi corpus nuevo también usa títulos de Markdown.

**Mostrame en el código dónde se arma el prompt.**
`armarPrompt()` en `rag.mjs`. Toma la plantilla de `prompt.txt` y reemplaza `{{fragmentos}}` y `{{pregunta}}`. Cada fragmento va con su encabezado `archivo — sección`, que es lo que el modelo cita en `Fuente:`.

## 4. Preguntas sobre cómo funciona un RAG

**¿Qué es un embedding? ¿Por qué textos sin palabras en común pueden quedar cerca?**
Una lista de números (1024 en bge-m3) que representa el significado del texto. El modelo se entrenó para que textos con significado parecido den vectores que apuntan para el mismo lado, aunque usen palabras distintas ("cuánto necesito para empezar a pagar" y "anticipo mínimo"). Por eso sirve donde la búsqueda por palabras de la clase 5 fallaba.

**¿Qué mide la similitud coseno?**
El ángulo entre dos vectores, sin importar su largo: 1 si apuntan igual, 0 si son perpendiculares. En pgvector se usa la distancia coseno (`<=>`), que es 1 menos la similitud.

**¿Por qué no alcanza con pegarle el corpus entero al modelo en cada pregunta?**
Cuesta más (se paga por cada token), es más lento, tiene un límite de contexto que un corpus grande excede, y el modelo se distrae con información irrelevante. Con búsqueda le paso solo los 3 fragmentos que importan, y además sé de dónde salió la respuesta.

**¿Cómo encuentra HNSW los más cercanos sin mirarlos a todos? ¿Por qué es aproximado?**
Arma un grafo donde cada vector se conecta con unos vecinos cercanos, en varios pisos (arriba pocos puntos y conexiones largas, abajo todos y conexiones cortas). La búsqueda arranca arriba, salta de vecino en vecino al que está más cerca de la pregunta y baja de piso para afinar. Puede quedar trabada en un punto cercano que no es el más cercano de todos: cambia un poco de exactitud por mucha velocidad. Con 26 fragmentos no se nota; importa con miles o millones.

**¿Quién evita que el modelo invente: la búsqueda, el umbral o el prompt?**
Los tres, en capas. El **umbral** corta antes de llamar al modelo si nada se parece (el mundial). La **búsqueda** limita lo que el modelo puede ver. El **prompt** le ordena usar solo esos fragmentos y decir "No lo encuentro" si no está (lo que salvó la pregunta del service de la Vela). Ninguna sola es perfecta, y esa pregunta lo demuestra: la búsqueda dejó pasar fragmentos sin la respuesta exacta, y fue el prompt el que evitó que el modelo inventara un precio.

**¿Qué le falta a mi sistema para usarse en serio? (las cuatro cosas de la clase 8)**
1. **Reranking:** un modelo más preciso que reordene los fragmentos mirando pregunta y fragmento juntos (habría distinguido mejor "precio del auto" de "precio del service").
2. **Búsqueda híbrida:** combinar significado con palabras exactas (BM25), útil para nombres de modelos y datos puntuales.
3. **Actualización incremental:** reindexar solo los documentos que cambiaron, no todo.
4. **Medición formal:** un conjunto grande de preguntas con su respuesta correcta para medir el porcentaje de aciertos (yo medí 16).

## 5. Antes de que te toque (checklist)

- [ ] Docker Desktop abierto y `docker start rag-db`
- [ ] Ollama abierto
- [ ] `.env` con la clave de Google y conexión a internet
- [ ] `node --env-file=.env servidor.mjs` y http://localhost:3000 probado esa mañana
- [ ] Mis tres preguntas anotadas: anticipo para financiar / mundial / service de la Vela 1.6
- [ ] `financiacion.md` abierto en "Planes de financiación propia" para mostrar la fuente
- [ ] Plan B: capturas o video corto
- [ ] Fichas 1 a 5 completas a mano

Si Google da error 503 ("alta demanda"), reintentar. Si persiste, `MODELO_CHAT` en `.env` se puede cambiar por otro modelo disponible.
