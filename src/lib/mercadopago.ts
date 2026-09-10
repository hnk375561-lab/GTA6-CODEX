/**
 * Cliente mínimo de la API REST de Mercado Pago (Checkout Pro).
 *
 * Por qué fetch directo a la API en vez del SDK oficial `mercadopago`:
 * el SDK es un wrapper fino sobre exactamente estos dos endpoints
 * (`/checkout/preferences` y `/v1/payments/:id`) — sumarlo como
 * dependencia solo para dos llamadas agrega superficie (versión a
 * mantener, tipos propios) sin ahorrar código real. Si en el futuro se
 * necesita algo más avanzado (suscripciones, split de pagos, Webhooks
 * firmados con SDK de verificación), migrar a el SDK oficial ahí sí se
 * justifica.
 *
 * Todo lo de acá corre server-side únicamente (no 'use client', no
 * NEXT_PUBLIC_*): el access token de Mercado Pago es un secreto y nunca
 * debe llegar al bundle del cliente.
 */

const MP_API_BASE = 'https://api.mercadopago.com'

/** Timeout por defecto para llamadas a la API de Mercado Pago. Sin esto,
 *  una API externa colgada cuelga la ruta API entera con ella hasta el
 *  `maxDuration` del runtime (o indefinidamente si no está seteado). */
const MP_FETCH_TIMEOUT_MS = 10_000

/** fetch con timeout vía AbortController. Si `init.signal` ya viene
 *  seteado desde afuera se respeta; si no, se crea uno propio con
 *  `MP_FETCH_TIMEOUT_MS`. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = MP_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: init.signal ?? controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Mercado Pago no respondió dentro de ${timeoutMs}ms (timeout).`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export interface CreatePreferenceItem {
  title: string
  description?: string
  quantity: number
  unit_price: number
  currency_id: 'ARS'
}

export interface CreatePreferenceParams {
  items: CreatePreferenceItem[]
  externalReference: string
  successUrl: string
  pendingUrl: string
  failureUrl: string
  /** Notification webhook, opcional — hoy no hay endpoint que lo escuche
   *  (la verificación de pago es síncrona en `/api/premium-report/pdf`,
   *  ver comentario ahí), se deja el parámetro listo para cuando se
   *  agregue uno. */
  notificationUrl?: string
}

export interface MercadoPagoPreference {
  id: string
  init_point: string
  sandbox_init_point: string
}

export class MercadoPagoNotConfiguredError extends Error {
  constructor() {
    super('MERCADOPAGO_ACCESS_TOKEN no está configurado.')
    this.name = 'MercadoPagoNotConfiguredError'
  }
}

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new MercadoPagoNotConfiguredError()
  return token
}

/** true si hay credenciales cargadas — usar para fail-closed en las rutas
 *  API (mismo criterio que `DASHBOARD_PASSWORD` en middleware.ts: sin
 *  configurar, la feature responde 503 en vez de romper a medias). */
export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)
}

export async function createPreference(params: CreatePreferenceParams): Promise<MercadoPagoPreference> {
  const token = getAccessToken()

  const res = await fetchWithTimeout(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: params.items,
      external_reference: params.externalReference,
      back_urls: {
        success: params.successUrl,
        pending: params.pendingUrl,
        failure: params.failureUrl,
      },
      auto_return: 'approved',
      notification_url: params.notificationUrl,
      statement_descriptor: 'SINFRENOS',
    }),
    // No cachear nunca una creación de preferencia.
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Mercado Pago rechazó la creación de preferencia (${res.status}): ${body}`)
  }

  const data = (await res.json()) as MercadoPagoPreference
  return data
}

export type MercadoPagoPaymentStatus = 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | string

export interface MercadoPagoPayment {
  id: number
  status: MercadoPagoPaymentStatus
  external_reference: string | null
  transaction_amount: number
  currency_id: string
}

/**
 * Verifica un pago contra la API de Mercado Pago (nunca confiar en los
 * query params que vuelven del `back_url` del navegador — cualquiera
 * puede escribir `?status=approved` a mano en la URL). Este es el único
 * punto de verdad real de "¿esto se pagó?".
 */
export async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const token = getAccessToken()

  const res = await fetchWithTimeout(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`No se pudo verificar el pago ${paymentId} (${res.status})`)
  }

  return (await res.json()) as MercadoPagoPayment
}
