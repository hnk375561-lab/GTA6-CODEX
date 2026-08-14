'use client'

import { ElementType, useMemo } from 'react'

interface AnimatedTextProps {
  text: string
  as?: ElementType
  className?: string
  /** 'letters' anima cada carácter, 'words' anima cada palabra completa */
  mode?: 'letters' | 'words'
  /** Delay inicial en ms antes de que arranque la primera unidad */
  startDelay?: number
  /** Separación en ms entre cada unidad animada */
  stagger?: number
  /** Clase para aplicar degradado animado (text-shimmer) sobre el texto */
  shimmer?: boolean
}

/**
 * Divide un texto en <span> individuales (letras o palabras) y les aplica
 * una animación de entrada escalonada vía CSS (letter-rise / word-rise).
 * 100% CSS-driven: no depende de IntersectionObserver, pensado para
 * elementos above-the-fold (héroes, títulos de sección al montar).
 */
export function AnimatedText({
  text,
  as: Tag = 'span',
  className = '',
  mode = 'letters',
  startDelay = 0,
  stagger,
  shimmer = false,
}: AnimatedTextProps) {
  const units = useMemo(() => {
    if (mode === 'words') {
      return text.split(' ')
    }
    return Array.from(text)
  }, [text, mode])

  const defaultStagger = mode === 'words' ? 70 : 28
  const gap = stagger ?? defaultStagger

  return (
    <Tag className={`${shimmer ? 'text-shimmer' : ''} ${className}`.trim()} aria-label={text}>
      {units.map((unit, i) => (
        <span
          key={`${unit}-${i}`}
          aria-hidden="true"
          className={mode === 'words' ? 'split-word' : 'split-letter'}
          style={{ ['--d' as string]: `${startDelay + i * gap}ms` }}
        >
          {unit === ' ' ? '\u00A0' : unit}
          {mode === 'words' && i < units.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  )
}
