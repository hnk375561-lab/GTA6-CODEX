#!/usr/bin/env node

/**
 * Sync `src/content/vehiculos/*.json` -> tabla `vehicle_models` (sección
 * 4.4 del doc maestro). Fuente de verdad sigue siendo el JSON en Git —
 * esto es solo un espejo de lectura para poder hacer JOIN desde
 * `listings.vehicle_model_slug`. Se corre a mano cuando cambia el
 * catálogo (o vía Action en un futuro), NUNCA se edita `vehicle_models`
 * directo en la base.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Settings → API → service_role — SECRETA,
 *                                nunca con prefijo NEXT_PUBLIC_, nunca
 *                                committeada, nunca usada en código de
 *                                cliente. Necesaria acá porque
 *                                `vehicle_models` no tiene policy de
 *                                escritura para anon/authenticated a
 *                                propósito — ver 005_listings_vehicle_model_fields.sql)
 *
 * Uso: npm run sync:vehicle-models
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(rootDir, '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim()
  }
  return env
}

const fileEnv = loadEnvLocal()
const env = (key) => process.env[key] ?? fileEnv[key]

const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('⏭️  sync:vehicle-models SALTEADO — faltan variables en .env.local')
  console.log('   Necesita NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(0)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const vehiculosDir = path.join(rootDir, 'src/content/vehiculos')
const files = fs.readdirSync(vehiculosDir).filter((f) => f.endsWith('.json'))

console.log(`🔄 Sincronizando ${files.length} fichas de src/content/vehiculos/ → vehicle_models\n`)

const rows = []
for (const file of files) {
  const raw = fs.readFileSync(path.join(vehiculosDir, file), 'utf-8')
  let json
  try {
    json = JSON.parse(raw)
  } catch (err) {
    console.warn(`⚠️  ${file}: JSON inválido, se salta (${err.message})`)
    continue
  }
  if (!json.slug || !json.title || !json.manufacturer) {
    console.warn(`⚠️  ${file}: falta slug/title/manufacturer, se salta`)
    continue
  }
  rows.push({
    slug: json.slug,
    manufacturer: json.manufacturer,
    title: json.title,
    class: json.class ?? null,
    updated_at: new Date().toISOString(),
  })
}

const BATCH_SIZE = 200
let upserted = 0
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE)
  const { error } = await admin.from('vehicle_models').upsert(batch, { onConflict: 'slug' })
  if (error) {
    console.error(`❌ Error en el batch ${i / BATCH_SIZE + 1}: ${error.message}`)
    process.exit(1)
  }
  upserted += batch.length
}

// Limpieza: modelos que ya no existen en el JSON (renombrados/borrados)
// se sacan del espejo. Si algún listing todavía los referencia, la FK con
// ON DELETE SET NULL (ver 005) los deja en null en vez de romper el DELETE.
const currentSlugs = rows.map((r) => r.slug)
const { data: existing } = await admin.from('vehicle_models').select('slug')
const staleSlugs = (existing ?? [])
  .map((r) => r.slug)
  .filter((slug) => !currentSlugs.includes(slug))

if (staleSlugs.length > 0) {
  const { error: deleteError } = await admin.from('vehicle_models').delete().in('slug', staleSlugs)
  if (deleteError) {
    console.error(`❌ Error borrando modelos obsoletos: ${deleteError.message}`)
    process.exit(1)
  }
  console.log(`🧹 ${staleSlugs.length} modelo(s) obsoleto(s) removido(s) del espejo: ${staleSlugs.join(', ')}`)
}

console.log(`✅ ${upserted} modelo(s) sincronizado(s) en vehicle_models`)
