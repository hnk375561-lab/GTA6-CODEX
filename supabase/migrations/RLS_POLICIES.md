# RLS Policies (Row Level Security) — Fase 1

> ⚠️ **OBSOLETO desde el 13/09/2026.** Este documento era texto sin aplicar,
> no SQL versionado — no había garantía de que estas políticas existieran
> realmente en la base. Las políticas reales, correctas y completas
> (incluidas las tablas nuevas de la Fase 2: `locations`,
> `vehicle_categories`, `vehicle_conditions`, `condition_question_sets`,
> `seller_profiles`) están en
> `supabase/migrations/003_rls_policies.sql`. Ese archivo es la fuente de
> verdad — aplicalo con `supabase db push` o pegándolo en el SQL Editor del
> dashboard, en orden, después de `002_align_schema_to_master_doc.sql`.
> Se deja este `.md` como referencia histórica, no lo edites esperando que
> tenga efecto.

**Aplicar manualmente en Supabase Dashboard o vía `supabase db push`**

Todas las tablas tienen RLS **ACTIVADO**. Las políticas definen qué cada usuario puede ver/modificar.

---

## 1. TABLA: profiles

### Regla: Lectura pública (perfiles son visibles)
```sql
CREATE POLICY "Profiles are public readable"
  ON profiles FOR SELECT USING (true);
```

### Regla: Solo el usuario puede editar su propio perfil
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### Regla: Solo el usuario puede borrar su propio perfil
```sql
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE USING (auth.uid() = id);
```

### Regla: Solo el usuario autenticado puede insertar SU PROPIO perfil
```sql
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

---

## 2. TABLA: listings

### Regla: Listings publicados son públicamente visibles
```sql
CREATE POLICY "Published listings are public"
  ON listings FOR SELECT
  USING (status = 'published');
```

### Regla: El dueño puede ver todos sus listings (borrador, publicados, etc)
```sql
CREATE POLICY "Sellers can view own listings"
  ON listings FOR SELECT
  USING (auth.uid() = seller_id);
```

### Regla: Solo el dueño puede insertar un listing
```sql
CREATE POLICY "Sellers can create own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);
```

### Regla: Solo el dueño puede editar su listing
```sql
CREATE POLICY "Sellers can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = seller_id);
```

### Regla: Solo el dueño puede borrar su listing
```sql
CREATE POLICY "Sellers can delete own listings"
  ON listings FOR DELETE
  USING (auth.uid() = seller_id);
```

---

## 3. TABLA: listing_images

### Regla: Imágenes de listings publicados son públicamente visibles
```sql
CREATE POLICY "Images of published listings are public"
  ON listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.status = 'published'
    )
  );
```

### Regla: El dueño del listing puede ver sus imágenes (borrador o no)
```sql
CREATE POLICY "Sellers can view own listing images"
  ON listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );
```

### Regla: Solo el dueño del listing puede insertar imágenes
```sql
CREATE POLICY "Sellers can upload images to own listings"
  ON listing_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );
```

### Regla: Solo el dueño puede borrar imágenes del listing
```sql
CREATE POLICY "Sellers can delete own listing images"
  ON listing_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.seller_id = auth.uid()
    )
  );
```

---

## 4. TABLA: conversations

### Regla: Solo los participantes (comprador o vendedor) pueden ver conversaciones
```sql
CREATE POLICY "Users can view conversations they're part of"
  ON conversations FOR SELECT
  USING (auth.uid() IN (seller_id, buyer_id));
```

### Regla: Solo el comprador puede iniciar una conversación
```sql
CREATE POLICY "Buyers can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);
```

### Regla: Solo los participantes pueden actualizar (archivar, etc)
```sql
CREATE POLICY "Users can update conversations they're part of"
  ON conversations FOR UPDATE
  USING (auth.uid() IN (seller_id, buyer_id));
```

---

## 5. TABLA: conversation_messages

### Regla: Solo los participantes de la conversación pueden ver mensajes
```sql
CREATE POLICY "Users can view messages in their conversations"
  ON conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_messages.conversation_id
      AND (conversations.seller_id = auth.uid() OR conversations.buyer_id = auth.uid())
    )
  );
```

### Regla: Solo los participantes pueden insertar mensajes
```sql
CREATE POLICY "Users can insert messages in their conversations"
  ON conversation_messages FOR INSERT
  WITH CHECK (
    (
      sender_id = auth.uid()
    )
    AND
    (
      EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.id = conversation_messages.conversation_id
        AND (conversations.seller_id = auth.uid() OR conversations.buyer_id = auth.uid())
      )
    )
  );
```

### Regla: Solo el autor puede editar su propio mensaje
```sql
CREATE POLICY "Users can update own messages"
  ON conversation_messages FOR UPDATE
  USING (auth.uid() = sender_id);
```

---

## 6. TABLA: favorites

### Regla: Cada usuario puede ver solo sus propios favoritos
```sql
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);
```

### Regla: Cada usuario puede insertar sus propios favoritos
```sql
CREATE POLICY "Users can add to own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Regla: Cada usuario puede eliminar sus propios favoritos
```sql
CREATE POLICY "Users can remove own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);
```

---

## APLICAR EN SUPABASE

### Opción 1: Dashboard (manual)
1. Entrar a https://supabase.com
2. Ir a tu proyecto
3. SQL Editor → New Query
4. Copiar cada `CREATE POLICY` arriba
5. Run

### Opción 2: CLI (recomendado)
```bash
supabase db push
```
(Requiere tener los archivos de migrations en `supabase/migrations/`)

---

## VERIFICAR QUE RLS ESTÁ ACTIVADO

En SQL Editor, ejecutar:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Debería mostrar `rowsecurity = true` en todas las tablas.

---

## SEGURIDAD: NOTAS IMPORTANTES

- **NO guardar secrets en RLS**: Las políticas ven solo el `auth.uid()` del usuario actual
- **RLS es la ÚNICA línea de defensa**: Sin RLS, cualquiera con la anon key podría leer/escribir todo
- **Testar RLS**: Crear dos usuarios de test, intentar que uno lea los datos del otro — debe fallar
- **Auditoría**: PostgreSQL registra todas las operaciones en `audit.recorded_audit_log` si está activado (opcional, futura fase)
