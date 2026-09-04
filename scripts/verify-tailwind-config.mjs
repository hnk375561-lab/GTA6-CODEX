#!/usr/bin/env node
/**
 * scripts/verify-tailwind-config.mjs
 * ============================================================
 * Verificación acotada de tailwind.config.js:
 *
 *  1. Cada glob de `content` debe apuntar a un directorio que
 *     REALMENTE existe. Un glob roto no rompe el build (Tailwind
 *     simplemente no encuentra archivos ahí), así que ni `tsc`
 *     ni `next build` lo detectan — hay que chequearlo a mano.
 *
 *  2. Las clases utilitarias que dependen de tokens custom del
 *     theme (colores gta-*, boxShadow gta-*, borderRadius custom)
 *     siguen apareciendo en el CSS de producción compilado. Esto
 *     protege contra que un cambio futuro en `content` o `theme.extend`
 *     deje de generar clases que la app usa de verdad.
 *
 * USO:
 *   npm run build                      (una vez, para generar .next/static/css)
 *   node scripts/verify-tailwind-config.mjs
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

let failed = false
const fail = (msg) => {
  console.error(`✗ ${msg}`)
  failed = true
}
const ok = (msg) => console.log(`✓ ${msg}`)

// --- 1. Validar que los globs de `content` apuntan a directorios reales ---
const configPath = path.join(root, 'tailwind.config.js')
const configSrc = fs.readFileSync(configPath, 'utf8')

const contentMatch = configSrc.match(/content:\s*\[([\s\S]*?)\]/)
if (!contentMatch) {
  fail('No se pudo encontrar el array `content` en tailwind.config.js')
} else {
  const globs = [...contentMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  if (globs.length === 0) {
    fail('El array `content` está vacío')
  }
  for (const glob of globs) {
    // Nos quedamos con la parte del path anterior al primer '*'
    const staticPart = glob.split('*')[0]
    const dir = path.resolve(root, staticPart)
    if (!fs.existsSync(dir)) {
      fail(`content glob apunta a un directorio inexistente: '${glob}' (${dir})`)
    } else {
      ok(`content glob válido: '${glob}'`)
    }
  }
}

// --- 2. Validar que las clases custom críticas siguen en el CSS compilado ---
//
// `next build` corre con Turbopack por default desde Next 15.5+ (este repo
// usa Next 16). Turbopack NO escribe el CSS en `.next/static/css/` como el
// build clásico con Webpack — lo emite junto al resto de los chunks en
// `.next/static/chunks/*.css`. El chequeo original buscaba solo el path de
// Webpack, así que contra un build real de este repo `cssDir` nunca
// existía: el script imprimía la advertencia de "corré el build" y salía
// con éxito (exit 0) SIN validar una sola clase — un falso verde permanente
// (hallazgo de auditoría, 2026-08). Buscamos en ambos paths para que el
// script siga funcionando tanto con Turbopack como con un build clásico de
// Webpack (`next build --no-turbopack`), sin atarnos a un bundler
// específico.
const candidateCssDirs = [
  path.join(root, '.next', 'static', 'chunks'), // Turbopack (default)
  path.join(root, '.next', 'static', 'css'), // Webpack
]
const cssDir = candidateCssDirs.find((dir) => fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.css')))

if (!cssDir) {
  fail(
    'No se encontró CSS compilado en .next/static/chunks ni en .next/static/css — corré `npm run build` antes de este script para validar el CSS generado.'
  )
} else {
  const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'))
  const css = cssFiles.map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n')

  // Muestra representativa de clases que dependen de tokens definidos en
  // theme.extend y que la app usa activamente (colores, radius). Para que
  // un check tenga sentido, la clase TIENE que existir en el CSS compilado:
  // Tailwind solo genera utilidades que aparecen en los archivos que
  // escanean los globs de `content`, así que una clase sin usos reales no
  // se emite por más que su token exista en el theme.
  //
  // Reconciliación (sept 2026, auditoría): se quitaron `.bg-auto-card`
  // (token `auto-card` eliminado del theme en la Fase 6 del rediseño — ver
  // tailwind.config.js) y `.shadow-auto-sm` (ningún archivo de src/* la
  // referencia; las boxShadow custom `auto-*`/`glow-*` no tienen consumo
  // por clase). Se sumaron en su lugar `.bg-auto-surface` y `.bg-auto-accent`,
  // las dos con uso real verificable en el CSS compilado (dashboard y
  // componentes distribuidos respectivamente).
  const expectedClasses = [
    '.bg-auto-surface',
    '.text-auto-text',
    '.text-auto-text-secondary',
    '.border-auto-border',
    '.text-auto-accent',
    '.bg-auto-accent',
    '.rounded-lg',
    '.rounded-md',
  ]

  for (const cls of expectedClasses) {
    if (css.includes(cls)) {
      ok(`clase generada correctamente: ${cls}`)
    } else {
      fail(`clase esperada NO encontrada en el CSS compilado: ${cls}`)
    }
  }

  // Clases que NO deberían existir (confirman que la limpieza de config
  // no dejó residuos inesperados en el output).
  const unexpectedPatterns = [{ pattern: '.prose', label: 'plugin typography (removido, sin consumidores)' }]
  for (const { pattern, label } of unexpectedPatterns) {
    if (css.includes(pattern)) {
      fail(`se encontró '${pattern}' en el CSS (${label}) — inesperado`)
    } else {
      ok(`ausencia esperada confirmada: '${pattern}' (${label})`)
    }
  }
}

if (failed) {
  console.error('\nverify-tailwind-config: FALLÓ')
  process.exit(1)
} else {
  console.log('\nverify-tailwind-config: OK')
}
