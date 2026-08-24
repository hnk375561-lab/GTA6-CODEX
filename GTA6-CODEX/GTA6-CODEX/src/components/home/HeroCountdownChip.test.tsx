// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { HeroCountdownChip } from './HeroCountdownChip'
import type { CountdownTarget } from './LaunchCountdown'

function target(overrides: Partial<CountdownTarget> & { targetIso: string }): CountdownTarget {
  return {
    id: 'test',
    label: 'Hito de prueba',
    pendingLabel: 'Pendiente',
    reachedLabel: 'Ya disponible',
    accent: '#ff2f8f',
    ...overrides,
  }
}

describe('HeroCountdownChip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no renderiza nada si no hay hitos futuros', () => {
    const { container } = render(
      <HeroCountdownChip targets={[target({ targetIso: '2020-01-01T00:00:00Z', label: 'Pasado' })]} />
    )
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(container.firstChild).toBeNull()
  })

  it('muestra el hito más próximo entre varios', () => {
    render(
      <HeroCountdownChip
        targets={[
          target({ targetIso: '2026-06-01T00:00:00Z', label: 'Lejano' }),
          target({ targetIso: '2026-01-05T00:00:00Z', label: 'Cercano' }),
        ]}
      />
    )
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(screen.getByText(/cercano/i)).toBeInTheDocument()
  })

  it('recalcula cada minuto y migra al siguiente hito cuando el actual se alcanza (regresión: antes quedaba congelado desde el mount)', () => {
    render(
      <HeroCountdownChip
        targets={[
          // Se alcanza a los 90 segundos de arrancado el test.
          target({ targetIso: '2026-01-01T00:01:30Z', label: 'Hito inminente' }),
          target({ targetIso: '2026-01-10T00:00:00Z', label: 'Hito lejano' }),
        ]}
      />
    )
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(screen.getByText(/hito inminente/i)).toBeInTheDocument()

    // Avanza 2 minutos: el primer hito ya pasó. Sin el `setInterval` de
    // recálculo, el chip seguiría mostrando "Hito inminente" para siempre.
    act(() => {
      vi.advanceTimersByTime(2 * 60_000)
    })
    expect(screen.getByText(/hito lejano/i)).toBeInTheDocument()
    expect(screen.queryByText(/hito inminente/i)).not.toBeInTheDocument()
  })

  it('usa singular "día" cuando falta exactamente 1', () => {
    render(<HeroCountdownChip targets={[target({ targetIso: '2026-01-01T23:00:00Z', label: 'Mañana' })]} />)
    act(() => {
      vi.runOnlyPendingTimers()
    })
    // El texto está partido entre nodos ("Faltan " + <strong>1</strong> +
    // " día para mañana"), por eso se matchea sobre el `textContent` del
    // contenedor entero en vez de un único nodo de texto.
    const link = screen.getByRole('link')
    expect(link).toHaveTextContent('Faltan 1 día para mañana')
    expect(link).not.toHaveTextContent('días')
  })
})
