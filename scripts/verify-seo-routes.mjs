#!/usr/bin/env node
/**
 * scripts/verify-seo-routes.mjs
 * ============================================================
 * Verificación end-to-end de que /robots.txt y /sitemap.xml están
 * REALMENTE servidos en el build de producción, no solo declarados en
 * código.
 *
 * Motivo: antes de este script existía seo.ts:generateRobotsTxt(), una
 * función con contenido correcto que nunca estaba conectada a ninguna
 * ruta real — /robots.txt nunca se sirvió en producción, y
 * generateRobotsTxt() anunciaba un /sitemap.xml que tampoco existía.
 * Un `tsc --noEmit` o un `next build` exitoso NO detectan este tipo de
 * problema (el código compila y el build no falla; simplemente la ruta
 * no está ahí).
 *
 * El sitio usa `output: 'export'` (next.config.js) para publicarse como
 * HTML estático en GitHub Pages — `next start` NO funciona con esta
 * configuración (Next.js tira "next start" does not work with "output:
 * export" configuration" en cualquier sistema operativo, no es un tema
 * de plataforma). El build real que se publica es el directorio `out/`
 * que genera `next build`, así que esta verificación sirve ESE
 * directorio con un servidor HTTP estático mínimo (sin dependencias
 * externas, sin child_process) y hace fetch ahí — es exactamente lo que
 * GitHub Pages sirve en producción.
 *
 * USO:
 *   npm run build          (una vez, si no hay build reciente)
 *   node scripts/verify-seo-routes.mjs
 *
 * Requiere que `next build` ya se haya corrido (usa el directorio
 * `out/` ya generado).
 * ============================================================
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'out')

const PORT = process.env.VERIFY_SEO_PORT || '3919'
const BASE_URL = `http://127.0.0.1:${PORT}`

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

/**
 * Resuelve una URL a un archivo dentro de `out/`, replicando cómo un
 * servidor estático (GitHub Pages) sirve un export de Next con
 * `trailingSlash: true`: `/foo/` → `foo/index.html`, `/foo.txt` →
 * `foo.txt` tal cual.
 */
function resolveStaticFile(urlPath) {
  const clean = urlPath.split('?')[0].split('#')[0]
  const rel = clean === '/' ? 'index.html' : decodeURIComponent(clean.replace(/^\/+/, ''))
  const candidates = rel.endsWith('/') || path.extname(rel) === ''
    ? [path.join(rel, 'index.html'), `${rel}.html`, rel]
    : [rel]

  for (const candidate of candidates) {
    const full = path.join(OUT_DIR, candidate)
    // Evita path traversal fuera de out/
    if (!full.startsWith(OUT_DIR)) continue
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full
  }
  return null
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const file = resolveStaticFile(req.url || '/')
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    const ext = path.extname(file)
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()))
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    throw new Error(
      `No existe el directorio 'out/' (${OUT_DIR}). Corré 'npm run build' antes de este script — el build con 'output: export' es el que genera el export estático que esta verificación sirve.`
    )
  }

  const server = createStaticServer()
  await listen(server, PORT)

  try {
    // --- /robots.txt ---
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`)
    assert.equal(robotsRes.status, 200, 'robots.txt debe responder 200')
    const robotsText = await robotsRes.text()
    assert.match(robotsText, /User-Agent: \*/i, 'robots.txt debe declarar reglas para User-Agent: *')
    // La regla de Disallow vigente depende de la política de indexación
    // del momento (ver comentario en src/app/robots.ts: bloqueo total
    // temporal mientras el sitio corre sin dominio propio, revertible a
    // reglas más finas como `Disallow: /api/` cuando eso cambie). Esta
    // verificación no asume CUÁL regla está activa — solo que existe al
    // menos una directiva Disallow real (robots.txt no es un archivo
    // vacío o roto).
    assert.match(robotsText, /Disallow: \S+/, 'robots.txt debe declarar al menos una regla Disallow')
    assert.match(robotsText, /Sitemap: https?:\/\/.+\/sitemap\.xml/, 'robots.txt debe apuntar a un sitemap.xml real')

    // --- /sitemap.xml ---
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`)
    assert.equal(sitemapRes.status, 200, 'sitemap.xml debe responder 200')
    const sitemapText = await sitemapRes.text()
    assert.match(sitemapText, /<urlset/, 'sitemap.xml debe ser un <urlset> válido')
    const urlCount = (sitemapText.match(/<loc>/g) || []).length
    assert.ok(urlCount > 50, `sitemap.xml debe listar bastantes más de 50 URLs (encontradas: ${urlCount})`)

    // El sitemap que anuncia robots.txt debe ser exactamente el que se sirve.
    // Se compara por nombre de archivo (no por path completo): SITE_URL
    // puede incluir un basePath de GitHub Pages (`/Sin-Frenos`) que solo
    // se activa en next.config.js cuando la env var GITHUB_PAGES_BASE_PATH
    // está seteada — este build local corre sin ella, así que el path real
    // servido en `out/` no lleva ese prefijo aunque SITE_URL sí lo declare.
    const sitemapUrlInRobots = robotsText.match(/Sitemap: (\S+)/)[1]
    const sitemapFilename = new URL(sitemapUrlInRobots).pathname.split('/').pop()
    const sitemapRes2 = await fetch(`${BASE_URL}/${sitemapFilename}`)
    assert.equal(sitemapRes2.status, 200, 'la URL de sitemap declarada en robots.txt debe responder 200')

    console.log(`OK — robots.txt y sitemap.xml (${urlCount} URLs) sirviendo correctamente en el export estático (out/).`)
  } finally {
    await close(server)
  }
}

main().catch((err) => {
  console.error('FALLÓ la verificación de rutas SEO:', err.message)
  process.exitCode = 1
})
