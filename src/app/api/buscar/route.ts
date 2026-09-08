import { NextRequest, NextResponse } from 'next/server'
import type Fuse from 'fuse.js'
import { getAllEntities } from '@/lib/entities'
import { getEntityImageMap } from '@/lib/media'
import { getBidirectionalRelationCount } from '@/lib/relations'
import { buildFuse } from '@/lib/entity-list-filters'
import type { Entity } from '@/types'

// Antes `/buscar/page.tsx` cargaba `getAllEntities()` completo y lo pasaba
// como prop a `SearchClient` ('use client'), que armaba el índice Fuse en
// el navegador — a 1000+ entidades eso significa descargar el catálogo
// entero antes de poder escribir una sola letra (Fase 1 del plan de
// escalado, docs/plan-escalado-1000-vehiculos.md).
//
// Acá se hace lo mismo (Fuse.js — el problema nunca fue la librería, fue
// dónde corre) pero server-side: el cliente manda la query y recibe solo
// los primeros 60 resultados ya resueltos.
//
// El índice Fuse se cachea a nivel módulo (persiste mientras la instancia
// serverless/edge esté "caliente"). El catálogo es estático hasta el
// próximo deploy, así que no hace falta invalidar el cache en runtime.
let cachedFuse: Fuse<Entity> | null = null
let cachedEntities: Entity[] | null = null

async function getFuse(): Promise<{ fuse: Fuse<Entity>; entities: Entity[] }> {
  if (cachedFuse && cachedEntities) {
    return { fuse: cachedFuse, entities: cachedEntities }
  }
  const entities = await getAllEntities()
  const fuse = buildFuse(entities)
  cachedFuse = fuse
  cachedEntities = entities
  return { fuse, entities }
}

export interface SearchApiItem {
  entity: Entity
  image: ReturnType<typeof getEntityImageMap>[string]
  relationCount: number
}

export interface SearchApiResponse {
  items: SearchApiItem[]
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (!q) {
    // Mismo comportamiento que antes: sin query, sin resultados (estado
    // inicial en blanco de SearchClient).
    return NextResponse.json<SearchApiResponse>({ items: [] })
  }

  const { fuse } = await getFuse()
  const matched = fuse.search(q).slice(0, 60).map((r) => r.item)

  // Imagen y conteo de relaciones se resuelven solo para los 60 resultados
  // que realmente vuelven al cliente, no para el catálogo completo (antes
  // `/buscar/page.tsx` resolvía `relationCountBySlug` para las 341+
  // entidades en cada request, incluso cuando la búsqueda no tenía query).
  const imageBySlug = getEntityImageMap(matched)
  const items: SearchApiItem[] = await Promise.all(
    matched.map(async (entity) => ({
      entity,
      image: imageBySlug[`${entity.type}/${entity.slug}`] ?? null,
      relationCount: await getBidirectionalRelationCount(entity),
    }))
  )

  return NextResponse.json<SearchApiResponse>({ items })
}
