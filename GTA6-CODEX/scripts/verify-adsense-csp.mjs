#!/usr/bin/env node
/**
 * scripts/verify-adsense-csp.mjs
 * ============================================================
 * Red de seguridad automática para el hallazgo E-2 (AdSense sin
 * red de seguridad CSP): el gating por consentimiento del usuario
 * ya existe (ConsentBanner solo carga adsbygoogle.js tras aceptar),
 * pero eso no alcanza — si alguien setea NEXT_PUBLIC_ADSENSE_CLIENT_ID
 * en producción sin haber actualizado la Content-Security-Policy de
 * next.config.js, el navegador bloquea el script igual (falla
 * silenciosa: no hay error visible para el usuario, el hueco de
 * anuncios simplemente queda vacío) y nadie se entera hasta mirar
 * la consola del navegador en prod.
 *
 * Este script hace estático lo que antes dependía de que alguien
 * se acordara de leer el comentario en next.config.js: si la env var
 * de AdSense está seteada, la CSP TIENE que incluir los dominios que
 * adsbygoogle.js necesita para cargar. Si no coinciden, falla el
 * build (verify:all) en vez de fallar en el navegador de un usuario
 * real.
 *
 * USO:
 *   node scripts/verify-adsense-csp.mjs
 *   node scripts/verify-adsense-csp.mjs --self-test
 *
 * NOTA (cierre hallazgo E-2, auditoría FASE 10): este script existía
 * pero no estaba enchufado a ningún pipeline real — vivía en
 * verify:all (que nadie corre automáticamente) sin un step propio en
 * .github/workflows/ci.yml, así que el chequeo nunca se ejecutaba de
 * verdad en push/PR. Ya se agregó el step "Verify AdSense CSP guard"
 * a ci.yml; a partir de ahora si se setea
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID sin haber sumado el dominio de
 * AdSense a la CSP, el pipeline falla en vez de dejar pasar un build
 * verde con AdSense roto en silencio.
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

// Dominio mínimo indispensable para que adsbygoogle.js llegue a
// cargar en absoluto (ver src/components/layout/ConsentBanner.tsx).
// No validamos la lista completa de dominios de anuncios/iframes de
// Google (esos se agregan iterativamente vía Report-Only, ver el
// comentario en next.config.js) — solo el que, si falta, garantiza
// que el script ni siquiera arranca.
const REQUIRED_SCRIPT_SRC_HOST = 'pagead2.googlesyndication.com'

function extractCsp(configSrc) {
  const match = configSrc.match(/const csp = \[([\s\S]*?)\]\.join/)
  if (!match) return null
  const directives = [...match[1].matchAll(/"([^"]*)"/g)].map((m) => m[1])
  return directives.join('; ')
}

function checkCspAllowsAdsense(configPath) {
  const configSrc = fs.readFileSync(configPath, 'utf8')
  const csp = extractCsp(configSrc)
  if (csp === null) {
    fail(`No se pudo extraer el array \`csp\` de ${path.relative(root, configPath)} — el script espera \`const csp = [...].join(...)\``)
    return
  }

  const scriptSrcMatch = csp.match(/script-src ([^;]*)/)
  const scriptSrc = scriptSrcMatch ? scriptSrcMatch[1] : ''

  if (scriptSrc.includes(REQUIRED_SCRIPT_SRC_HOST)) {
    ok(`script-src de la CSP incluye '${REQUIRED_SCRIPT_SRC_HOST}'`)
  } else {
    fail(
      `NEXT_PUBLIC_ADSENSE_CLIENT_ID está seteado pero script-src de la CSP en ` +
        `${path.relative(root, configPath)} NO incluye '${REQUIRED_SCRIPT_SRC_HOST}'. ` +
        `El navegador bloqueará adsbygoogle.js aunque el consentimiento esté dado ` +
        `(hallazgo E-2). Antes de activar AdSense: pasar la CSP a modo ` +
        `Content-Security-Policy-Report-Only con una cuenta real en staging, ` +
        `revisar qué dominios reporta la consola del navegador como bloqueados, ` +
        `y sumarlos al script-src (ver comentario en next.config.js).`
    )
  }
}

function selfTest() {
  console.log('Self-test: verify-adsense-csp.mjs\n')
  const tmpDir = fs.mkdtempSync(path.join(root, '.tmp-adsense-csp-selftest-'))
  let selfTestFailed = false

  try {
    // Caso 1: CSP sin el dominio de AdSense -> debe fallar.
    const badConfig = path.join(tmpDir, 'next.config.bad.js')
    fs.writeFileSync(
      badConfig,
      `const nextConfig = { headers: async () => { const csp = [\n  "default-src 'self'",\n  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",\n].join('; ') } }\nmodule.exports = nextConfig\n`
    )
    const before1 = failed
    failed = false
    checkCspAllowsAdsense(badConfig)
    if (!failed) {
      console.error('✗ self-test: se esperaba que el caso SIN el dominio de AdSense fallara, pero pasó')
      selfTestFailed = true
    } else {
      console.log('✓ self-test: caso sin dominio de AdSense falla como se espera')
    }
    failed = before1

    // Caso 2: CSP con el dominio de AdSense -> debe pasar.
    const goodConfig = path.join(tmpDir, 'next.config.good.js')
    fs.writeFileSync(
      goodConfig,
      `const nextConfig = { headers: async () => { const csp = [\n  "default-src 'self'",\n  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com",\n].join('; ') } }\nmodule.exports = nextConfig\n`
    )
    const before2 = failed
    failed = false
    checkCspAllowsAdsense(goodConfig)
    if (failed) {
      console.error('✗ self-test: se esperaba que el caso CON el dominio de AdSense pasara, pero falló')
      selfTestFailed = true
    } else {
      console.log('✓ self-test: caso con dominio de AdSense pasa como se espera')
    }
    failed = before2
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  if (selfTestFailed) {
    console.error('\nverify-adsense-csp --self-test: FALLÓ')
    process.exit(1)
  } else {
    console.log('\nverify-adsense-csp --self-test: OK')
    process.exit(0)
  }
}

if (process.argv.includes('--self-test')) {
  selfTest()
} else {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  if (!adsenseClientId) {
    ok('NEXT_PUBLIC_ADSENSE_CLIENT_ID no está seteado — nada que validar (AdSense sigue inactivo)')
  } else {
    ok(`NEXT_PUBLIC_ADSENSE_CLIENT_ID está seteado (${adsenseClientId}) — validando CSP`)
    checkCspAllowsAdsense(path.join(root, 'next.config.js'))
  }

  if (failed) {
    console.error('\nverify-adsense-csp: FALLÓ')
    process.exit(1)
  } else {
    console.log('\nverify-adsense-csp: OK')
  }
}
