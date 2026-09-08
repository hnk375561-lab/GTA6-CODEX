import { NextRequest, NextResponse } from 'next/server'
import { SITE_NAME } from './src/config/site'

// Bots/crawlers conocidos que querés bloquear
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
]

// Rate limiting en memoria (simple, sin KV/DO)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Limpiar entradas antiguas cada 2 minutos
setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip)
    }
  }
}, 120000)

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

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const limit = 50 // requests
  const window = 60000 // 1 minuto en ms

  const existing = requestCounts.get(ip)

  if (!existing) {
    requestCounts.set(ip, { count: 1, resetTime: now + window })
    return false
  }

  if (now > existing.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + window })
    return false
  }

  existing.count++
  return existing.count > limit
}

export function middleware(request: NextRequest) {
  // Block bots
  const userAgent = request.headers.get('user-agent')
  if (isBlockedBot(userAgent)) {
    return new NextResponse('Bloqueado', { status: 403 })
  }

  // Rate limiting
  const clientIP = getClientIP(request)
  if (isRateLimited(clientIP)) {
    return new NextResponse('Demasiadas solicitudes', { status: 429 })
  }

  // Dashboard auth (código original)
  const auth = request.headers.get('authorization')
  const expectedPassword = process.env.DASHBOARD_PASSWORD
  const pathname = request.nextUrl.pathname

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
        if (password === expectedPassword) {
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
  matcher: ['/:path*'],
}
