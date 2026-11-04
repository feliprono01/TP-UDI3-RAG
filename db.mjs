// La conexión a Postgres. Un "pool" reutiliza conexiones abiertas.
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL en el .env. ¿Corriste node con --env-file=.env?");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Los valores viajan aparte, como $1, $2... (nunca pegados en el texto de la consulta).
export const consulta = (sql, valores = []) => pool.query(sql, valores);
export const cerrar = () => pool.end();
