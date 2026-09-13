-- ============================================================================
-- FASE 3 — Modelo Listing con datos semilla: columnas faltantes +
-- vehicle_models (13/09/2026)
-- ============================================================================
--
-- HALLAZGO al arrancar Fase 3: `src/app/listings/ver/page.tsx` ya estaba
-- escrito (de una sesión anterior) contra columnas `brand`, `model`,
-- `version`, `year` en `listings` — pero 001/002 nunca las crearon. 001
-- solo tiene `year_manufacture` (nombre viejo, sección 4.7 del doc maestro
-- pide `year`). El SELECT * de esa página no explota porque Postgres
-- simplemente no devuelve esas keys, pero el dato nunca se muestra: brand/
-- model/version/year quedaban mudos en cualquier listing.
--
-- Tampoco existía `vehicle_models` (sección 4.4): el espejo de lectura de
-- `src/content/vehiculos/*.json` que permite que `listings.vehicle_model_slug`
-- tenga una FK real y que la página de un listing pueda linkear de vuelta a
-- la ficha técnica del modelo. Sin esta tabla, "vehicle_model_slug" era un
-- TEXT suelto sin ninguna garantía de integridad.

-- ----------------------------------------------------------------------
-- 1. listings — columnas de la sección 4.7 que faltaban
-- ----------------------------------------------------------------------

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT,
  ADD COLUMN IF NOT EXISTS year INT;

COMMENT ON COLUMN listings.year_manufacture IS
  'DEPRECATED: reemplazado por `year` (sección 4.7 del doc maestro). No usar en código nuevo.';
COMMENT ON COLUMN listings.brand IS
  'Texto libre declarado por el vendedor, INDEPENDIENTE de vehicle_model_slug (sección 4.7) — un vehículo sin match exacto en el catálogo no pierde este dato.';

-- ----------------------------------------------------------------------
-- 2. vehicle_models (sección 4.4) — espejo liviano de
--    src/content/vehiculos/*.json. Fuente de verdad sigue siendo el JSON
--    en Git; esta tabla es solo índice de lectura para poder hacer JOIN
--    desde listings. Se puebla vía `npm run sync:vehicle-models`
--    (service_role, nunca desde el cliente) — nunca se edita a mano.
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicle_models (
  slug TEXT PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  title TEXT NOT NULL,
  class TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicle models are public readable" ON vehicle_models;
CREATE POLICY "Vehicle models are public readable"
  ON vehicle_models FOR SELECT USING (true);

-- A propósito, sin policy de INSERT/UPDATE/DELETE: con RLS activo y sin
-- policy de escritura, el cliente (anon/authenticated) no puede escribir
-- nada acá. El script de sync usa la service_role key, que bypassea RLS
-- por diseño de Supabase — mismo patrón que las tablas de referencia
-- curadas en 003_rls_policies.sql.

-- ----------------------------------------------------------------------
-- 3. listings.vehicle_model_slug — FK real ahora que la tabla existe
-- ----------------------------------------------------------------------
-- OPCIONAL a propósito (sección 4.7: "puede o no estar asociado a un
-- VehicleModel"). Se agrega DESPUÉS de crear vehicle_models y ANTES de
-- cargar listings semilla, así la FK ya protege los datos de prueba desde
-- el arranque: un INSERT/UPDATE con un slug que no existe en
-- vehicle_models es rechazado por Postgres, no queda un dato inconsistente
-- silencioso. `ON DELETE SET NULL` cubre el otro sentido: si un modelo se
-- renombra/borra del catálogo (`sync-vehicle-models.mjs` lo saca del
-- espejo), los listings que lo referenciaban pasan a null automáticamente
-- en vez de romper el sync — quedan como "sin match", que es un estado
-- válido, no un error.

-- (El índice sobre esta columna ya existe desde 001_initial_schema.sql:
-- idx_listings_vehicle_model_slug — no se duplica acá.)

ALTER TABLE listings
  ADD CONSTRAINT fk_listings_vehicle_model_slug
  FOREIGN KEY (vehicle_model_slug) REFERENCES vehicle_models(slug)
  ON DELETE SET NULL;
