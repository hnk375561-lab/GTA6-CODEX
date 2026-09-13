/**
 * Cliente Supabase BROWSER-ONLY (client-side)
 *
 * SEGURIDAD:
 * - Usa la anon key pública (segura de exponer — diseñado así por Supabase)
 * - La seguridad real vive en Row Level Security (RLS) — ver supabase/migrations/
 * - TODO acceso a datos pasa por RLS antes de devolverse al cliente
 * - NO almacenar secrets o credenciales server-side acá
 *
 * USO:
 * - Importar en componentes client-side: `import { supabase } from '@/lib/supabase/client'`
 * - NO importar en Route Handlers o funciones server-side
 * - Si necesita datos en un Server Component, pasar vía props/context desde un Client Component
 *
 * CONFIGURACIÓN:
 * - NEXT_PUBLIC_SUPABASE_URL: URL del proyecto (https://[PROJECT_ID].supabase.co)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Anon key de Settings → API en el dashboard
 */

'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
