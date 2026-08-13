import Link from 'next/link'
import { EntityType } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
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
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gta-border bg-gradient-to-b from-gta-card to-gta-dark py-20 sm:py-32">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-5xl font-bold text-gta-text sm:text-6xl">
              GTA6 Codex
            </h1>
            <p className="mb-6 text-xl text-gta-text-secondary">
              El wiki editorial más completo sobre Grand Theft Auto 6.
            </p>
            <p className="mb-8 text-gta-text-secondary">
              Información verificada, rumores, análisis profundo y contenido exclusivo en un solo lugar.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={`/${EntityType.CHARACTER}`}
                className="inline-flex items-center justify-center rounded-lg bg-gta-accent px-8 py-3 font-semibold text-gta-dark transition-all hover:bg-gta-accent-orange"
              >
                Explorar
              </Link>
              <Link
                href="/buscar"
                className="inline-flex items-center justify-center rounded-lg border border-gta-accent px-8 py-3 font-semibold text-gta-accent transition-all hover:bg-gta-accent/10"
              >
                Buscar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="border-b border-gta-border bg-gta-dark py-12">
        <div className="container-max">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-gta-accent">{entityCount}</div>
              <p className="text-sm text-gta-text-secondary">Entidades documentadas</p>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-gta-accent-orange">100%</div>
              <p className="text-sm text-gta-text-secondary">Información verificada</p>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-gta-accent">Premium</div>
              <p className="text-sm text-gta-text-secondary">Análisis de primer nivel</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      {featured.length > 0 && (
        <section className="bg-gta-dark py-16 sm:py-24">
          <div className="container-max">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-gta-text">Destacados</h2>
              <p className="text-lg text-gta-text-secondary">Lo más relevante ahora mismo</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((entity) => (
                <Link key={`${entity.type}-${entity.slug}`} href={`/${entity.type}/${entity.slug}`} className="group">
                  <Card hoverable className="h-full">
                    <CardBody>
                      <Badge variant="status" status={entity.status} className="mb-3">
                        {entity.status}
                      </Badge>
                      <h3 className="mb-2 text-xl font-bold text-gta-text transition-colors group-hover:text-gta-accent">
                        {entity.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-gta-text-secondary">
                        {entity.description}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section id="categories" className="bg-gta-dark py-16 sm:py-24">
        <div className="container-max">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gta-text">Categorías</h2>
            <p className="text-lg text-gta-text-secondary">
              Accede a información detallada organizadas por categoría
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.type}
                href={`/${category.type}`}
                className="group"
              >
                <Card hoverable className="h-full">
                  <CardBody>
                    <div className="mb-3 text-4xl">{category.icon}</div>
                    <h3 className="mb-2 text-xl font-bold text-gta-text group-hover:text-gta-accent transition-colors">
                      {category.label}
                    </h3>
                    <p className="text-sm text-gta-text-secondary">
                      {category.description}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="border-t border-gta-border bg-gta-dark py-16 sm:py-24">
        <div className="container-max">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gta-text">
              Sobre GTA6 Codex
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
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

            <Card>
              <CardBody>
                <h3 className="mb-3 text-xl font-bold text-gta-text">
                  Sistemas de Información
                </h3>
                <div className="space-y-2">
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
          </div>
        </div>
      </section>
    </>
  )
}
