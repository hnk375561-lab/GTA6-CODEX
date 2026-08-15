import Link from 'next/link'
import { EntityType } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Reveal } from '@/components/ui/Reveal'
import { CountUp } from '@/components/ui/CountUp'
import { WordRotate } from '@/components/ui/WordRotate'
import { RotatingHeroBackground } from '@/components/layout/RotatingHeroBackground'
import { EntityImage } from '@/components/entities/EntityImage'
import { SceneSection } from '@/components/webgl/SceneSection'
import { getEntityCount, getFeaturedEntities } from '@/lib/entities'

export default async function Home() {
  const [entityCount, featured] = await Promise.all([
    getEntityCount(),
    getFeaturedEntities(3),
  ])

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
      type: EntityType.TRAILER,
      label: 'Trailers',
      description: 'Análisis escena por escena del material oficial de Rockstar Games.',
      icon: '🎬',
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
      {/* Hero Section — cinematográfico pero contenido: un solo fondo con
          overlay de contraste, un solo acento de color, sin capas de efectos
          compitiendo con el título. La entrada (escala/blur/luz) está
          sincronizada con la apertura de iris del motor WebGL vía las
          variables --scene-* (ver SceneAmbientBridge); nunca oculta el
          contenido (opacity siempre 1) para no depender de que WebGL cargue. */}
      <SceneSection sceneId="hero" className="hero-gleam relative overflow-hidden border-b border-gta-border py-28 sm:py-44">
        <RotatingHeroBackground />
        <div className="hero-gleam-sweep" aria-hidden="true" />
        <div className="hero-scanlines" aria-hidden="true" />
        <div className="hero-vignette" aria-hidden="true" />
        <div className="container-max relative">
          <div className="hero-cinematic mx-auto max-w-3xl text-center">
            <Reveal delay={0} className="mb-8 flex justify-center">
              <div className="hero-pill">
                <span className="hero-pill-dot" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-gta-text">{entityCount}</strong> entidades documentadas
                </span>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <p className="hero-kicker mb-4 text-xs font-bold uppercase tracking-[0.3em] text-gta-accent">
                Bienvenido a Leonida · Vice City, 2026
              </p>
            </Reveal>

            <h1 className="hero-title mb-4 text-7xl font-black leading-[0.9] tracking-tight sm:text-9xl">
              <span className="block text-gta-text">GTA6</span>
              <span className="hero-title-accent block">Codex</span>
            </h1>

            <div className="mb-7 flex items-center justify-center gap-2 text-lg text-gta-text-secondary sm:text-2xl">
              <span>Explorá</span>
              <WordRotate
                words={['Personajes', 'Vehículos', 'Ubicaciones', 'Misiones', 'Organizaciones']}
                duration={2200}
                className="font-bold text-gta-accent"
              />
            </div>

            <p className="mb-10 text-balance text-lg text-gta-text-secondary sm:text-xl">
              La enciclopedia definitiva de Grand Theft Auto 6, reconstruida a fondo.
              Todo Leonida, verificado y en un solo lugar.
            </p>

            {/* CTA Buttons */}
            <Reveal delay={200} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={`/${EntityType.CHARACTER}`}
                className="hero-cta-primary inline-flex items-center justify-center gap-2 rounded-lg px-9 py-4 text-base font-bold text-gta-dark transition-all hover:-translate-y-0.5"
              >
                Entrar a Leonida
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/buscar"
                className="inline-flex items-center justify-center rounded-lg border-2 border-gta-border-strong px-9 py-4 text-base font-bold text-gta-text transition-all hover:-translate-y-0.5 hover:border-gta-accent hover:text-gta-accent"
              >
                Buscar
              </Link>
            </Reveal>
          </div>
        </div>

        {/* Primera interacción sugerida: aparece cuando la escena se asienta
            (--scene-intro), invita al primer scroll. Puramente decorativo,
            no altera la navegación ni el foco del teclado. */}
        <div className="hero-scroll-cue" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 7l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </SceneSection>

      {/* Info Section */}
      <SceneSection sceneId="stats" className="stats-band border-b border-gta-border bg-gta-dark py-16">
        <div className="container-max">
          <div className="grid divide-y divide-gta-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="stat-block text-center">
              <div className="stat-number mb-2 text-5xl font-black sm:text-6xl">
                <CountUp end={entityCount} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gta-text-secondary">
                Entidades documentadas
              </p>
            </div>
            <div className="stat-block text-center">
              <div className="stat-number mb-2 text-5xl font-black sm:text-6xl">
                <CountUp end={100} suffix="%" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gta-text-secondary">
                Información verificada
              </p>
            </div>
            <div className="stat-block text-center">
              <div className="stat-number mb-2 text-5xl font-black sm:text-6xl">Premium</div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gta-text-secondary">
                Análisis de primer nivel
              </p>
            </div>
          </div>
        </div>
      </SceneSection>

      {/* Featured Section */}
      {featured.length > 0 && (
        <SceneSection sceneId="featured" className="bg-gta-dark py-16 sm:py-24">
          <div className="container-max">
            <Reveal className="mb-12 text-center">
              <p className="section-kicker mb-3 text-xs font-bold uppercase tracking-[0.3em] text-gta-accent">
                Curado por el equipo
              </p>
              <h2 className="mb-4 text-4xl font-black text-gta-text sm:text-5xl">
                Destacados
              </h2>
              <p className="text-lg text-gta-text-secondary">Lo más relevante ahora mismo</p>
            </Reveal>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((entity, i) => (
                <Reveal key={`${entity.type}-${entity.slug}`} delay={i * 100}>
                  <Link href={`/${entity.type}/${entity.slug}`} className="group block h-full">
                    <Card hoverable className="featured-card h-full overflow-hidden !p-0">
                      <div className="relative overflow-hidden">
                        <EntityImage
                          entity={entity}
                          variant="thumbnail"
                          className="!rounded-none !border-0 transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gta-card via-gta-card/10 to-transparent" />
                        <Badge
                          variant="status"
                          status={entity.status}
                          className="absolute left-4 top-4"
                        >
                          {entity.status}
                        </Badge>
                      </div>
                      <CardBody className="px-6 pb-6 pt-4">
                        <h3 className="mb-2 text-2xl font-bold text-gta-text transition-colors group-hover:text-gta-accent">
                          {entity.title}
                        </h3>
                        <p className="line-clamp-2 text-sm text-gta-text-secondary">
                          {entity.description}
                        </p>
                      </CardBody>
                    </Card>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </SceneSection>
      )}

      {/* Categories Section */}
      <SceneSection sceneId="categories" htmlId="categories" className="bg-gta-dark py-16 sm:py-24">
        <div className="container-max">
          <Reveal className="mb-12 text-center">
            <p className="section-kicker mb-3 text-xs font-bold uppercase tracking-[0.3em] text-gta-accent">
              Explorá el codex
            </p>
            <h2 className="mb-4 text-4xl font-black text-gta-text sm:text-5xl">
              Categorías
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
                      <div className="category-icon-badge mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
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
      </SceneSection>

      {/* Info Cards */}
      <SceneSection sceneId="about" className="border-t border-gta-border bg-gta-dark py-16 sm:py-24">
        <div className="container-max">
          <Reveal className="mb-12 text-center">
            <p className="section-kicker mb-3 text-xs font-bold uppercase tracking-[0.3em] text-gta-accent">
              El proyecto
            </p>
            <h2 className="mb-4 text-3xl font-black text-gta-text sm:text-4xl">
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
      </SceneSection>
    </>
  )
}
