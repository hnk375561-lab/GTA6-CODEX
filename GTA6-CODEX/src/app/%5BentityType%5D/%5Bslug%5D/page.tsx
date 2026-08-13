'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { Entity, EntityType } from '@/types'
import { getEntity } from '@/lib/entities'

interface EntityPageProps {
  params: {
    entityType: string
    slug: string
  }
}

export default function EntityPage({ params }: EntityPageProps) {
  const [entity, setEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadEntity() {
      try {
        // Validar que entityType sea válido
        const validTypes = Object.values(EntityType)
        if (!validTypes.includes(params.entityType as EntityType)) {
          notFound()
        }

        // STUB: Fase 1 - getEntity retorna null
        // Cuando tengamos contenido, esto cargará la entidad real
        const data = await getEntity(params.entityType as EntityType, params.slug)

        if (!data) {
          notFound()
        }

        setEntity(data)
      } catch (err) {
        setError('Error loading entity')
      } finally {
        setLoading(false)
      }
    }

    loadEntity()
  }, [params.entityType, params.slug])

  if (loading) {
    return (
      <div className="container-max py-20">
        <div className="animate-pulse">
          <div className="h-12 bg-gta-card rounded mb-4 w-3/4"></div>
          <div className="h-4 bg-gta-card rounded mb-8 w-1/2"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gta-card rounded"></div>
            <div className="h-4 bg-gta-card rounded"></div>
            <div className="h-4 bg-gta-card rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !entity) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gta-dark">
      {/* Breadcrumb */}
      <div className="border-b border-gta-border bg-gta-card">
        <div className="container-max py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gta-accent hover:text-gta-accent-orange">
              Inicio
            </Link>
            <span className="text-gta-text-secondary">/</span>
            <Link
              href={`/${entity.type}`}
              className="text-gta-accent hover:text-gta-accent-orange capitalize"
            >
              {entity.type}
            </Link>
            <span className="text-gta-text-secondary">/</span>
            <span className="text-gta-text">{entity.title}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-gta-border bg-gradient-to-b from-gta-card to-gta-dark py-12">
        <div className="container-max">
          <div className="mb-4 flex items-center gap-2">
            <Badge status={entity.status} variant="status">
              {entity.status}
            </Badge>
            {entity.tags?.map((tag) => (
              <Badge key={tag} variant="tag">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="mb-4 text-5xl font-bold text-gta-text">
            {entity.title}
          </h1>

          <p className="text-lg text-gta-text-secondary max-w-3xl">
            {entity.description}
          </p>

          <div className="mt-6 text-xs text-gta-text-secondary">
            <p>
              Última actualización:{' '}
              {new Date(entity.updatedAt).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-max py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2">
            {entity.content && (
              <Card>
                <CardBody>
                  <div className="prose prose-invert max-w-none">
                    <div
                      className="text-gta-text-secondary leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: entity.content }}
                    />
                  </div>
                </CardBody>
              </Card>
            )}

            {!entity.content && (
              <Card>
                <CardBody>
                  <p className="text-gta-text-secondary italic">
                    Contenido no disponible. Esta entidad está en construcción.
                  </p>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Entities */}
            {entity.relations && entity.relations.length > 0 && (
              <Card>
                <CardBody>
                  <h3 className="mb-4 font-bold text-gta-text">
                    Relacionado
                  </h3>
                  <ul className="space-y-2">
                    {entity.relations.map((relation) => (
                      <li key={`${relation.targetType}-${relation.targetSlug}`}>
                        <Link
                          href={`/${relation.targetType}/${relation.targetSlug}`}
                          className="block rounded-lg border border-gta-border bg-gta-dark p-2 text-sm text-gta-accent hover:bg-gta-card transition-colors"
                        >
                          <div className="font-semibold">
                            {relation.targetSlug}
                          </div>
                          <div className="text-xs text-gta-text-secondary">
                            {relation.relation}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {/* Meta Information */}
            <Card>
              <CardBody>
                <h3 className="mb-4 font-bold text-gta-text">
                  Información
                </h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gta-text-secondary">Tipo</dt>
                    <dd className="text-gta-text capitalize">
                      {entity.type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gta-text-secondary">Slug</dt>
                    <dd className="text-gta-text font-mono text-xs break-all">
                      {entity.slug}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gta-text-secondary">Creado</dt>
                    <dd className="text-gta-text">
                      {new Date(entity.createdAt).toLocaleDateString('es-ES')}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
