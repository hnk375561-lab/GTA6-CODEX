'use client'

import Link from 'next/link'
import { Reveal } from '@/components/ui/Reveal'

interface HomeIntroductionProps {
  vehicleCount: number
}

/**
 * PORTADA EDITORIAL BRUTALISTA
 * - Sin hero tradicional (no hero + imagen grande)
 * - Título desordenado, casi como graffiti tipográfico
 * - Números como acento visual (no como métrica oculta)
 * - Búsqueda/exploración como invitación, no CTA agresivo
 * - Composición asimétrica
 */
export function HomeIntroduction({ vehicleCount }: HomeIntroductionProps) {
  return (
    <div className="relative">
      {/* Número gigante de fondo (decorativo, no focal) */}
      <div
        className="absolute -left-20 -top-32 text-[20rem] font-display font-black leading-none text-edge opacity-5 pointer-events-none select-none"
        aria-hidden="true"
      >
        {vehicleCount}
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 space-y-12">
        {/* Línea 1: Título principal, desordenado */}
        <Reveal>
          <div className="space-y-4">
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-black leading-none tracking-tighter">
              Sin Frenos:
            </h1>
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-black leading-none tracking-tighter text-auto-accent ml-12 sm:ml-32 lg:ml-48">
              el archivo
              <br />
              vivo
            </h1>
          </div>
        </Reveal>

        {/* Línea 2: Datos visuales (no ocultos en cards) */}
        <Reveal delay={100}>
          <div className="grid grid-cols-3 gap-8 max-w-md">
            <div>
              <p className="font-mono text-4xl sm:text-5xl font-bold text-auto-accent">
                {vehicleCount}+
              </p>
              <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase mt-2">
                Vehículos
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl sm:text-5xl font-bold text-auto-accent-orange">
                ∞
              </p>
              <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase mt-2">
                Datos
              </p>
            </div>
            <div>
              <p className="font-mono text-4xl sm:text-5xl font-bold text-auto-gold">
                1
              </p>
              <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase mt-2">
                Lugar
              </p>
            </div>
          </div>
        </Reveal>

        {/* Línea 3: Copy + CTA integrada (NO botón destacado) */}
        <Reveal delay={150}>
          <div className="max-w-2xl space-y-6">
            <p className="text-lg sm:text-xl text-neutral-700 leading-relaxed font-light">
              Museo digital de máquinas. {vehicleCount}+ vehículos con datos verificados. 
              Especificaciones técnicas, rankings reales, simulador de cuota. 
              Todo lo que necesitás para elegir, sin salir.
            </p>

            {/* Exploración integrada al contenido, no sidebar */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/buscar"
                className="px-6 py-3 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-900 hover:bg-surface-alt transition-colors"
              >
                Buscar un modelo
              </Link>
              <Link
                href="/categorias"
                className="px-6 py-3 rounded-full border border-auto-accent/30 bg-auto-accent/5 text-sm font-semibold text-auto-accent hover:bg-auto-accent/10 transition-colors"
              >
                Ver por categoría
              </Link>
              <Link
                href="/rankings"
                className="px-6 py-3 rounded-full border border-auto-accent-orange/30 bg-auto-accent-orange/5 text-sm font-semibold text-auto-accent-orange hover:bg-auto-accent-orange/10 transition-colors"
              >
                Consultar rankings
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Decoración: líneas técnicas (ruptura visual) */}
      <Reveal delay={200} className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block">
        <div className="space-y-2 opacity-20">
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-400 to-transparent w-64" />
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-400 to-transparent w-48" />
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-400 to-transparent w-32" />
        </div>
      </Reveal>
    </div>
  )
}
