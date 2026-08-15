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
const cssDir = path.join(root, '.next', 'static', 'css')
if (!fs.existsSync(cssDir)) {
  console.log(
    '⚠ No se encontró .next/static/css — corré `npm run build` antes de este script para validar el CSS generado.'
  )
} else {
  const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'))
  const css = cssFiles.map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n')

  // Muestra representativa de clases que dependen de tokens definidos en
  // theme.extend y que la app usa activamente (colores, shadows, radius).
  const expectedClasses = [
    '.bg-gta-dark',
    '.text-gta-accent',
    '.border-gta-border',
    '.shadow-gta-sm',
    'hover\\:shadow-gta-md', // Card.tsx usa hover:shadow-gta-md, no la variante base
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
