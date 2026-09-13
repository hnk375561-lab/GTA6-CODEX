#!/usr/bin/env node

/**
 * Test de aislamiento RLS — Fase 2, criterio de aceptación explícito:
 * "el RLS bloquea correctamente el acceso a datos de otro usuario
 * (test explícito de esto, no solo del camino feliz)".
 *
 * Crea DOS usuarios de prueba reales (vía admin API, service_role key —
 * NUNCA se expone al cliente/browser, solo se usa acá, en Node, local o en
 * un job de CI) y verifica que:
 *   1. Un usuario puede crear y leer sus propios listings en cualquier estado.
 *   2. Otro usuario NO puede leer un listing ajeno en estado 'draft'.
 *   3. Un listing 'published' SÍ es visible para otros (y para anon).
 *   4. Un usuario no puede editar el perfil de otro.
 *   5. Un usuario no puede leer los favoritos de otro.
 *   6. Un usuario no puede insertar un listing a nombre de otro (seller_id
 *      ajeno).
 * Limpia todo lo que crea al final, incluidos los usuarios de prueba.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY   (Settings → API → service_role — SECRETA,
 *                                nunca con prefijo NEXT_PUBLIC_, nunca
 *                                committeada, nunca usada en código de
 *                                cliente)
 *
 * Uso: npm run test:rls
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
const ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.log('⏭️  test:rls SALTEADO — faltan variables en .env.local')
  console.log('   Necesita NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.log('   y SUPABASE_SERVICE_ROLE_KEY (esta última: Settings → API → service_role,')
  console.log('   SECRETA, solo en .env.local, nunca commiteada ni con prefijo NEXT_PUBLIC_).')
  console.log('   Aplicá primero 002 y 003 en Supabase (ver: npm run setup:rls).')
  process.exit(0)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let failures = 0
function check(label, condition) {
  if (condition) {
    console.log(`✅ ${label}`)
  } else {
    console.log(`❌ ${label}`)
    failures++
  }
}

function clientAs() {
  return createClient(SUPABASE_URL, ANON_KEY)
}

const stamp = Date.now()
const emailA = `rls-test-a-${stamp}@example.com`
const emailB = `rls-test-b-${stamp}@example.com`
const password = `Test-${stamp}-!Aa`

let userA, userB
let clientAnon, clientA, clientB
let listingDraftId, listingPublishedId, listingCrossId
let locationId

async function main() {
  console.log('🧪 Test de aislamiento RLS (Fase 2)\n')

  // --- Setup: dos usuarios reales, confirmados, vía admin API ---
  const { data: createdA, error: errA } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  })
  if (errA) throw new Error(`No se pudo crear usuario A: ${errA.message}`)
  userA = createdA.user

  const { data: createdB, error: errB } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  })
  if (errB) throw new Error(`No se pudo crear usuario B: ${errB.message}`)
  userB = createdB.user

  clientAnon = clientAs()
  clientA = clientAs()
  clientB = clientAs()

  const { error: signInAErr } = await clientA.auth.signInWithPassword({ email: emailA, password })
  if (signInAErr) throw new Error(`No se pudo loguear A: ${signInAErr.message}`)
  const { error: signInBErr } = await clientB.auth.signInWithPassword({ email: emailB, password })
  if (signInBErr) throw new Error(`No se pudo loguear B: ${signInBErr.message}`)

  const { data: loc } = await admin.from('locations').select('id').limit(1).single()
  locationId = loc?.id
  if (!locationId) throw new Error('No hay filas en locations — aplicá 002 antes de correr este test.')

  // --- 1. A crea un listing en draft y lo puede leer ---
  const { data: draft, error: draftErr } = await clientA
    .from('listings')
    .insert({
      seller_id: userA.id,
      title: 'RLS test — draft',
      category_id: 'autos',
      condition_id: 'usado',
      location_id: locationId,
      status: 'draft',
    })
    .select()
    .single()
  check('A puede crear su propio listing (draft)', !draftErr && !!draft)
  listingDraftId = draft?.id

  const { data: ownRead } = await clientA.from('listings').select('id').eq('id', listingDraftId).maybeSingle()
  check('A puede leer su propio listing en draft', ownRead?.id === listingDraftId)

  // --- 2. B NO puede leer el draft de A ---
  const { data: crossRead } = await clientB.from('listings').select('id').eq('id', listingDraftId).maybeSingle()
  check('B NO puede leer el listing en draft de A (bloqueado por RLS)', crossRead === null)

  // --- 2b. Tampoco un visitante anónimo ---
  const { data: anonRead } = await clientAnon.from('listings').select('id').eq('id', listingDraftId).maybeSingle()
  check('Anónimo NO puede leer el listing en draft de A', anonRead === null)

  // --- 3. A publica el listing; ahora sí es visible para B y para anon ---
  const { error: publishErr } = await clientA
    .from('listings')
    .update({ status: 'published' })
    .eq('id', listingDraftId)
  check('A puede publicar su propio listing', !publishErr)
  listingPublishedId = listingDraftId

  const { data: crossReadPublished } = await clientB
    .from('listings')
    .select('id')
    .eq('id', listingPublishedId)
    .maybeSingle()
  check('B SÍ puede leer el listing de A una vez publicado', crossReadPublished?.id === listingPublishedId)

  const { data: anonReadPublished } = await clientAnon
    .from('listings')
    .select('id')
    .eq('id', listingPublishedId)
    .maybeSingle()
  check('Anónimo SÍ puede leer el listing de A una vez publicado', anonReadPublished?.id === listingPublishedId)

  // --- 4. B no puede editar el listing de A ---
  const { data: hijackAttempt } = await clientB
    .from('listings')
    .update({ title: 'hijacked' })
    .eq('id', listingPublishedId)
    .select()
  check('B NO puede editar el listing publicado de A (0 filas afectadas)', (hijackAttempt ?? []).length === 0)

  // --- 5. B no puede insertar un listing a nombre de A ---
  const { error: spoofErr } = await clientB.from('listings').insert({
    seller_id: userA.id,
    title: 'RLS test — spoof',
    category_id: 'autos',
    condition_id: 'usado',
    location_id: locationId,
    status: 'draft',
  })
  check('B NO puede crear un listing con seller_id de A (RLS lo rechaza)', !!spoofErr)

  // --- 6. B no puede editar el perfil de A ---
  const { data: profileHijack } = await clientB
    .from('profiles')
    .update({ display_name: 'hijacked' })
    .eq('id', userA.id)
    .select()
  check('B NO puede editar el perfil de A (0 filas afectadas)', (profileHijack ?? []).length === 0)

  // --- 7. A agrega un favorito; B no puede verlo ---
  const { error: favErr } = await clientA
    .from('favorites')
    .insert({ user_id: userA.id, listing_id: listingPublishedId })
  check('A puede crear su propio favorito', !favErr)

  const { data: favCross } = await clientB
    .from('favorites')
    .select('id')
    .eq('user_id', userA.id)
    .maybeSingle()
  check('B NO puede leer los favoritos de A', favCross === null)

  // --- 8. `phone` de A nunca viaja fuera de la fila propia ---
  // (Ver 004_fix_profile_rls_leak.sql: 003 dejaba esto roto — una policy
  // "USING (true)" en `profiles` exponía `phone` a cualquiera que hiciera
  // SELECT directo a la tabla, sin pasar por `public_profiles`.)
  await admin.from('profiles').update({ phone: '+549344xxxxxxx' }).eq('id', userA.id)

  const { data: phoneViaTable } = await clientB
    .from('profiles')
    .select('phone')
    .eq('id', userA.id)
    .maybeSingle()
  check('B NO puede leer profiles.phone de A por SELECT directo a la tabla', phoneViaTable === null)

  const { data: phoneViaAnon } = await clientAnon
    .from('profiles')
    .select('phone')
    .eq('id', userA.id)
    .maybeSingle()
  check('Anónimo NO puede leer profiles.phone de A por SELECT directo a la tabla', phoneViaAnon === null)

  const { data: viaPublicView, error: viaPublicViewErr } = await clientAnon
    .from('public_profiles')
    .select('*')
    .eq('id', userA.id)
    .maybeSingle()
  check(
    'La vista public_profiles SÍ expone el resto del perfil de A a un anónimo',
    !viaPublicViewErr && viaPublicView?.id === userA.id
  )
  check(
    'La vista public_profiles NO tiene la columna phone en absoluto',
    viaPublicView !== null && !Object.prototype.hasOwnProperty.call(viaPublicView, 'phone')
  )

  console.log(`\n${failures === 0 ? '✅ Todos los checks de RLS pasaron' : `❌ ${failures} check(s) de RLS fallaron`}\n`)
}

async function cleanup() {
  console.log('🧹 Limpiando datos de prueba...')
  try {
    if (listingCrossId) await admin.from('listings').delete().eq('id', listingCrossId)
    if (listingDraftId) await admin.from('listings').delete().eq('id', listingDraftId)
    if (userA) await admin.auth.admin.deleteUser(userA.id)
    if (userB) await admin.auth.admin.deleteUser(userB.id)
  } catch (cleanupErr) {
    console.warn(`⚠️  Error durante la limpieza (revisar manualmente en el dashboard): ${cleanupErr.message}`)
  }
}

try {
  await main()
} catch (err) {
  console.error(`\n💥 Error inesperado: ${err.message}`)
  failures++
} finally {
  await cleanup()
}

process.exit(failures === 0 ? 0 : 1)
