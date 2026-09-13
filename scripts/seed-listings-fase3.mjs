#!/usr/bin/env node

/**
 * Carga listings de prueba — Fase 3, criterio de aceptación explícito:
 * "un listing con condición 'chocado' muestra correctamente sus
 * condition_details; uno con vehicle_model_slug=null no rompe nada".
 *
 * Crea (o reutiliza) DOS vendedores de prueba reales vía admin API y
 * carga ~15 listings cubriendo: distintas categorías (autos/motos),
 * distintas condiciones (incluida cada condición 'grave' de la sección
 * 4.6, con su condition_details acorde al question_set de esa condición),
 * con y sin vehicle_model_slug, y precio fijo/negociable/a convenir.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (SECRETA — ver test-rls.mjs para la
 *                                misma advertencia; se usa acá porque
 *                                sembrar a nombre de un vendedor de
 *                                prueba con service_role es más simple y
 *                                repetible que loguearse de verdad)
 *
 * Uso: npm run seed:listings
 *      npm run seed:listings -- --reset   (borra los listings de prueba
 *                                           anteriores antes de recargar)
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
const RESET = process.argv.includes('--reset')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('⏭️  seed:listings SALTEADO — faltan variables en .env.local')
  console.log('   Necesita NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  console.log('   Aplicá primero 001-005 en Supabase y corré npm run sync:vehicle-models.')
  process.exit(0)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Identificamos "lo sembrado" por pertenecer a estos dos vendedores de
// prueba, NO por un campo de listings — `title_status` es de la sección
// 4.7 (documentación/titularidad declarada por el vendedor real) y no es
// el lugar correcto para una marca interna de seed data.
const SELLER_EMAILS = ['seed-vendedor-1@sinfrenos.test', 'seed-vendedor-2@sinfrenos.test']

async function getOrCreateSeller(email) {
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users?.find((u) => u.email === email)
  if (existing) return existing

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Seed-${Date.now()}-!Aa`,
    email_confirm: true,
  })
  if (error) throw new Error(`No se pudo crear vendedor semilla ${email}: ${error.message}`)
  return data.user
}

async function getLocationId(ciudad) {
  const { data, error } = await admin.from('locations').select('id').eq('ciudad', ciudad).single()
  if (error || !data) throw new Error(`No encontré la ciudad "${ciudad}" en locations — ¿corriste 002?`)
  return data.id
}

async function main() {
  console.log('🌱 Sembrando listings de prueba (Fase 3)\n')

  const sellerA = await getOrCreateSeller(SELLER_EMAILS[0])
  const sellerB = await getOrCreateSeller(SELLER_EMAILS[1])

  if (RESET) {
    const { error } = await admin
      .from('listings')
      .delete()
      .in('seller_id', [sellerA.id, sellerB.id])
    if (error) throw new Error(`No pude limpiar listings sembrados antes: ${error.message}`)
    console.log('🧹 Listings sembrados anteriormente, borrados.\n')
  }

  const paran = await getLocationId('Paraná')
  const concUy = await getLocationId('Concepción del Uruguay')
  const caba = await getLocationId('Buenos Aires')
  const cba = await getLocationId('Córdoba')

  // condition_details por listing, coherente con el question_set_id de su
  // condición (ver 002_align_schema_to_master_doc.sql, tabla
  // condition_question_sets) — NO inventa preguntas nuevas, usa las keys
  // ya definidas ahí (qs_mecanica, qs_siniestro, qs_incompleto, qs_proyecto).
  const listings = [
    {
      seller_id: sellerA.id, category_id: 'autos', condition_id: 'nuevo',
      title: 'Toyota Hilux SRX 0km', brand: 'Toyota', model: 'Hilux', version: 'SRX 4x4',
      year: 2026, mileage_km: 0, price_amount: 58000, price_currency: 'USD', price_type: 'fixed',
      location_id: caba, vehicle_model_slug: 'toyota-hilux',
      description: 'Unidad 0km, entrega inmediata.', condition_details: {},
    },
    {
      seller_id: sellerA.id, category_id: 'autos', condition_id: 'usado',
      title: 'Toyota Hilux 2021 35.000 km', brand: 'Toyota', model: 'Hilux', version: 'SRV 4x2',
      year: 2021, mileage_km: 35000, price_amount: 42000, price_currency: 'USD', price_type: 'negotiable',
      location_id: concUy, vehicle_model_slug: 'toyota-hilux', accepts_trade: true,
      description: 'Única mano, service oficial al día.', condition_details: {},
    },
    {
      // Caso explícito del criterio de aceptación: condición 'chocado'.
      seller_id: sellerA.id, category_id: 'autos', condition_id: 'chocado',
      title: 'Honda Civic Type R chocado, para reparar', brand: 'Honda', model: 'Civic', version: 'Type R',
      year: 2019, mileage_km: 60000, price_amount: 9500, price_currency: 'USD', price_type: 'negotiable',
      location_id: paran, vehicle_model_slug: 'honda-civic-type-r',
      description: 'Golpe frontal, motor y caja probados OK. Se vende como está.',
      condition_details: { tipo_siniestro: 'Choque frontal leve', danio_estructural: false },
    },
    {
      seller_id: sellerB.id, category_id: 'autos', condition_id: 'siniestrado',
      title: 'Renault Kwid siniestrado, para repuestos o reparar', brand: 'Renault', model: 'Kwid', version: 'Iconic',
      year: 2020, mileage_km: null, price_amount: null, price_currency: 'USD', price_type: 'on_request',
      location_id: cba, vehicle_model_slug: null,
      description: 'Vendo como está, sin garantía de nada. Papeles al día.',
      condition_details: { tipo_siniestro: 'Vuelco', danio_estructural: true },
    },
    {
      seller_id: sellerB.id, category_id: 'autos', condition_id: 'no_arranca',
      title: 'Fiat Uno no arranca, motor a diagnosticar', brand: 'Fiat', model: 'Uno', version: null,
      year: 2015, mileage_km: 180000, price_amount: 1200, price_currency: 'USD', price_type: 'negotiable',
      location_id: paran, vehicle_model_slug: null,
      description: 'Dejó de arrancar de un día para el otro, no se probó más.',
      condition_details: { diagnostico: 'No se hizo diagnóstico todavía', arranca: false },
    },
    {
      seller_id: sellerB.id, category_id: 'autos', condition_id: 'para_repuestos',
      title: 'Peugeot 208 para repuestos', brand: 'Peugeot', model: '208', version: null,
      year: 2016, mileage_km: null, price_amount: 800, price_currency: 'USD', price_type: 'fixed',
      location_id: cba, vehicle_model_slug: null,
      description: 'Se vende íntegro para repuestos, no arranca y le faltan partes.',
      condition_details: { partes_faltantes: 'Falta caja de cambios y óptica derecha' },
    },
    {
      seller_id: sellerA.id, category_id: 'autos', condition_id: 'proyecto',
      title: 'Alfa Romeo Giulia — proyecto de restauración', brand: 'Alfa Romeo', model: 'Giulia', version: null,
      year: 1975, mileage_km: null, price_amount: 15000, price_currency: 'USD', price_type: 'negotiable',
      location_id: caba, vehicle_model_slug: 'alfa-romeo-giulia',
      description: 'Proyecto avanzado, chapa y pintura terminadas, falta mecánica.',
      condition_details: { estado_avance: 'Chapa y pintura al 90%, motor desarmado' },
    },
    {
      seller_id: sellerA.id, category_id: 'autos', condition_id: 'desarmado',
      title: 'Alfa Romeo Stelvio desarmado, lote de partes', brand: 'Alfa Romeo', model: 'Stelvio', version: null,
      year: 2018, mileage_km: null, price_amount: 6000, price_currency: 'USD', price_type: 'negotiable',
      location_id: cba, vehicle_model_slug: 'alfa-romeo-stelvio',
      description: 'Vendo el lote completo de partes, no se vende por separado.',
      condition_details: { partes_faltantes: 'Motor y caja vendidos aparte, resto completo' },
    },
    {
      seller_id: sellerB.id, category_id: 'autos', condition_id: 'clasico',
      title: 'Aston Martin DB12 — clásico de colección', brand: 'Aston Martin', model: 'DB12', version: null,
      year: 1998, mileage_km: 85000, price_amount: 95000, price_currency: 'USD', price_type: 'negotiable',
      location_id: caba, vehicle_model_slug: null,
      description: 'Coleccionista vende, mantenimiento al día, papeles históricos.',
      condition_details: {},
    },
    {
      seller_id: sellerA.id, category_id: 'motos', condition_id: 'nuevo',
      title: 'Aprilia RSV4 0km', brand: 'Aprilia', model: 'RSV4', version: null,
      year: 2026, mileage_km: 0, price_amount: 24000, price_currency: 'USD', price_type: 'fixed',
      location_id: concUy, vehicle_model_slug: 'aprilia-rsv4',
      description: '0km, único dueño, con garantía de fábrica.', condition_details: {},
    },
    {
      seller_id: sellerB.id, category_id: 'motos', condition_id: 'usado',
      title: 'Aprilia RSV4 2022, poco uso', brand: 'Aprilia', model: 'RSV4', version: null,
      year: 2022, mileage_km: 4200, price_amount: 17500, price_currency: 'USD', price_type: 'negotiable',
      location_id: paran, vehicle_model_slug: 'aprilia-rsv4', accepts_financing: true,
      description: 'Solo asfalto, service al día en concesionario oficial.', condition_details: {},
    },
    {
      seller_id: sellerB.id, category_id: 'motos', condition_id: 'motor_roto',
      title: 'Moto 150cc motor roto, precio a convenir', brand: 'Sin marca clara', model: null, version: null,
      year: null, mileage_km: null, price_amount: null, price_currency: 'ARS', price_type: 'on_request',
      location_id: cba, vehicle_model_slug: null,
      description: 'Se rompió el motor, se vende para el que quiera repararla o para repuestos.',
      condition_details: { diagnostico: 'Fundió el motor, no se abrió para ver el daño exacto', arranca: false },
    },
    {
      seller_id: sellerA.id, category_id: 'motos', condition_id: 'competicion',
      title: 'Aprilia RSV4 preparada para pista', brand: 'Aprilia', model: 'RSV4', version: 'Track',
      year: 2021, mileage_km: null, price_amount: 21000, price_currency: 'USD', price_type: 'negotiable',
      location_id: caba, vehicle_model_slug: 'aprilia-rsv4',
      description: 'Preparada para pista, no apta para calle (sin luces ni patentamiento).',
      condition_details: {},
    },
    {
      // Caso "sin match en el catálogo": marca/modelo declarados por el
      // vendedor que no existen como ficha técnica — vehicle_model_slug
      // debe poder ser null sin romper nada (criterio de aceptación).
      seller_id: sellerB.id, category_id: 'autos', condition_id: 'otro',
      title: 'Auto armado/tuneado, sin match exacto en catálogo', brand: 'Armado', model: 'A pedido', version: null,
      year: 2010, mileage_km: 90000, price_amount: 5000, price_currency: 'USD', price_type: 'negotiable',
      location_id: paran, vehicle_model_slug: null,
      description: 'Base de un modelo pero muy modificado, no corresponde a ninguna ficha del catálogo.',
      condition_details: { detalle: 'Base mecánica de otro modelo, carrocería y motor no originales' },
    },
    {
      seller_id: sellerA.id, category_id: 'autos', condition_id: 'inundado',
      title: 'Cupra Leon inundado, vendo como está', brand: 'Cupra', model: 'Leon', version: null,
      year: 2020, mileage_km: 40000, price_amount: 8000, price_currency: 'USD', price_type: 'negotiable',
      location_id: cba, vehicle_model_slug: null,
      description: 'Tomó agua en la última inundación, no se arrancó desde entonces.',
      condition_details: { tipo_siniestro: 'Inundación', danio_estructural: false },
    },
  ]

  let created = 0
  for (const listing of listings) {
    const { data, error } = await admin
      .from('listings')
      .insert({ ...listing, status: 'published' })
      .select('id, title')
      .single()
    if (error) {
      console.error(`❌ "${listing.title}": ${error.message}`)
      continue
    }
    created++
    console.log(`✅ ${data.title}`)
    console.log(`   /listings/ver?id=${data.id}`)
  }

  console.log(`\n🌱 ${created}/${listings.length} listings sembrados.`)
  console.log(`   (a nombre de ${SELLER_EMAILS.join(' / ')}, para poder limpiarlos con --reset)`)
}

await main()
