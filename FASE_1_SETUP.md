# FASE 1 — Supabase Conectado (Setup Guía Completa)

**Objetivo**: Tener Supabase conectado y funcionando sin afectar el deploy actual.

**Duración estimada**: 20-30 minutos

---

## PASO 1: Crear Proyecto en Supabase (5 min)

1. Ir a https://supabase.com y registrarse (gratis)
2. Crear un nuevo proyecto:
   - **Name**: Sin Frenos (o lo que quieras)
   - **Database Password**: Guardar en lugar seguro (no se puede recuperar)
   - **Region**: Preferencia Argentina o Sur América (para latencia)
3. Esperar a que el proyecto se cree (~2 minutos)
4. Ir a **Settings → API**
5. Copiar:
   - **Project URL** (https://[PROJECT_ID].supabase.co)
   - **Anon Key** (la que dice "PUBLIC")

---

## PASO 2: Configurar Variables de Entorno Local (2 min)

1. En la raíz de tu repo, crear `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[TU_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU_ANON_KEY]
```

⚠️ **IMPORTANTE**:
- `.env.local` es LOCAL — NO ir a GitHub
- Ya está en `.gitignore`, pero verificá

---

## PASO 3: Instalar Dependencia (2 min)

```bash
npm install
```

(Ya está en el package.json modificado)

---

## PASO 4: Crear El Schema en Supabase (5 min)

### Opción A: Via CLI (recomendado si tenés supabase CLI instalado)

```bash
npm install -g @supabase/cli
supabase login
supabase link --project-ref [TU_PROJECT_ID]
supabase db push
```

### Opción B: Via Dashboard (manual, sin CLI)

1. En Supabase Dashboard → **SQL Editor**
2. Crear Query nueva
3. Copiar TODO el contenido de `supabase/migrations/001_initial_schema.sql`
4. Pegar y **Run**

**Verificar que creó las tablas**: Ir a **Database → Tables** — debería listar:
- profiles
- listings
- listing_images
- conversations
- conversation_messages
- favorites

---

## PASO 5: Aplicar Políticas RLS (Row Level Security) (10 min)

⚠️ **CRÍTICO**: Sin RLS, cualquiera con la anon key podría leer/escribir todo.

### Opción A: Via CLI

Si ya corriste `supabase db push` arriba, RLS se debería haber aplicado automáticamente (si está en una migration separada).

**Si no**:

```bash
# Crear migration nueva para RLS
supabase migration new add_rls_policies

# Copiar contenido de supabase/migrations/RLS_POLICIES.md
# en los SQL de la migration y hacer push
supabase db push
```

### Opción B: Via Dashboard (manual)

1. Dashboard → **SQL Editor**
2. Crear Query nueva
3. Copiar cada política de `supabase/migrations/RLS_POLICIES.md`
4. Run cada una

### Verificar RLS está activado

En SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todas las filas deben tener `rowsecurity = true`.

---

## PASO 6: Verificar Que Todo Funciona (3 min)

### 1. Node / TypeScript compila

```bash
npm run type-check
```

Debería pasar sin errores.

### 2. Test básico de cliente Supabase

Crear archivo temporal: `test-supabase.mjs` en la raíz:

```javascript
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('❌ Faltan env vars')
  process.exit(1)
}

const supabase = createClient(url, key)
console.log('✅ Cliente Supabase inicializado')

// Test de conexión
const { data, error } = await supabase.from('profiles').select('count(*)', { count: 'exact' })
if (error) {
  console.error('❌ Error de conexión:', error.message)
  process.exit(1)
}
console.log('✅ Conexión a DB OK')
```

Correr:

```bash
node test-supabase.mjs
```

Debería mostrar:
```
✅ Cliente Supabase inicializado
✅ Conexión a DB OK
```

### 3. Build sin tocar deploy

```bash
npm run build
```

Debería compilar sin errores. El `out/` sigue siendo 100% estático.

---

## PASO 7: Verificar Que El Deploy Sigue Igual (1 min)

- El `next.config.js` **NO cambió** → `output: 'export'` sigue igual
- El workflow de GitHub Pages **NO cambió**
- `npm run build && npm run start` sigue generando un sitio estático

**Confirmar**: 
- Hacer un push a una rama de feature
- Verificar que GitHub Actions corre el deploy-pages workflow normalmente
- Sitio sigue accesible en GitHub Pages (o tu dominio)

---

## CHECKLIST FINAL

- [ ] Proyecto creado en Supabase
- [ ] `.env.local` configurado con URL y anon key
- [ ] `npm install` ejecutado
- [ ] Schema SQL aplicado (001_initial_schema.sql)
- [ ] Políticas RLS aplicadas (RLS_POLICIES.md)
- [ ] `npm run type-check` pasa
- [ ] Test de cliente Supabase pasa
- [ ] `npm run build` pasa
- [ ] Deploy a GitHub Pages sigue funcionando igual

---

## PRÓXIMOS PASOS (Fase 2)

Una vez que Fase 1 está confirmada:

1. **Fase 2**: Auth + RLS + primeros componentes de login
2. **Fase 3**: Modelo Listing con datos semilla (solo lectura)
3. Y así sucesivamente...

---

## TROUBLESHOOTING

### "❌ Missing Supabase environment variables"

**Solución**: `.env.local` no está en la raíz o falta alguna variable. Verificar:

```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Si están vacíos → copiar de Supabase Settings → API y guardar en `.env.local`.

### "❌ Error de conexión a DB"

**Solución posibles**:
- URL o anon key está mal copiada
- RLS está rechazando la lectura (sin RLS, debería dejar leer públicamente)
- DB no creó las tablas — verificar `supabase/migrations/001_initial_schema.sql` se ejecutó

### "Deploy sigue igual pero... ¿funciona realmente Supabase?"

**Test real**: En Fase 2 crearemos el primer componente client-side que lee de Supabase. Por ahora, Fase 1 es solo infraestructura.

---

## PREGUNTAS FRECUENTES

**P: ¿Puedo hacer rollback si algo sale mal?**
R: Sí. Supabase te deja hacer rollback de migrations. En Dashboard → Migrations → Rollback. O eliminar el proyecto y crear uno nuevo.

**P: ¿La anon key es realmente segura?**
R: Sí. Es pública por diseño. La seguridad real vive en **RLS** — sin RLS estaría inseguro, pero con RLS correctas, un usuario solo puede acceder a sus datos y a datos públicos.

**P: ¿Y si hay mucho tráfico?**
R: Plan gratuito de Supabase soporta bastante. El límite se verá primero en almacenamiento (500MB inicial) o egress (5GB). Eso es tema de Fase 15 cuando tenga éxito. No ahora.

**P: ¿Qué pasa si Supabase se cae?**
R: El sitio sigue sirviendo (GitHub Pages no depende de Supabase). Los features del marketplace no funcionarían, pero el catálogo técnico + comparador siguen vivos.

---

## CONTACTO Y DOCS

- Supabase Docs: https://supabase.com/docs
- Tu Proyecto: https://supabase.com/dashboard/projects
- CLI Ref: https://supabase.com/docs/guides/cli/getting-started
