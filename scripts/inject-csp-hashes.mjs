#!/usr/bin/env node
/**
 * scripts/inject-csp-hashes.mjs
 * ============================================================
 * PROBLEMA REAL (encontrado 12/9/2026 vía consola del navegador):
 *
 * src/app/layout.tsx pone un <meta http-equiv="Content-Security-Policy">
 * con `script-src 'self' 'sha256-<UN-HASH-FIJO>' ...`. Ese hash fijo
 * corresponde SOLO al snippet anti-FOUC de dark mode (el único <script>
 * inline que el autor de ese CSP tuvo en cuenta).
 *
 * Pero Next.js (App Router) inyecta en CADA página varios <script> inline
 * más: `(self.__next_f=self.__next_f||[]).push([...])`, que llevan el
 * payload de streaming/hidratación de React Server Components. El
 * contenido de esos scripts es DISTINTO en cada página (y a veces varias
 * veces dentro de la misma página) — o sea, cada uno tiene su propio hash
 * SHA-256, que nunca va a coincidir con el único hash hardcodeado.
 *
 * Resultado: el navegador bloquea esos scripts por CSP, React nunca recibe
 * el payload de hidratación, y tira "Minified React error #412" — la
 * página se queda con el HTML servido por el export estático pero sin
 * terminar de hidratar/montar los bloques que dependían de ese payload
 * (tarjetas de vehículos/fabricantes vacías, principalmente en las
 * páginas con más interactividad cliente).
 *
 * FIX: en vez de un hash fijo compartido, calculamos el hash real de
 * TODOS los <script> inline (sin `src`) de CADA archivo .html generado en
 * `out/`, y reescribimos el script-src de ESE archivo con exactamente los
 * hashes que contiene. Es la técnica estándar de CSP por hash para sitios
 * 100% estáticos: el contenido no cambia entre requests (no hay servidor
 * por request), así que un hash por archivo es tan seguro como
 * 'unsafe-inline' es inseguro, y no bloquea nada legítimo.
 *
 * Ya no hace falta recalcular nada a mano si se edita el script anti-FOUC:
 * este script encuentra su hash solo, en cada build.
 *
 * USO (parte del pipeline de build, después de `next build`):
 *   node scripts/inject-csp-hashes.mjs
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'out')

if (!fs.existsSync(outDir)) {
  console.error(`✗ No existe ${outDir} — corré \`next build\` antes de este script.`)
  process.exit(1)
}

// Orígenes externos fijos que ya estaban en el CSP (Analytics/AdSense/etc).
// Si se agrega un origen externo nuevo al sitio, actualizar acá TAMBIÉN
// (este script no los infiere, son scripts con `src` a otro dominio).
const EXTERNAL_SCRIPT_SOURCES =
  'https://www.googletagmanager.com https://pagead2.googlesyndication.com https://static.cloudflareinsights.com https://*.google.com https://*.doubleclick.net'

function findHtmlFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(full))
    } else if (entry.name.endsWith('.html')) {
      results.push(full)
    }
  }
  return results
}

// Matchea <script ...>contenido</script> SIN atributo src= (los inline
// con src apuntan a /_next/static/... y esos no necesitan hash, ya
// cumplen 'self').
const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g

// El <meta> real que renderiza React escribe las comillas del atributo
// `content="..."` como entidad HTML (&#x27;), no como comilla literal (').
// Las comillas literales SÍ aparecen dentro de los <script> de hidratación
// (self.__next_f.push(...)), que serializan estos mismos props como texto
// JS/JSON — un regex que busque "script-src 'self'" con comilla literal
// termina matcheando ESA copia serializada, no el <meta> que el navegador
// realmente evalúa. Anclamos en la secuencia exacta
// `Content-Security-Policy" content="` (única en el documento, confirmado
// con grep) para garantizar que tocamos el tag real, y trabajamos con
// &#x27; como equivalente de comilla dentro de ese valor.
const CSP_META_RE = /(Content-Security-Policy" content=")([^"]*)(")/
const SCRIPT_SRC_IN_META_RE = /(script-src &#x27;self&#x27;)[^;]*(;)/

function sha256Base64(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('base64')
}

const htmlFiles = findHtmlFiles(outDir)
let filesPatched = 0
let filesSkipped = 0
let totalUniqueHashes = new Set()

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8')

  if (!html.includes('script-src')) {
    filesSkipped++
    continue
  }

  const hashes = new Set()
  let match
  INLINE_SCRIPT_RE.lastIndex = 0
  while ((match = INLINE_SCRIPT_RE.exec(html)) !== null) {
    const content = match[1]
    if (content.trim().length === 0) continue
    const hash = sha256Base64(content)
    hashes.add(hash)
    totalUniqueHashes.add(hash)
  }

  if (hashes.size === 0) {
    filesSkipped++
    continue
  }

  // Los hashes van entre &#x27; (equivalente HTML-entity de comilla simple)
  // porque estamos escribiendo directamente dentro del valor del atributo
  // `content="..."`, que ya viene con esa codificación.
  const hashDirectives = [...hashes].map((h) => `&#x27;sha256-${h}&#x27;`).join(' ')
  const newScriptSrc = `script-src &#x27;self&#x27; ${hashDirectives} ${EXTERNAL_SCRIPT_SOURCES};`

  const metaMatch = html.match(CSP_META_RE)
  if (!metaMatch) {
    // Páginas stub de redirect legacy (id="__next_error__", solo
    // <meta http-equiv="refresh">, ver next.config.js) no pasan por
    // RootLayout y por lo tanto no tienen el <meta> de CSP — no hay nada
    // que parchear ni ningún script inline propio que dependa de esto.
    filesSkipped++
    continue
  }

  const [fullMetaMatch, prefix, metaContentValue, suffix] = metaMatch
  if (!SCRIPT_SRC_IN_META_RE.test(metaContentValue)) {
    console.error(`✗ No se encontró script-src dentro del <meta> de CSP en: ${path.relative(outDir, file)}`)
    process.exitCode = 1
    continue
  }
  const newMetaContentValue = metaContentValue.replace(SCRIPT_SRC_IN_META_RE, () => newScriptSrc)
  const newFullMeta = `${prefix}${newMetaContentValue}${suffix}`

  const patched = html.replace(fullMetaMatch, newFullMeta)

  if (patched === html) {
    console.error(`✗ No se pudo reemplazar el <meta> de CSP en: ${path.relative(outDir, file)}`)
    process.exitCode = 1
    continue
  }

  fs.writeFileSync(file, patched, 'utf8')
  filesPatched++
}

console.log(`✓ ${filesPatched} archivo(s) .html con CSP script-src recalculado con sus hashes reales.`)
console.log(`  (${totalUniqueHashes.size} hashes distintos en total, ${htmlFiles.length} archivos .html revisados, ${filesSkipped} sin scripts inline o sin CSP)`)

if (filesPatched === 0) {
  console.error('✗ No se parcheó ningún archivo — revisar el patrón de búsqueda contra el HTML real.')
  process.exit(1)
}
