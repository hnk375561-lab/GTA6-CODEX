import Link from 'next/link'
import { EntityType } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { MagicCard } from '@/components/ui/MagicCard'
import { Badge } from '@/components/ui/Badge'
import { AnimatedText } from '@/components/ui/AnimatedText'
import { Reveal } from '@/components/ui/Reveal'
import { CountUp } from '@/components/ui/CountUp'
import { AuroraText } from '@/components/ui/AuroraText'
import { Marquee } from '@/components/ui/Marquee'
import { ShineBorder } from '@/components/ui/ShineBorder'
import { WordRotate } from '@/components/ui/WordRotate'
import { HeroBackdrop } from '@/components/layout/HeroBackdrop'
import {
  getEntityCount,
  getEntityCountsByType,
  getFeaturedEntities,
  getLastUpdatedAt,
} from '@/lib/entities'

export default async function Home() {
  const [entityCount, featured, countsByType, lastUpdatedIso] = await Promise.all([
    getEntityCount(),
    getFeaturedEntities(3),
    getEntityCountsByType(),
    getLastUpdatedAt(),
  ])

  const lastUpdatedLabel = lastUpdatedIso
    ? new Date(lastUpdatedIso)
        .toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
        .replace('.', '')
    : null

  const categories = [
    {
      type: EntityType.CHARACTER,
      label: 'Personajes',
      description: 'Explora los personajes principales y secundarios de GTA 6.',
      icon: '👤',
    },
    {
      type: EntityType.VEHICLE,
      label: 'Vehículos',
      description: 'Descubre todos los vehículos disponibles en el juego.',
      icon: '🚗',
    },
    {
      type: EntityType.LOCATION,
      label: 'Ubicaciones',
      description: 'Conoce los distritos, barrios y puntos de interés de GTA 6.',
      icon: '📍',
    },
    {
      type: EntityType.MISSION,
      label: 'Misiones',
      description: 'Información detallada sobre las misiones principales y secundarias.',
      icon: '🎯',
    },
    {
      type: EntityType.NEWS,
      label: 'Noticias',
      description: 'Últimas noticias, rumores y actualizaciones sobre GTA 6.',
      icon: '📰',
    },
    {
      type: EntityType.GUIDE,
      label: 'Guías',
      description: 'Guías completas y tutoriales para dominar el juego.',
      icon: '📚',
    },
  ]

  return (
    <>
      {/* Hero Section — composición por capas (ver globals.css y HeroBackdrop):
          0 fondo · 1 scanline · 2 grid (FlickeringGrid) · 3 bloom ambiental ·
          4 contenido · 5 metadata técnica · 6 CTA. Entrada: pill → título →
          rotador → copy → metadata → CTA, escalonada, nunca simultánea. */}
      <section className="relative overflow-hidden border-b border-gta-border bg-gradient-to-b from-gta-card to-gta-dark py-20 sm:py-32">
        <HeroBackdrop />

        <div className="container-max relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal delay={0} direction="zoom" className="mb-6 flex justify-center">
              <div className="hero-pill">
                <ShineBorder shineColor={['#00d000', '#ff6600']} borderWidth={1} duration={9} />
                <span className="hero-pill-dot" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-gta-text">{entityCount}</strong> entidades documentadas
                </span>
              </div>
            </Reveal>

            {/* Título: elemento visual principal. reveal-blur da la sensación
                de "archivo revelándose" (blur → foco) en vez de un pop-in.
                AuroraText sigue siendo perfectamente legible con la animación
                desactivada (prefers-reduced-motion la congela en un frame). */}
            <Reveal delay={140} className="reveal-blur mb-2">
              <h1 className="text-5xl font-bold sm:text-6xl">
                <AuroraText colors={['#00d000', '#7dffb0', '#ff6600', '#00d000']} speed={1.2}>
                  GTA6 Codex
                </AuroraText>
              </h1>
            </Reveal>

            {/* La palabra rotativa refuerza las categorías principales del sitio:
                es navegación implícita, no decoración (Nivel 3 — hero). */}
            <Reveal
              delay={320}
              className="mb-6 flex items-center justify-center gap-2 text-xl text-gta-text-secondary"
            >
              <span>Explorá</span>
              <WordRotate
                words={['Personajes', 'Vehículos', 'Ubicaciones', 'Misiones', 'Organizaciones']}
                duration={2200}
                className="font-semibold text-gta-accent"
              />
            </Reveal>

            <p className="mb-6 text-xl text-gta-text-secondary">
              <AnimatedText
                text="El wiki editorial más completo sobre Grand Theft Auto 6."
                mode="words"
                startDelay={480}
              />
            </p>
            <Reveal delay={640}>
              <p className="mb-8 text-gta-text-secondary">
                Información verificada, rumores, análisis profundo y contenido exclusivo en un solo lugar.
              </p>
            </Reveal>

            {/* Metadata técnica (Capa 5): solo datos reales del repo, nada
                inventado — conteo real y fecha real de última actualización. */}
            <Reveal delay={780} className="mb-8 hero-meta">
              <span className="hero-meta-item">GTA VI</span>
              <span className="hero-meta-sep">/</span>
              <span className="hero-meta-item">LEONIDA</span>
              <span className="hero-meta-sep">/</span>
              <span className="hero-meta-item">DATABASE</span>
              {lastUpdatedLabel && (
                <>
                  <span className="hero-meta-sep">/</span>
                  <span className="hero-meta-item">Actualizado {lastUpdatedLabel}</span>
                </>
              )}
            </Reveal>

            {/* CTA Buttons */}
            <Reveal delay={940} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={`/${EntityType.CHARACTER}`}
                className="btn-shine btn-pop inline-flex items-center justify-center rounded-lg bg-gta-accent px-8 py-3 font-semibold text-gta-dark transition-colors hover:bg-gta-accent-orange"
              >
                Explorar
              </Link>
              <Link
                href="/buscar"
                className="btn-shine btn-pop inline-flex items-center justify-center rounded-lg border border-gta-accent px-8 py-3 font-semibold text-gta-accent transition-colors hover:bg-gta-accent/10"
              >
                Buscar
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Ticker de categorías: refuerza el conteo por tipo con sensación de
          feed en vivo / HUD técnico, sin bloquear ninguna interacción. */}
      <div className="category-ticker" aria-hidden="true">
        <Marquee pauseOnHover className="[--duration:38s] py-2">
          {categories.map((category, i) => (
            <span key={category.type} className="category-ticker-item">
              <span>{category.icon}</span>
              <span>{category.label}</span>
              <strong>{countsByType[category.type] ?? 0}</strong>
              {i < categories.length - 1 && <span className="category-ticker-sep">/</span>}
            </span>
          ))}
        </Marquee>
      </div>

      {/* Info Section */}
      <section className="border-b border-gta-border bg-gta-dark py-12">
        <div className="container-max">
          <div className="grid gap-8 sm:grid-cols-3">
            <Reveal delay={0} direction="zoom" className="text-center">
              <div className="mb-2 text-3xl font-bold text-gta-accent">
                <CountUp end={entityCount} />
              </div>
              <p className="text-sm text-gta-text-secondary">Entidades documentadas</p>
            </Reveal>
            <Reveal delay={120} direction="zoom" className="text-center">
              <div className="mb-2 text-3xl font-bold text-gta-accent-orange">
                <CountUp end={100} suffix="%" />
              </div>
              <p className="text-sm text-gta-text-secondary">Información verificada</p>
            </Reveal>
            <Reveal delay={240} direction="zoom" className="text-center">
              <div className="mb-2 animate-float text-3xl font-bold text-gta-accent">Premium</div>
              <p className="text-sm text-gta-text-secondary">Análisis de primer nivel</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      {featured.length > 0 && (
        <section className="bg-gta-dark py-16 sm:py-24">
          <div className="container-max">
            <Reveal className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-gta-text">
                <AnimatedText text="Destacados" mode="letters" stagger={35} />
              </h2>
              <p className="text-lg text-gta-text-secondary">Lo más relevante ahora mismo</p>
            </Reveal>

            {/* Level 3 del card system: único uso de MagicCard con tilt en
                todo el sitio, reservado a contenido curado como "featured"
                (máx. 3 items). Se descartó sumar <ShineBorder /> acá: su
                animate-shine corre en loop infinito incluso sin hover — en
                una card eso es exactamente el "efecto continuo innecesario"
                que la Fase 5 pide evitar. El spotlight+tilt de MagicCard ya
                es 100% event-driven (solo corre mientras el mouse está
                encima), que es la sensación premium correcta acá. */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((entity, i) => (
                <Reveal key={`${entity.type}-${entity.slug}`} delay={i * 100}>
                  <Link href={`/${entity.type}/${entity.slug}`} className="group block h-full">
                    <MagicCard tilt className="h-full p-6">
                      <Badge variant="status" status={entity.status} className="mb-3">
                        {entity.status}
                      </Badge>
                      <h3 className="mb-2 text-xl font-bold text-gta-text transition-colors group-hover:text-gta-accent">
                        {entity.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-gta-text-secondary">
                        {entity.description}
                      </p>
                    </MagicCard>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section id="categories" className="bg-gta-dark py-16 sm:py-24">
        <div className="container-max">
          <Reveal className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gta-text">
              <AnimatedText text="Categorías" mode="letters" stagger={35} />
            </h2>
            <p className="text-lg text-gta-text-secondary">
              Accede a información detallada organizadas por categoría
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, i) => (
              <Reveal
                key={category.type}
                delay={(i % 3) * 100}
                direction={i % 2 === 0 ? 'left' : 'right'}
              >
                <Link href={`/${category.type}`} className="group block h-full">
                  <Card hoverable className="h-full">
                    <CardBody>
                      <div className="mb-3 text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                        {category.icon}
                      </div>
                      <h3 className="mb-2 text-xl font-bold text-gta-text group-hover:text-gta-accent transition-colors">
                        {category.label}
                      </h3>
                      <p className="text-sm text-gta-text-secondary">
                        {category.description}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="border-t border-gta-border bg-gta-dark py-16 sm:py-24">
        <div className="container-max">
          <Reveal className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gta-text">
              Sobre GTA6 Codex
            </h2>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-2">
            <Reveal direction="left">
              <Card>
                <CardBody>
                  <h3 className="mb-3 text-xl font-bold text-gta-text">
                    ¿Qué es GTA6 Codex?
                  </h3>
                  <p className="text-sm text-gta-text-secondary leading-relaxed">
                    Un proyecto editorial dedicado a documentar y analizar cada aspecto de
                    Grand Theft Auto 6. Combinamos información oficial, análisis profundo y
                    discusiones de la comunidad.
                  </p>
                </CardBody>
              </Card>
            </Reveal>

            <Reveal direction="right" delay={120}>
              <Card>
                <CardBody>
                  <h3 className="mb-3 text-xl font-bold text-gta-text">
                    Sistemas de Información
                  </h3>
                  <div className="stagger space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge status="confirmado">Confirmado</Badge>
                      <span className="text-xs text-gta-text-secondary">
                        Información oficial o verificada
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status="rumor">Rumor</Badge>
                      <span className="text-xs text-gta-text-secondary">
                        No confirmado, especulación
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status="nuestro">Nuestro</Badge>
                      <span className="text-xs text-gta-text-secondary">
                        Análisis y teorías propias
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
