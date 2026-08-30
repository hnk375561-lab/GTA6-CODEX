import type { Metadata } from 'next'
import { Reveal } from '@/components/ui/Reveal'
import { SITE_NAME, SITE_URL } from '@/config/site'

export const metadata: Metadata = {
  title: `Mapa | ${SITE_NAME}`,
  description: 'Mapa de concesionarias y puntos de interés — en construcción.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: `${SITE_URL}/mapa` },
}

/**
 * El mapa interactivo original (LeonidaMapExplorer/LeonidaMapCanvas, en
 * src/components/map/) modelaba las 5 zonas ficticias de Leonida a partir
 * de datos que ya no existen en el repo (leonida-zones.ts,
 * leonida-map-coordinates.ts — eliminados junto al resto del contenido de
 * GTA6). El componente en sí también fue eliminado del repo (no solo sus
 * datos), así que un mapa real (ej. "concesionarias cerca tuyo") requiere
 * reconstruirlo desde cero con datos geográficos reales — no es una
 * reactivación inmediata. Queda como stub explícito acá hasta que ese
 * trabajo se priorice, en vez de fabricar coordenadas de relleno.
 */
export default function MapaPage() {
  return (
    <div className="mx-auto max-w-3xl px-[var(--gutter-width)] py-16 text-center md:py-24">
      <Reveal>
        <h1 className="font-display text-3xl font-bold text-auto-text md:text-4xl">Mapa en construcción</h1>
        <p className="mt-4 text-auto-text-secondary">
          Estamos preparando un mapa de concesionarias y puntos de interés con datos reales.
        </p>
      </Reveal>
    </div>
  )
}
