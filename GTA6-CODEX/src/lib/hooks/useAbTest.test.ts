// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { pickVariant, useAbTest } from '@/lib/hooks/useAbTest'

describe('pickVariant', () => {
  it('siempre devuelve una de las variantes provistas', () => {
    const variants = ['a', 'b', 'c'] as const
    for (const seed of ['x', 'y', 'z', 'seed-1', 'seed-2', '']) {
      expect(variants).toContain(pickVariant(seed, variants))
    }
  })

  it('es determinístico: mismo seed, misma variante', () => {
    const variants = ['rojo', 'verde', 'azul'] as const
    const seed = 'visitante-123'
    expect(pickVariant(seed, variants)).toBe(pickVariant(seed, variants))
  })

  it('con una sola variante siempre la devuelve', () => {
    expect(pickVariant('cualquier-seed', ['unica'] as const)).toBe('unica')
  })

  it('tira si la lista de variantes está vacía', () => {
    expect(() => pickVariant('seed', [] as const)).toThrow()
  })
})

describe('useAbTest', () => {
  beforeEach(() => {
    // Mismo motivo que useWishlist.test.ts: este hook lee/escribe
    // localStorage real de jsdom, hay que limpiar entre tests.
    window.localStorage.clear()
  })

  it('asigna una variante válida y la persiste en localStorage', async () => {
    const variants = ['Ver en OLX', 'Buscar en OLX', 'Ver publicaciones'] as const
    const { result } = renderHook(() => useAbTest('test-persistencia', variants))

    await waitFor(() => expect(variants).toContain(result.current))

    const stored = window.localStorage.getItem('autoficha:ab:test-persistencia')
    expect(stored).toBe(result.current)
  })

  it('en visitas siguientes respeta la variante ya persistida', async () => {
    window.localStorage.setItem('autoficha:ab:test-repeticion', 'Buscar en OLX')
    const variants = ['Ver en OLX', 'Buscar en OLX', 'Ver publicaciones'] as const

    const { result } = renderHook(() => useAbTest('test-repeticion', variants))
    await waitFor(() => expect(result.current).toBe('Buscar en OLX'))
  })

  it('ignora un valor persistido que ya no es una variante válida', async () => {
    window.localStorage.setItem('autoficha:ab:test-invalido', 'variante-vieja-que-ya-no-existe')
    const variants = ['a', 'b'] as const

    const { result } = renderHook(() => useAbTest('test-invalido', variants))
    await waitFor(() => expect(variants).toContain(result.current))

    act(() => {
      // No-op: solo fuerza un re-render para confirmar estabilidad post-efecto.
    })
    expect(variants).toContain(result.current)
  })
})
