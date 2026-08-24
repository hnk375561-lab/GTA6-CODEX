// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { WordRotate } from './WordRotate'

const WORDS = ['personaje', 'vehículo', 'ubicación', 'misión']

describe('WordRotate', () => {
  it('expone las 4 palabras completas a lectores de pantalla vía sr-only (regresión del bug de a11y)', () => {
    // Antes solo existía la palabra visualmente montada en el DOM, sin
    // ningún span sr-only — un lector de pantalla perdía 3 de los 4
    // conceptos de la frase. Este test falla si el span sr-only se borra
    // o deja de incluir la lista completa.
    const { container } = render(<WordRotate words={WORDS} />)
    const srOnly = container.querySelector('.sr-only')
    expect(srOnly).not.toBeNull()
    expect(srOnly?.textContent).toBe('personaje, vehículo, ubicación, misión')
  })

  it('marca la palabra visible como aria-hidden (es puramente decorativa)', () => {
    const { container } = render(<WordRotate words={WORDS} />)
    const visible = container.querySelector('.word-rotate-item')
    expect(visible).toHaveAttribute('aria-hidden', 'true')
  })

  it('reserva el ancho con la palabra más larga en el ghost span', () => {
    const { container } = render(<WordRotate words={WORDS} />)
    const ghost = container.querySelector('.word-rotate-ghost')
    expect(ghost?.textContent).toBe('ubicación')
  })

  it('renderiza la primera palabra en el montaje inicial', () => {
    const { container } = render(<WordRotate words={WORDS} />)
    const visible = container.querySelector('.word-rotate-item')
    expect(visible?.textContent).toBe('personaje')
  })
})
