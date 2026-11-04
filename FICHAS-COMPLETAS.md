# Fichas de la clase 8 — completadas con los datos reales de mi sistema

Corpus: Reglamento de Socios + Guía de Instalaciones del Club Los Ceibos.
Los números son los que salieron de correr mi propio sistema. Pasalas a mano a las fichas y reescribí las explicaciones con tus palabras.

---

## Ficha 1 — La dimensión (paso 3)

**Antes de correr prueba.mjs** — ¿Cuántos números va a devolver bge-m3? ¿Por qué?
Yo calculaba que no iban a ser los mismos 1536 de Google: cada modelo de embeddings define su propia cantidad de números, y bge-m3 es otro modelo. Supuse que serían menos de 1536 (alrededor de 1000).

**Después de correr** — ¿Cuántos devolvió? ¿En qué dos lugares tengo que escribir ese número?
Devolvió **1024** números. Hay que escribirlo en dos lugares: en el `.env` (`DIMENSIONES=1024`) y en `esquema.sql` (`VECTOR(1024)`). El `.env` controla lo que sale del modelo y la columna controla lo que entra a la base: tienen que coincidir siempre.

---

## Ficha 2 — Mi estructura (paso 5)

| Pregunta | Mi respuesta |
|---|---|
| La marca que escribí | `/^#{1,3} .+/` (los títulos de Markdown: #, ## y ###) |
| Fragmentos que salieron | **19** (11 del reglamento + 8 de la guía) |
| Fragmentos con sección reconocida | **19 de 19** |
| El más corto y el más largo (caracteres) | **199** y **528** |

**¿Las secciones son las que esperaba? Si alguna parte quedó sin reconocer, ¿qué tiene de distinto su comienzo?**
Sí, todas son las esperadas ("Cuota social", "Invitados", "Quincho", "Gimnasio", etc.). No quedó ninguna parte sin reconocer, porque todo mi corpus está escrito con títulos de Markdown. Los dos fragmentos que se llaman como el título del documento incluyen la frase de introducción.

**Si el más largo pasa de 2000 caracteres, ¿qué le hace la función? ¿Qué se pierde?**
El más largo tiene 528, así que no pasa. Si pasara, la función lo corta entre párrafos en pedazos de hasta 2000 caracteres y repite el título de la sección en cada pedazo. Lo que se pierde es el hilo: el segundo pedazo ya no "ve" lo que dijo el primero.

**Si mi marca es null: ¿por qué mi corpus no tiene una marca que sirva? ¿Qué problema de la clase 7 vuelve a aparecer?**
No aplica: mi marca no es null. Si lo fuera, el corpus se cortaría por tamaño fijo y los fragmentos quedarían sin sección, así que la fuente diría "fragmento 12" en vez de un nombre. Además, un corte por tamaño parte las ideas por la mitad, el problema de la clase 7.

---

## Ficha 3 — Indexar otra vez (paso 7)

**Antes de correr** — Filas después del paso 6: **19**. Si corro `indexar.mjs` otra vez sin cambiar nada, ¿cuántas filas va a haber? ¿Por qué?
Va a haber **38**. Un `INSERT` agrega filas, no reemplaza: cada fragmento queda dos veces.

**Después de correr** — Filas que hay: **38** (antes de agregar el `TRUNCATE`). ¿Acerté? Si le hiciera una pregunta ahora, ¿qué vería entre los tres primeros? ¿Por qué en las clases 6 y 7 no pasaba?
Acerté. Entre los tres primeros aparecería el mismo fragmento dos veces (con la misma similitud) y el modelo recibiría el mismo texto repetido, con un fragmento útil menos. En las clases 6 y 7 no pasaba porque `writeFile` reemplaza el archivo entero: indexar veinte veces dejaba siempre un solo índice. La base, en cambio, acumula todo lo que se le manda.

**El arreglo:** `TRUNCATE TABLE fragmentos RESTART IDENTITY` al principio de `indexar.mjs`. Con eso vuelve a dar 19 sin importar cuántas veces se corra (lo comprobé corriéndolo dos veces).

---

## Ficha 4 — Dónde cortar (paso 9) — se conserva

**Mi UMBRAL de la clase 7:** solo vos sabés cuál era (está en el `.env` de tu carpeta `rag-reglamento`, si la tenés). Si no lo tenés, anotá "no tengo el valor": es mejor que un número que no medí.
**¿Me sirve para hoy? ¿Por qué?**
No. El umbral depende del modelo: Google y bge-m3 ubican los textos en mapas distintos y con escalas distintas, así que un número medido con uno no sirve con el otro. Hay que volver a medir cuando cambia el modelo, el corpus o el troceado.

**Similitud del mejor fragmento para cada pregunta:**

| Pregunta | ¿Está? | Similitud |
|---|---|---|
| ¿cuánto sale la cuota mensual de un socio activo? | sí | 0,777 |
| ¿cuántas cuotas impagas hacen que me den de baja? | sí | 0,751 |
| ¿con cuánta anticipación tengo que reservar el quincho? | sí | 0,731 |
| ¿hasta qué hora está abierto el club los sábados? | sí | 0,727 |
| ¿cuánto cuesta reservar una cancha de pádel? | sí | 0,723 |
| ¿a cuántos invitados puedo llevar por día? | sí | 0,681 |
| ¿cuándo empieza la temporada de pileta? | sí | 0,678 |
| ¿puedo llevar al perro a la pileta? | sí | 0,667 |
| ¿puedo ir al gimnasio si tengo 14 años? | sí | 0,634 |
| ¿quién puede votar en la asamblea? | sí | 0,584 |
| ¿cuánto cuesta alquilar la cancha de tenis? | no | 0,608 |
| ¿cuál es la contraseña del wifi del club? | no | 0,541 |
| ¿el club tiene buffet o cantina? | no | 0,510 |
| ¿cómo se hace una milanesa? | no | 0,369 |
| ¿quién ganó el último mundial? | no | 0,260 |

**La recta** (X = está, O = no está, ^ = mi umbral 0,58):

```
                               X  XXX XXXX           
               O    O       OO  O                    
  ---------------------------------------------------
                               ^                     
  0,0  0,1  0,2  0,3  0,4  0,5  0,6  0,7  0,8  0,9  1
```
Dibujala a mano en la ficha: cruces para las que están, círculos para las que no, y una flecha en 0,58. (Si tenés tu umbral de la clase 7, marcalo con otra flecha.)

1. **Con el umbral de la clase 7:** si tenés tu número real, hacé la cuenta con la recta: cuántas cruces quedan a su izquierda (descartadas) y cuántos círculos a su derecha (pasarían). Si no lo tenés, no lo inventes: anotá "no tengo el valor de la clase 7" y usá este ejemplo, que es una **hipótesis calculada con mis datos reales**, no una medición de la clase 7:

   | Si el umbral hubiera sido… | Preguntas que están y se descartarían (de 10) | Preguntas que no están y pasarían (de 5) |
   |---|---|---|
   | 0,50 | 0 | 3 (tenis, wifi, buffet) |
   | 0,60 | 1 (asamblea, 0,584) | 1 (tenis, 0,608) |
   | 0,70 | 5 | 0 |
   | **0,58 (el que elegí)** | **0** | **1 (tenis)** |

   Conclusión: un umbral pensado para otro modelo o corpus puede dejar pasar basura o descartar respuestas buenas, y por eso hay que volver a medir.
2. **¿Hay un hueco limpio?** No, se pisan: la cruz más baja (0,584, votar en la asamblea) está por debajo del círculo más alto (0,608, cancha de tenis).
3. **Mi umbral nuevo: 0,58.**
4. **Las preguntas del lado equivocado:** "cancha de tenis" (0,608) pasa el umbral aunque no está. Le pasa porque "cancha de ___, cuánto cuesta" se parece mucho a las canchas de pádel y fútbol 5 del club; el embedding captura el tema, no la palabra exacta "tenis". Elegí 0,58 para no perder ninguna respuesta válida: prefiero dejar pasar una pregunta que no está (que el prompt todavía puede frenar) antes que descartar una que sí está.

---

## Ficha 5 — Mis cuatro preguntas (paso 10) — se conserva para la exposición

| # | Pregunta | Similitud del primero | Fuente que citó | ¿Correcta? | Si falló: ¿búsqueda o modelo? |
|---|---|---|---|---|---|
| 1 | ¿cuánto sale la cuota de un socio cadete? | 0,761 | reglamento-socios.md — Cuota social | Sí ($9.000) | — |
| 2 | ¿puedo ir al gimnasio si tengo 14 años? | 0,634 | guia-instalaciones.md — Gimnasio | Sí (no, edad mínima 16) | — |
| 3 | ¿quién ganó el último mundial? | 0,260 | ninguna (no se llamó al modelo) | Sí: "No lo encuentro en los documentos." | — (el umbral la cortó) |
| 4 | ¿cuánto cuesta alquilar la cancha de tenis? | 0,608 | trajo fútbol 5 y pádel | Contestó bien ("No lo encuentro"), pero por el motivo equivocado | Falló la **búsqueda** (trajo canchas que no son de tenis); lo salvó el **modelo** |

**Para la exposición:**
- **Pregunta que funciona:** la de la cuota del socio cadete. Abrir `reglamento-socios.md` en "Cuota social" y mostrar que dice $9.000.
- **Pregunta que no está y el sistema dice que no:** la del mundial (0,260, muy debajo del umbral, sin llamar al modelo).
- **Pregunta que falla:** la de la cancha de tenis. La búsqueda trajo fragmentos parecidos pero equivocados porque el embedding capta el tema ("canchas") y no el dato exacto ("tenis"). El umbral los dejó pasar (0,608 y 0,596 contra 0,58), y el prompt, que obliga al modelo a usar solo los fragmentos, impidió que inventara un precio. Para arreglarlo de verdad haría falta reranking o búsqueda híbrida.
