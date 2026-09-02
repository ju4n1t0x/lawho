-- 001-init.sql
-- Initial schema for the DB-backed blog and login-only auth.
-- Run with: psql "$DATABASE_URL" -f migrations/001-init.sql

-- citext enables case-insensitive email comparison.
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id serial PRIMARY KEY,
  email citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'writer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- token is UNIQUE (already indexed by the unique constraint); index the FK for lookups.
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE notes (
  id serial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL,
  body text NOT NULL,
  image_url text NOT NULL,
  date date NOT NULL,
  draft boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT true,
  author text,
  tag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed note: mirrors the retired src/content/notes/primer-operativo-2024.md so the
-- blog index renders content on first deploy. image_url points at the public origin.
INSERT INTO notes (slug, title, subtitle, body, image_url, date, draft, featured, author, tag) VALUES (
  'primer-operativo-2024',
  'Primer operativo de salud en el Chaco Salteño',
  'El nacimiento de una red de salud comunitaria junto a las comunidades wichí',
  $$En junio de 2024 salimos al terreno por primera vez. Un equipo de médicas, médicos y voluntarios de la Asociación Civil LaWho viajó al Chaco Salteño para acompañar a las comunidades wichí, chorote, chulupí y toba con un objetivo simple: llevar salud donde más se necesita y aprender, codo a codo, de quienes viven allí.

Durante seis días montamos puestos sanitarios itinerantes y realizamos controles pediátricos, atención clínica general y estudios complementarios. La Dra. Elizabeth Macedo coordinó cada jornada junto a los referentes de cada comunidad, priorizando a niñas, niños y adultos mayores, y dejando registro de cada consulta para poder dar continuidad al seguimiento.

No fue solo asistencia: fue el inicio de un vínculo. Compartimos talleres de prevención, charlas sobre nutrición e higiene, y escuchamos de primera mano las necesidades de cada paraje. Esas conversaciones son hoy la base sobre la que proyectamos cada nuevo operativo.

Volvimos con más preguntas que respuestas y con la certeza de que esto recién empieza. Gracias a cada voluntario, a cada familia que abrió sus puertas y a quienes donan para que la salud llegue al monte.$$,
  '/uploads/notes/primer-operativo-2024/primer-operativo-2024.jpg',
  '2024-06-15',
  false,
  true,
  'Equipo LaWho',
  'Salud comunitaria'
);
