# Anexo — Preguntas para hacerle a Pancho

Las 16 preguntas de `pruebas.json`, con la similitud medida del mejor fragmento y lo que se espera ver. Umbral: **0,50**. Las marcadas con ★ también están como botón en el lateral del chat ("Preguntas para probar").

## A. Funcionan: la respuesta está en los documentos

| Pregunta | Sección que debería citar | Similitud |
|---|---|---|
| ¿Cuánto tarda la entrega de un 0km que está en stock? | Entrega del vehículo | 0,786 |
| ★ ¿Cuánto tengo que pagar de seña para reservar un auto? | Reserva y seña | 0,765 |
| ★ ¿Cuántos años de garantía tiene un 0km? | Garantía de fábrica (0km) | 0,762 |
| ¿Puedo entregar mi auto usado como parte de pago? | Entrega de tu usado como parte de pago | 0,749 |
| ★ ¿Qué consumo de combustible tiene la pick-up Cordillera? | Pick-up Cordillera 4x4 Diésel | 0,724 |
| ★ ¿Cuánto necesito de anticipo para financiar un auto? | Planes de financiación propia (30% mínimo) | 0,646 |
| ¿Qué documentación tengo que llevar para comprar un auto? | Documentación requerida | 0,643 |
| ¿Cada cuánto hay que hacer el service? | Service y mantenimiento programado | 0,614 |
| ¿Me dan auto de cortesía mientras hacen el service? | Turnos de service | 0,575 |
| ¿Cuántos caballos de fuerza tiene la Travesía? | SUV Travesía 2.0 | 0,505 (justo sobre el umbral) |

## B. Cruza dos documentos

| Pregunta | Qué se espera | Similitud |
|---|---|---|
| ★ Compré un usado certificado y lo quiero entregar como parte de pago de un 0km: ¿qué garantía tiene el usado certificado y hasta qué antigüedad me lo reciben? | Combina `garantia-service.md` (usados: 6 meses o 10.000 km) y `financiacion.md` (no se reciben usados de más de 15 años), citando las dos fuentes | 0,754 |

## C. No están: el sistema debe decir que no lo tiene

| Pregunta | Qué pasa | Similitud |
|---|---|---|
| ★ ¿Quién ganó el último mundial? | Cortada por el umbral, **sin llamar al modelo** | 0,247 |
| ¿Cómo se hace una milanesa? | Cortada por el umbral, sin llamar al modelo | 0,374 |
| ★ ¿Tienen autos eléctricos en el catálogo? | Cortada por el umbral (queda apenas abajo) | 0,489 |

## D. Casos límite: pasan el umbral aunque el dato no está

La búsqueda trae el tema general, pero no el dato puntual. Lo frena el **prompt**: el modelo dice que no lo encuentra o responde solo lo que el documento sí dice, sin inventar.

| Pregunta | Qué se espera | Similitud |
|---|---|---|
| ★ ¿Cuánto cuesta el service de la Vela 1.6? | Pasa el umbral. El documento dice que el costo "depende del modelo y se informa al momento del turno". Puede contestar "No lo encuentro" o contar solo lo que sí dice (primer service gratis), **sin inventar un precio** | 0,693 |
| ¿Hacen envíos a domicilio del auto comprado? | Pasa el umbral. No hay dato de envíos: debería decir que no lo encuentra | 0,586 |

## Cómo usarlas en la exposición

1. **Una que funciona:** anticipo para financiar (abrir "Ver los documentos consultados" y mostrar la fuente).
2. **Una que no está:** mundial (mostrar la similitud contra la raya del umbral).
3. **Una que falla o queda en el límite:** service de la Vela 1.6 (explicar que la búsqueda trajo el tema, y que el prompt evitó el precio inventado).
4. **Extra:** la de los dos documentos.

El modelo no es 100% determinista: la redacción cambia entre corridas, pero las fuentes y las similitudes son siempre las mismas.
