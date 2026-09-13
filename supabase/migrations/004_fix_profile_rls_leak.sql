-- ============================================================================
-- FASE 2 — FIX: leak de columnas privadas en `profiles` / `seller_profiles`
-- (13/09/2026)
-- ============================================================================
--
-- HALLAZGO (auditoría de continuidad de Fase 2): 003_rls_policies.sql creó,
-- para poder mostrar perfiles ajenos en cards/listings, una policy de SELECT
-- con `USING (true)` sobre la tabla base `profiles` (y su análoga en
-- `seller_profiles`). Postgres combina políticas permisivas de SELECT con
-- OR, así que esa policy por sí sola vuelve TODA la tabla — todas las
-- columnas, incluido `phone` — legible por cualquiera (anon incluido) con
-- un simple `.from('profiles').select('phone')`, sin pasar nunca por la
-- vista `public_profiles` pensada para filtrar columnas. Esto viola
-- directamente la sección 4.15 del documento maestro ("nunca exponer
-- phone/email sin acción explícita del interesado").
--
-- El comentario de 003 asumía que "el código de la app siempre usa la
-- vista" alcanzaba como garantía — no alcanza: RLS protege filas, no
-- columnas, y confiar en la disciplina del código de cliente para no pedir
-- una columna que la base te deja leer no es una garantía real de
-- seguridad (cualquier request hecho a mano con la anon key la rompe).
--
-- FIX: en vez de forzar la restricción de columnas por policy (imposible
-- en RLS puro), se vuelve a la técnica correcta para este patrón en
-- Supabase: la vista pública deja de ser `security_invoker = true` (que
-- hereda el RLS restrictivo de la tabla base y por eso "necesitaba" la
-- policy permisiva para no devolver vacío) y pasa a correr con los
-- privilegios de su dueño (comportamiento por default, sin la cláusula),
-- de forma que puede leer todas las filas para armar la proyección
-- pública — pero SOLO expone las columnas ya whitelisteadas en su
-- definición. La tabla base vuelve a exigir `auth.uid() = id` para
-- cualquier SELECT directo. Resultado: `select('phone')` directo a
-- `profiles` sigue funcionando para la propia fila, pero devuelve 0 filas
-- para cualquier otra — el único camino para ver datos de otros es la
-- vista, que no tiene `phone` en su lista de columnas.

-- ----------------------------------------------------------------------
-- 1. profiles: eliminar la policy permisiva, recrear la vista sin
--    security_invoker
-- ----------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view safe profile fields via view" ON profiles;

DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
SELECT
  id,
  display_name,
  avatar_url,
  seller_type,
  is_verified,
  total_listings,
  total_sales,
  avg_rating
FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- ----------------------------------------------------------------------
-- 2. seller_profiles: mismo fix (exponía `cuit` de la misma forma)
-- ----------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view safe seller fields via view" ON seller_profiles;

DROP VIEW IF EXISTS public_seller_profiles;
CREATE VIEW public_seller_profiles AS
SELECT user_id, business_name, verified
FROM seller_profiles;

GRANT SELECT ON public_seller_profiles TO anon, authenticated;

-- ----------------------------------------------------------------------
-- Verificación manual post-migración (SQL Editor, logueado como anon o
-- sin sesión):
--   select phone from profiles;                    -- debe devolver 0 filas
--   select * from public_profiles limit 5;          -- debe funcionar y
--                                                     -- NO tener columna phone
-- La cobertura automática de esto queda en scripts/test-rls.mjs, sección
-- nueva "8. profiles — phone nunca viaja fuera de la fila propia".
-- ============================================================================
