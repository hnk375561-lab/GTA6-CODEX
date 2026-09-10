import { redirect } from 'next/navigation'
import { getEntitiesByType } from '@/lib/entities'
import { EntityType } from '@/types'

// Antes: regla en `next.config.js` → `redirects()`:
//   { source: '/vehiculos/fabricante/:manufacturer', destination: '/fabricantes/:manufacturer', permanent: true }
//
// `redirects()` no se ejecuta en `output: 'export'` (GitHub Pages no
// corre ningún proceso Next.js en runtime que pueda evaluarlo por
// request). Como reemplazo, esta ruta se prerenderiza como página
// estática real para cada fabricante conocido y usa `redirect()` de
// `next/navigation` en un Server Component: en build time, Next.js lo
// resuelve emitiendo un `<meta http-equiv="refresh">` en el HTML
// estático de salida (mismo mecanismo interno que usa para
// `notFound()`/`redirect()` en export estático) — funciona sin servidor,
// incluida GitHub Pages. Preserva el link viejo indexado en vez de
// romperlo con un 404.
export function generateStaticParams() {
  return getEntitiesByType(EntityType.MANUFACTURER).then((manufacturers) =>
    manufacturers.map((m) => ({ manufacturer: m.slug }))
  )
}

export const dynamicParams = false

interface PageProps {
  params: Promise<{ manufacturer: string }>
}

export default async function VehiculosFabricanteRedirectPage({ params }: PageProps) {
  const { manufacturer } = await params
  redirect(`/fabricantes/${manufacturer}`)
}
