// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useWishlist, wishlistId } from '@/lib/hooks/useWishlist'

describe('useWishlist', () => {
  beforeEach(() => {
    // Cada test arranca con localStorage limpio — a diferencia de la
    // mayoría de la suite (que no toca `window`), este hook lee/escribe
    // storage real de jsdom, así que sin este reset el estado de un test
    // se filtraría al siguiente.
    window.localStorage.clear()
  })

  it('arranca vacío y queda hidratado después del primer efecto', async () => {
    const { result } = renderHook(() => useWishlist())
    await waitFor(() => expect(result.current.hydrated).toBe(true))
    expect(result.current.count).toBe(0)
    expect(result.current.isWishlisted('vehiculos', 'bmw-m4')).toBe(false)
  })

  it('toggleWishlist agrega y luego quita la misma entidad', async () => {
    const { result } = renderHook(() => useWishlist())
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => result.current.toggleWishlist('vehiculos', 'bmw-m4'))
    expect(result.current.isWishlisted('vehiculos', 'bmw-m4')).toBe(true)
    expect(result.current.count).toBe(1)

    act(() => result.current.toggleWishlist('vehiculos', 'bmw-m4'))
    expect(result.current.isWishlisted('vehiculos', 'bmw-m4')).toBe(false)
    expect(result.current.count).toBe(0)
  })

  it('persiste en localStorage con el id compuesto type/slug', async () => {
    const { result } = renderHook(() => useWishlist())
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => result.current.toggleWishlist('vehiculos', 'audi-q5'))

    const raw = window.localStorage.getItem('sinfrenos:wishlist')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual([wishlistId('vehiculos', 'audi-q5')])
  })

  it('distingue entidades de distinto tipo con el mismo slug', async () => {
    const { result } = renderHook(() => useWishlist())
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => result.current.toggleWishlist('vehiculos', 'ejemplo'))
    expect(result.current.isWishlisted('vehiculos', 'ejemplo')).toBe(true)
    expect(result.current.isWishlisted('noticias', 'ejemplo')).toBe(false)
  })

  it('removeFromWishlist quita sin afectar otras entradas', async () => {
    const { result } = renderHook(() => useWishlist())
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.toggleWishlist('vehiculos', 'audi-q5')
      result.current.toggleWishlist('vehiculos', 'bmw-m4')
    })
    expect(result.current.count).toBe(2)

    act(() => result.current.removeFromWishlist('vehiculos', 'audi-q5'))
    expect(result.current.isWishlisted('vehiculos', 'audi-q5')).toBe(false)
    expect(result.current.isWishlisted('vehiculos', 'bmw-m4')).toBe(true)
    expect(result.current.count).toBe(1)
  })

  it('clearWishlist vacía todo', async () => {
    const { result } = renderHook(() => useWishlist())
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.toggleWishlist('vehiculos', 'audi-q5')
      result.current.toggleWishlist('vehiculos', 'bmw-m4')
    })
    expect(result.current.count).toBe(2)

    act(() => result.current.clearWishlist())
    expect(result.current.count).toBe(0)
    expect(window.localStorage.getItem('sinfrenos:wishlist')).toBe('[]')
  })

  it('dos instancias del hook (ej. una card y la página de favoritos) quedan sincronizadas', async () => {
    const a = renderHook(() => useWishlist())
    const b = renderHook(() => useWishlist())
    await waitFor(() => expect(a.result.current.hydrated).toBe(true))
    await waitFor(() => expect(b.result.current.hydrated).toBe(true))

    act(() => a.result.current.toggleWishlist('vehiculos', 'bmw-m4'))

    await waitFor(() => expect(b.result.current.isWishlisted('vehiculos', 'bmw-m4')).toBe(true))
  })

  it('ignora un valor corrupto en localStorage en vez de romper', async () => {
    window.localStorage.setItem('sinfrenos:wishlist', '{not valid json')
    const { result } = renderHook(() => useWishlist())
    await waitFor(() => expect(result.current.hydrated).toBe(true))
    expect(result.current.count).toBe(0)
  })
})
