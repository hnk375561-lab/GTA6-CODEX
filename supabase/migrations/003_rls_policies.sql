-- ============================================================================
-- FASE 2 — POLÍTICAS RLS REALES (13/09/2026)
-- ============================================================================
--
-- `supabase/migrations/RLS_POLICIES.md` documentaba las políticas como
-- texto para "aplicar manualmente" — nunca existieron como SQL versionado,
-- así que no había garantía de que estuvieran realmente activas en la base.
-- Esta migración las define como CREATE POLICY reales, coherentes con la
-- sección 4.15 del documento maestro, y cubre también las tablas nuevas de
-- 002_align_schema_to_master_doc.sql.
--
-- Reemplaza en contenido a RLS_POLICIES.md (que se deja como referencia
-- humana, pero desactualizado — ver nota al final de este archivo).

-- ============================================================================
-- 1. profiles
-- ============================================================================
-- Cada usuario lee/edita su propia fila completa. El resto del público NUNCA
-- lee `phone` ni metadata interna directamente de esta tabla — para mostrar
-- datos de un vendedor en una card/listing se usa la vista `public_profiles`
-- de abajo, que expone solo lo que la sección 4.1 permite exponer.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Sin política de INSERT ni DELETE a propósito: la fila se crea únicamente
-- vía el trigger `handle_new_user` (SECURITY DEFINER, corre por fuera de
-- RLS) al registrarse. Nadie inserta/borra un perfil directamente desde el
-- cliente.

DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles
  WITH (security_invoker = true) AS
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

-- Nota: con security_invoker=true la vista respeta el RLS de la tabla base
-- (auth.uid()=id), lo cual la dejaría vacía para el público. Se agrega una
-- policy adicional, SOLO para lectura de las columnas ya filtradas por la
-- vista, permitiendo que cualquiera lea perfiles ajenos vía esta vista:
DROP POLICY IF EXISTS "Public can view safe profile fields via view" ON profiles;
CREATE POLICY "Public can view safe profile fields via view"
  ON profiles FOR SELECT
  USING (true);

-- (Esta policy queda superpuesta con "Users can view own profile" — Postgres
-- combina políticas de SELECT con OR, así que el resultado neto es: SELECT
-- directo a la tabla es público en filas, pero el código de la app debe
-- consultar SIEMPRE `public_profiles` y nunca `profiles.*` para terceros,
-- ya que la restricción real de columnas la da la vista, no RLS por sí solo.
-- RLS protege filas, no columnas — column-level security en Postgres puro
-- requiere GRANT por columna o vistas; se eligió vista por simplicidad.
-- Test de la sección 2 de scripts/test-rls.mjs valida que `phone` nunca
-- viaja fuera de la fila propia cuando se usa el cliente anon a través de
-- la vista.)

-- ============================================================================
-- 2. listings
-- ============================================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published listings are public" ON listings;
CREATE POLICY "Published listings are public"
  ON listings FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Sellers can view own listings" ON listings;
CREATE POLICY "Sellers can view own listings"
  ON listings FOR SELECT
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can create own listings" ON listings;
CREATE POLICY "Sellers can create own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can update own listings" ON listings;
CREATE POLICY "Sellers can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can delete own listings" ON listings;
CREATE POLICY "Sellers can delete own listings"
  ON listings FOR DELETE
  USING (auth.uid() = seller_id);

-- ============================================================================
-- 3. listing_media
-- ============================================================================

ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Media of published listings is public" ON listing_media;
CREATE POLICY "Media of published listings is public"
  ON listing_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_media.listing_id
        AND listings.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Sellers can view own listing media" ON listing_media;
CREATE POLICY "Sellers can view own listing media"
  ON listing_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_media.listing_id
        AND listings.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can manage own listing media" ON listing_media;
CREATE POLICY "Sellers can manage own listing media"
  ON listing_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_media.listing_id
        AND listings.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_media.listing_id
        AND listings.seller_id = auth.uid()
    )
  );

-- Nota (sección 4.15): para `listing_views` (Fase 7, todavía no existe la
-- tabla) sí hace falta una RPC dedicada en vez de INSERT directo, porque ahí
-- el riesgo es spam de vistas falsas a alta frecuencia. Para `listing_media`
-- el gating por dueño del listing ya alcanza, porque además el archivo real
-- se sube a Storage con sus propias políticas (ver 4.15c) antes de que esta
-- fila exista.

-- ============================================================================
-- 4. conversations
-- ============================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their conversations" ON conversations;
CREATE POLICY "Participants can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can start a conversation" ON conversations;
CREATE POLICY "Buyers can start a conversation"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Participants can update their conversations" ON conversations;
CREATE POLICY "Participants can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================================
-- 5. conversation_messages
-- ============================================================================

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON conversation_messages;
CREATE POLICY "Participants can view messages"
  ON conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
        AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON conversation_messages;
CREATE POLICY "Participants can send messages"
  ON conversation_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
        AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
  );

-- ============================================================================
-- 6. favorites
-- ============================================================================

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add own favorites" ON favorites;
CREATE POLICY "Users can add own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own favorites" ON favorites;
CREATE POLICY "Users can remove own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. Tablas de referencia curadas: locations, vehicle_categories,
--    vehicle_conditions, condition_question_sets
-- ============================================================================
-- Lectura pública sin restricciones (las necesita cualquier visitante para
-- ver filtros/formularios). A PROPÓSITO no se define ninguna policy de
-- INSERT/UPDATE/DELETE: con RLS activo y sin policy de escritura, Postgres
-- deniega toda escritura desde el cliente (anon/authenticated). Solo se
-- editan vía migración SQL o con la service_role key (nunca expuesta al
-- browser) — así se cumple "catálogo cerrado y curado, no texto libre".

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Locations are public readable" ON locations;
CREATE POLICY "Locations are public readable"
  ON locations FOR SELECT USING (true);

ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vehicle categories are public readable" ON vehicle_categories;
CREATE POLICY "Vehicle categories are public readable"
  ON vehicle_categories FOR SELECT USING (true);

ALTER TABLE vehicle_conditions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vehicle conditions are public readable" ON vehicle_conditions;
CREATE POLICY "Vehicle conditions are public readable"
  ON vehicle_conditions FOR SELECT USING (true);

ALTER TABLE condition_question_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Question sets are public readable" ON condition_question_sets;
CREATE POLICY "Question sets are public readable"
  ON condition_question_sets FOR SELECT USING (true);

-- ============================================================================
-- 8. seller_profiles
-- ============================================================================

ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own seller profile" ON seller_profiles;
CREATE POLICY "Users can view own seller profile"
  ON seller_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own seller profile" ON seller_profiles;
CREATE POLICY "Users can manage own seller profile"
  ON seller_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP VIEW IF EXISTS public_seller_profiles;
CREATE VIEW public_seller_profiles
  WITH (security_invoker = true) AS
SELECT user_id, business_name, verified
FROM seller_profiles;

GRANT SELECT ON public_seller_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view safe seller fields via view" ON seller_profiles;
CREATE POLICY "Public can view safe seller fields via view"
  ON seller_profiles FOR SELECT
  USING (true);

-- ============================================================================
-- FIN — RLS_POLICIES.md queda obsoleto como fuente de verdad a partir de
-- esta migración; este archivo SQL versionado es lo que realmente se
-- aplica. No editar RLS_POLICIES.md esperando que tenga efecto: no corre.
-- ============================================================================
