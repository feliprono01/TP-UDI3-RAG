# Fichas de la clase 8 — completadas con los datos reales de mi sistema

Corpus: Financiación + Garantía y Service + Políticas de Venta y Catálogo de Austral Motors (concesionaria de autos).
Los números son los que salieron de correr mi propio sistema. Pasalas a mano a las fichas y reescribí las explicaciones con tus palabras.

---

## Ficha 1 — La dimensión (paso 3)

**Antes de correr prueba.mjs** — ¿Cuántos números va a devolver bge-m3? ¿Por qué?
Yo calculaba que no iban a ser los mismos 1536 de Google: cada modelo de embeddings define su propia cantidad de números, y bge-m3 es otro modelo. Supuse que serían menos de 1536 (alrededor de 1000).

**Después de correr** — ¿Cuántos devolvió? ¿En qué dos lugares tengo que escribir ese número?
Devolvió **1024** números. Hay que escribirlo en dos lugares: en el `.env` (`DIMENSIONES=1024`) y en `esquema.sql` (`VECTOR(1024)`). El `.env` controla lo que sale del modelo y la columna controla lo que entra a la base: tienen que coincidir siempre. (Este número no cambió al cambiar de tema porque el modelo de embeddings, bge-m3, es el mismo; lo que cambió es el corpus.)

---

## Ficha 2 — Mi estructura (paso 5)

| Pregunta | Mi respuesta |
|---|---|
| La marca que escribí | `/^#{1,3} .+/` (los títulos de Markdown: #, ## y ###) |
| Fragmentos que salieron | **26** (7 de financiación + 7 de garantía/service + 12 de políticas y catálogo) |
| Fragmentos con sección reconocida | **26 de 26** |
| El más corto y el más largo (caracteres) | **149** y **729** |

**¿Las secciones son las que esperaba? Si alguna parte quedó sin reconocer, ¿qué tiene de distinto su comienzo?**
Sí, todas son las esperadas ("Planes de financiación propia", "Garantía de fábrica (0km)", "Reserva y seña", y cada modelo del catálogo como su propia sección: "Sedán Vela 1.6", "Pick-up Cordillera 4x4 Diésel", etc.). No quedó ninguna parte sin reconocer, porque todo mi corpus está escrito con títulos de Markdown. El catálogo usa `###` para cada modelo, así que cada auto queda como un fragmento propio con su propia sección.

**Si el más largo pasa de 2000 caracteres, ¿qué le hace la función? ¿Qué se pierde?**
El más largo tiene 729, así que no pasa. Si pasara, la función lo corta entre párrafos en pedazos de hasta 2000 caracteres y repite el título de la sección en cada pedazo. Lo que se pierde es el hilo: el segundo pedazo ya no "ve" lo que dijo el primero.

**Si mi marca es null: ¿por qué mi corpus no tiene una marca que sirva? ¿Qué problema de la clase 7 vuelve a aparecer?**
No aplica: mi marca no es null. Si lo fuera, el corpus se cortaría por tamaño fijo y los fragmentos quedarían sin sección, así que la fuente diría "fragmento 12" en vez de un nombre. Además, un corte por tamaño parte las ideas por la mitad, el problema de la clase 7.

---

## Ficha 3 — Indexar otra vez (paso 7)

**Antes de correr** — Filas después del paso 6: **26**. Si corro `indexar.mjs` otra vez sin cambiar nada, ¿cuántas filas va a haber? ¿Por qué?
Si no tuviera el `TRUNCATE`, habría **52**: un `INSERT` agrega filas, no reemplaza, así que cada fragmento quedaría dos veces.

**Después de correr** — Mi `indexar.mjs` ya tiene `TRUNCATE TABLE fragmentos RESTART IDENTITY` al principio (lo agregué la primera vez que armé este sistema, con el tema del club, y se mantuvo sin cambios al cambiar de tema). Por eso, aunque lo corrí varias veces al reindexar el corpus nuevo, siempre volvió a dar **26** filas, nunca más.
Sin ese `TRUNCATE`, entre los tres primeros resultados de una pregunta aparecería el mismo fragmento dos veces (con la misma similitud), y el modelo recibiría el mismo texto repetido con un fragmento útil menos. En las clases 6 y 7 esto no pasaba porque `writeFile` reemplaza el archivo entero: indexar veinte veces dejaba siempre un solo índice. La base, en cambio, acumula todo lo que se le manda, así que soy responsable de no repetir.

---

## Ficha 4 — Dónde cortar (paso 9) — se conserva

**Mi UMBRAL anterior (tema del club):** 0,58.
**¿Me sirve para hoy? ¿Por qué?**
No. El umbral depende del corpus y de cómo el embedding ubica sus textos: un número medido con el reglamento del club no tiene por qué servir con los documentos de la concesionaria, aunque el modelo de embeddings sea el mismo. Hay que volver a medir cada vez que cambia el corpus.

**Similitud del mejor fragmento para cada pregunta:**

| Pregunta | ¿Está? | Similitud |
|---|---|---|
| ¿cuánto tarda la entrega de un 0km que está en stock? | sí | 0,786 |
| ¿cuánto tengo que pagar de seña para reservar un auto? | sí | 0,765 |
| ¿cuántos años de garantía tiene un 0km? | sí | 0,762 |
| ¿puedo entregar mi auto usado como parte de pago? | sí | 0,749 |
| ¿qué consumo de combustible tiene la pick-up Cordillera? | sí | 0,724 |
| ¿qué documentación tengo que llevar para comprar un auto? | sí | 0,643 |
| ¿cuánto necesito de anticipo para financiar un auto? | sí | 0,643 |
| ¿cada cuánto hay que hacer el service? | sí | 0,607 |
| ¿me dan auto de cortesía mientras hacen el service? | sí | 0,592 |
| ¿cuántos caballos de fuerza tiene la Travesía? | sí | 0,505 |
| ¿cuánto cuesta el service de la Vela 1.6? | no | 0,693 |
| ¿hacen envíos a domicilio del auto comprado? | no | 0,586 |
| ¿tienen autos eléctricos en el catálogo? | no | 0,499 |
| ¿cómo se hace una milanesa? | no | 0,359 |
| ¿quién ganó el último mundial? | no | 0,258 |

**La recta** (X = está, O = no está, ^ = mi umbral 0,50):

```
                                  X X   XX  X X  X  X        
                O     O   O      O                           
  --------------------------------------------------------- 
                            ^                                 
  0,0  0,1  0,2  0,3  0,4  0,5  0,6  0,7  0,8  0,9  1
```
Dibujala a mano en la ficha: cruces para las que están, círculos para las que no, y una flecha en 0,50.

1. **Con el umbral anterior (0,58, calibrado para el club):** si lo hubiera usado hoy, descartaría la pregunta de los caballos de fuerza de la Travesía (0,505, por debajo de 0,58) y dejaría pasar igual la del service de la Vela (0,693) y la de envíos a domicilio (0,586). Conclusión: un umbral pensado para otro corpus puede dejar pasar basura y además descartar respuestas buenas, y por eso hay que volver a medir.
2. **¿Hay un hueco limpio?** No, se pisan: la cruz más baja (0,505, caballos de la Travesía) está por debajo del círculo más alto (0,693, service de la Vela 1.6).
3. **Mi umbral nuevo: 0,50.**
4. **Las preguntas del lado equivocado:** "service de la Vela 1.6" (0,693) y "envíos a domicilio" (0,586) pasan el umbral aunque no están. Les pasa porque el embedding capta el tema general (el auto, la entrega) y no el dato puntual que falta (el precio del service, si hay envío). Elegí 0,50 para no perder ninguna respuesta válida: prefiero dejar pasar una pregunta que no está (que el prompt todavía puede frenar) antes que descartar una que sí está.

---

## Ficha 5 — Mis cuatro preguntas (paso 10) — se conserva para la exposición

| # | Pregunta | Similitud del primero | Fuente que citó | ¿Correcta? | Si falló: ¿búsqueda o modelo? |
|---|---|---|---|---|---|
| 1 | ¿cuánto necesito de anticipo para financiar un auto? | 0,643 | financiacion.md — Planes de financiación propia | Sí (30% mínimo) | — |
| 2 | ¿cuántos años de garantía tiene un 0km? | 0,762 | garantia-service.md — Garantía de fábrica (0km) | Sí (3 años o 100.000 km) | — |
| 3 | ¿quién ganó el último mundial? | 0,258 | ninguna (no se llamó al modelo) | Sí: "No lo encuentro en los documentos." | — (el umbral la cortó) |
| 4 | ¿cuánto cuesta el service de la Vela 1.6? | 0,693 | trajo "Sedán Vela 1.6", "Reserva y seña" y "Service y mantenimiento" | Contestó bien ("No lo encuentro"), pero por el motivo equivocado | Falló la **búsqueda** (el precio del service no está en ninguno de los tres fragmentos: el documento solo dice que depende del modelo); lo salvó el **modelo** |

**Para la exposición:**
- **Pregunta que funciona:** la del anticipo para financiar. Abrir `financiacion.md` en "Planes de financiación propia" y mostrar que dice 30% mínimo.
- **Pregunta que no está y el sistema dice que no:** la del mundial (0,258, muy debajo del umbral, sin llamar al modelo).
- **Pregunta que falla:** la del service de la Vela 1.6. La búsqueda trajo fragmentos relacionados (el modelo, la reserva, el plan de mantenimiento) pero ninguno tiene el precio puntual, porque el documento aclara que el costo del service "depende del modelo y se informa al momento del turno". El umbral los dejó pasar (0,693, 0,522 y 0,515, todos sobre 0,50), y el prompt, que obliga al modelo a usar solo los fragmentos, impidió que inventara un precio. Para arreglarlo de verdad haría falta reranking o búsqueda híbrida.
- **Bonus — pregunta compuesta que también falla por búsqueda:** "si entrego mi usado como parte de pago y el 0km tiene garantía, ¿en qué casos se anula la garantía por no hacer el service?" mezcla dos temas en una sola oración; la búsqueda trae fragmentos de "Devoluciones y cambios", el título general de garantía y "Entrega de tu usado…", mientras que la respuesta real está en "Service y mantenimiento programado". El sistema dice correctamente que no lo encuentra, pero la causa es, otra vez, una falla de búsqueda y no que la respuesta no exista en el corpus.
