// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountUp } from './CountUp'

describe('CountUp', () => {
  beforeEach(() => {
    // jsdom no implementa IntersectionObserver: se stubea con una versión
    // mínima que nunca invoca el callback, así el efecto de animación no
    // corre y los tests se enfocan en el HTML inicial (que es justo lo que
    // se rompía antes de la corrección).
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderiza el valor final en el primer render, no 0 (regresión del bug de SSR)', () => {
    // Antes `useState(0)` hacía que el HTML estático (lo que ve un
    // crawler sin JS) siempre mostrara "0" sin importar `end`. Este test
    // falla si alguien vuelve a poner `useState(0)`.
    render(<CountUp end={247} />)
    expect(screen.getByText('247')).toBeInTheDocument()
  })

  it('formatea el valor con separador de miles en formato es-ES', () => {
    render(<CountUp end={1234} />)
    // Se compara contra `toLocaleString` real del entorno de test en vez
    // de hardcodear "1.234": algunos builds de Node sin ICU completo (p.
    // ej. small-icu) devuelven "1234" sin separador para 'es-ES' aunque el
    // componente esté llamando a `toLocaleString` correctamente — lo que
    // este test debe cubrir es que `CountUp` usa el mismo formateo que el
    // propio runtime, no una cadena fija que dependa de qué ICU haya
    // disponible en la máquina que corre el test.
    expect(screen.getByText((1234).toLocaleString('es-ES'))).toBeInTheDocument()
  })

  it('agrega prefix y suffix alrededor del número', () => {
    render(<CountUp end={50} prefix="+" suffix="%" />)
    expect(screen.getByText('+50%')).toBeInTheDocument()
  })

  it('no muestra "0" para end=0 seguido de ceros incorrectos', () => {
    render(<CountUp end={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
