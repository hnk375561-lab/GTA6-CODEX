#!/usr/bin/env node
/** Validación de integridad del registro editorial `src/content/media/`.
 * No descarga recursos: valida estructura, ids y referencias locales. */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CONTENT = path.join(ROOT, 'src', 'content')
const MEDIA = path.join(CONTENT, 'media')
const ENTITY_TYPES = new Set([
  'personajes', 'vehiculos', 'ubicaciones', 'misiones', 'armas', 'actividades',
  'organizaciones', 'negocios', 'objetos', 'noticias', 'guias', 'trailers',
])
const SOURCE_TYPES = new Set(['youtube', 'vercel-blob', 'official-site', 'local'])
const errors = []
const entities = new Set()
const trailers = new Map()

for (const type of ENTITY_TYPES) {
  const dir = path.join(CONTENT, type)
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    try {
      const entity = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      if (typeof entity.slug !== 'string') continue
      entities.add(`${type}/${entity.slug}`)
      if (type === 'trailers') trailers.set(entity.slug, new Set((entity.scenes || []).map((scene) => scene.id)))
    } catch {
      // JSON de entidades es responsabilidad de la validación existente.
    }
  }
}

if (!fs.existsSync(MEDIA)) {
  errors.push('No existe src/content/media/')
} else {
  const ids = new Set()
  for (const file of fs.readdirSync(MEDIA).filter((name) => name.endsWith('.json')).sort()) {
    const label = `media/${file}`
    let asset
    try {
      asset = JSON.parse(fs.readFileSync(path.join(MEDIA, file), 'utf8'))
    } catch {
      errors.push(`${label}: JSON inválido`)
      continue
    }
    const expectedId = file.replace(/\.json$/, '')
    if (asset.id !== expectedId || ids.has(asset.id)) errors.push(`${label}: id debe ser único y coincidir con el nombre`) 
    ids.add(asset.id)
    if (!asset.title || !asset.kind || !asset.status) errors.push(`${label}: faltan id/title/kind/status requeridos`)
    if (!asset.source || !SOURCE_TYPES.has(asset.source.type) || !asset.source.provider || !asset.source.retrievedAt) {
      errors.push(`${label}: source inválido o incompleto`)
    } else if (asset.source.type === 'local' ? !asset.source.localPath : !asset.source.originalUrl) {
      errors.push(`${label}: la fuente no tiene ruta reproducible`)
    }
    for (const relation of asset.relations?.entities || []) {
      const key = `${relation.entityType}/${relation.entitySlug}`
      if (!ENTITY_TYPES.has(relation.entityType) || !entities.has(key)) errors.push(`${label}: entidad relacionada inexistente ${key}`)
    }
    const trailer = asset.relations?.trailer
    if (trailer) {
      if (!trailers.has(trailer.trailerSlug)) errors.push(`${label}: trailer inexistente ${trailer.trailerSlug}`)
      else if (trailer.sceneId && !trailers.get(trailer.trailerSlug).has(trailer.sceneId)) {
        errors.push(`${label}: escena inexistente ${trailer.trailerSlug}/${trailer.sceneId}`)
      }
    }
  }
}

if (errors.length) {
  console.error(`FALLÓ verify-media-integrity: ${errors.length} problema(s):`)
  errors.forEach((error) => console.error(`  - ${error}`))
  process.exitCode = 1
} else {
  console.log('OK — registro editorial de media, entidades y escenas consistentes.')
}
