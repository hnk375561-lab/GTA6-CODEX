import { describe, expect, it } from 'vitest'
import { EVIDENCE_STAMP_META, type EvidenceLevel } from '@/lib/evidence'

describe('EVIDENCE_STAMP_META', () => {
  it('contiene todas las 5 categorías de nivel de evidencia', () => {
    const expectedLevels: EvidenceLevel[] = [
      'oficial-nombrado',
      'oficial-visual-multifuente',
      'oficial-visual',
      'respaldado',
      'especulativo',
    ]
    expectedLevels.forEach((level) => {
      expect(EVIDENCE_STAMP_META[level]).toBeDefined()
    })
  })

  it('cada entrada tiene icon, shortLabel y className', () => {
    Object.entries(EVIDENCE_STAMP_META).forEach(([_level, meta]) => {
      expect(meta.icon).toBeDefined()
      expect(typeof meta.icon).toBe('string')
      expect(meta.icon.length).toBeGreaterThan(0)

      expect(meta.shortLabel).toBeDefined()
      expect(typeof meta.shortLabel).toBe('string')
      expect(meta.shortLabel.length).toBeGreaterThan(0)

      expect(meta.className).toBeDefined()
      expect(typeof meta.className).toBe('string')
      expect(meta.className.length).toBeGreaterThan(0)
    })
  })

  it('los tres niveles "oficial-*" comparten el mismo estilo visual (verde)', () => {
    const oficialStyles = [
      EVIDENCE_STAMP_META['oficial-nombrado'].className,
      EVIDENCE_STAMP_META['oficial-visual-multifuente'].className,
      EVIDENCE_STAMP_META['oficial-visual'].className,
    ]
    // Todos contienen "emerald" (verde) en las clases
    oficialStyles.forEach((style) => {
      expect(style).toContain('emerald')
    })
  })

  it('respaldado tiene estilo naranja', () => {
    const className = EVIDENCE_STAMP_META.respaldado.className
    expect(className).toContain('gta-accent-orange')
  })

  it('especulativo tiene estilo warning (amarillo/naranja)', () => {
    const className = EVIDENCE_STAMP_META.especulativo.className
    expect(className).toContain('gta-accent-warning')
  })

  it('los iconos oficial-visual son simétricos (◎ igual)', () => {
    expect(EVIDENCE_STAMP_META['oficial-visual-multifuente'].icon).toBe('◎')
    expect(EVIDENCE_STAMP_META['oficial-visual'].icon).toBe('◎')
  })

  it('shortLabel es más compacto que lo que se usaría en ficha', () => {
    // Los shortLabel son para el grid compacto de cards
    // Todos tienen menos de 25 caracteres para caber en space limitado
    Object.values(EVIDENCE_STAMP_META).forEach((meta) => {
      expect(meta.shortLabel.length).toBeLessThan(25)
    })
  })

  it('respeta la distinción editorial: oficial-nombrado vs oficial-visual', () => {
    const nombrado = EVIDENCE_STAMP_META['oficial-nombrado']
    const visual = EVIDENCE_STAMP_META['oficial-visual']
    // Ambos son verdes pero el icon y label diferencian
    expect(nombrado.icon).not.toBe(visual.icon)
    expect(nombrado.shortLabel).not.toBe(visual.shortLabel)
  })

  it('oficial-visual y oficial-visual-multifuente se ven igual en grid (distinción en ficha)', () => {
    const visual = EVIDENCE_STAMP_META['oficial-visual']
    const multifuente = EVIDENCE_STAMP_META['oficial-visual-multifuente']
    // Ambos usan el mismo icon y label en el grid compacto de cards
    // La distinción real (multifuente vs single source) se explica en la ficha completa
    expect(visual.icon).toBe(multifuente.icon)
    expect(visual.shortLabel).toBe(multifuente.shortLabel)
    // Pero se diferencian levemente en className (opacidad)
    expect(visual.className).not.toBe(multifuente.className)
  })
})
