import { NextRequest, NextResponse } from 'next/server'
import { SITE_NAME } from './src/config/site'

/**
 * Protege /dashboard con HTTP Basic Auth.
 *
 * No es un sistema de usuarios (no hace falta uno para una sola persona
 * viendo sus propios números) — es el gate más simple que existe en el
 * ecosistema HTTP nativo, sin librerías, sin cookies, sin sesión que
 * expire. El usuario/contraseña se comparan contra DASHBOARD_PASSWORD
 * (env var, nunca hardcodeada ni commiteada). Si la env var no está
 * configurada, el dashboard se bloquea por completo en vez de quedar
 * abierto — fail-closed, no fail-open.
 */
export function middleware(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const expectedPassword = process.env.DASHBOARD_PASSWORD

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

export const config = {
  matcher: '/dashboard/:path*',
}
