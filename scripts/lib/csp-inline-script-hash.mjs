/**
 * scripts/lib/csp-inline-script-hash.mjs
 * ============================================================
 * Calcula el hash SHA-256 (formato CSP: "sha256-<base64>") del único
 * script inline real que src/app/layout.tsx ejecuta antes de hidratar
 * (el snippet anti-FOUC de dark mode). El CSP de layout.tsx usa ese
 * hash en `script-src` en vez de 'unsafe-inline' (ver auditoría forense
 * 12/09/2026, hallazgo F-03).
 *
 * POR QUÉ EXISTE ESTE ARCHIVO:
 *   Un hash de CSP para contenido inline solo funciona si coincide
 *   BYTE A BYTE con el contenido real del <script>. Si alguien edita el
 *   snippet anti-FOUC en layout.tsx sin recalcular el hash, el CSP
 *   bloquea la ejecución del script (falla silenciosa: no hay error de
 *   build, el script simplemente no corre, y dark mode vuelve a tener
 *   flash-of-unstyled-content). Este script existe para que ese
 *   recálculo sea un comando, no algo que alguien tenga que recordar
 *   hacer a mano con `sha256sum` y `base64`.
 *
 * USO:
 *   node scripts/lib/csp-inline-script-hash.mjs
 *     → imprime el hash actual del script tal cual vive hoy en
 *       layout.tsx, para copiarlo a mano si hace falta actualizarlo.
 *
 *   node scripts/lib/csp-inline-script-hash.mjs --check
 *     → falla (exit 1) si el hash impreso en el CSP de layout.tsx ya NO
 *       coincide con el contenido real del script. Pensado para
 *       engancharse a `verify:all` en un commit futuro (no está
 *       enganchado todavía — ver TROUBLESHOOTING.md/CHANGELOG si se
 *       agrega, para no repetir el mismo patrón de "auditoría dice que
 *       ya se hizo, pero no se hizo" documentado en F-02 de la
 *       auditoría forense).
 * ============================================================
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LAYOUT_PATH = path.resolve(__dirname, '../../src/app/layout.tsx')

function extractInlineScript(source) {
  const match = source.match(/__html:\s*"((?:[^"\\]|\\.)*)"/)
  if (!match) {
    throw new Error(
      `No encontré el script inline (patrón __html: "...") en ${LAYOUT_PATH}. ` +
        'Si el snippet anti-FOUC cambió de forma (ya no es un string JS ' +
        'entrecomillado simple), este extractor hay que actualizarlo también.'
    )
  }
  // El contenido está escrito como literal de string de JS/TSX dentro del
  // archivo fuente (comillas dobles, escapes tipo \n si los hubiera) —
  // JSON.parse sobre el string re-entrecomillado lo decodifica igual que
  // lo haría el parser de JS real.
  return JSON.parse(`"${match[1]}"`)
}

function extractCspHash(source) {
  const match = source.match(/'sha256-([A-Za-z0-9+/=]+)'/)
  return match ? `sha256-${match[1]}` : null
}

function computeHash(scriptContent) {
  return `sha256-${createHash('sha256').update(scriptContent, 'utf8').digest('base64')}`
}

function main() {
  const source = readFileSync(LAYOUT_PATH, 'utf8')
  const scriptContent = extractInlineScript(source)
  const computedHash = computeHash(scriptContent)
  const hashInCsp = extractCspHash(source)

  const checkMode = process.argv.includes('--check')

  if (!checkMode) {
    console.log(computedHash)
    return
  }

  if (!hashInCsp) {
    console.error(
      '[csp-inline-script-hash] No encontré ningún hash sha256-... en el ' +
        "script-src del CSP de layout.tsx. ¿Se volvió a 'unsafe-inline'?"
    )
    process.exitCode = 1
    return
  }

  if (hashInCsp !== computedHash) {
    console.error(
      '[csp-inline-script-hash] El hash del CSP en layout.tsx NO coincide ' +
        'con el contenido real del script anti-FOUC.\n' +
        `  CSP tiene:      ${hashInCsp}\n` +
        `  Debería ser:    ${computedHash}\n` +
        'El script anti-FOUC cambió y el hash no se actualizó — el CSP lo ' +
        'está bloqueando en este momento. Actualizar el hash en el ' +
        "script-src de src/app/layout.tsx con el valor de 'Debería ser'."
    )
    process.exitCode = 1
    return
  }

  console.log('[csp-inline-script-hash] OK — el hash del CSP coincide con el script real.')
}

main()
