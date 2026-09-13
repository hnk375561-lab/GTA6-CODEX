-- ============================================================================
-- FASE 2 — ALINEACIÓN DEL SCHEMA AL DOCUMENTO MAESTRO, SECCIÓN 4 (13/09/2026)
-- ============================================================================
--
-- Contexto: 001_initial_schema.sql implementó una versión simplificada del
-- modelo (enum fijo `condition_state`, ubicación en texto libre, sin tablas
-- de categorías/condiciones curadas). Esto generó una divergencia real con
-- la sección 4 del documento maestro y dejó código ya escrito
-- (`src/app/test-supabase/page.tsx`, `src/app/listings/ver/page.tsx`) que
-- consulta tablas que todavía no existían (`vehicle_categories`,
-- `vehicle_conditions`, `listing_media`).
--
-- Esta migración:
--   1. Crea las tablas curadas que faltaban: locations, vehicle_categories,
--      condition_question_sets, vehicle_conditions, seller_profiles.
--   2. Extiende `listings` con las columnas del modelo de referencia
--      (category_id, condition_id, location_id, condition_details, etc.)
--      SIN borrar las columnas viejas (condition_state, location_province/
--      city/address, price_display) — quedan marcadas DEPRECATED. Se
--      pueden dropear en una migración de limpieza posterior, una vez
--      confirmado que no hay datos reales dependiendo de ellas (a la fecha
--      de esta migración la Fase 3 — carga de listings semilla — todavía
--      no arrancó, así que es muy probable que la tabla esté vacía, pero
--      no se asume: no se hace DROP acá).
--   3. Renombra `listing_images` a `listing_media` y sus columnas al
--      nombre de la sección 4.8 (storage_path -> url, display_order ->
--      position, + is_cover, + media_type), porque el código de
--      `listings/ver/page.tsx` ya fue escrito contra ese nombre.
--   4. Extiende `profiles` con los campos de la sección 4.1 que faltaban
--      (seller_type, location_id) sin romper `user_type` existente.
--
-- IMPORTANTE: esta migración es aditiva/no destructiva a propósito. No
-- corre sola en el free tier de Supabase — hay que aplicarla manualmente
-- (dashboard → SQL editor, o `supabase db push`) igual que la 001.

-- ============================================================================
-- 1. locations (sección 4.3) — catálogo cerrado, NO texto libre por vendedor
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provincia TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  UNIQUE (provincia, ciudad)
);

CREATE INDEX IF NOT EXISTS idx_locations_provincia ON locations(provincia);

-- Seed inicial: capital de cada provincia argentina, para que el selector
-- de ubicación (Fase 4, paso 5 del flujo de publicación) tenga con qué
-- arrancar. Es un punto de partida curado, no una cobertura completa —
-- se espera ir agregando ciudades a medida que haya vendedores reales de
-- esas localidades (INSERT nuevo, nunca texto libre desde el front).
INSERT INTO locations (provincia, ciudad) VALUES
  ('Buenos Aires', 'La Plata'),
  ('Buenos Aires', 'Mar del Plata'),
  ('Buenos Aires', 'Bahía Blanca'),
  ('Ciudad Autónoma de Buenos Aires', 'Buenos Aires'),
  ('Catamarca', 'San Fernando del Valle de Catamarca'),
  ('Chaco', 'Resistencia'),
  ('Chubut', 'Rawson'),
  ('Córdoba', 'Córdoba'),
  ('Corrientes', 'Corrientes'),
  ('Entre Ríos', 'Paraná'),
  ('Entre Ríos', 'Concepción del Uruguay'),
  ('Entre Ríos', 'Gualeguaychú'),
  ('Formosa', 'Formosa'),
  ('Jujuy', 'San Salvador de Jujuy'),
  ('La Pampa', 'Santa Rosa'),
  ('La Rioja', 'La Rioja'),
  ('Mendoza', 'Mendoza'),
  ('Misiones', 'Posadas'),
  ('Neuquén', 'Neuquén'),
  ('Río Negro', 'Viedma'),
  ('Salta', 'Salta'),
  ('San Juan', 'San Juan'),
  ('San Luis', 'San Luis'),
  ('Santa Cruz', 'Río Gallegos'),
  ('Santa Fe', 'Santa Fe'),
  ('Santa Fe', 'Rosario'),
  ('Santiago del Estero', 'Santiago del Estero'),
  ('Tierra del Fuego', 'Ushuaia'),
  ('Tucumán', 'San Miguel de Tucumán')
ON CONFLICT (provincia, ciudad) DO NOTHING;

-- ============================================================================
-- 2. vehicle_categories (sección 4.5) — tabla chica y curada
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO vehicle_categories (id, name, enabled) VALUES
  ('autos', 'Autos', TRUE),
  ('motos', 'Motos', TRUE),
  ('camionetas', 'Camionetas', FALSE),
  ('camiones', 'Camiones', FALSE),
  ('utilitarios', 'Utilitarios', FALSE),
  ('maquinaria-agricola', 'Maquinaria agrícola', FALSE),
  ('maquinaria-vial', 'Maquinaria vial', FALSE),
  ('motorhomes', 'Motorhomes', FALSE),
  ('nautica', 'Náutica', FALSE),
  ('otros', 'Otros', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. condition_question_sets (sección 4.6) — formularios dinámicos, jsonb
-- ============================================================================
--
-- ADVERTENCIA (ver sección 18 del documento maestro, "decisiones que
-- todavía necesitan validación"): las preguntas de abajo son un
-- PLACEHOLDER mínimo para no bloquear el desarrollo, NO la lista final.
-- El documento pide explícitamente definir el listado real con alguien
-- que conozca el mercado de usados argentino (mecánico/tasador) antes de
-- lanzar la Fase 4 a producción — no inventar una lista genérica y darla
-- por definitiva.

CREATE TABLE IF NOT EXISTS condition_question_sets (
  id TEXT PRIMARY KEY,
  questions JSONB NOT NULL DEFAULT '[]'
);

INSERT INTO condition_question_sets (id, questions) VALUES
  ('qs_ninguna', '[]'),
  ('qs_mecanica', '[
    {"key": "diagnostico", "label": "¿Se conoce el diagnóstico del problema?", "type": "text"},
    {"key": "arranca", "label": "¿El motor arranca?", "type": "boolean"}
  ]'),
  ('qs_siniestro', '[
    {"key": "tipo_siniestro", "label": "¿Qué tipo de siniestro sufrió?", "type": "text"},
    {"key": "danio_estructural", "label": "¿Tiene daño estructural/de chasis?", "type": "boolean"}
  ]'),
  ('qs_incompleto', '[
    {"key": "partes_faltantes", "label": "¿Qué partes faltan o están incompletas?", "type": "text"}
  ]'),
  ('qs_proyecto', '[
    {"key": "estado_avance", "label": "¿En qué estado de avance está el proyecto/restauración?", "type": "text"}
  ]'),
  ('qs_otro', '[
    {"key": "detalle", "label": "Contanos el detalle de la condición", "type": "text"}
  ]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. vehicle_conditions (sección 4.6) — taxonomía extensible de "cómo está"
-- ============================================================================
-- Modelada como tabla, NO como enum de Postgres (los enums son costosos de
-- extender sin migración) — coincide con el criterio del documento.

CREATE TABLE IF NOT EXISTS vehicle_conditions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('normal', 'atencion', 'grave')),
  question_set_id TEXT REFERENCES condition_question_sets(id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO vehicle_conditions (id, label, severity, question_set_id) VALUES
  ('nuevo',          'Nuevo',                  'normal',   'qs_ninguna'),
  ('usado',          'Usado',                  'normal',   'qs_ninguna'),
  ('proyecto',       'Proyecto',               'atencion', 'qs_proyecto'),
  ('restauracion',   'Para restaurar',         'atencion', 'qs_proyecto'),
  ('motor_roto',     'Motor roto',             'grave',    'qs_mecanica'),
  ('caja_rota',      'Caja rota',              'grave',    'qs_mecanica'),
  ('no_arranca',     'No arranca',             'grave',    'qs_mecanica'),
  ('chocado',        'Chocado',                'grave',    'qs_siniestro'),
  ('siniestrado',    'Siniestrado',            'grave',    'qs_siniestro'),
  ('inundado',       'Inundado',               'grave',    'qs_siniestro'),
  ('incendiado',     'Incendiado',             'grave',    'qs_siniestro'),
  ('desarmado',      'Desarmado',              'grave',    'qs_incompleto'),
  ('para_repuestos', 'Para repuestos',         'grave',    'qs_incompleto'),
  ('clasico',        'Clásico',                'normal',   'qs_ninguna'),
  ('competicion',    'Competición',            'normal',   'qs_ninguna'),
  ('otro',           'Otro',                   'atencion', 'qs_otro')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. seller_profiles (sección 4.2) — solo para vendedores no particulares
-- ============================================================================
-- Fuera del alcance funcional de la Fase 2 (el documento lo deja
-- explícitamente para después), pero se crea la tabla ahora para no tener
-- que migrar `listings.seller_id` más adelante.

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  cuit TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'))
);

-- ============================================================================
-- 6. profiles — agregar campos de la sección 4.1 que faltaban
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS seller_type TEXT NOT NULL DEFAULT 'particular'
    CHECK (seller_type IN ('particular', 'concesionaria', 'profesional', 'empresa'));

COMMENT ON COLUMN profiles.user_type IS
  'DEPRECATED: superpuesto con seller_type (sección 4.1 del doc maestro). '
  'Se mantiene por compatibilidad, no agregar nuevo código que dependa de esta columna.';

-- ============================================================================
-- 7. listings — extender al modelo de la sección 4.7
-- ============================================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES vehicle_categories(id),
  ADD COLUMN IF NOT EXISTS condition_id TEXT REFERENCES vehicle_conditions(id),
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id),
  ADD COLUMN IF NOT EXISTS condition_details JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed'
    CHECK (price_type IN ('fixed', 'negotiable', 'on_request')),
  ADD COLUMN IF NOT EXISTS accepts_trade BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepts_financing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_title BOOLEAN,
  ADD COLUMN IF NOT EXISTS title_status TEXT,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_condition_id ON listings(condition_id);
CREATE INDEX IF NOT EXISTS idx_listings_location_id ON listings(location_id);
CREATE INDEX IF NOT EXISTS idx_listings_status_category_location
  ON listings(status, category_id, location_id);

-- Columnas viejas, marcadas deprecated (NO se borran en esta migración —
-- ver nota al principio del archivo). Dropear en una migración aparte una
-- vez confirmado que Fase 3/4 ya solo escriben en las columnas nuevas.
COMMENT ON COLUMN listings.condition_state IS
  'DEPRECATED: reemplazado por condition_id -> vehicle_conditions. No usar en código nuevo.';
COMMENT ON COLUMN listings.location_province IS
  'DEPRECATED: reemplazado por location_id -> locations (catálogo curado). No usar en código nuevo.';
COMMENT ON COLUMN listings.location_city IS
  'DEPRECATED: reemplazado por location_id -> locations. No usar en código nuevo.';
COMMENT ON COLUMN listings.price_display IS
  'DEPRECATED: reemplazado por price_amount + price_currency + price_type. No usar en código nuevo.';

-- Full-text search sobre título/descripción/marca/modelo (sección 4.7 y 7)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_listings_search_vector ON listings USING GIN (search_vector);

-- ============================================================================
-- 8. listing_images -> listing_media (sección 4.8)
-- ============================================================================
-- El código de src/app/listings/ver/page.tsx ya fue escrito contra el
-- nombre `listing_media` y columnas `url`/`position`/`is_cover` — se
-- renombra la tabla existente en vez de crear una paralela, para no
-- perder las filas que ya pueda haber.

ALTER TABLE IF EXISTS listing_images RENAME TO listing_media;

ALTER TABLE listing_media RENAME COLUMN storage_path TO url;
ALTER TABLE listing_media RENAME COLUMN display_order TO position;

ALTER TABLE listing_media
  ADD COLUMN IF NOT EXISTS is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

-- Backfill: la primera foto (position = 0) de cada listing pasa a ser cover,
-- si es que había filas cargadas antes de esta migración.
UPDATE listing_media m
SET is_cover = TRUE
WHERE m.position = 0
  AND NOT EXISTS (
    SELECT 1 FROM listing_media m2
    WHERE m2.listing_id = m.listing_id AND m2.is_cover = TRUE
  );

COMMENT ON COLUMN listing_media.url IS
  'URL pública (o firmada) completa del archivo en Supabase Storage, no un path crudo — así la usa listings/ver/page.tsx directamente en <img src>.';

-- ============================================================================
-- FIN DE LA MIGRACIÓN 002
-- ============================================================================
-- Las políticas RLS de las tablas nuevas/renombradas se definen en
-- 003_rls_policies.sql (SQL real, no solo markdown documentado).
