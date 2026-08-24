// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { HeroNewsFlash } from './HeroNewsFlash'

const ITEMS = [
  { slug: 'noticia-1', type: 'noticias', title: 'Primer titular' },
  { slug: 'noticia-2', type: 'noticias', title: 'Segundo titular' },
  { slug: 'noticia-3', type: 'noticias', title: 'Tercer titular' },
]

describe('HeroNewsFlash', () => {
  it('los dots son <button> reales con aria-label propio (regresión: antes eran <span> sin onClick)', () => {
    render(<HeroNewsFlash items={ITEMS} />)
    const dotsGroup = screen.getByLabelText('Elegir titular')
    const dots = dotsGroup.querySelectorAll('button')
    expect(dots).toHaveLength(3)
    expect(dots[1]).toHaveAttribute('aria-label', expect.stringContaining('Segundo titular'))
  })

  it('clickear un dot cambia el titular mostrado', () => {
    render(<HeroNewsFlash items={ITEMS} />)
    expect(screen.getByText('Primer titular')).toBeInTheDocument()

    const dotsGroup = screen.getByLabelText('Elegir titular')
    const secondDot = dotsGroup.querySelectorAll('button')[1]
    fireEvent.click(secondDot)

    expect(screen.getByText('Segundo titular')).toBeInTheDocument()
    expect(screen.queryByText('Primer titular')).not.toBeInTheDocument()
  })

  it('marca el dot activo con aria-current', () => {
    render(<HeroNewsFlash items={ITEMS} />)
    const dotsGroup = screen.getByLabelText('Elegir titular')
    const dots = dotsGroup.querySelectorAll('button')
    expect(dots[0]).toHaveAttribute('aria-current', 'true')
    expect(dots[1]).toHaveAttribute('aria-current', 'false')
  })

  it('pausa la auto-rotación al recibir touchstart (regresión: antes solo pausaba con hover/focus, inexistentes en mobile)', () => {
    vi.useFakeTimers()
    const { container } = render(<HeroNewsFlash items={ITEMS} intervalMs={1000} />)

    const root = container.querySelector('.hero-news-flash')
    expect(root).not.toBeNull()
    act(() => {
      fireEvent.touchStart(root as Element)
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('Primer titular')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('sin touchstart, la auto-rotación sigue avanzando sola (control del test anterior)', () => {
    vi.useFakeTimers()
    render(<HeroNewsFlash items={ITEMS} intervalMs={1000} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Segundo titular')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('no renderiza nada si no hay items', () => {
    const { container } = render(<HeroNewsFlash items={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
