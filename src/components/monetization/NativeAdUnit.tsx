'use client'

import { useEffect, useRef } from 'react'

/**
 * Unidad de anuncios nativos / widgets de "contenido recomendado" —
 * canal nuevo (03/09/2026), documentado en `docs/monetizacion-plan.md`
 * sección 2.15.
 *
 * Por qué esto es un canal aparte de `AdUnit.tsx` (AdSense): son dos
 * redes con inventario y CPMs distintos, y AdSense NO permite que se le
 * apile debajo un widget de "más contenido" de otra red en el mismo
 * bloque (mezclarlos en un único componente violaría las políticas de
 * ambas). Este componente es intencionalmente genérico: no asume una
 * red puntual, porque las tres opciones típicas para un sitio de este
 * tamaño (Taboola, Outbrain, MGID) funcionan igual — un único `<script>`
 * con un `container id` — y todas requieren aprobación previa del sitio
 * antes de poder pegar el código real, así que no tiene sentido
 * hardcodear una sola.
 *
 * Por qué vale la pena sumarlo YA aunque ninguna esté aprobada todavía:
 * el proceso de aprobación de MGID/RevContent es rápido (a veces
 * instantáneo, sin el volumen de tráfico ni la espera que a veces pide
 * AdSense) y corre en paralelo sin pisar nada existente — es upside
 * puro mientras se decide cuál conviene.
 *
 * Activar: elegir UNA red, pegar su script id en
 * `NEXT_PUBLIC_NATIVE_ADS_SCRIPT_SRC` (la URL del script que la red da
 * al aprobar el sitio, ej. `https://cdn.taboola.com/libtrc/TU-CUENTA/loader.js`)
 * y el id de contenedor que pide esa red en
 * `NEXT_PUBLIC_NATIVE_ADS_CONTAINER_ID`. Sin esas dos variables, el
 * componente no renderiza nada (fail-closed, mismo criterio que
 * `AdUnit.tsx` con `NEXT_PUBLIC_ADSENSE_CLIENT_ID`).
 */
const NATIVE_ADS_SCRIPT_SRC = process.env.NEXT_PUBLIC_NATIVE_ADS_SCRIPT_SRC
const NATIVE_ADS_CONTAINER_ID = process.env.NEXT_PUBLIC_NATIVE_ADS_CONTAINER_ID

export function NativeAdUnit({
  className = '',
  dataTrackingLabel = 'native-ad-unit',
}: {
  className?: string
  dataTrackingLabel?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const configured = Boolean(NATIVE_ADS_SCRIPT_SRC && NATIVE_ADS_CONTAINER_ID)

  useEffect(() => {
    if (!configured || !containerRef.current) return

    // Cada red pide que el script se cargue una vez por contenedor visible
    // en la página — se inyecta acá en vez de en <Script strategy="afterInteractive">
    // global porque este widget puede aparecer más de una vez en el
    // catálogo (ficha de vehículo + guía) y cada instancia necesita su
    // propia carga.
    const script = document.createElement('script')
    script.src = NATIVE_ADS_SCRIPT_SRC as string
    script.async = true
    containerRef.current.appendChild(script)

    return () => {
      script.remove()
    }
  }, [configured])

  if (!configured) return null

  return (
    <div
      ref={containerRef}
      id={NATIVE_ADS_CONTAINER_ID}
      className={`native-ad-container my-6 min-h-[100px] w-full ${className}`}
      data-tracking={dataTrackingLabel}
    />
  )
}
