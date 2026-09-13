# FASE 1 — Setup Automatizado (Completamente)

**Estado**: ✅ Todas las credenciales ya están configuradas. Solo requiere 3 pasos manuales.

---

## ✅ QUÉ YA ESTÁ HECHO

- ✅ `package.json` actualizado con `@supabase/supabase-js`
- ✅ `.env.local` creado con credenciales de Supabase
- ✅ `npm install` ejecutado — todas las dependencias instaladas
- ✅ Scripts de setup creados (`setup:supabase`, `setup:rls`)
- ✅ Cliente Supabase en `src/lib/supabase/client.ts`
- ✅ Schema SQL en `supabase/migrations/001_initial_schema.sql`
- ✅ Políticas RLS en `supabase/migrations/RLS_POLICIES.md`

**Por lo tanto**: Solo necesitas aplicar el schema SQL y las políticas RLS.

---

## 🎯 3 PASOS FINALES (5-10 minutos)

### PASO 1: Verificar que todo esté en tu máquina local

```bash
git pull origin main
# Debería tener: .env.local, scripts/setup-*.mjs, archivos de Fase 1
```

### PASO 2: Aplicar el Schema SQL (UNA de estas opciones)

#### Opción A: Via Supabase Dashboard (MÁS FÁCIL - 2 min)

1. Ir a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. **SQL Editor** → **Crear Query Nueva**
4. Abre en tu editor: `supabase/migrations/001_initial_schema.sql`
5. **Copia TODO** el contenido (Ctrl+A en el archivo)
6. **Pega** en SQL Editor de Supabase
7. Click en **"Run"**

**Resultado esperado**: Las 6 tablas se crean sin errores.

#### Opción B: Via Supabase CLI (RECOMENDADO si tienes CLI instalado)

```bash
npm install -g @supabase/cli@latest

# Link tu proyecto
supabase link --project-ref zqkjdhiwgxjhatpntixq

# Push el schema
supabase db push
```

#### Opción C: Via psql (si tienes PostgreSQL instalado)

1. En Supabase Dashboard → **Settings → Database → Connection Pooling**
2. Copiar la **Connection string** (elige "psql" en el dropdown)
3. En terminal:
   ```bash
   psql "YOUR_CONNECTION_STRING" < supabase/migrations/001_initial_schema.sql
   ```

---

### PASO 3: Aplicar Políticas RLS

#### Opción A: Via Dashboard (RECOMENDADO)

1. Vuelve a **SQL Editor** en Supabase Dashboard
2. Abre `supabase/migrations/RLS_POLICIES.md` en tu editor
3. **Copia la primera política**:
   ```sql
   CREATE POLICY "Profiles are public readable"
     ON profiles FOR SELECT USING (true);
   ```
4. Pega en SQL Editor de Supabase y **Run**
5. **Repite para cada bloque `CREATE POLICY`** (~15-20 políticas)

#### Opción B: Via CLI (más rápido si tienes CLI)

```bash
# Las políticas ya están en migration format
supabase migration new apply_rls_policies
# Copia el contenido de RLS_POLICIES.md

supabase db push
```

---

## ✅ VERIFICAR QUE TODO FUNCIONA

### 1. Verificar que RLS está activado

En SQL Editor de Supabase, ejecuta:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Esperado**: Todas las filas muestran `rowsecurity = true`.

### 2. Verificar que el cliente Supabase funciona

En la raíz del repo:

```bash
npm run type-check   # Debería pasar sin errores
npm run build        # Debería compilar el sitio
```

### 3. Test final (opcional)

```bash
npm run setup:supabase
```

Esto intenta conectarse a Supabase y verifica que `.env.local` está correctamente configurado.

---

## 🎉 FASE 1 COMPLETADA

Una vez que verificaste todo:

```bash
git pull origin main  # Por si hay cambios
npm install
npm run build
```

**Ya está todo listo para Fase 2**: Auth + Login + componentes client-side reales.

---

## 📊 ESTADO DE LAS TABLAS CREADAS

```
profiles              ← Datos de usuario (relacionado a auth.users)
listings              ← Anuncios de venta (tabla central del marketplace)
listing_images        ← Fotos de cada listing
conversations         ← Hilos de mensajería comprador-vendedor
conversation_messages ← Mensajes dentro de cada conversación
favorites             ← Marcadores de favoritos
```

Cada tabla tiene:
- ✅ Índices para queries rápidas
- ✅ Triggers para actualizar timestamps automáticamente
- ✅ Row Level Security (RLS) activado
- ✅ Políticas de seguridad aplicadas

---

## ⚠️ TROUBLESHOOTING

### "Error: relation 'profiles' does not exist"

→ El schema SQL no se aplicó. Vuelve a **PASO 2** y asegúrate de que el SQL Editor mostró **"Success"**.

### "permission denied for schema public" al INSERT

→ Las políticas RLS se rechazaron. Verifica que aplicaste **todas** las políticas de `RLS_POLICIES.md`.

### ".env.local no existe"

→ Ya debe estar en el repo después de `git pull`. Si no está, créalo:

```bash
echo 'NEXT_PUBLIC_SUPABASE_URL=https://zqkjdhiwgxjhatpntixq.supabase.co' > .env.local
echo 'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxa2pkaGl3Z3hqaGF0cG50aXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNjEzMDEsImV4cCI6MjEwNDgzNzMwMX0.TBXDy5VC25DqgXEiuJZGR33ibyChPlDwxXcInpIvhWA' >> .env.local
```

### "Module not found: @supabase/supabase-js"

→ Ejecuta: `npm install`

---

## 📞 SIGUIENTE FASE

Cuando Fase 1 esté completada y verificada:

**Fase 2**: Auth + Login + Signup
- Crear componentes de autenticación
- Hooks de usuario
- Persistencia de sesión
- RLS mejorado con `auth.uid()`

---

## ✨ RESUMEN

| Paso | Qué | Duración |
|------|-----|----------|
| 1 | Git pull | 1 min |
| 2 | Aplicar Schema SQL | 2 min |
| 3 | Aplicar Políticas RLS | 3-5 min |
| 4 | Verificar | 2 min |
| **Total** | | **8-10 min** |

---

**¡Listo! A continuación, Fase 2.** 🚀
