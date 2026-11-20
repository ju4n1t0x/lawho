-- 002-seed-terreno.sql
-- Seed 3-4 featured notes for the Terreno carousel.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- Run with: psql "$DATABASE_URL" -f migrations/002-seed-terreno.sql

INSERT INTO notes (slug, title, subtitle, body, image_url, date, draft, featured, author, tag) VALUES
(
  'segundo-operativo-2024',
  'Segundo operativo en Embarcacion',
  'Jornadas de salud integral en la comunidad guarani de Embarcacion',
  $$En septiembre de 2024 volvimos al terreno, esta vez a la comunidad guarani de Embarcacion, provincia de Salta. El equipo de LaWho conformo jornadas de salud integral con controles pediatricos, ginecologicos y atencion clinica general.

Cada jornada comenzo con una reunion con los referentes comunitarios para priorizar las necesidades del dia. Se realizaron mas de 80 consultas en tres jornadas, y se entregaron kits de higiene y material educativo.

La experiencia reforzo la importancia de trabajar con las comunidades, no para ellas. Escuchar, aprender y acompanar es el camino.$$,
  '/uploads/notes/segundo-operativo-2024/segundo-operativo-2024.jpg',
  '2024-09-20',
  false,
  true,
  'Equipo LaWho',
  'Salud comunitaria'
),
(
  'jornada-nutricion-2025',
  'Jornada de nutricion en Tartagal',
  'Abordaje interdisciplinario de la desnutricion infantil en el Chaco Salteno',
  $$En marzo de 2025 organizamos una jornada especializada en nutricion infantil en Tartagal. El equipo incluyo pediatras, nutricionistas y trabajadores sociales que evaluaron el estado nutricional de mas de 60 ninos y ninas.

Se identificaron casos de desnutricion moderada y se establecieron planes de seguimiento individual. Las familias recibieron capacitacion sobre alimentacion con recursos locales y acceso a huertas comunitarias.

Este operativo marco un antes: la salud no se limita a la clinica, abarca lo que comes, lo que tienes y lo que puedes.$$,
  '/uploads/notes/jornada-nutricion-2025/jornada-nutricion-2025.jpg',
  '2025-03-10',
  false,
  true,
  'Equipo LaWho',
  'Nutricion'
),
(
  'cronica-primera-red',
  'La primera red de salud comunitaria',
  'Como nacio la idea de construir una red de salud que trascienda los operativos',
  $$Mucho antes del primer operativo, la idea de una red de salud comunitaria ya germinaba. La Dra. Elizabeth Macedo y un grupo de voluntarios se preguntaban: como hacemos para que la salud no dependa de un evento anual?

La respuesta fue construir vinculos permanentes con las comunidades, formar promotores de salud locales y establecer un sistema de seguimiento que trascienda cada jornada de campo.

Hoy esa red se materializa en cada llamado de un referente comunitario, en cada reporte mensual y en cada plan que construimos juntos.$$,
  '/uploads/notes/cronica-primera-red/cronica-primera-red.jpg',
  '2025-06-01',
  false,
  true,
  'Dra. Elizabeth Macedo',
  'Cronica'
),
(
  'busqueda-de-soluciones',
  'Busqueda de soluciones locales',
  'Talleres participativos para identificar las necesidades reales del terreno',
  $$Los talleres participativos se convirtieron en una herramienta fundamental para nuestro trabajo. En cada comunidad, organizamos mesas de trabajo donde los vecinos definen sus prioridades de salud.

El proceso comienza con una escucha activa: cada familia comparte sus experiencias, sus miedos y sus esperanzas. A partir de ahi, el equipo de LaWho diseña jornadas adaptadas a cada contexto, con controles preventivos, talleres de nutricion y espacios de formacion de promotores.

Este enfoque demuestra que las soluciones mas efectivas nacen del dialogo con las comunidades.$$,
  '/uploads/notes/busqueda-de-soluciones/busqueda-de-soluciones.jpg',
  '2025-07-15',
  false,
  true,
  'Equipo LaWho',
  'Talleres'
)
ON CONFLICT (slug) DO NOTHING;
