#!/usr/bin/env node

/**
 * Script para Aplicar Políticas RLS (Row Level Security)
 *
 * IMPORTANTE: Este script lee las políticas de RLS_POLICIES.md
 * y las aplica vía el dashboard de Supabase o CLI.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🔐 FASE 1 — Aplicar Políticas RLS\n')

// Leer el archivo RLS_POLICIES.md
const rlsPath = path.join(rootDir, 'supabase/migrations/RLS_POLICIES.md')

if (!fs.existsSync(rlsPath)) {
  console.error('❌ Archivo RLS_POLICIES.md no encontrado')
  process.exit(1)
}

const rlsContent = fs.readFileSync(rlsPath, 'utf-8')

console.log('📋 POLÍTICAS RLS A APLICAR:\n')
console.log('Este documento contiene todas las políticas de seguridad para:')
console.log('  • profiles')
console.log('  • listings')
console.log('  • listing_images')
console.log('  • conversations')
console.log('  • conversation_messages')
console.log('  • favorites\n')

console.log('⚠️  INSTRUCCIONES:\n')
console.log('1. Abre https://supabase.com/dashboard')
console.log('2. Ve a SQL Editor → Nueva Query')
console.log('3. Abre supabase/migrations/RLS_POLICIES.md en tu editor')
console.log('4. Copia cada bloque `CREATE POLICY` (uno por uno)')
console.log('5. Pégalo en SQL Editor y ejecuta con "Run"\n')

console.log('Alternativamente, si usas Supabase CLI:\n')
console.log('1. Crea una migration: supabase migration new apply_rls_policies')
console.log('2. Copia el contenido de RLS_POLICIES.md')
console.log('3. supabase db push\n')

console.log('EJEMPLO de primera política (profiles):\n')
console.log('```sql')
console.log('CREATE POLICY "Profiles are public readable"')
console.log('  ON profiles FOR SELECT USING (true);')
console.log('```\n')

console.log('✅ Ver supabase/migrations/RLS_POLICIES.md para todas las políticas\n')

console.log('VERIFICAR QUE RLS ESTÁ ACTIVADO:\n')
console.log('Después de aplicar todas las políticas, ejecuta en SQL Editor:\n')
console.log('```sql')
console.log('SELECT tablename, rowsecurity')
console.log('FROM pg_tables')
console.log("WHERE schemaname = 'public'")
console.log('ORDER BY tablename;')
console.log('```\n')

console.log('Debería mostrar rowsecurity = true en todas las tablas.\n')
