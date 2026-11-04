// Similitud coseno: 1 si apuntan para el mismo lado, 0 si son perpendiculares.
// Se usa solo para verificar que Postgres calcula lo mismo (verificar-sql.mjs).
export function coseno(a, b) {
  let punto = 0, normaA = 0, normaB = 0;
  for (let i = 0; i < a.length; i++) {
    punto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  return punto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}
