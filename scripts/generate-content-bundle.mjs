// scripts/generate-content-bundle.mjs
// Corre en build time (Node real). Lee todos los JSON de src/content/**
// y los vuelca en un único módulo TS que se importa estáticamente.
// Se ejecuta ANTES de `next build` (ver package.json).

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content')
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'lib', 'generated')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'content-bundle.ts')

// EntityType enum values
const ENTITY_TYPES = ['vehiculos', 'noticias', 'guias', 'fabricantes']

function loadType(type) {
  const dir = path.join(CONTENT_DIR, type)
  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'template.json')
  const entities = []

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8').replace(/^\uFEFF/, '')
      entities.push(JSON.parse(raw))
    } catch (err) {
      console.warn(`[generate-content-bundle] JSON inválido en ${type}/${file}:`, err.message)
    }
  }

  return entities
}

function loadMedia() {
  const dir = path.join(CONTENT_DIR, 'media')
  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  const assets = []

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8').replace(/^\uFEFF/, '')
      assets.push(JSON.parse(raw))
    } catch (err) {
      console.warn(`[generate-content-bundle] JSON inválido en media/${file}:`, err.message)
    }
  }

  return assets
}

const bundle = {}
let totalEntities = 0

for (const type of ENTITY_TYPES) {
  bundle[type] = loadType(type)
  totalEntities += bundle[type].length
}

bundle.media = loadMedia()
totalEntities += bundle.media.length

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const fileContent = `// AUTO-GENERADO por scripts/generate-content-bundle.mjs — NO EDITAR A MANO.
// Se regenera en cada build a partir de src/content/**/*.json
import type { Entity } from '@/types'
import type { MediaAsset } from '@/types/media'

export const CONTENT_BUNDLE: {
  vehiculos: Entity[]
  noticias: Entity[]
  guias: Entity[]
  fabricantes: Entity[]
  media: MediaAsset[]
} = ${JSON.stringify(bundle, null, 2)} as any
`

fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8')
console.log(`[generate-content-bundle] Escribí ${OUTPUT_FILE} con ${totalEntities} entidades.`)
