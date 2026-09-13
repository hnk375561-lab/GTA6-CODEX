#!/usr/bin/env node

/**
 * Script para Aplicar Políticas RLS (Row Level Security) — Fase 2
 *
 * IMPORTANTE: desde el 13/09/2026 las políticas reales viven como SQL
 * versionado en supabase/migrations/003_rls_policies.sql (no en
 * RLS_POLICIES.md, que quedó documentado pero nunca se aplicaba solo).
 * Este script no ejecuta SQL él mismo (la anon key no tiene permiso para
 * correr SQL arbitrario) — imprime instrucciones y confirma qué archivos
 * hay que aplicar.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🔐 FASE 2 — Aplicar schema y políticas RLS\n')

const migration002 = path.join(rootDir, 'supabase/migrations/002_align_schema_to_master_doc.sql')
const migration003 = path.join(rootDir, 'supabase/migrations/003_rls_policies.sql')

for (const [label, filePath] of [
  ['002_align_schema_to_master_doc.sql (tablas nuevas + columnas nuevas)', migration002],
  ['003_rls_policies.sql (políticas RLS reales)', migration003],
]) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No se encontró ${filePath}`)
    process.exit(1)
  }
  console.log(`✅ Encontrado: ${label}`)
}

console.log('\n⚠️  INSTRUCCIONES (aplicar EN ESTE ORDEN, 001 → 002 → 003):\n')
console.log('1. Abrí https://supabase.com/dashboard → tu proyecto → SQL Editor')
console.log('2. Si todavía no corriste 001_initial_schema.sql, corrélo primero')
console.log('3. Pegá y ejecutá el contenido completo de 002_align_schema_to_master_doc.sql')
console.log('4. Pegá y ejecutá el contenido completo de 003_rls_policies.sql')
console.log('\nAlternativamente, con Supabase CLI:')
console.log('   $ supabase link --project-ref <tu-project-ref>')
console.log('   $ supabase db push\n')

console.log('VERIFICAR QUE RLS ESTÁ ACTIVADO EN TODAS LAS TABLAS:\n')
console.log('```sql')
console.log('SELECT tablename, rowsecurity')
console.log('FROM pg_tables')
console.log("WHERE schemaname = 'public'")
console.log('ORDER BY tablename;')
console.log('```')
console.log('Debería mostrar rowsecurity = true en todas las tablas.\n')

console.log('DESPUÉS de aplicar 002 y 003, corré el test automático de aislamiento:')
console.log('   $ npm run test:rls')
console.log('(necesita SUPABASE_SERVICE_ROLE_KEY en .env.local — ver .env.example)\n')
