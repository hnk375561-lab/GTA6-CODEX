import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { SITE_NAME } from './src/config/site'

// Comparación constant-time para el password del dashboard. `a === b` en
// JS compara char por char y corta en el primer mismatch — eso filtra,
// vía tiempo de respuesta, cuántos caracteres iniciales acertó quien
// ataca (timing attack clásico contra Basic Auth). `timingSafeEqual`
// exige buffers del mismo largo: si difieren, se corta antes (fuga
// aceptada de LARGO, no de contenido — es la limitación estándar de esta
// técnica, no un descuido).
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8')
  const bufB = Buffer.from(b, 'utf-8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Tipo mínimo del binding "Workers Rate Limiting API" (no dependemos de
// @cloudflare/workers-types solo por esto). Ver wrangler.toml: [[ratelimits]].
interface CloudflareRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

interface CloudflareRateLimiterEnv {
  RATE_LIMITER?: CloudflareRateLimiter
  NAV_RATE_LIMITER?: CloudflareRateLimiter
}

// IMPORTANTE: estos valores deben coincidir con [ratelimits.simple] en
// wrangler.toml (limit / period). El binding nativo RATE_LIMITER lee su
// propia config desde wrangler.toml directamente, pero el fallback en
// memoria de abajo (isRateLimitedInMemory) NO tiene acceso a ese archivo
// en runtime — por eso se duplica acá a mano. Si cambiás uno, cambiá el
// otro, o el fallback queda con un límite viejo silenciosamente.
const RATE_LIMIT_MAX_REQUESTS = 300 // debe coincidir con wrangler.toml -> limit
const RATE_LIMIT_WINDOW_MS = 60000 // debe coincidir con wrangler.toml -> period (en segundos * 1000)

// Límite separado para navegación GET normal (antes sin ningún límite).
// Mucho más generoso que el de /api y /dashboard a propósito: un humano
// real, incluso navegando rápido o compartiendo IP por CGNAT, no se
// acerca a esto. Lo que sí frena es exactamente el patrón que causó el
// incidente: un mismo cliente pegando ~9 req/s sostenidas por horas.
// No reduce el conteo de invocaciones del Worker (ver nota arriba de
// BLOCKED_USER_AGENTS) — lo que sí hace es cortar el flood ANTES de que
// cada request dispare el trabajo pesado de renderizar/leer contenido,
// y evita que un solo cliente agote el cupo diario del plan él solo.
const NAV_RATE_LIMIT_MAX_REQUESTS = 400
const NAV_RATE_LIMIT_WINDOW_MS = 60000

// Bots/crawlers conocidos que querés bloquear.
//
// IMPORTANTE — esto NO baja el conteo de invocaciones del Worker: para
// que este chequeo corra, Cloudflare ya tuvo que invocar el Worker (así
// se cuenta la request contra el límite del plan, pase lo que pase
// después dentro del código). Bloquear acá evita que el bot siga
// consumiendo CPU/subrequests/DB una vez adentro, pero el request en sí
// ya "costó". El bloqueo real de invocaciones se hace en el dashboard de
// Cloudflare (WAF / Bot Fight Mode), antes de que la request llegue al
// Worker — ver nota en el chat.
//
// robots.txt (src/app/robots.ts) ya declara GPTBot/CCBot/anthropic-ai
// como disallow, pero robots.txt es una sugerencia que el bot debe
// respetar voluntariamente. Estos mismos (y otros crawlers de
// entrenamiento de IA / scraping agresivo que no suelen respetarlo) se
// agregan acá para que el bloqueo sea real, no solo declarativo.
const BLOCKED_USER_AGENTS = [
  'AhrefsBot',
  'SemrushBot',
  'DotBot',
  'MJ12bot',
  'SiteAuditBot',
  'rogerbot',
  'curl',
  'wget',
  'scrapy',
  'python-requests',
  'Go-http-client',
  'Java',
  'Apache-HttpClient',
  'okhttp',
  // Crawlers de entrenamiento de IA (mismos de robots.txt + otros que
  // no suelen respetarlo)
  'GPTBot',
  'ChatGPT-User',
  'CCBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Bytespider',
  'Amazonbot',
  'PetalBot',
  'Meta-ExternalAgent',
  'meta-externalagent',
  'FacebookBot',
  'Diffbot',
  'omgili',
  'YouBot',
  // Scraping/SEO agresivo adicional (mismo patrón que Ahrefs/Semrush)
  'BLEXBot',
  'DataForSeoBot',
  'SerpstatBot',
  'MauiBot',
  'proxycrawl',
  'magpie-crawler',
  'FriendlyCrawler',
]

// Rate limiting en memoria — SOLO fallback para contextos sin el binding
// nativo de Cloudflare (`next dev`, tests, o si el binding no está
// configurado). En producción real (Workers) este Map vive por isolate:
// un mismo cliente puede caer en isolates distintos que no comparten
// memoria entre sí, así que "50 req/min" acá termina siendo "50 req/min
// por instancia que te toque", no un límite global real. Por eso el
// camino primario usa `env.RATE_LIMITER` (Workers Rate Limiting API,
// contador compartido a nivel de cuenta/ubicación, ver wrangler.toml).
const requestCounts = new Map<string, { count: number; resetTime: number }>()
// Mapa separado para el límite de navegación GET (distinto umbral/ventana
// que el de /api y /dashboard — no pueden compartir el mismo Map porque
// una misma IP tendría dos contadores en conflicto).
const navRequestCounts = new Map<string, { count: number; resetTime: number }>()

// Antes esto se limpiaba con un `setInterval` a nivel de módulo (scope
// global). Cloudflare Workers prohíbe explícitamente I/O asíncrono
// (fetch, setTimeout/setInterval, crypto.getRandomValues) fuera de un
// handler de request — cualquier intento tira
// "Disallowed operation called within global scope" en cuanto el módulo
// se evalúa al arrancar una isolate nueva. Esto coincide con los errores
// vistos en Cloudflare Workers Metrics: un goteo constante, independiente
// del volumen de tráfico, típico de un fallo en cold start del módulo en
// vez de un fallo por request. Se reemplaza por un sweep perezoso: se
// ejecuta como mucho una vez cada `SWEEP_INTERVAL_MS`, disparado desde
// dentro del propio handler del middleware (que sí corre en contexto de
// request), no desde un timer persistente.
const SWEEP_INTERVAL_MS = 120000
let lastSweepAt = 0

function sweepExpiredEntries() {
  const now = Date.now()
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return
  lastSweepAt = now
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip)
    }
  }
  for (const [ip, data] of navRequestCounts.entries()) {
    if (now > data.resetTime) {
      navRequestCounts.delete(ip)
    }
  }
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  )
}

function isBlockedBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  return BLOCKED_USER_AGENTS.some((bot) => userAgent.toLowerCase().includes(bot.toLowerCase()))
}

function isRateLimitedInMemory(
  ip: string,
  map: Map<string, { count: number; resetTime: number }>,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const existing = map.get(ip)

  if (!existing) {
    map.set(ip, { count: 1, resetTime: now + windowMs })
    return false
  }

  if (now > existing.resetTime) {
    map.set(ip, { count: 1, resetTime: now + windowMs })
    return false
  }

  existing.count++
  return existing.count > maxRequests
}

// Intenta usar el binding nativo indicado (contador compartido a nivel
// de cuenta, no por isolate — ver wrangler.toml [[ratelimits]]). Si el
// binding no existe (dev local, tests, build sin Workers) o falla por
// cualquier motivo, cae fail-open al Map en memoria correspondiente en
// vez de romper el request — mismo criterio "no romper nada" del resto
// del middleware (bots/dashboard).
async function isRateLimited(
  ip: string,
  bindingName: 'RATE_LIMITER' | 'NAV_RATE_LIMITER',
  fallbackMap: Map<string, { count: number; resetTime: number }>,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  try {
    const { env } = getCloudflareContext()
    const limiter = (env as CloudflareRateLimiterEnv)[bindingName]
    if (limiter) {
      const { success } = await limiter.limit({ key: ip })
      return !success
    }
  } catch {
    // getCloudflareContext no disponible en este contexto (ej. next dev
    // sin initOpenNextCloudflareForDev, o entorno de test) — se sigue
    // al fallback de abajo.
  }

  return isRateLimitedInMemory(ip, fallbackMap, maxRequests, windowMs)
}

export async function middleware(request: NextRequest) {
  // Limpieza perezosa del mapa de rate limiting (fallback) — ver
  // comentario en `sweepExpiredEntries`. Se ejecuta acá (no en scope
  // global) porque este es el único lugar con contexto de request
  // válido.
  sweepExpiredEntries()

  // Block bots
  const userAgent = request.headers.get('user-agent')
  if (isBlockedBot(userAgent)) {
    return new NextResponse('Bloqueado', { status: 403 })
  }

  const pathname = request.nextUrl.pathname

  // Rate limiting estricto (300/min) — rutas sensibles (API, dashboard)
  // o métodos que modifican estado (POST/PUT/etc, típicamente
  // formularios). Acá sí tiene sentido un umbral bajo: es scraping
  // agresivo de la API o fuerza bruta contra /dashboard.
  const isSensitiveRoute = pathname.startsWith('/api') || pathname.startsWith('/dashboard')
  const isMutatingRequest = request.method !== 'GET' && request.method !== 'HEAD'
  const shouldRateLimitStrict = isSensitiveRoute || isMutatingRequest

  const clientIP = getClientIP(request)

  if (shouldRateLimitStrict) {
    if (
      await isRateLimited(
        clientIP,
        'RATE_LIMITER',
        requestCounts,
        RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_WINDOW_MS
      )
    ) {
      return new NextResponse('Demasiadas solicitudes', { status: 429 })
    }
  } else {
    // Rate limiting laxo (400/min) para navegación GET normal — antes
    // sin ningún límite (ver incidente: un mismo cliente sostuvo ~9
    // req/s por 24hs sin que nada lo frenara). El umbral es
    // deliberadamente alto para no afectar navegación real, incluso
    // detrás de CGNAT: un humano, o varios compartiendo IP, no se
    // acercan a 400 requests/min contra este catálogo.
    if (
      await isRateLimited(
        clientIP,
        'NAV_RATE_LIMITER',
        navRequestCounts,
        NAV_RATE_LIMIT_MAX_REQUESTS,
        NAV_RATE_LIMIT_WINDOW_MS
      )
    ) {
      return new NextResponse('Demasiadas solicitudes', { status: 429 })
    }
  }

  // Dashboard auth (código original)
  const auth = request.headers.get('authorization')
  const expectedPassword = process.env.DASHBOARD_PASSWORD

  if (pathname.startsWith('/dashboard')) {
    if (!expectedPassword) {
      return new NextResponse('Dashboard no configurado (falta DASHBOARD_PASSWORD).', {
        status: 503,
      })
    }

    if (auth) {
      const [scheme, encoded] = auth.split(' ')
      if (scheme === 'Basic' && encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
        const [, password] = decoded.split(':')
        if (safeCompare(password, expectedPassword)) {
          return NextResponse.next()
        }
      }
    }

    return new NextResponse('Autenticación requerida.', {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${SITE_NAME} Dashboard"`,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Ejecutar el middleware en todo MENOS:
     * - _next/static (archivos JS/CSS compilados)
     * - _next/image (optimización de imágenes)
     * - archivos estáticos con extensión (svg, png, jpg, css, js, ico, etc.)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff2?)$).*)',
  ],
}
