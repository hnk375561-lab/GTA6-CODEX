/**
 * Cartel de venta profesional (PDF) — segundo canal que cobra directo a
 * la persona usuaria (no a un negocio/afiliado), vía Mercado Pago
 * Checkout Pro. El primero fue el reporte comparativo premium (ver
 * `src/lib/premium-report.ts`). Contexto completo en
 * `docs/monetizacion-plan.md` sección 2.16.
 *
 * Qué vende: quien va a `/vender-tu-auto` deja el lead gratis (igual que
 * siempre, `SellVehicleLeadForm.tsx` no cambia), pero si además quiere un
 * cartel prolijo — precio grande y legible, datos de contacto, marca y
 * modelo — para pegar en el parabrisas o compartir en redes/grupos de
 * WhatsApp, ese PDF con diseño de marca de Sin Frenos es un producto de
 * ARS 690 (impulso, no una decisión que requiera pensar).
 *
 * Mismo criterio "sin base de datos propia" que el reporte premium: los
 * datos del cartel (marca, modelo, precio, contacto) NUNCA se guardan en
 * ningún lado del lado del servidor — viajan de ida y vuelta en la propia
 * URL (`returnUrl` con los datos codificados en base64) y se verifican
 * con un hash contra el `external_reference` que Mercado Pago devuelve,
 * exactamente el mismo mecanismo que usa `buildExternalReference` /
 * `externalReferenceMatchesSlugs` en premium-report.ts pero para un
 * payload de texto libre en vez de una lista de slugs conocidos.
 */

export const FLYER_PRICE_ARS = 690

export interface FlyerData {
  marca: string
  modelo: string
  anio: string
  precio: string
  km?: string
  contacto: string
  ubicacion?: string
}

const REQUIRED_FIELDS: Array<keyof FlyerData> = ['marca', 'modelo', 'anio', 'precio', 'contacto']

export function isValidFlyerData(data: Partial<FlyerData>): data is FlyerData {
  return REQUIRED_FIELDS.every((field) => typeof data[field] === 'string' && data[field]!.trim().length > 0)
}

/** Serialización canónica (orden de claves fijo) — necesaria para que el
 *  hash sea determinístico sin importar el orden en que llegue el JSON. */
function canonicalize(data: FlyerData): string {
  return JSON.stringify({
    marca: data.marca.trim(),
    modelo: data.modelo.trim(),
    anio: data.anio.trim(),
    precio: data.precio.trim(),
    km: (data.km || '').trim(),
    contacto: data.contacto.trim(),
    ubicacion: (data.ubicacion || '').trim(),
  })
}

/**
 * Hash corto y determinístico del payload — no necesita ser
 * criptográficamente fuerte (no protege un secreto, solo detecta que el
 * PDF pedido coincide con lo que se pagó), así que un FNV-1a de 32 bits
 * alcanza y evita sumar una dependencia de crypto solo para esto.
 */
export function hashFlyerData(data: FlyerData): string {
  const str = canonicalize(data)
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function buildExternalReference(data: FlyerData): string {
  return `for-sale-flyer:${hashFlyerData(data)}`
}

export function externalReferenceMatchesData(externalReference: string | null, data: FlyerData): boolean {
  if (!externalReference) return false
  return externalReference === buildExternalReference(data)
}

/**
 * `encodeFlyerData`/`decodeFlyerData` usan `Buffer` (solo disponible en
 * Node) — este módulo solo se importa desde Route Handlers (server-only)
 * y desde `ForSaleFlyerForm.tsx`, que importa exclusivamente
 * `FLYER_PRICE_ARS`, `isValidFlyerData` y el tipo `FlyerData` (nunca estas
 * dos funciones), así que el tree-shaking de producción de Next.js las
 * deja fuera del bundle del cliente.
 */
export function encodeFlyerData(data: FlyerData): string {
  return Buffer.from(canonicalize(data), 'utf-8').toString('base64url')
}

export function decodeFlyerData(encoded: string): FlyerData | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'))
    if (!isValidFlyerData(parsed)) return null
    return parsed as FlyerData
  } catch {
    return null
  }
}
