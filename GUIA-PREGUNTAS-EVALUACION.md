# Guía de preguntas y respuestas para la evaluación

Preguntas que probablemente te hagan en la exposición, agrupadas por tema, con la respuesta armada a partir de tu propio sistema (PROSEBA automotores) y de los apuntes de las clases 5 a 8. Cuando un concepto puede sonar raro, va explicado aparte en un bloque **CONCEPTO**.

Estudiala con tus palabras, no la leas en voz alta. Donde dice "mi sistema" podés señalar el código o la pantalla.

---

## Bloque 1 — Qué es un RAG y por qué hace falta

### P: ¿Qué es un RAG?

**R:** Sigla de *Retrieval-Augmented Generation* (generación aumentada con recuperación). En vez de pedirle al modelo que responda de memoria, primero busco en mis propios documentos los fragmentos relevantes para la pregunta, se los pego en la entrada del modelo, y recién ahí le pido que responda. El modelo nunca "sabe" el contenido de mi corpus; lo ve recién en cada pregunta, en el prompt.

> **CONCEPTO — Generación aumentada con recuperación:** la idea se publicó con ese nombre en 2020 (Lewis y otros). "Recuperación" es la etapa de buscar fragmentos; "aumentada" es pegarlos en la entrada; "generación" es que el modelo escriba la respuesta con eso.

### P: ¿Por qué no le pasás todo el documento entero en cada pregunta?

**R:** Por tres razones, medidas en la cátedra: no siempre entra en la ventana de contexto del modelo; cuesta plata y tiempo en cada turno porque se reenvía completo en cada mensaje; y aunque entre y se pague, el modelo aprovecha mal lo que queda en el medio de un texto largo (el rendimiento dibuja una U: bien al principio y al final, mal en el medio). Por eso parto los documentos en fragmentos y mando solo los tres que más se parecen a la pregunta.

> **CONCEPTO — Ventana de contexto:** la cantidad máxima de tokens que un modelo puede tener a la vista en una sola pasada, contando lo que se le manda y lo que genera. Si se pasa el límite, por chat se recorta en silencio lo más viejo, sin avisar.

### P: ¿Por qué el modelo "inventa" (alucina) si no le das el dato?

**R:** Porque los pesos del modelo no son una base de datos con hechos guardados: son una transformación ajustada estadísticamente sobre el texto de entrenamiento. Lo que apareció muchas veces en el entrenamiento da una respuesta firme; lo que apareció poco (o nunca, como mi corpus propio) da una respuesta borrosa, pero el modelo la escribe con la misma seguridad en los dos casos. No hay ningún paso interno donde el modelo chequee si lo que va a decir es cierto: el mecanismo que genera un dato correcto es el mismo que genera uno inventado. Por eso la solución no es "pedirle que recuerde mejor", sino dejar de pedirle que recuerde: dárselo en la entrada.

> **CONCEPTO — Alucinación:** una salida falsa pero verosímil, escrita con la misma fluidez y apariencia de certeza que una correcta. Está demostrado (Kalai y Vempala, 2024) que existe un piso estadístico de alucinación que no se puede eliminar solo con más datos o mejor arquitectura.

---

## Bloque 2 — Troceado (chunking) y marca

### P: ¿Por qué partís los documentos en fragmentos? ¿Por qué no uno entero por archivo?

**R:** Porque la unidad con la que trabaja la búsqueda tiene que ser lo bastante chica para mandarse en la entrada del modelo y lo bastante grande para entenderse sola. Si mando el archivo entero, el embedding de todo el documento es una sola "dirección" que mezcla todos los temas (financiación, garantía, catálogo) y no se parece del todo a ninguna pregunta puntual.

> **CONCEPTO — Fragmento (chunk):** pedazo de un documento, chico como para mandarse en la entrada del modelo, grande como para entenderse por sí solo. No se busca en documentos: se busca en fragmentos.

### P: ¿Cómo trocea tu sistema? ¿Por qué elegiste esa estrategia?

**R:** Trocea **por estructura**, usando `trocearPorMarca()` en `trocear.mjs`: cada vez que un párrafo arranca con la "marca" (en mi caso, un título de Markdown: `#`, `##` o `###`), empieza un fragmento nuevo. Elegí esto en vez de trocear por tamaño fijo porque mis documentos ya tienen una estructura clara (secciones con título), y así cada fragmento es una unidad de sentido completa y la sección queda como la fuente que se cita. La alternativa, trocear cada 800 caracteres fijos, puede cortar una idea a la mitad (por ejemplo, separar una pregunta de su respuesta).

> **CONCEPTO — Marca:** la expresión regular que reconoce dónde empieza cada parte del documento. La mía es `/^#{1,3} .+/`: el inicio de renglón (`^`), uno a tres `#` seguidos de un espacio y texto. Lo que la marca reconoce es lo que después se cita como fuente.

### P: ¿Qué pasa si un fragmento supera el tamaño máximo?

**R:** Mi función tiene un tope (`MAXIMO = 2000` caracteres en `trocear.mjs`). Si una sección entera supera eso, la corto entre párrafos (nunca a la mitad de un párrafo) y repito el título en cada pedazo nuevo, para que no quede "huérfano". Lo que se pierde ahí es el hilo entre pedazos: el segundo fragmento ya no "ve" lo que decía el primero. En mi corpus actual ningún fragmento llega a ese límite (el más largo tiene 729 caracteres), pero el mecanismo existe por si el corpus crece.

### P: ¿Qué es el solapamiento, y por qué tu sistema actual no lo usa?

**R:** El solapamiento es cuando el troceado es por tamaño fijo: cada fragmento repite una porción de caracteres del fragmento anterior, para que una respuesta que cae justo en el borde de un corte quede completa en al menos uno de los dos. Mi troceado por marca no lo necesita porque corto en los bordes naturales del documento (entre secciones), no en cualquier lado: no hay "bordes malos" que solapar.

### P: ¿Qué pasaría si tu corpus no tuviera ninguna estructura reconocible?

**R:** Pondría `export const MARCA = null;` en `marca.mjs`. Mi `indexar.mjs` ya contempla ese caso: si `MARCA` es `null`, usa `trocearFijo()` en vez de `trocearPorMarca()`, que corta cada 800 caracteres con 150 de solapamiento (la técnica de la clase 5). El costo es que los fragmentos quedan sin sección, y la fuente que se cita pasa a ser "fragmento N" en lugar del nombre de una sección.

---

## Bloque 3 — Embeddings y similitud

### P: ¿Qué es un embedding?

**R:** Una lista de números (en mi caso, 1024, porque uso el modelo bge-m3) que representa el significado de un texto. Es como las coordenadas de un punto en un mapa, pero en vez de dos dimensiones (latitud y longitud) tiene 1024. Dos textos que signifiquen algo parecido quedan en posiciones cercanas de ese mapa, aunque no compartan ni una palabra.

> **CONCEPTO — Por qué sirve esto:** en la clase 5, mi buscador por palabras clave fallaba cuando la pregunta y el documento usaban palabras distintas para lo mismo (el "problema del vocabulario", documentado desde 1987 por Furnas y otros). Los embeddings arreglan eso porque comparan significado, no letras.

### P: ¿Cómo se calcula el embedding en tu sistema? ¿Dónde corre?

**R:** Con el modelo `bge-m3`, corriendo localmente en mi compu con Ollama (función `embeddingsEnLote()` en `api.mjs`). No sale ningún dato de mi máquina para calcular embeddings. Solo la respuesta final (la que genera Gemini) sale a la nube.

### P: ¿Por qué el embedding corre local y la respuesta no?

**R:** Son dos tareas muy distintas. Un modelo de embeddings lee el texto entero una sola vez y devuelve un vector: una sola pasada. Un modelo de chat genera la respuesta token por token, con una pasada completa por el modelo entero por cada token, y necesita muchos más parámetros para escribir bien. Por eso el primero corre bien en cualquier compu (bge-m3 pesa ~1 GB) y el segundo, en la práctica, necesita los servidores de un proveedor. Además, indexar hace muchos pedidos (uno por lote sobre todo el corpus) y preguntar hace uno solo: conviene que la parte que hace más pedidos no gaste el cupo gratuito de Google.

### P: ¿Qué mide la similitud coseno? ¿Por qué esa y no otra cosa?

**R:** Mide el ángulo entre dos vectores, ignorando su largo: dos vectores que apuntan exactamente para el mismo lado dan 1; perpendiculares dan 0; opuestos dan -1. Se usa el ángulo (no la distancia euclídea, por ejemplo) porque en los embeddings lo que importa es la *dirección* del vector, que es lo que representa el significado; el largo no aporta información de significado.

> **CONCEPTO — Fórmula:** coseno = producto punto ÷ (norma de a × norma de b). El producto punto es la suma de multiplicar cada par de números en la misma posición; la norma es el largo de la flecha (raíz de la suma de cuadrados, Pitágoras). En pgvector se usa la **distancia coseno**, que es `1 − similitud`: 0 cuando son iguales, más grande cuanto más se alejan. El operador en SQL es `<=>`.

### P: ¿Por qué no se pueden comparar embeddings de dos modelos distintos?

**R:** Porque cada modelo ubica los textos en su propio "mapa de significados": aunque los dos devuelvan la misma cantidad de números, no es el mismo espacio. Si indexo con un modelo y pregunto con otro, la dimensión puede coincidir sin ningún error, pero los resultados no significan nada. Mi sistema protege esto con una verificación en `api.mjs`: si el modelo devuelve otra cantidad de números que la que dice `DIMENSIONES` en el `.env`, tira un error en vez de guardar basura en la base.

---

## Bloque 4 — Búsqueda, Postgres y pgvector

### P: ¿Por qué pasaste el índice de un archivo JSON a una base de datos?

**R:** Un archivo como `indice.json` (de las clases 6 y 7) tiene limitaciones cuando el corpus crece: hay que leerlo entero en cada pregunta aunque se usen 3 fragmentos, solo lo puede usar un programa a la vez, y no sabe buscar por sí mismo (el programa compara contra todos). Una base de datos (Postgres, con la extensión pgvector) guarda los datos de forma persistente, responde consultas aunque varios programas le hablen a la vez, y con un índice adecuado no necesita comparar contra todos los fragmentos para encontrar los más parecidos.

### P: ¿Qué es pgvector, y qué agrega a Postgres?

**R:** Es una extensión de Postgres: le agrega un tipo de columna (`VECTOR(n)`) para guardar listas de números, operadores para medir distancia entre vectores (`<=>` para la distancia coseno), y un tipo de índice (HNSW) para buscar los más cercanos sin compararlos a todos. Que sea una extensión y no una base aparte me permite tener en la misma fila el texto, los metadatos (archivo, sección) y el vector.

### P: Mostrame dónde está la consulta que hace la búsqueda.

**R:** En `buscar.mjs`, función `buscar()`:
```sql
SELECT id, fuente, seccion, posicion, texto,
       1 - (embedding <=> $1::vector) AS similitud
  FROM fragmentos
 ORDER BY embedding <=> $1::vector
 LIMIT $2
```
Ordeno por la **distancia** (`embedding <=> $1`), no por la similitud, aunque dan el mismo orden: solo así Postgres puede usar el índice HNSW. La similitud (`1 - distancia`) la calculo nada más para mostrarla y compararla con el umbral.

### P: ¿Por qué se usan `$1`, `$2`… en vez de pegar los valores directo en el texto de la consulta?

**R:** Se llaman **consultas parametrizadas**. Si pegara el texto del fragmento directo dentro de la consulta SQL, un apóstrofo en el texto ("l'école") rompería la consulta, y alguien podría escribir texto a propósito para agregar órdenes SQL propias (por ejemplo, borrar una tabla). Eso se llama **inyección SQL**, uno de los ataques más viejos y comunes de la web. Con `$1, $2…` la consulta y los datos viajan por separado: la base nunca confunde un dato con una orden.

### P: ¿Cómo encuentra HNSW los fragmentos más cercanos sin compararlos contra todos?

**R:** HNSW (*Hierarchical Navigable Small World*) arma, al indexar, un grafo donde cada vector se conecta con unos pocos vecinos cercanos, en varios "pisos": arriba hay pocos puntos con conexiones largas (para moverse rápido por el mapa), abajo están todos los puntos con conexiones cortas (para afinar). La búsqueda arranca arriba, salta de vecino en vecino acercándose a la pregunta, y baja de piso para precisar. Es **aproximado**: puede quedar trabado en un punto cercano que no es el más cercano de todos, a cambio de ser mucho más rápido que comparar contra todo el corpus. Con mis 26 fragmentos no se nota la diferencia; importa con corpus de miles o millones.

> **CONCEPTO — Búsqueda exhaustiva vs. aproximada:** exhaustiva compara la pregunta contra cada fragmento, uno por uno (siempre encuentra el más parecido, pero crece en proporción al corpus). Aproximada (como HNSW) puede no devolver el más cercano de todos a cambio de ser mucho más rápida.

### P: ¿Qué pasa si corrés `indexar.mjs` dos veces seguidas?

**R:** Un `INSERT` en SQL agrega filas, no reemplaza: si no hiciera nada, indexar dos veces duplicaría cada fragmento (de 26 pasaría a 52). Por eso mi `indexar.mjs` empieza con `TRUNCATE TABLE fragmentos RESTART IDENTITY`, que vacía la tabla antes de volver a indexar. `RESTART IDENTITY` además hace que el `id` vuelva a empezar en 1. Esto es distinto de las clases 6-7, donde `writeFile` reemplazaba el archivo entero solo: una base de datos tiene **persistencia** (guarda todo lo que recibe hasta que se le diga lo contrario), así que soy yo quien tiene que evitar la duplicación.

---

## Bloque 5 — El umbral

### P: ¿Qué es el umbral y para qué sirve?

**R:** Es el valor mínimo de similitud que tiene que tener el mejor fragmento encontrado para que valga la pena mandárselo al modelo. Si ningún fragmento llega al umbral, mi sistema contesta "No lo encuentro en los documentos." **sin llamar al modelo**: es la defensa más barata contra inventar, porque ni siquiera gasta la llamada a la API.

### P: ¿Cómo calibraste tu umbral? ¿Por qué no un número fijo tipo 0,5 "porque sí"?

**R:** Con `distribucion.mjs` y `pruebas.json`: armé 10 preguntas cuya respuesta sí está en el corpus y 5 cuya respuesta no está (2 totalmente ajenas, como el mundial, y 3 relacionadas pero ausentes, como el precio del service de un modelo puntual). Para cada una medí la similitud del mejor fragmento. Las que están dieron entre 0,505 y 0,786; las que no, entre 0,247 y 0,693. Elegí **0,50**, justo debajo de la más baja de las que están, para no perder ninguna respuesta válida.

### P: Las nubes de similitud se pisan (0,505 vs. 0,693). ¿Eso no es un problema?

**R:** Es lo normal y lo esperable: no existe un umbral perfecto que separe las dos nubes sin ningún error. Cualquier corte se puede equivocar de dos formas: **falso negativo** (una pregunta que sí está queda debajo del corte y el sistema dice "no lo encuentro" sin motivo) o **falso positivo** (una pregunta que no está pasa el corte y el modelo recibe fragmentos que no sirven). Subir el umbral baja un error y sube el otro; no hay forma de bajar los dos a la vez si las nubes se pisan. Elegir el umbral es elegir qué error preferís cometer.

### P: ¿Qué error elegiste cometer, y por qué?

**R:** Prefiero el falso positivo: dejar pasar una pregunta que no está, antes que descartar una que sí está. Un falso negativo le niega información real al cliente y no tiene arreglo dentro del sistema. Un falso positivo todavía lo puede frenar el **prompt**, que le exige al modelo usar solo esos fragmentos y decir "No lo encuentro" si no alcanzan — y de hecho eso es justo lo que pasó con la pregunta del service de la Vela 1.6.

### P: ¿Por qué el umbral está en el `.env` y no escrito fijo en el código?

**R:** Porque depende del modelo de embeddings y del corpus: los valores de similitud no se comparan entre modelos (cada uno tiene su propia escala), y tampoco sirven de un corpus a otro. De hecho, cuando cambié el corpus del club al de la concesionaria, el umbral que tenía antes (0,58) dejó de servir y tuve que recalibrar. Tenerlo en el `.env`, al lado del modelo de embeddings, deja claro que son dos configuraciones que viajan juntas.

---

## Bloque 6 — El prompt y las capas contra la invención

### P: ¿Cómo está armado tu prompt? ¿Por qué tiene esa estructura?

**R:** `rag.mjs` arma el prompt final combinando una plantilla (`prompt.txt`) con los fragmentos encontrados y la pregunta. La plantilla tiene cinco ejes: **rol** (quién responde: Pancho, asesor de PROSEBA automotores), **contexto** (los fragmentos recuperados y nada más), **tarea** (responder la pregunta con eso), **restricciones** (no usar conocimiento propio, y si no alcanza, decir exactamente "No lo encuentro en los documentos.") y **formato** (respuesta breve + renglón `Fuente:` con archivo y sección).

### P: ¿Por qué le exigís una frase exacta para "no sé", en vez de dejar que conteste como quiera?

**R:** Porque una salida impredecible no se puede procesar. Si el modelo siempre contesta con la misma frase literal cuando no sabe, mi programa la puede detectar y actuar distinto (por ejemplo, no mostrar el sello de "Fuente"). Si cada vez dijera algo distinto, no tendría forma de saber con certeza si encontró la respuesta o no.

### P: ¿Por qué exigís citar la fuente (archivo y sección)?

**R:** No es por prolijidad: es para que la respuesta se pueda **verificar**. Un sistema que responde sin decir de dónde sacó el dato no se puede auditar. En mi front, cada fragmento usado se muestra con su similitud y un enlace al texto completo, así cualquiera puede comprobar que la fuente dice lo mismo que la respuesta.

### P: ¿Quién evita, en definitiva, que el sistema invente: la búsqueda, el umbral o el prompt?

**R:** Los tres, en capas, y ninguno es infalible solo. El **umbral** corta antes de llamar al modelo cuando nada se parece a la pregunta (ahorra también la llamada). La **búsqueda** limita qué puede ver el modelo: si trae los fragmentos equivocados, el modelo va a responder sobre esos con la misma seguridad. El **prompt** le ordena al modelo usar solo lo que recibió y decir que no sabe si no alcanza. Poner varias protecciones independientes, de modo que lo que se le escapa a una lo ataje la siguiente, es una práctica común en cualquier sistema que tiene que fallar poco — y mi propio sistema lo demuestra con la pregunta del service de la Vela: ahí la búsqueda dejó pasar fragmentos sin la respuesta exacta, y fue el prompt el que evitó que el modelo inventara un precio.

---

## Bloque 7 — Decisiones de arquitectura y seguridad

### P: ¿Dónde está la clave de la API de Google? ¿Por qué no puede estar en el navegador?

**R:** Está en `.env`, y solo la lee `api.mjs`, que corre en el **servidor** (`servidor.mjs`), nunca en el navegador. Cualquier código que corre en el navegador se le entrega entero al navegador: cualquiera abre las herramientas de desarrollo (F12) y lo lee, clave incluida. No hay forma de esconderla ahí. Mi front solo manda la pregunta (texto) a `/preguntar` y recibe la respuesta ya armada; la clave nunca viaja a la página.

### P: ¿Qué corre en Docker, y por qué?

**R:** Postgres con la extensión pgvector, en un contenedor llamado `rag-db`. Un contenedor es un programa aislado del resto del sistema, con sus propios archivos y configuración; se arma a partir de una imagen (acá, `pgvector/pgvector:pg17`), que trae Postgres 17 con pgvector ya instalado. La ventaja es que no tengo que instalar Postgres a mano ni pelearme con versiones, y los datos se guardan en un volumen de Docker (`rag-datos`) que sobrevive aunque apague o borre el contenedor.

### P: ¿Qué pasos seguiste para cambiar de tema (del club a la concesionaria)? ¿Qué tuviste que volver a medir?

**R:** Cuatro pasos: 1) reemplacé los archivos de `corpus/` (saqué los del club, puse `financiacion.md`, `garantia-service.md` y `politicas-y-catalogo.md`); 2) no tuve que tocar `marca.mjs` porque mis documentos nuevos también usan títulos de Markdown; 3) adapté el primer párrafo de `prompt.txt` (quién responde y de qué tema), sin tocar las reglas; 4) reescribí `pruebas.json` con preguntas nuevas, reindexé, y volví a calibrar el umbral con `distribucion.mjs` (pasó de 0,58 a 0,50). El núcleo del sistema (`api.mjs`, `buscar.mjs`, `rag.mjs`, `db.mjs`, `trocear.mjs`) no cambió nada.

### P: ¿Qué le falta a tu sistema para usarse en producción de verdad?

**R:** Cuatro cosas, de las que ya tengo ejemplos concretos de por qué harían falta:
1. **Reranking:** un modelo más preciso que reordene los fragmentos recuperados mirando la pregunta y cada fragmento juntos. Habría distinguido mejor "precio del auto" de "precio del service" en mi pregunta que falla.
2. **Búsqueda híbrida:** combinar la búsqueda por significado (embeddings) con una búsqueda por palabras exactas (BM25), útil para nombres de modelos y datos puntuales como precios.
3. **Actualización incremental:** reindexar solo los documentos que cambiaron, no todo el corpus cada vez.
4. **Medición formal:** un conjunto grande de preguntas con su respuesta correcta conocida, para medir en porcentaje cuántas veces el fragmento correcto aparece entre los primeros resultados (yo medí a mano con 16 preguntas).

---

## Repaso rápido de conceptos (para repasar 5 minutos antes)

| Término | En una línea |
|---|---|
| RAG | Buscar en una fuente propia y pegar lo encontrado en la entrada del modelo antes de que responda. |
| Fragmento | Pedazo de un documento, lo bastante chico para la entrada del modelo, lo bastante grande para entenderse solo. |
| Marca | La expresión regular que reconoce dónde empieza cada sección de mi corpus. |
| Embedding | Lista de números que representa el significado de un texto. |
| Similitud coseno | Mide el ángulo entre dos vectores embedding; 1 = mismo sentido, 0 = sin relación. |
| Distancia coseno | 1 − similitud. Es lo que usa pgvector (`<=>`) para ordenar. |
| pgvector | Extensión de Postgres para guardar vectores y buscar los más cercanos. |
| HNSW | Índice que busca saltando entre vecinos en un grafo de varios niveles, sin comparar contra todos. Es aproximado. |
| Umbral | Similitud mínima para considerar útil un fragmento; si nadie la alcanza, no se llama al modelo. |
| Falso positivo / negativo | Dejar pasar algo que no sirve / descartar algo que sí servía, según dónde pongo el umbral. |
| Consulta parametrizada | `$1, $2…`: los datos viajan separados de la orden SQL, evita la inyección SQL. |
| Alucinación | Respuesta falsa pero verosímil, dicha con la misma seguridad que una correcta. |
| Persistencia | Que los datos de la base sigan ahí después de que el programa que los escribió terminó. |
