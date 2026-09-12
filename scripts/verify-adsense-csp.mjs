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
 *
 * FIX (auditoría FASE 2, 12/09/2026 — hallazgo #4 de esa ronda): este
 * script buscaba la CSP en `headers()` de next.config.js. Esa función
 * se sacó en la migración a `output: 'export'` del 10/09 (Next.js la
 * ignora en export estático — GitHub Pages no ejecuta ningún runtime
 * que la evalúe por request). Hasta ahora el check pasaba en verde
 * SOLO porque NEXT_PUBLIC_ADSENSE_CLIENT_ID nunca llegaba seteada
 * desde CI (hallazgo #1 de la misma auditoría) — ni siquiera llegaba a
 * intentar leer el archivo. El día que se resolviera ese hallazgo y la
 * variable empezara a llegar, este script iba a FALLAR el build
 * siempre, no porque la CSP estuviera mal, sino porque seguía
 * buscándola en un archivo que ya no la tiene. La CSP real hoy vive
 * como un <meta http-equiv="Content-Security-Policy"> armado con un
 * array `[...].join('; ')` dentro de `content={...}` en
 * `src/app/layout.tsx` — se actualiza el script para leer de ahí.
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

function extractCsp(layoutSrc) {
  // La CSP real vive como <meta http-equiv="Content-Security-Policy"
  // content={[...].join('; ')} /> en src/app/layout.tsx (ver comentario
  // arriba del componente RootLayout) — ya no hay `const csp = [...]`
  // en next.config.js porque `headers()` no se ejecuta en
  // `output: 'export'`.
  const match = layoutSrc.match(/httpEquiv="Content-Security-Policy"[\s\S]*?content=\{\[([\s\S]*?)\]\.join/)
  if (!match) return null
  const directives = [...match[1].matchAll(/"([^"]*)"/g)].map((m) => m[1])
  return directives.join('; ')
}

function checkCspAllowsAdsense(layoutPath) {
  const layoutSrc = fs.readFileSync(layoutPath, 'utf8')
  const csp = extractCsp(layoutSrc)
  if (csp === null) {
    fail(
      `No se pudo extraer la CSP de ${path.relative(root, layoutPath)} — el script espera un ` +
        `<meta http-equiv="Content-Security-Policy" content={[...].join(...)} /> dentro de RootLayout`
    )
    return
  }

  const scriptSrcMatch = csp.match(/script-src ([^;]*)/)
  const scriptSrc = scriptSrcMatch ? scriptSrcMatch[1] : ''

  if (scriptSrc.includes(REQUIRED_SCRIPT_SRC_HOST)) {
    ok(`script-src de la CSP incluye '${REQUIRED_SCRIPT_SRC_HOST}'`)
  } else {
    fail(
      `NEXT_PUBLIC_ADSENSE_CLIENT_ID está seteado pero script-src de la CSP en ` +
        `${path.relative(root, layoutPath)} NO incluye '${REQUIRED_SCRIPT_SRC_HOST}'. ` +
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
    const badLayout = path.join(tmpDir, 'layout.bad.tsx')
    fs.writeFileSync(
      badLayout,
      `<meta\n  httpEquiv="Content-Security-Policy"\n  content={[\n    "default-src 'self'",\n    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",\n  ].join('; ')}\n/>\n`
    )
    const before1 = failed
    failed = false
    checkCspAllowsAdsense(badLayout)
    if (!failed) {
      console.error('✗ self-test: se esperaba que el caso SIN el dominio de AdSense fallara, pero pasó')
      selfTestFailed = true
    } else {
      console.log('✓ self-test: caso sin dominio de AdSense falla como se espera')
    }
    failed = before1

    // Caso 2: CSP con el dominio de AdSense -> debe pasar.
    const goodLayout = path.join(tmpDir, 'layout.good.tsx')
    fs.writeFileSync(
      goodLayout,
      `<meta\n  httpEquiv="Content-Security-Policy"\n  content={[\n    "default-src 'self'",\n    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com",\n  ].join('; ')}\n/>\n`
    )
    const before2 = failed
    failed = false
    checkCspAllowsAdsense(goodLayout)
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
    checkCspAllowsAdsense(path.join(root, 'src/app/layout.tsx'))
  }

  if (failed) {
    console.error('\nverify-adsense-csp: FALLÓ')
    process.exit(1)
  } else {
    console.log('\nverify-adsense-csp: OK')
  }
}
