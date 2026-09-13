#!/usr/bin/env node

/**
 * FASE 3 — Datos semilla de `listings` (solo lectura)
 *
 * Objetivo exacto de la sección 19 / Fase 3 del documento maestro:
 * "validar el esquema completo de la sección 4 con 10-20 listings de
 * prueba cargados a mano, página /listings/[id] (acá: /listings/ver?id=)
 * renderizando esos datos client-side". Criterio de aceptación explícito:
 * "un listing con condición 'chocado' muestra correctamente sus
 * condition_details; uno con vehicle_model_slug=null no rompe nada."
 *
 * Este script cubre ambos casos y de paso ejercita CASI toda la
 * taxonomía de `vehicle_conditions` (002_align_schema_to_master_doc.sql),
 * no solo 'chocado', para que la verificación manual en /listings/ver
 * sea representativa del rango real de publicaciones que el producto
 * promete soportar (sección 2 del doc maestro: "podés vender un vehículo
 * tal como está").
 *
 * Por qué usuarios reales vía Admin API (mismo patrón que test-rls.mjs) y
 * no un INSERT directo a auth.users: Supabase gestiona esa tabla con
 * columnas internas (instance_id, hashed tokens, etc.) que no son parte
 * del contrato público. Crear los vendedores demo por la API oficial es
 * lo único que garantiza que el trigger `handle_new_user` (001) corra y
 * deje un `profiles` consistente, exactamente como con un usuario real.
 *
 * Los listings quedan con `status='published'` directamente (bypass de
 * RLS vía service_role, igual que sync-vehicle-models.mjs) porque el
 * objetivo de esta fase es validar LECTURA — el flujo real de alta
 * (draft -> pending_review -> published) es la Fase 4, todavía no existe.
 *
 * Idempotencia: los 3 vendedores demo se identifican por el dominio de
 * email `@seed-fase3.sinfrenos.local` (nunca se resuelve de verdad, no
 * hace falta que exista). Volver a correr el script sin --cleanup crea
 * un vendedor nuevo con timestamp si ya no encuentra los anteriores, así
 * que para reintentar limpio conviene correr primero con --cleanup.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Settings → API → service_role — SECRETA,
 *                                nunca con prefijo NEXT_PUBLIC_, nunca
 *                                commiteada, nunca usada en código de
 *                                cliente)
 *
 * Uso:
 *   npm run seed:listings-fase3            # crea vendedores + listings
 *   npm run seed:listings-fase3:cleanup    # borra todo lo creado por este script
 *
 * Recomendado correr ANTES `npm run sync:vehicle-models` — si
 * `vehicle_models` está vacía, los listings que intentan matchear un
 * modelo real del catálogo caen automáticamente a
 * `vehicle_model_slug = null` (log de aviso, no error) en vez de romper
 * el seed por la FK de 005_listings_vehicle_model_fields.sql.
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
const CLEANUP = process.argv.includes('--cleanup')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('⏭️  seed:listings-fase3 SALTEADO — faltan variables en .env.local')
  console.log('   Necesita NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(0)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SEED_DOMAIN = 'seed-fase3.sinfrenos.local'

const DEMO_SELLERS = [
  { key: 'particular', email: `vendedor-particular@${SEED_DOMAIN}`, display_name: 'Marcos (demo particular)', seller_type: 'particular' },
  { key: 'concesionaria', email: `concesionaria-demo@${SEED_DOMAIN}`, display_name: 'AutoCentro Entre Ríos (demo)', seller_type: 'concesionaria' },
  { key: 'coleccionista', email: `coleccionista-demo@${SEED_DOMAIN}`, display_name: 'Club de Clásicos (demo)', seller_type: 'particular' },
]

// (provincia, ciudad) — deben existir tal cual en el seed de
// 002_align_schema_to_master_doc.sql, no se inventan acá.
const LOCATION_KEYS = [
  ['Entre Ríos', 'Concepción del Uruguay'],
  ['Entre Ríos', 'Paraná'],
  ['Santa Fe', 'Rosario'],
  ['Córdoba', 'Córdoba'],
  ['Ciudad Autónoma de Buenos Aires', 'Buenos Aires'],
  ['Mendoza', 'Mendoza'],
]

// 16 listings: cubren autos y motos, y prácticamente toda
// `vehicle_conditions` (002), no solo 'chocado'. `vehicleModelSlug: null`
// explícito marca los casos que deben probar el criterio de aceptación
// "sin match en el catálogo no rompe nada".
const LISTINGS = [
  {
    seller: 'concesionaria', category: 'autos', condition: 'nuevo',
    title: 'Toyota Corolla 2024 0km', brand: 'Toyota', model: 'Corolla', version: 'XEI CVT', year: 2024,
    mileageKm: 0, price: 32000000, currency: 'ARS', priceType: 'fixed',
    vehicleModelSlug: 'toyota-corolla-2024', location: 1,
    acceptsTrade: true, acceptsFinancing: true, hasTitle: true,
    description: '0km de agencia, entrega inmediata. Service oficial incluido.',
    conditionDetails: {},
  },
  {
    seller: 'particular', category: 'autos', condition: 'usado',
    title: 'Fiat Cronos 2021 muy cuidado', brand: 'Fiat', model: 'Cronos', version: 'Drive 1.3', year: 2021,
    mileageKm: 58000, price: 14500000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: 'fiat-cronos', location: 0,
    acceptsTrade: true, acceptsFinancing: false, hasTitle: true,
    description: 'Único dueño, service en agencia al día, todo original.',
    conditionDetails: {},
  },
  {
    seller: 'particular', category: 'motos', condition: 'usado',
    title: 'Honda Wave 110 2022', brand: 'Honda', model: 'Wave', version: '110', year: 2022,
    mileageKm: 12000, price: 2100000, currency: 'ARS', priceType: 'fixed',
    vehicleModelSlug: null, location: 0,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: true,
    description: 'Uso diario, papeles al día, service reciente.',
    conditionDetails: {},
  },
  {
    seller: 'particular', category: 'autos', condition: 'chocado',
    title: 'VW Golf GTI chocado adelante - motor OK', brand: 'Volkswagen', model: 'Golf GTI', version: null, year: 2018,
    mileageKm: 89000, price: 9000000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: 'volkswagen-golf-gti', location: 2,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: true,
    description: 'Golpe frontal en el paragolpe/óptica, motor y caja funcionando perfecto. Vendo así o para arreglar.',
    conditionDetails: { tipo_siniestro: 'Choque frontal leve contra cordón', danio_estructural: false },
  },
  {
    seller: 'particular', category: 'autos', condition: 'siniestrado',
    title: 'Toyota Hilux siniestrada - para repuestos o reparar', brand: 'Toyota', model: 'Hilux', version: 'SRV 4x4', year: 2016,
    mileageKm: 145000, price: null, currency: 'ARS', priceType: 'on_request',
    vehicleModelSlug: 'toyota-hilux', location: 4,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: false,
    description: 'Vuelco. Chasis con daño visible. Motor arranca. Se vende con papeles de baja por destrucción en trámite.',
    conditionDetails: { tipo_siniestro: 'Vuelco en ruta', danio_estructural: true },
  },
  {
    seller: 'particular', category: 'autos', condition: 'no_arranca',
    title: 'Renault Clio no arranca - se vende tal cual', brand: 'Renault', model: 'Clio', version: null, year: 2015,
    mileageKm: 130000, price: 3200000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: null, location: 1,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: true,
    description: 'Dejó de arrancar hace 2 meses, no se probó bien qué es. El resto del auto anda bien.',
    conditionDetails: { diagnostico: 'No confirmado, sospecha de bomba de nafta', arranca: false },
  },
  {
    seller: 'particular', category: 'autos', condition: 'motor_roto',
    title: 'Peugeot 208 motor fundido', brand: 'Peugeot', model: '208', version: 'Allure', year: 2017,
    mileageKm: 175000, price: 4000000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: null, location: 3,
    acceptsTrade: true, acceptsFinancing: false, hasTitle: true,
    description: 'Se fundió por falta de aceite. Chapa y pintura impecables, interior completo.',
    conditionDetails: { diagnostico: 'Motor fundido, biela suelta confirmada por mecánico', arranca: false },
  },
  {
    seller: 'particular', category: 'autos', condition: 'caja_rota',
    title: 'Chevrolet Onix caja de cambios rota', brand: 'Chevrolet', model: 'Onix', version: null, year: 2019,
    mileageKm: 98000, price: 6500000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: null, location: 0,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: true,
    description: 'Motor perfecto, la caja automática empezó a patinar en 3ra. Diagnosticado en concesionaria.',
    conditionDetails: { diagnostico: 'Caja automática patina en 3ra marcha', arranca: true },
  },
  {
    seller: 'coleccionista', category: 'autos', condition: 'para_repuestos',
    title: 'Ford Falcon para repuestos', brand: 'Ford', model: 'Falcon', version: null, year: 1978,
    mileageKm: null, price: 1500000, currency: 'ARS', priceType: 'fixed',
    vehicleModelSlug: null, location: 2,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: false,
    description: 'Carrocería completa, motor trabado. Ideal para repuestos o donante de chasis.',
    conditionDetails: { partes_faltantes: 'Faltan asientos traseros y tablero completo' },
  },
  {
    seller: 'coleccionista', category: 'autos', condition: 'desarmado',
    title: 'IKA Torino desarmado - proyecto', brand: 'IKA', model: 'Torino', version: null, year: 1971,
    mileageKm: null, price: null, currency: 'ARS', priceType: 'on_request',
    vehicleModelSlug: null, location: 4,
    acceptsTrade: true, acceptsFinancing: false, hasTitle: false,
    description: 'Vendo todas las partes juntas, viene en cajones. Documentación a regularizar.',
    conditionDetails: { partes_faltantes: 'Motor separado del chasis, faltan cromados' },
  },
  {
    seller: 'coleccionista', category: 'autos', condition: 'restauracion',
    title: 'Fiat 600 para restaurar', brand: 'Fiat', model: '600', version: null, year: 1969,
    mileageKm: null, price: 3500000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: null, location: 3,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: true,
    description: 'Chapa original sin óxido grave, interior a rehacer. Motor no probado en años.',
    conditionDetails: { estado_avance: 'Sin empezar, recién adquirido de una sucesión' },
  },
  {
    seller: 'coleccionista', category: 'autos', condition: 'clasico',
    title: 'Chevrolet Chevy Serie 2 impecable', brand: 'Chevrolet', model: 'Chevy', version: 'Serie 2', year: 1985,
    mileageKm: 87000, price: 12000000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: null, location: 4,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: true,
    description: 'Restaurado hace 3 años, se usa poco y en exposiciones de clásicos.',
    conditionDetails: {},
  },
  {
    seller: 'particular', category: 'motos', condition: 'competicion',
    title: 'Yamaha YZF de pista, no habilitada para calle', brand: 'Yamaha', model: 'YZF-R6', version: null, year: 2014,
    mileageKm: null, price: 8000000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: null, location: 2,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: false,
    description: 'Preparada para pista (escape, ECU, sin luces homologadas). No tiene título para circular en calle.',
    conditionDetails: {},
  },
  {
    seller: 'particular', category: 'autos', condition: 'inundado',
    title: 'Honda Civic inundado en 2023', brand: 'Honda', model: 'Civic', version: null, year: 2012,
    mileageKm: 120000, price: 3800000, currency: 'ARS', priceType: 'negotiable',
    vehicleModelSlug: null, location: 5,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: true,
    description: 'Le entró agua hasta el tablero en la inundación. Motor no se probó desde entonces.',
    conditionDetails: { tipo_siniestro: 'Inundación (agua hasta el tablero)', danio_estructural: false },
  },
  {
    seller: 'particular', category: 'autos', condition: 'incendiado',
    title: 'Ford Ka incendiado (motor)', brand: 'Ford', model: 'Ka', version: null, year: 2013,
    mileageKm: 95000, price: 900000, currency: 'ARS', priceType: 'fixed',
    vehicleModelSlug: null, location: 1,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: false,
    description: 'Se prendió fuego el compartimiento del motor por un corto. Carrocería y habitáculo sin daño de fuego.',
    conditionDetails: { tipo_siniestro: 'Incendio en compartimiento del motor', danio_estructural: false },
  },
  {
    seller: 'particular', category: 'autos', condition: 'otro',
    title: 'Renault Kangoo sin patente, importada', brand: 'Renault', model: 'Kangoo', version: null, year: 2016,
    mileageKm: 110000, price: null, currency: 'USD', priceType: 'on_request',
    vehicleModelSlug: null, location: 0,
    acceptsTrade: false, acceptsFinancing: false, hasTitle: false,
    description: 'Situación de documentación particular, se explica al interesado por mensaje.',
    conditionDetails: { detalle: 'Documentación importada, trámite de radicación en curso' },
  },
]

async function findOrCreateSeller(seller) {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (listErr) throw new Error(`No se pudo listar usuarios: ${listErr.message}`)
  const found = list.users.find((u) => u.email === seller.email)
  if (found) return found

  const { data: created, error } = await admin.auth.admin.createUser({
    email: seller.email,
    password: `Seed-${Date.now()}-!Aa`,
    email_confirm: true,
  })
  if (error) throw new Error(`No se pudo crear vendedor demo ${seller.email}: ${error.message}`)
  return created.user
}

async function cleanup() {
  console.log('🧹 Borrando vendedores y listings de seed (Fase 3)...\n')
  const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw new Error(`No se pudo listar usuarios: ${error.message}`)
  const seedUsers = list.users.filter((u) => u.email?.endsWith(`@${SEED_DOMAIN}`))
  if (seedUsers.length === 0) {
    console.log('   Nada que borrar — no hay usuarios de seed.')
    return
  }
  for (const u of seedUsers) {
    // ON DELETE CASCADE (profiles -> listings/favorites/conversations/...,
    // ver 001_initial_schema.sql) hace el resto de la limpieza solo.
    const { error: delErr } = await admin.auth.admin.deleteUser(u.id)
    if (delErr) {
      console.error(`   ❌ No se pudo borrar ${u.email}: ${delErr.message}`)
    } else {
      console.log(`   ✅ Borrado ${u.email} (cascada a sus listings/favoritos/etc.)`)
    }
  }
}

async function main() {
  if (CLEANUP) {
    await cleanup()
    return
  }

  console.log('🌱 FASE 3 — Cargando listings de prueba\n')

  console.log('1. Vendedores demo...')
  const sellers = {}
  for (const s of DEMO_SELLERS) {
    const user = await findOrCreateSeller(s)
    sellers[s.key] = user
    console.log(`   ✅ ${s.key} -> ${user.email} (${user.id})`)
  }

  // display_name/seller_type los deja el trigger handle_new_user con un
  // default genérico — se ajustan acá para que las cards/listing se vean
  // representativas, no "Usuario sin nombre".
  for (const s of DEMO_SELLERS) {
    const { error } = await admin
      .from('profiles')
      .update({ display_name: s.display_name, seller_type: s.seller_type })
      .eq('id', sellers[s.key].id)
    if (error) console.warn(`   ⚠️  No se pudo actualizar el perfil de ${s.email}: ${error.message}`)
  }

  console.log('\n2. Resolviendo ubicaciones semilla...')
  const locations = []
  for (const [provincia, ciudad] of LOCATION_KEYS) {
    const { data, error } = await admin
      .from('locations')
      .select('id')
      .eq('provincia', provincia)
      .eq('ciudad', ciudad)
      .single()
    if (error || !data) {
      throw new Error(
        `No se encontró la location (${provincia}, ${ciudad}) — ¿se aplicó 002_align_schema_to_master_doc.sql?`
      )
    }
    locations.push(data.id)
  }
  console.log(`   ✅ ${locations.length} ubicaciones resueltas`)

  console.log('\n3. Verificando vehicle_models (para los listings con match de catálogo)...')
  const { data: modelsData, error: modelsErr } = await admin.from('vehicle_models').select('slug')
  if (modelsErr) throw new Error(`No se pudo leer vehicle_models: ${modelsErr.message}`)
  const knownSlugs = new Set((modelsData ?? []).map((m) => m.slug))
  if (knownSlugs.size === 0) {
    console.log('   ⚠️  vehicle_models está vacía. Corré "npm run sync:vehicle-models" antes')
    console.log('      para que los listings con catálogo real queden linkeados.')
    console.log('      Este seed sigue igual, esos listings quedan con vehicle_model_slug=null.')
  } else {
    console.log(`   ✅ ${knownSlugs.size} modelos disponibles en el espejo`)
  }

  console.log('\n4. Insertando listings...')
  const insertedIds = []
  for (const l of LISTINGS) {
    const vehicleModelSlug = l.vehicleModelSlug && knownSlugs.has(l.vehicleModelSlug) ? l.vehicleModelSlug : null
    if (l.vehicleModelSlug && !vehicleModelSlug) {
      console.log(`   ℹ️  "${l.title}": ${l.vehicleModelSlug} no está (todavía) en vehicle_models, queda sin match.`)
    }

    const { data: inserted, error } = await admin
      .from('listings')
      .insert({
        seller_id: sellers[l.seller].id,
        vehicle_model_slug: vehicleModelSlug,
        category_id: l.category,
        condition_id: l.condition,
        title: l.title,
        brand: l.brand,
        model: l.model,
        version: l.version,
        year: l.year,
        mileage_km: l.mileageKm,
        price_amount: l.price,
        price_currency: l.currency,
        price_type: l.priceType,
        accepts_trade: l.acceptsTrade,
        accepts_financing: l.acceptsFinancing,
        location_id: locations[l.location],
        description: l.description,
        condition_details: l.conditionDetails ?? {},
        has_title: l.hasTitle,
        title_status: l.hasTitle === false ? 'sin documentación al día' : null,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id, title, condition_id')
      .single()

    if (error) {
      console.error(`   ❌ "${l.title}": ${error.message}`)
      continue
    }

    insertedIds.push(inserted)

    // Una foto placeholder por listing, determinística por id (nunca la
    // misma dos veces), marcada is_cover. Sirve solo para validar
    // renderizado en Fase 3 — Fase 4 reemplaza esto por fotos reales
    // subidas a Supabase Storage.
    const { error: mediaError } = await admin.from('listing_media').insert({
      listing_id: inserted.id,
      url: `https://picsum.photos/seed/${inserted.id}/800/600`,
      position: 0,
      is_cover: true,
      media_type: 'image',
    })
    if (mediaError) {
      console.warn(`   ⚠️  No se pudo insertar la foto de "${l.title}": ${mediaError.message}`)
    }

    console.log(`   ✅ [${inserted.condition_id}] ${inserted.title}`)
  }

  console.log(`\n✅ ${insertedIds.length}/${LISTINGS.length} listings insertados.\n`)
  console.log('Para verificar manualmente el criterio de aceptación de la Fase 3, abrí:')
  const chocado = insertedIds.find((l) => l.condition_id === 'chocado')
  const sinMatch = insertedIds.find((l) => LISTINGS.find((x) => x.title === l.title)?.vehicleModelSlug === null)
  if (chocado) console.log(`   'chocado'          -> /listings/ver?id=${chocado.id}`)
  if (sinMatch) console.log(`   vehicle_model_slug=null -> /listings/ver?id=${sinMatch.id}`)
  console.log('\nPara borrar todo lo que creó este script: npm run seed:listings-fase3:cleanup')
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`)
  process.exit(1)
})
