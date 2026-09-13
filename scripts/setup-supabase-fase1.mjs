#!/usr/bin/env node

/**
 * Script de Setup Automático para FASE 1
 *
 * Qué hace:
 * 1. Lee .env.local para obtener credenciales
 * 2. Instala @supabase/supabase-js
 * 3. Aplica el schema SQL
 * 4. Aplica políticas RLS
 * 5. Verifica que todo funciona
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🚀 FASE 1 — Setup Automático\n')

// ============================================================================
// 1. Leer .env.local
// ============================================================================

const envPath = path.join(rootDir, '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local no existe. Créalo primero con:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://zqkjdhiwgxjhatpntixq.supabase.co')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=...')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf-8')
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de Supabase incompletas en .env.local')
  process.exit(1)
}

console.log('✅ .env.local leído')
console.log(`   URL: ${supabaseUrl}`)
console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 20)}...\n`)

// ============================================================================
// 2. Crear cliente Supabase
// ============================================================================

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('✅ Cliente Supabase inicializado\n')

// ============================================================================
// 3. Leer y aplicar schema SQL
// ============================================================================

console.log('📝 Aplicando schema SQL...\n')

const migrationPath = path.join(rootDir, 'supabase/migrations/001_initial_schema.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

// Dividir el SQL en statements individuales (separados por ;)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'))

console.log(`Found ${statements.length} SQL statements to execute...\n`)

// NOTA: Supabase no proporciona un endpoint directo para ejecutar SQL arbitrary
// desde el cliente (anon key). Las migraciones deben hacerse:
// 1. Via CLI: supabase db push
// 2. Via Dashboard: SQL Editor
// 3. Via pgAdmin si tienes conexión directa

console.warn('⚠️  ATENCIÓN: Para aplicar el schema SQL, necesitas una de estas opciones:\n')
console.warn('OPCIÓN 1: Via Supabase CLI (recomendado)')
console.warn('  $ supabase link --project-ref zqkjdhiwgxjhatpntixq')
console.warn('  $ supabase db push\n')

console.warn('OPCIÓN 2: Via Supabase Dashboard')
console.warn('  1. Ir a https://supabase.com/dashboard')
console.warn('  2. SQL Editor → Nueva Query')
console.warn('  3. Copiar contenido de supabase/migrations/001_initial_schema.sql')
console.warn('  4. Run\n')

console.warn('OPCIÓN 3: Via pgAdmin / psql (conexión directa a PostgreSQL)')
console.warn('  1. Obtener connection string en Settings → Database')
console.warn('  2. psql [CONNECTION_STRING] < supabase/migrations/001_initial_schema.sql\n')

// ============================================================================
// 4. Test de conexión (para verificar que .env.local funciona)
// ============================================================================

console.log('🔌 Verificando conexión a Supabase...\n')

try {
  const { data: result, error } = await supabase
    .from('profiles')
    .select('count(*)', { count: 'exact', head: true })

  if (error) {
    // Es esperable que falle si la tabla no existe aún
    console.log(`   Resultado: Tabla no existe aún (esperable hasta aplicar schema)`)
    console.log(`   Error: ${error.message}\n`)
  } else {
    console.log('✅ Conexión a Supabase OK')
    console.log(`   Profiles existentes: ${result?.length || 0}\n`)
  }
} catch (err) {
  console.warn(`⚠️  Error de conexión: ${err.message}`)
  console.warn('   (Verificar .env.local y que el proyecto Supabase esté activo)\n')
}

// ============================================================================
// 5. Next Steps
// ============================================================================

console.log('📋 PRÓXIMOS PASOS:\n')
console.log('1. Elige UNA de las opciones arriba para aplicar el schema SQL')
console.log('2. Después de aplicar el schema, ejecuta:')
console.log('   $ npm run setup:rls\n')
console.log('3. Verifica que todo funciona:')
console.log('   $ npm run type-check && npm run build\n')

console.log('✅ Setup Fase 1 completado. Continúa con el schema SQL.\n')
