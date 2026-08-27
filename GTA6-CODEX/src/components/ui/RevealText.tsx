'use client'

import { ElementType, Fragment, useEffect, useRef, useState } from 'react'

interface RevealTextProps {
  /** Texto plano a animar. Debe ser un string (no JSX) para poder partirlo
   *  en palabras — para contenido con markup mixto seguí usando <Reveal>. */
  text: string
  className?: string
  /** Tag del elemento contenedor (por defecto 'span', para poder anidarlo
   *  dentro de cualquier <h1>/<h2>/<p> existente sin romper la semántica). */
  as?: ElementType
}

/**
 * Capítulo 3.1 de la Biblia del Scroll — "reveal por palabra/carácter, no
 * por bloque entero". Hermano de <Reveal> (mismo trigger por
 * IntersectionObserver, mismo criterio de "una sola vez"), pero en vez de
 * hacer aparecer todo el texto de golpe, arma la frase palabra por palabra
 * con un stagger entre cada una.
 *
 * La velocidad del stagger no es fija: se captura `--scroll-speed` (0..1,
 * publicado en <html> por `ScrollTelemetryBridge` a partir de la velocidad
 * real de Lenis — ver ese archivo) en el instante exacto en que el
 * IntersectionObserver dispara, y se mapea a un intervalo entre palabras:
 * scroll rápido → intervalo corto (la frase se arma en una cascada rápida);
 * scroll lento → intervalo largo (se arma despacio, palabra a palabra,
 * bien legible). Es una foto de la velocidad en ese instante, no un valor
 * que se re-computa en cada frame — así la cascada de una frase mantiene un
 * ritmo interno consistente de principio a fin en vez de acelerar/frenar a
 * mitad de su propia animación si la persona sigue scrolleando mientras el
 * texto todavía se está formando.
 *
 * Sigue el mismo patrón ya usado en `.hero-title-word` (globals.css): cada
 * palabra es un <span> con una custom property inline (`--word-delay`) que
 * alimenta un `transition-delay` en CSS — cero animación manejada por JS,
 * solo el cálculo del delay y el toggle de la clase que dispara la
 * transición.
 */
const MIN_WORD_INTERVAL_MS = 22 // scroll rápido: cascada casi instantánea
const MAX_WORD_INTERVAL_MS = 70 // scroll lento/quieto: se arma palabra a palabra, legible
const MAX_STAGGERED_WORDS = 14 // frases muy largas: acotar el delay total (ver nota abajo)

export function RevealText({ text, className = '', as: Tag = 'span' }: RevealTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return

        // Foto de la velocidad de scroll en el instante del trigger (ver
        // comentario del componente). Fallback a 0 (scroll quieto/lento) si
        // la variable todavía no fue publicada por `ScrollTelemetryBridge`
        // (por ejemplo, primer render antes de cualquier scroll).
        const rawSpeed = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--scroll-speed')
        )
        const speed = Number.isFinite(rawSpeed) ? Math.min(Math.max(rawSpeed, 0), 1) : 0
        const interval = MAX_WORD_INTERVAL_MS - speed * (MAX_WORD_INTERVAL_MS - MIN_WORD_INTERVAL_MS)

        node.style.setProperty('--word-interval', `${interval}ms`)
        setVisible(true)
        observer.unobserve(node)
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const words = text.trim().split(/\s+/)

  return (
    <Tag
      ref={ref}
      className={`reveal-text ${visible ? 'reveal-text-visible' : ''} ${className}`.trim()}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          <span
            className="reveal-text-word"
            // Frases largas: cappear el índice usado para el delay en
            // MAX_STAGGERED_WORDS en vez de dejar que la última palabra de
            // un titular de 20 palabras espere segundos enteros — a partir
            // de ese punto, las palabras restantes entran juntas con el
            // delay de la palabra #14, no una detrás de otra hasta el
            // infinito.
            style={{ ['--word-index' as string]: Math.min(i, MAX_STAGGERED_WORDS) }}
          >
            {word}
          </span>
          {/* Espacio normal (no NBSP), fuera del span animado: el
              navegador sigue pudiendo cortar línea acá igual que en texto
              plano — necesario para que titulares largos sigan haciendo
              wrap normal en mobile. */}
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Tag>
  )
}
