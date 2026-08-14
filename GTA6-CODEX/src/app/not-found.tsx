import Link from 'next/link'
import { AnimatedText } from '@/components/ui/AnimatedText'
import { Reveal } from '@/components/ui/Reveal'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gta-dark">
      <div className="container-narrow text-center py-20">
        <div className="mb-8">
          <div className="text-9xl font-bold text-gta-accent mb-4">
            <AnimatedText text="404" mode="letters" shimmer stagger={90} />
          </div>
          <h1 className="text-4xl font-bold text-gta-text mb-2">
            <AnimatedText text="Página No Encontrada" mode="words" startDelay={350} stagger={90} />
          </h1>
          <Reveal delay={750}>
            <p className="text-lg text-gta-text-secondary mb-8">
              Parece que esta ubicación no existe en el código de GTA 6.
            </p>
          </Reveal>
        </div>

        <Reveal delay={900} className="space-y-4">
          <Link
            href="/"
            className="btn-shine btn-pop inline-block bg-gta-accent px-8 py-3 font-semibold text-gta-dark rounded-lg hover:bg-gta-accent-orange transition-colors"
          >
            Volver a Inicio
          </Link>
          <p className="text-sm text-gta-text-secondary">
            Si crees que esto es un error, contáctanos
          </p>
        </Reveal>
      </div>
    </div>
  )
}
