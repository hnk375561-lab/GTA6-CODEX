import { NextResponse } from 'next/server'
import { getAllEntities } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import type { Entity } from '@/types'

// Reemplazo de `src/app/api/buscar/route.ts` para hosting 100% estático
// (GitHub Pages): ese endpoint leía `request.nextUrl.searchParams` (`q`),
// lo que lo vuelve dinámico y por lo tanto imposible de generar con
// `output: 'export'` (Next.js necesita poder resolverlo una sola vez en
// build, sin request real).
//
// Esta ruta no lee nada dinámico, así que con `output: 'export'` Next.js
// la ejecuta UNA vez en build y el resultado se escribe como archivo
// estático en `out/search-index.json` — mismo mecanismo que ya usan
// `sitemap.ts` y `robots.ts` en este proyecto, aplicado acá a un Route
// Handler en vez de a las convenciones nativas de metadata.
//
// El índice completo (título, descripción, tags, imagen resuelta y
// conteo de relaciones de las 340+ entidades) se sirve como un único
// JSON estático, cacheable por el CDN de GitHub Pages para siempre (el
// contenido no cambia hasta el próximo deploy). `SearchClient.tsx` lo
// descarga una sola vez (al entrar a /buscar) y arma el índice Fuse.js
// en el navegador — la búsqueda en sí (cada tecleo) es 100% client-side,
// sin ningún round-trip de red adicional.
export const dynamic = 'force-static'

export interface SearchIndexItem {
  entity: Entity
  image: ReturnType<typeof getEntityImageMap>[string]
  relationCount: number
}

export interface SearchIndexResponse {
  items: SearchIndexItem[]
}

export async function GET() {
  const entities = await getAllEntities()
  const imageBySlug = getEntityImageMap(entities)

  const items: SearchIndexItem[] = await Promise.all(
    entities.map(async (entity) => ({
      entity,
      image: imageBySlug[`${entity.type}/${entity.slug}`] ?? null,
      relationCount: await getBidirectionalRelationCount(entity),
    }))
  )

  return NextResponse.json<SearchIndexResponse>(
    { items },
    {
      headers: {
        // No-op en GitHub Pages hoy (no hay forma de setear headers custom
        // sin servidor propio delante), pero documenta la intención por si
        // en el futuro se agrega un CDN propio delante del sitio.
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}
