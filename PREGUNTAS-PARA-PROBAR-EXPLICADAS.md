# Preguntas para probar a Pancho — qué pasa con cada una y por qué

Este documento explica, pregunta por pregunta, qué hace el sistema y por qué. Son las 16 preguntas de `pruebas.json`.

## Antes de empezar: cómo decide el sistema

1. La pregunta se convierte en números (un *embedding*) y se compara contra los 26 fragmentos de los documentos.
2. Cada fragmento recibe una **similitud** de 0 a 1: cuanto más cerca de 1, más se parece a la pregunta.
3. El sistema se queda con los **3 fragmentos** más parecidos.
4. Si el mejor no llega al **umbral (0,50)**, responde que no lo tiene y **no llama al modelo** (Gemini).
5. Si llega, le pasa los fragmentos a Gemini con una orden: "respondé solo con esto, y si no está, decí que no lo encontrás".

**Importante:** la similitud mide si el *tema* se parece, no si el *dato exacto* está. Por eso hay preguntas que pasan el umbral aunque la respuesta no esté.

## Resumen de las 16 preguntas

| # | Pregunta | Similitud | Resultado |
|---|---|---|---|
| 1 | ¿Cuánto tarda la entrega de un 0km que está en stock? | 0,786 | Funciona |
| 2 | ¿Cuánto tengo que pagar de seña para reservar un auto? | 0,765 | Funciona |
| 3 | ¿Cuántos años de garantía tiene un 0km? | 0,762 | Funciona |
| 4 | Compré un usado certificado y lo quiero entregar como parte de pago… (dos documentos) | 0,754 | Funciona (cruza dos documentos) |
| 5 | ¿Puedo entregar mi auto usado como parte de pago? | 0,749 | Funciona |
| 6 | ¿Qué consumo de combustible tiene la pick-up Cordillera? | 0,724 | Funciona |
| 7 | ¿Cuánto necesito de anticipo para financiar un auto? | 0,646 | Funciona |
| 8 | ¿Qué documentación tengo que llevar para comprar un auto? | 0,643 | Funciona |
| 9 | ¿Cada cuánto hay que hacer el service? | 0,614 | Funciona |
| 10 | ¿Me dan auto de cortesía mientras hacen el service? | 0,575 | Funciona |
| 11 | ¿Cuántos caballos de fuerza tiene la Travesía? | 0,505 | Funciona, pero justo sobre el umbral |
| 12 | ¿Quién ganó el último mundial? | 0,247 | No está: lo corta el umbral |
| 13 | ¿Cómo se hace una milanesa? | 0,374 | No está: lo corta el umbral |
| 14 | ¿Tienen autos eléctricos en el catálogo? | 0,489 | No está: lo corta el umbral, por muy poco |
| 15 | ¿Cuánto cuesta el service de la Vela 1.6? | 0,693 | No está: pasa el umbral y lo frena el prompt |
| 16 | ¿Hacen envíos a domicilio del auto comprado? | 0,586 | No está: pasa el umbral y lo frena el prompt |

Todas las preguntas "que sí están" encontraron su sección correcta en el **primer** lugar (11 de 11).

---

## A. Preguntas que funcionan

En todas, la búsqueda trae el fragmento correcto, supera el umbral y el modelo responde con ese dato citando la fuente.

### 1. ¿Cuánto tarda la entrega de un 0km que está en stock? (0,786)
- **Dónde está la respuesta:** `politicas-y-catalogo.md` — "Entrega del vehículo".
- **Qué dice:** los 0km en stock se entregan dentro de las 72 horas hábiles de abonado el saldo total.
- **Por qué funciona:** la pregunta usa casi las mismas palabras que el título y el texto de la sección ("entrega", "0km", "en stock"). Por eso tiene la similitud más alta de todas.

### 2. ¿Cuánto tengo que pagar de seña para reservar un auto? (0,765)
- **Dónde está:** `politicas-y-catalogo.md` — "Reserva y seña".
- **Qué dice:** $300.000 para 0km y $150.000 para usados, acreditable al precio final.
- **Por qué funciona:** "seña" y "reservar" aparecen tal cual en el título de la sección. El tema es único en los documentos, así que no compite con ningún otro fragmento.

### 3. ¿Cuántos años de garantía tiene un 0km? (0,762)
- **Dónde está:** `garantia-service.md` — "Garantía de fábrica (0km)".
- **Qué dice:** 3 años o 100.000 km, lo que ocurra primero (pintura 5 años, anticorrosión 10).
- **Por qué funciona:** pregunta directa sobre un tema que tiene su propia sección dedicada.

### 4. Compré un usado certificado y lo quiero entregar como parte de pago de un 0km: ¿qué garantía tiene y hasta qué antigüedad me lo reciben? (0,754)
- **Dónde está:** en **dos documentos**.
  - `garantia-service.md` — "Garantía de autos usados": 6 meses o 10.000 km.
  - `financiacion.md` — "Entrega de tu usado como parte de pago": no se reciben vehículos de más de 15 años.
- **Por qué funciona:** la búsqueda trae fragmentos de los dos archivos entre los 3 primeros, y el modelo los combina en una sola respuesta citando las dos fuentes.
- **Por qué es la pregunta "extra":** demuestra que el sistema puede usar más de un documento cuando la pregunta necesita datos de varios lugares.

### 5. ¿Puedo entregar mi auto usado como parte de pago? (0,749)
- **Dónde está:** `financiacion.md` — "Entrega de tu usado como parte de pago".
- **Qué dice:** sí, se puede. La tasación dura 30 minutos, vale 7 días, el auto debe estar libre de deuda, y no se reciben autos de más de 15 años, con siniestro total ni motos.
- **Por qué funciona:** el título de la sección es casi la pregunta.

### 6. ¿Qué consumo de combustible tiene la pick-up Cordillera? (0,724)
- **Dónde está:** `politicas-y-catalogo.md` — "Pick-up Cordillera 4x4 Diésel".
- **Qué dice:** consumo mixto de 8,8 litros cada 100 km.
- **Por qué funciona:** el nombre del modelo ("Cordillera") es muy específico y cada modelo del catálogo es su propio fragmento. Eso hace que el modelo correcto salga primero.

### 7. ¿Cuánto necesito de anticipo para financiar un auto? (0,646)
- **Dónde está:** `financiacion.md` — "Planes de financiación propia".
- **Qué dice:** anticipo mínimo del 30% para acceder al plan propio.
- **Por qué la similitud es más baja:** el tema "anticipo" aparece en dos secciones ("Planes de financiación propia" y "Anticipo y cuotas"). Las dos entran entre los 3 resultados, y a veces cambian de orden. Igual el modelo cita la correcta, porque el 30% está solo en "Planes de financiación propia".
- **Es la pregunta recomendada para mostrar que funciona:** abrí el documento en esa sección y mostrá que dice lo mismo.

### 8. ¿Qué documentación tengo que llevar para comprar un auto? (0,643)
- **Dónde está:** `financiacion.md` — "Documentación requerida".
- **Qué dice:** DNI, constancia de CUIT/CUIL, comprobante de domicilio de menos de 60 días y recibo de sueldo o constancia de ingresos. Para financiación bancaria, además, declaración jurada de bienes.
- **Por qué funciona:** el tema tiene una sección propia. La similitud es más baja porque la pregunta es general ("documentación", "comprar") y el texto es una lista de requisitos.

### 9. ¿Cada cuánto hay que hacer el service? (0,614)
- **Dónde está:** `garantia-service.md` — "Service y mantenimiento programado".
- **Qué dice:** cada 10.000 km o 12 meses, lo que ocurra primero. El primer service (5.000 km o 6 meses) es gratis para 0km comprados en PROSEBA.
- **Por qué la similitud baja:** es una pregunta corta y la palabra "service" aparece en varias secciones (turnos, repuestos, garantía). Aun así la correcta sale primera.

### 10. ¿Me dan auto de cortesía mientras hacen el service? (0,575)
- **Dónde está:** `garantia-service.md` — "Turnos de service".
- **Qué dice:** sí, sin cargo, para services de más de 4 horas de trabajo y sujeto a disponibilidad.
- **Por qué la similitud es baja:** el dato del auto de cortesía está en el último párrafo de una sección que habla sobre todo de turnos y horarios. Aun así, supera el umbral y es el primer resultado.

### 11. ¿Cuántos caballos de fuerza tiene la Travesía? (0,505) — justo sobre el límite
- **Dónde está:** `politicas-y-catalogo.md` — "SUV Travesía 2.0".
- **Qué dice:** 170 CV.
- **Por qué la similitud es tan baja:** "caballos de fuerza" es una forma coloquial; el documento dice "CV". El significado es el mismo, pero las palabras distintas bajan la similitud.
- **Por qué importa:** es la **razón del umbral 0,50**. Si el umbral fuera 0,58 (el que se usaba con el tema anterior), esta pregunta, que sí está, se descartaría.

---

## B. Preguntas que no están, cortadas por el umbral

La similitud queda por debajo de 0,50. El sistema responde que no lo tiene **sin llamar al modelo**: es más rápido, no gasta cupo de Gemini y no hay riesgo de que invente.

### 12. ¿Quién ganó el último mundial? (0,247)
- **Por qué no está:** no tiene nada que ver con una concesionaria.
- **Qué se ve:** globo ámbar con "No figura en los documentos" y la nota "Ningún documento llegó al umbral (0.5)…".
- **Por qué es la mejor para mostrar:** la similitud (0,247) queda muy lejos de la raya del umbral. Es el caso más claro.

### 13. ¿Cómo se hace una milanesa? (0,374)
- **Por qué no está:** es otro tema sin relación.
- **Qué se ve:** lo mismo que la anterior. Un poco más cerca del umbral, pero todavía muy lejos.

### 14. ¿Tienen autos eléctricos en el catálogo? (0,489)
- **Por qué no está:** el catálogo tiene 5 modelos (Vela, Rumbo, Travesía, Cordillera y Carguero) y ninguno es eléctrico.
- **Qué se ve:** el umbral la corta, sin llamar al modelo.
- **Ojo:** queda **apenas 0,011 por debajo** del umbral. Es una pregunta del mismo tema (catálogo de autos) y por eso se parece bastante. Es un caso frágil: si pasara el umbral por poco, el prompt igual la frenaría.

---

## C. Casos límite: pasan el umbral aunque la respuesta no está

Estas son las que más conviene entender. **El sistema no falla porque invente, sino que la búsqueda se equivoca a medias y el prompt la corrige.**

### 15. ¿Cuánto cuesta el service de la Vela 1.6? (0,693)
- **Qué pasa en la búsqueda:** trae el modelo Vela 1.6 (0,693), el mantenimiento programado (0,525) y la reserva (0,523). Las tres superan el umbral, pero **ninguna tiene el precio**.
- **Por qué no está el dato:** el documento dice que, desde el segundo service, "el costo depende del modelo y se informa al momento del turno". No hay un precio fijo que citar.
- **Por qué la similitud es tan alta:** el sistema ve que la pregunta habla de la Vela y de service, y los dos temas existen en los documentos. No entiende que falta el número exacto.
- **Qué hace el modelo:** el prompt le ordena usar solo los fragmentos y decir "No lo encuentro en los documentos" si no está. Según la corrida, hace una de dos cosas:
  1. Dice que no lo encuentra.
  2. Responde solo lo que sí dice el documento (el primer service es gratis y el costo depende del modelo).
- **Ninguna de las dos inventa un precio.** Eso es lo que importa. El modelo no es 100% determinista, así que la redacción puede cambiar entre corridas.
- **Qué enseña:** la búsqueda sola no alcanza. El umbral, la búsqueda y el prompt trabajan en capas, y acá fue el prompt el que evitó el error.

### 16. ¿Hacen envíos a domicilio del auto comprado? (0,586)
- **Por qué no está:** los documentos hablan de la entrega del vehículo en la concesionaria, pero no mencionan envíos a domicilio.
- **Por qué pasa el umbral:** el tema "entrega" sí existe, entonces el sistema encuentra algo parecido.
- **Qué se espera:** el modelo debería decir que no lo encuentra. Es una respuesta esperable y puede variar de redacción, porque no lo medí en esta guía con el modelo actual.

---

## Qué mostrar en la exposición (en este orden)

1. **Una que funciona:** la 7 (anticipo). Abrí "Ver los documentos consultados" y mostrá el fragmento y su similitud.
2. **Una que no está:** la 12 (mundial). Mostrá la similitud contra la raya del umbral.
3. **Una en el límite:** la 15 (service de la Vela). Explicá que la búsqueda trajo el tema, pero no el precio, y que el prompt evitó inventarlo.
4. **Extra:** la 4 (dos documentos).

## Por qué el umbral está en 0,50

Las preguntas que sí están dieron entre 0,505 y 0,786. Las que no están, entre 0,247 y 0,693. **Se pisan**, y por eso ningún número separa todo perfecto.

Se eligió 0,50 para **no rechazar nunca una pregunta válida** (la 11 queda justo arriba). El costo es que a veces pasa una que no está (15 y 16). Ese error es más aceptable: el prompt todavía puede frenarlo, mientras que rechazar una pregunta válida le niega información real al cliente.
