'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Comportamiento estándar de foco para un diálogo modal (ARIA Authoring
 * Practices Guide): guarda el elemento con foco al abrir, mueve el foco al
 * contenedor del modal, atrapa `Tab`/`Shift+Tab` dentro de los elementos
 * enfocables del modal mientras está abierto, y devuelve el foco al
 * elemento original al cerrarse.
 *
 * Se extrajo como hook compartido porque los 4 componentes del sitio que
 * usan `role="dialog"` (SimpleLightbox, GalleryExplorer,
 * VehicleCompareSheet, ConsentBanner) repetían el mismo patrón de
 * `useEffect` para `Escape`/scroll-lock, pero a ninguno le faltaba
 * exactamente esto: sin atrapar `Tab`, alguien navegando con teclado podía
 * salir del modal hacia elementos de la página de atrás mientras seguía
 * visualmente abierto; sin restaurar el foco, al cerrar quedaba flotando
 * en el `<body>` en vez de volver al botón que lo abrió.
 *
 * No maneja `Escape` ni el scroll lock del body a propósito — eso se queda
 * en cada componente porque ya varía levemente entre ellos (algunos
 * también atan flechas de navegación a `Escape`). Este hook solo resuelve
 * el foco.
 */
export function useModalFocus(open: boolean, containerRef: RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    containerRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, containerRef])
}
