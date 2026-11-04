-- La tabla donde viven los fragmentos. Se puede correr todas las veces que quieras:
-- el DROP la borra y arranca de cero.
CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS fragmentos;

CREATE TABLE fragmentos (
  id        SERIAL PRIMARY KEY,
  fuente    TEXT NOT NULL,        -- el archivo
  seccion   TEXT,                 -- la parte del archivo (puede ser null)
  posicion  INT  NOT NULL,        -- el orden dentro del archivo
  texto     TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL -- 1024 = lo que devuelve bge-m3. Tiene que coincidir con DIMENSIONES del .env
);

-- Índice para buscar por cercanía sin comparar contra todos (distancia coseno).
CREATE INDEX ON fragmentos USING hnsw (embedding vector_cosine_ops);
