-- ============================================================================
-- FASE 1 — SCHEMA INICIAL (12/09/2026)
-- ============================================================================
--
-- Define la estructura base de tablas para todo el marketplace:
-- - Perfiles de usuario (relacionado a auth.users de Supabase)
-- - Listings (anuncios de venta — la entidad central)
-- - Imágenes de listings
-- - Conversaciones (mensajería)
-- - Favoritismo
--
-- RLS (Row Level Security) está ACTIVO en todas las tablas. Las políticas
-- se escriben como comentarios aquí y se aplican manualmente o vía CLI.
-- Ver supabase/migrations/RLS_POLICIES.md para las reglas exactas.

-- ============================================================================
-- 1. TABLA: profiles (relacionada a auth.users)
-- ============================================================================
-- Almacena datos del perfil de cada usuario. Creada automáticamente vía trigger
-- cuando se registra un nuevo usuario.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Datos públicos del perfil
  display_name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Tipo de usuario: 'individual' (vendedor privado) o 'dealer' (concesionaria)
  -- Por ahora solo 'individual' se usa. 'dealer' es para futuro.
  user_type TEXT DEFAULT 'individual' CHECK (user_type IN ('individual', 'dealer')),
  
  -- Ubicación (provincia Argentina)
  province TEXT,
  city TEXT,
  
  -- Contacto público (el email real está en auth.users, esto es redundancia opcional)
  phone TEXT,
  
  -- Reputación y estadísticas (se actualizan vía triggers)
  total_listings INT DEFAULT 0,
  total_sales INT DEFAULT 0,
  avg_rating DECIMAL(3, 2),
  last_active TIMESTAMP WITH TIME ZONE,
  
  -- Flags de moderación
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_reason TEXT,
  
  -- Metadata (JSON para datos futuros sin migrar)
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);

-- Trigger: crear perfil automático cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email_verified)
  VALUES (NEW.id, NEW.email_confirmed_at IS NOT NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- ============================================================================
-- 2. TABLA: listings (anuncios de venta — TABLA CENTRAL)
-- ============================================================================
-- Cada fila es un vehículo concreto en venta. NO relacionado a VehicleModel
-- (el modelo técnico), sino a una unidad específica.

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Quién vende
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Vehículo: referencia opcional al VehicleModel del catálogo
  -- (para vincular con el comparador/fichas técnicas)
  -- Formato: slug de model (ej. "toyota-corolla-2024")
  vehicle_model_slug TEXT,
  
  -- Datos de venta (declarados por el vendedor)
  title TEXT NOT NULL, -- ej. "Toyota Corolla 2024 Automático"
  description TEXT,
  
  -- Precio (permitir "a convenir" y otros formatos)
  price_amount DECIMAL(15, 2), -- NULL si "a convenir"
  price_currency TEXT DEFAULT 'ARS', -- ARS, USD, etc
  price_display TEXT, -- texto libre: "A convenir", "$800.000", etc
  
  -- Condición del vehículo (JSON flexible para futuro)
  condition_state TEXT CHECK (condition_state IN (
    'new',           -- Nuevo
    'excellent',     -- Excelente estado
    'good',          -- Buen estado
    'fair',          -- Estado regular
    'poor',          -- Mal estado
    'restoration',   -- Para restaurar
    'project',       -- Proyecto
    'as_is',         -- Tal como está (con defectos)
    'wrecked'        -- Siniestrado/desarmado
  )),
  
  -- Specifics de vehículo (datos clave declarados por vendedor)
  year_manufacture INT,
  mileage_km INT,
  transmission TEXT, -- 'manual', 'automatic', 'cvt', 'unknown'
  fuel_type TEXT,    -- 'gasoline', 'diesel', 'hybrid', 'electric', 'other'
  
  -- Ubicación de venta
  location_province TEXT,
  location_city TEXT,
  location_address TEXT,
  
  -- Documentación (estado declarado por vendedor)
  has_full_documentation BOOLEAN,
  documentation_notes TEXT,
  
  -- Estado de publicación
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',       -- Borrador
    'published',   -- Publicado y visible
    'sold',        -- Vendido
    'removed'      -- Removido por vendedor o moderación
  )),
  
  -- Moderación
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  moderation_notes TEXT,
  
  -- Estadísticas
  view_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_vehicle_model_slug ON listings(vehicle_model_slug);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location_city ON listings(location_city);
CREATE INDEX IF NOT EXISTS idx_listings_is_flagged ON listings(is_flagged);

-- Trigger: actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_listings_updated ON listings;
CREATE TRIGGER on_listings_updated
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION public.update_listings_updated_at();

-- ============================================================================
-- 3. TABLA: listing_images (imágenes de cada listing)
-- ============================================================================
-- Almacena referencias a imágenes en Supabase Storage (no los binarios).
-- Las imágenes reales se suben a Storage vía client-side.

CREATE TABLE IF NOT EXISTS listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Path en Supabase Storage (ej. "listings/[listing-id]/[image-id].webp")
  storage_path TEXT NOT NULL,
  
  -- Metadata de imagen (width, height, tamaño, etc)
  width INT,
  height INT,
  file_size_bytes INT,
  mime_type TEXT DEFAULT 'image/webp',
  
  -- Orden de display (0 = portada)
  display_order INT DEFAULT 0,
  
  -- Control de calidad
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN (
    'pending',   -- Esperando validación
    'approved',  -- OK
    'rejected'   -- Rechazada por contenido inapropiado
  ))
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_moderation_status ON listing_images(moderation_status);

-- ============================================================================
-- 4. TABLA: conversations (mensajería privada entre comprador y vendedor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Participantes
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Última actividad
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  
  -- Estado
  is_archived BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT seller_ne_buyer CHECK (seller_id != buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Trigger: actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_conversations_updated ON conversations;
CREATE TRIGGER on_conversations_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_conversations_updated_at();

-- ============================================================================
-- 5. TABLA: conversation_messages (mensajes dentro de cada conversación)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Contenido
  content TEXT NOT NULL,
  
  -- Lectura
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender_id ON conversation_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_is_read ON conversation_messages(is_read);

-- Trigger: actualizar last_message_* en conversations cuando se añade mensaje
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = SUBSTRING(NEW.content, 1, 100)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_conversation_message_created ON conversation_messages;
CREATE TRIGGER on_conversation_message_created
  AFTER INSERT ON conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_new_message();

-- ============================================================================
-- 6. TABLA: favorites (marcadores de favoritos)
-- ============================================================================
-- Favoritos: backend real, sincroniza con localStorage en cliente.

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  
  UNIQUE(user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);

-- ============================================================================
-- FIN DE SCHEMA INICIAL
-- ============================================================================
-- Las políticas RLS se aplican en una migration separada o manualmente.
-- Ver supabase/migrations/RLS_POLICIES.md para las reglas exactas.
