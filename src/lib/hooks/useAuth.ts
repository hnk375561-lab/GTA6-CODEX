'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

/**
 * Sesión de Supabase Auth, cliente. Fase 2 del documento maestro pedía
 * "login/logout funcionando client-side" — `/ingresar` ya mandaba el
 * magic link, pero nada en la app leía la sesión resultante ni ofrecía
 * cerrarla: no había forma de saber, desde el resto del sitio, si había
 * alguien logueado. Este hook es lo que faltaba para eso, sin tocar
 * `useWishlist` (que sigue siendo localStorage puro a propósito, ver
 * sección 4.9 del documento maestro: recién en Fase 6 pasa a usar sesión).
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  // Arranca en true: hasta que Supabase confirme (o no) una sesión
  // existente, no sabemos si hay usuario — evita un parpadeo de "no
  // logueado" antes de tiempo, mismo criterio que `hydrated` en
  // useWishlist.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      .catch(() => {
        // Supabase inalcanzable (env vars faltantes/mal puestas, proyecto
        // pausado por inactividad, sin red) — el Header se monta en todo
        // el sitio, así que esto NO puede tirar. Se degrada a "no
        // logueado": el catálogo técnico sigue andando igual.
        if (!active) return
        setUser(null)
        setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return { user, loading, signOut }
}
