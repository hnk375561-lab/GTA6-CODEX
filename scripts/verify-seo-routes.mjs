#!/usr/bin/env node
/**
 * scripts/verify-seo-routes.mjs
 * ============================================================
 * Verificación end-to-end de que /robots.txt y /sitemap.xml están
 * REALMENTE servidos en un build de producción, no solo declarados en
 * código.
 *
 * Motivo: antes de este script existía seo.ts:generateRobotsTxt(), una
 * función con contenido correcto que nunca estaba conectada a ninguna
 * ruta real — /robots.txt nunca se sirvió en producción, y
 * generateRobotsTxt() anunciaba un /sitemap.xml que tampoco existía.
 * Un `tsc --noEmit` o un `next build` exitoso NO detectan este tipo de
 * problema (el código compila y el build no falla; simplemente la ruta
 * no está ahí). Por eso esta verificación arranca next start de verdad
 * y hace fetch a las rutas.
 *
 * USO:
 *   npm run build          (una vez, si no hay build reciente)
 *   node scripts/verify-seo-routes.mjs
 *
 * Requiere que `next build` ya se haya corrido (usa el build de
 * .next/ existente vía `next start`).
 * ============================================================
 */
import { spawn } from 'child_process'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const NEXT_BIN = path.join(__dirname, '..', 'node_modules', '.bin', 'next')

const PORT = process.env.VERIFY_SEO_PORT || '3919'
const BASE_URL = `http://127.0.0.1:${PORT}`

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve()
      } catch {
        // servidor todavía no responde, reintenta
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout esperando ${url}`))
      }
      setTimeout(tick, 300)
    }
    tick()
  })
}

async function main() {
  // Se invoca el binario de next DIRECTO (node_modules/.bin/next), no via
  // `npx`, y con detached:true para poder matar todo el grupo de procesos
  // al terminar. `npx next start` interpone un proceso extra que, al
  // matarlo, NO mata al next-server real que lanza por debajo — deja un
  // proceso huérfano escuchando el puerto. Verificado manualmente: con
  // `npx` como wrapper, server.kill('SIGTERM') dejaba un next-server vivo
  // (visible en `ps aux` después de que este script ya había terminado).
  const server = spawn(NEXT_BIN, ['start', '-p', PORT], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })

  let serverOutput = ''
  server.stdout.on('data', (d) => (serverOutput += d))
  server.stderr.on('data', (d) => (serverOutput += d))

  const cleanup = () => {
    if (server.pid) {
      try {
        // Negativo = matar todo el grupo de procesos (server + hijos),
        // no solo el proceso lanzado directamente.
        process.kill(-server.pid, 'SIGKILL')
      } catch {
        // ya estaba muerto
      }
    }
  }

  try {
    await waitForServer(`${BASE_URL}/robots.txt`)

    // --- /robots.txt ---
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`)
    assert.equal(robotsRes.status, 200, 'robots.txt debe responder 200')
    const robotsText = await robotsRes.text()
    assert.match(robotsText, /User-Agent: \*/i, 'robots.txt debe declarar reglas para User-Agent: *')
    assert.match(robotsText, /Disallow: \/api\//, 'robots.txt debe bloquear /api/')
    assert.match(robotsText, /Sitemap: https?:\/\/.+\/sitemap\.xml/, 'robots.txt debe apuntar a un sitemap.xml real')

    // --- /sitemap.xml ---
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`)
    assert.equal(sitemapRes.status, 200, 'sitemap.xml debe responder 200')
    const sitemapText = await sitemapRes.text()
    assert.match(sitemapText, /<urlset/, 'sitemap.xml debe ser un <urlset> válido')
    const urlCount = (sitemapText.match(/<loc>/g) || []).length
    assert.ok(urlCount > 50, `sitemap.xml debe listar bastantes más de 50 URLs (encontradas: ${urlCount})`)

    // El sitemap que anuncia robots.txt debe ser exactamente el que se sirve
    const sitemapUrlInRobots = robotsText.match(/Sitemap: (\S+)/)[1]
    const sitemapRes2 = await fetch(sitemapUrlInRobots.replace(/^https?:\/\/[^/]+/, BASE_URL))
    assert.equal(sitemapRes2.status, 200, 'la URL de sitemap declarada en robots.txt debe responder 200')

    console.log(`OK — robots.txt y sitemap.xml (${urlCount} URLs) sirviendo correctamente en producción.`)
  } finally {
    cleanup()
  }
}

main()
  .catch((err) => {
    console.error('FALLÓ la verificación de rutas SEO:', err.message)
    process.exitCode = 1
  })
  .finally(() => {
    // El child process (next start) puede tardar un instante en morir tras
    // SIGTERM; no dejamos que sus streams mantengan vivo el event loop.
    setTimeout(() => process.exit(process.exitCode || 0), 500)
  })
