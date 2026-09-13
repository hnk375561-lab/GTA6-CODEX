# FASE 1 — Cambios Exactos

**Resumen**: 8 archivos nuevos/modificados. El deploy a GitHub Pages **no cambia**.

---

## ARCHIVOS MODIFICADOS

### 1. `package.json`
- **Cambio**: Agregar `@supabase/supabase-js` a `dependencies`
- **Versión**: ^2.39.1
- **Bump de versión**: 0.1.1 → 0.1.2
- **Integración**: Copiar el `dependencies` y `devDependencies` sección entero desde el ZIP. Luego correr `npm install`

### 2. `.env.example`
- **Cambio**: Agregar 2 nuevas variables de entorno bajo comentario "FASE 1 — SUPABASE"
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Nota**: Estas son PUBLIC — están en `.env.example` para que otros desarrolladores sepan configurarlas
- **Integración**: Reemplazar el `.env.example` existente con el del ZIP

---

## ARCHIVOS NUEVOS

### 3. `src/lib/supabase/client.ts`
- **Qué es**: Cliente Supabase browser-only (client-side)
- **Contenido**: 
  - Importa `createBrowserClient` de `@supabase/ssr`
  - Lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de env
  - Exporta `supabase` (instancia del cliente)
  - Lanza error si faltan variables
- **Uso**: Importar en Client Components como `import { supabase } from '@/lib/supabase/client'`
- **Seguridad**: Es 100% browser-side. RLS de PostgreSQL asegura que cada usuario solo ve sus datos.

### 4. `supabase/migrations/001_initial_schema.sql`
- **Qué es**: Migration SQL que crea el schema completo de la DB
- **Tablas creadas**:
  - `profiles` — perfil del usuario (relacionado a auth.users)
  - `listings` — anuncios de venta (tabla central)
  - `listing_images` — imágenes de cada listing
  - `conversations` — mensajería entre comprador/vendedor
  - `conversation_messages` — mensajes dentro de conversaciones
  - `favorites` — marcadores
- **Triggers**: Automáticamente crean perfiles, actualizan timestamps, etc
- **Aplicación**: Via `supabase db push` (CLI) o copy-paste en SQL Editor (manual)

### 5. `supabase/migrations/RLS_POLICIES.md`
- **Qué es**: Documento con todas las políticas RLS (Row Level Security)
- **Por qué .md**: Para que sea legible. Los SQL están ahí listos para copy-paste
- **Contenido**:
  - 6 secciones (una por tabla)
  - Cada sección lista las políticas que esa tabla necesita
  - Ejemplo: "Profiles are public readable", "Sellers can update own listings", etc
- **Aplicación**: Copy-paste cada `CREATE POLICY` en SQL Editor, o via `supabase db push` si está en una migration `.sql` separada

### 6. `supabase/.gitignore`
- **Qué es**: .gitignore específico para la carpeta supabase
- **Contenido**: Ignora `.env.local`, logs, artifacts, etc
- **Nota**: Asegurar que no commitear secrets de Supabase

### 7. `FASE_1_SETUP.md`
- **Qué es**: Guía paso-a-paso de 20-30 minutos
- **Secciones**:
  1. Crear proyecto en Supabase (gratuito)
  2. Copiar URL y anon key
  3. Crear `.env.local` local
  4. `npm install`
  5. Crear schema SQL
  6. Aplicar RLS
  7. Verificar que todo funciona
  8. Confirmar deploy no cambió
  9. Checklist final
  10. Troubleshooting
- **Siguiente**: Después de completar esto, pasar a Fase 2

### 8. `FASE_1_CAMBIOS.md` (este archivo)
- **Qué es**: Referencia rápida de qué cambió
- **Para quién**: Para ti, para chequear que todo está integrado correctamente

---

## RUTAS EXACTAS EN EL ZIP

```
fase1-supabase.zip
├── package.json                              ← copiar a raíz
├── .env.example                              ← copiar a raíz (replace)
├── src/
│   └── lib/
│       └── supabase/
│           └── client.ts                     ← nuevo
├── supabase/
│   ├── .gitignore                            ← nuevo
│   └── migrations/
│       ├── 001_initial_schema.sql            ← nuevo
│       └── RLS_POLICIES.md                   ← nuevo
├── FASE_1_SETUP.md                           ← nuevo (raíz)
└── FASE_1_CAMBIOS.md                         ← nuevo (raíz)
```

---

## CÓMO INTEGRAR

### 1. Extraer el ZIP en la raíz de tu repo

```bash
unzip fase1-supabase.zip -d .
```

(Esto respetará la estructura de carpetas)

### 2. Revisar cambios

```bash
git status
```

Debería mostrar:
- 2 archivos modificados (`package.json`, `.env.example`)
- 6 archivos nuevos (client.ts, migration SQL, RLS doc, gitignore, 2 SETUP docs)

### 3. Instalar dependencias

```bash
npm install
```

### 4. Crear `.env.local` local (NO en el repo)

Copiar `.env.example` → `.env.local` y completar:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[tu-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-anon-key]
```

(Esto está en `.gitignore`, así que no se commitea)

### 5. Seguir FASE_1_SETUP.md

Lee el archivo completo y sigue los 7 pasos.

### 6. Commitear a tu rama

```bash
git add package.json .env.example src/supabase/ FASE_1_*.md
git commit -m "Fase 1: Supabase conectado (schema + RLS + cliente)"
git push
```

---

## QUÉ NO CAMBIÓ

- ❌ `next.config.js` — sigue siendo `output: 'export'`
- ❌ `.github/workflows/deploy-pages.yml` — sigue igual
- ❌ Todos los archivos de `src/content/`, `src/components/`, `src/app/` de hoy
- ❌ SEO, comparador, búsqueda — nada de eso se toca
- ❌ El `out/` del build sigue siendo 100% estático

**El deploy actual a GitHub Pages no se ve afectado**.

---

## DESPUÉS DE FASE 1

Una vez que Fase 1 está integrado y verificado:

- **Fase 2**: Auth + Login + RLS avanzado
- **Fase 3**: Modelo Listing con datos semilla
- **Fase 4**: Publicación de listings
- **Fase 5**: Búsqueda/discovery
- Y así...

Cada fase tendrá su propio ZIP con solo los archivos nuevos/modificados.

---

## VERIFICACIÓN RÁPIDA

Después de integrar, correr:

```bash
npm run type-check  # Debería pasar
npm run build       # Debería pasar
```

Si ambos pasan → **Fase 1 está OK**.

---

## CONTACT

Si algo no funciona:
1. Revisar FASE_1_SETUP.md → Troubleshooting
2. Verificar env vars en `.env.local`
3. Verificar que Supabase está accesible
4. Revisar que RLS se aplicó correctamente
