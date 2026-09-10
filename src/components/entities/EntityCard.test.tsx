// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EntityCard } from './EntityCard'
import { EntityType, type Entity, type Vehicle } from '@/types'

/**
 * REGRESIÓN — incidente del 09/09/2026 (Error 1027 de Cloudflare, "plan
 * limits exceeded"). Causa raíz real: `next/link` sin `prefetch={false}`
 * en `EntityCard`, combinado con `enableCacheInterception: true` en
 * `open-next.config.ts` (necesario por otro bug, ver comentario ahí — no
 * se puede simplemente apagar). Cada `<Link>` de card, al entrar en
 * viewport, dispara un fetch interno de prefetch contra el binding de
 * assets del Worker ("assets.local" en el dashboard de Cloudflare). Con
 * una grilla de 5 columnas y decenas de vehículos por página, eso
 * multiplica las invocations reales por ~100-140x — así se agotó el cupo
 * del plan en una sola sesión de navegación normal, sin ningún tráfico
 * anómalo ni ataque.
 *
 * Esto YA se había arreglado una vez (commit `d03717eb`, 08/09) y se
 * volvió a perder sin que nadie lo notara cuando `EntityCard` se
 * reescribió por completo horas después (rediseño "showroom",
 * `f18d4ae8`) — un `git show` normal no lo iba a mostrar como error de
 * ningún tipo: compila, lintea y pasa cualquier test que no mire
 * específicamente esta prop. Por eso este archivo existe: para que un
 * futuro rediseño/refactor de `EntityCard` (total o parcial, sin importar
 * cuán chico) NO pueda volver a perderlo sin que la suite de tests lo
 * grite en rojo.
 *
 * Mockeamos `next/link` para poder inspeccionar la prop `prefetch` en el
 * DOM (Next no la expone como atributo real del `<a>`, así que el mock la
 * vuelca a `data-prefetch` para poder hacer la aserción).
 */
vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: {
    href: string
    prefetch?: boolean
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}))

// EntityImage usa next/image + lightbox/reveal client-side — nada de eso
// es relevante para este test (solo nos importa el <Link> que envuelve
// la card), así que se reemplaza por un placeholder mínimo.
vi.mock('@/components/entities/EntityImage', () => ({
  EntityImage: () => <div data-testid="entity-image-stub" />,
}))

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    type: EntityType.VEHICLE,
    slug: 'toyota-hilux',
    title: 'Toyota Hilux',
    description: 'Pickup mediana',
    status: 'confirmado',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    manufacturer: 'Toyota',
    class: 'Pickup',
    price: 'USD 53.245',
    ...overrides,
  }
}

function makeGenericEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    type: EntityType.NEWS,
    slug: 'alguna-noticia',
    title: 'Alguna noticia',
    description: 'Descripción',
    status: 'confirmado',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  } as Entity
}

afterEach(() => {
  cleanup()
})

describe('EntityCard — regresión prefetch (Error 1027 / amplificación de invocations)', () => {
  it('vehículo en layout="grid" (grilla de catálogo, /vehiculos): el Link principal lleva prefetch={false}', () => {
    const { container } = render(<EntityCard entity={makeVehicle()} layout="grid" />)
    const links = container.querySelectorAll('a[href]')
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link.getAttribute('data-prefetch')).toBe('false')
    })
  })

  it('vehículo en layout="row" (vista Catálogo/lista): el Link principal lleva prefetch={false}', () => {
    const { container } = render(<EntityCard entity={makeVehicle()} layout="row" />)
    const links = container.querySelectorAll('a[href]')
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link.getAttribute('data-prefetch')).toBe('false')
    })
  })

  it('entidad no-vehículo (fallback genérico: noticias, guías, fabricantes): el Link también lleva prefetch={false}', () => {
    const { container } = render(<EntityCard entity={makeGenericEntity()} layout="grid" />)
    const links = container.querySelectorAll('a[href]')
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link.getAttribute('data-prefetch')).toBe('false')
    })
  })
})
