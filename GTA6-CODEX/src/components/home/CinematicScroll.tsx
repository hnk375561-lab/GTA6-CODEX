'use client'

/**
 * CinematicScroll — hero de scroll cinemático (shards tipográficos que se
 * separan, parallax por capas, marquee, cursor propio, barra de progreso).
 *
 * Contenido 100% original (nombres de zona inventados, sin relación con
 * ninguna obra de terceros). Reemplazá WORDS, ZONES y TICKER_ITEMS por tu
 * propio contenido con derechos en regla.
 *
 * Es un Client Component porque usa refs de DOM, scroll, mouse y rAF —
 * no puede vivir en un Server Component (mismo motivo que HeroScrollCue).
 */

import { useEffect, useRef, useState } from 'react'

type Shard = { t: string; x: number; y: number; c: string }

const SHARDS: Shard[] = [
  { t: 'DRIFTWOOD BAY', x: -260, y: -160, c: 'var(--cs-magenta)' },
  { t: 'CINDER ROW', x: -90, y: -230, c: 'var(--cs-amber)' },
  { t: 'HALCYON PIER', x: 120, y: -210, c: 'var(--cs-teal)' },
  { t: 'LOWTOWN', x: 260, y: -120, c: 'var(--cs-magenta)' },
  { t: 'ECHO STRIP', x: -300, y: 60, c: 'var(--cs-amber)' },
  { t: 'SALT FLATS', x: -40, y: 120, c: 'var(--cs-teal)' },
  { t: 'IRONBRIDGE', x: 180, y: 100, c: 'var(--cs-magenta)' },
  { t: 'THE HOLLOW', x: 320, y: 40, c: 'var(--cs-amber)' },
  { t: '2026', x: 0, y: -40, c: 'var(--cs-teal)' },
]

const ZONES = [
  { name: 'Halcyon\nPier', tag: 'Distrito costero', speed: 0.05 },
  { name: 'Lowtown', tag: 'Centro histórico', speed: 0.12 },
  { name: 'Echo\nStrip', tag: 'Zona nocturna', speed: 0.22 },
]

const TICKER_ITEMS = ['MIDNIGHT COAST', 'MUNDO ABIERTO', 'DEMO TÉCNICA', 'CONTENIDO PROPIO', 'SCROLL FLUIDO']

const SECTION_IDS = ['cs-hero', 'cs-reveal', 'cs-ticker', 'cs-zones', 'cs-banner']

export function CinematicScroll() {
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollSpaceRef = useRef<HTMLDivElement>(null)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const shardRefs = useRef<(HTMLDivElement | null)[]>([])
  const tickerTrackRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [activeSection, setActiveSection] = useState(0)
  const [fps, setFps] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    const scrollSpace = scrollSpaceRef.current
    if (!track || !scrollSpace) return

    function syncHeight() {
      const footer = document.getElementById('cs-footer')
      scrollSpace!.style.height = track!.scrollHeight + (footer?.offsetHeight ?? 0) + 'px'
    }
    syncHeight()
    window.addEventListener('resize', syncHeight)

    let current = 0
    let target = window.scrollY
    const LERP_RATE = 7.5
    function onScroll() {
      target = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    let mouseXNorm = 0
    let mouseYNorm = 0
    function onMouseMove(e: MouseEvent) {
      mouseXNorm = (e.clientX / window.innerWidth - 0.5) * 2
      mouseYNorm = (e.clientY / window.innerHeight - 0.5) * 2
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    // navegación por teclado: flecha abajo/arriba salta de sección
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
      const vh = window.innerHeight
      let idx = 0
      sections.forEach((s, i) => { if (window.scrollY + vh * 0.5 >= s.offsetTop) idx = i })
      const nextIdx = e.key === 'ArrowDown' ? Math.min(idx + 1, sections.length - 1) : Math.max(idx - 1, 0)
      sections[nextIdx]?.scrollIntoView({ behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKeyDown)

    // reveal-on-scroll: agrega .cs-in cuando el elemento entra en viewport
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.cs-reveal-el'))
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('cs-in') }),
      { threshold: 0.2 }
    )
    revealEls.forEach((el) => io.observe(el))

    let tickerX = 0
    let lastT = performance.now()
    let frames = 0
    let fpsAccum = 0
    let raf = 0

    function updateHero(p: number) {
      shardRefs.current.forEach((el, i) => {
        if (!el) return
        const s = SHARDS[i]
        const spread = 1 + p * 3.2
        const drift = p * (120 + i * 14)
        const depth = 6 + (i % 4) * 4
        const x = s.x * spread + mouseXNorm * depth
        const y = s.y * spread - drift + mouseYNorm * depth
        const r = p * 18 * (i % 2 === 0 ? 1 : -1) + mouseXNorm * (i % 2 === 0 ? 3 : -3)
        el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`
        el.style.opacity = String(Math.max(0, 0.9 - p * 1.1))
      })
      if (wordmarkRef.current) {
        wordmarkRef.current.style.transform =
          `translateY(${p * 60}px) translate(${mouseXNorm * -8}px, ${mouseYNorm * -8}px)`
        wordmarkRef.current.style.opacity = String(Math.max(0, 1 - p * 1.6))
      }
    }

    function updateParallax(scrollY: number) {
      document.querySelectorAll<HTMLElement>('[data-cs-speed]').forEach((el) => {
        const speed = parseFloat(el.dataset.csSpeed || '0')
        const section = el.closest('section')
        const rel = scrollY - (section instanceof HTMLElement ? section.offsetTop : 0)
        el.style.transform = `translateY(${rel * speed}px)`
      })
    }

    function updateActiveSection(scrollY: number) {
      const vh = window.innerHeight
      let idx = 0
      SECTION_IDS.forEach((id, i) => {
        const el = document.getElementById(id)
        if (el && scrollY + vh * 0.5 >= el.offsetTop) idx = i
      })
      setActiveSection(idx)
    }

    function tick(now: number) {
      const dt = now - lastT
      lastT = now
      const dtSec = Math.min(dt, 50) / 1000
      frames++
      fpsAccum += dt
      if (fpsAccum > 500) {
        setFps(Math.round(1000 / (fpsAccum / frames)))
        frames = 0
        fpsAccum = 0
      }

      const lerpFactor = 1 - Math.exp(-LERP_RATE * dtSec)
      current += (target - current) * lerpFactor
      if (Math.abs(target - current) < 0.05) current = target

      track!.style.transform = `translate3d(0, ${-current}px, 0)`

      const hero = document.getElementById('cs-hero')
      const heroH = hero?.offsetHeight ?? 1
      updateHero(Math.min(1, current / (heroH * 0.9)))
      updateParallax(current)
      updateActiveSection(current)

      if (progressRef.current) {
        const max = track!.scrollHeight - window.innerHeight
        const pct = max > 0 ? Math.min(1, current / max) : 0
        progressRef.current.style.transform = `scaleX(${pct})`
      }

      if (tickerTrackRef.current) {
        tickerX -= 40 * dtSec
        const loopWidth = tickerTrackRef.current.scrollWidth / 3
        if (Math.abs(tickerX) > loopWidth) tickerX += loopWidth
        tickerTrackRef.current.style.transform = `translate3d(${tickerX}px,0,0)`
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', syncHeight)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function goToSection(i: number) {
    document.getElementById(SECTION_IDS[i])?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="cs-root">
      <div ref={progressRef} className="cs-progress" />
      <nav className="cs-rail" aria-label="Progreso de secciones">
        {SECTION_IDS.map((id, i) => (
          <button
            key={id}
            type="button"
            className={i === activeSection ? 'cs-rail-dot active' : 'cs-rail-dot'}
            aria-label={`Ir a sección ${i + 1}`}
            onClick={() => goToSection(i)}
          />
        ))}
      </nav>
      <div ref={cursorRef} className="cs-cursor" aria-hidden="true" />
      <div className="cs-counter">
        <b>{String(activeSection + 1).padStart(2, '0')}</b> / {SECTION_IDS.length}
      </div>

      <div ref={scrollSpaceRef} className="cs-scroll-space">
        <div className="cs-viewport">
          <div ref={trackRef} className="cs-track">

            <section id="cs-hero" className="cs-section cs-hero">
              <div className="cs-shard-field">
                {SHARDS.map((s, i) => (
                  <div
                    key={s.t}
                    ref={(el) => { shardRefs.current[i] = el }}
                    className="cs-word-shard"
                    style={{ color: s.c, borderColor: s.c, fontSize: 12 + (i % 3) * 2 }}
                  >
                    {s.t}
                  </div>
                ))}
              </div>
              <div ref={wordmarkRef} className="cs-wordmark">
                <div className="cs-eyebrow">Mundo abierto original — contenido propio</div>
                <h1>MIDNIGHT<br />COAST</h1>
                <div className="cs-sub">Solo tipografía, cero assets ajenos</div>
              </div>
              <div className="cs-hero-glow" />
              <div className="cs-hero-meta">
                <span className="cs-eyebrow">Scroll cinemático</span>
                <div className="cs-scroll-cue"><span>Scroll</span><div className="cs-scroll-line" /></div>
                <span className="cs-eyebrow">v1.2</span>
              </div>
            </section>

            <section id="cs-reveal" className="cs-section cs-reveal">
              <div className="cs-grid">
                <div className="cs-reveal-el" data-delay="1">
                  <div className="cs-eyebrow">Cómo funciona</div>
                  <h2>Los fragmentos<br />son palabras.</h2>
                  <p>Cada &quot;shard&quot; del hero es una etiqueta tipográfica que reacciona
                    al scroll y al mouse. El motor interpola con tiempo real (no con
                    frames), así se siente igual en cualquier dispositivo.</p>
                  <div className="cs-badges">
                    <div>60FPS objetivo</div>
                    <div>Solo transform/opacity</div>
                    <div>Navegable con teclado</div>
                  </div>
                </div>
                <div className="cs-dossier cs-reveal-el" data-delay="2">
                  <div className="cs-row"><span>Zona</span><span>Driftwood Bay</span></div>
                  <div className="cs-row"><span>Clima</span><span>Subtropical</span></div>
                  <div className="cs-row"><span>Densidad</span><span>Alta</span></div>
                  <div className="cs-row"><span>Estado</span><span>En construcción</span></div>
                  <div className="cs-row"><span>Motor de scroll</span><span>rAF + lerp</span></div>
                </div>
              </div>
            </section>

            <section id="cs-ticker" className="cs-section cs-ticker">
              <div ref={tickerTrackRef} className="cs-ticker-track">
                {Array.from({ length: 3 }).flatMap((_, r) =>
                  TICKER_ITEMS.map((w, i) => (
                    <span key={`${r}-${i}`} className="cs-ticker-item">
                      {w}<span className="cs-ticker-dot" />
                    </span>
                  ))
                )}
              </div>
            </section>

            <section id="cs-zones" className="cs-section cs-zones">
              <div className="cs-eyebrow">Zonas del mundo (placeholder)</div>
              <h2>Cada tarjeta, su propia velocidad.</h2>
              <div className="cs-zone-row">
                {ZONES.map((z, i) => (
                  <div
                    key={z.name}
                    className="cs-zone-card cs-reveal-el"
                    data-cs-speed={z.speed}
                    data-delay={i + 1}
                  >
                    <span className="cs-idx">{String(i + 1).padStart(2, '0')} / {['LENTA', 'MEDIA', 'RÁPIDA'][i]}</span>
                    <div>
                      <h3>{z.name.split('\n').map((line, li) => <span key={li}>{line}<br /></span>)}</h3>
                      <span className="cs-tag">{z.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="cs-banner" className="cs-section cs-banner">
              <div className="cs-layer cs-layer-1" data-cs-speed="0.08" />
              <div className="cs-layer cs-layer-2" data-cs-speed="0.16" />
              <div className="cs-banner-content cs-reveal-el" data-delay="1">
                <div className="cs-eyebrow">Listo para tu contenido</div>
                <h2>Reemplazá las etiquetas por tus propios textos.</h2>
                <p>Toda la mecánica —scroll suave, shards tipográficos, parallax por
                  capas, snap entre secciones— es independiente del contenido.</p>
              </div>
            </section>

            <footer id="cs-footer" className="cs-footer">
              <span>Contenido original — sin assets de terceros</span>
              <span>{fps} fps</span>
            </footer>

          </div>
        </div>
      </div>
    </div>
  )
}
