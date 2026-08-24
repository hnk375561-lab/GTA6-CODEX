import Image from 'next/image'
import Link from 'next/link'
import type { MediaAsset } from '@/types/media'
import { resolveMediaRender } from '@/lib/media'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed'
import { VideoEmbed } from '@/components/media/VideoEmbed'
import { SimpleLightbox } from '@/components/ui/SimpleLightbox'

interface MediaCarouselProps {
  title: string
  assets: MediaAsset[]
}

/**
 * Carrusel horizontal de media relacionada, mostrado en el sidebar de la
 * ficha de entidad ("Contenido relacionado"). Cada asset se resuelve a su
 * forma renderizable vía `resolveMediaRender`: video de YouTube (facade
 * click-to-load), video mp4 directo (facade click-to-load, ver VideoEmbed)
 * o imagen. Assets 'unavailable' se omiten silenciosamente en vez de
 * mostrar un placeholder roto.
 */
export function MediaCarousel({ title, assets }: MediaCarouselProps) {
  const renderable = assets
    .map((asset) => ({ asset, rendered: resolveMediaRender(asset) }))
    .filter(({ rendered }) => rendered.renderAs !== 'unavailable')

  if (renderable.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-auto-text-secondary">{title}</h3>
      </CardHeader>
      <CardBody className="!py-0">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pt-4 -mx-1 px-1">
          {renderable.map(({ asset, rendered }) => {
            const content =
              rendered.renderAs === 'youtube' ? (
                <YouTubeEmbed embedId={rendered.embedId!} title={rendered.title} thumbnailSrc={rendered.thumbnailSrc} />
              ) : rendered.renderAs === 'video' ? (
                <VideoEmbed videoSrc={rendered.videoSrc!} title={rendered.title} />
              ) : (
                <div className="group relative aspect-video w-full overflow-hidden rounded-lg bg-auto-darker">
                  <Image
                    src={rendered.thumbnailSrc}
                    alt={rendered.title}
                    fill
                    sizes="(min-width: 1024px) 500px, 90vw"
                    quality={92}
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
              )

            const href =
              asset.relations?.trailer?.trailerSlug != null
                ? `/trailers/${asset.relations.trailer.trailerSlug}`
                : asset.relations?.entities?.[0] != null
                  ? `/${asset.relations.entities[0].entityType}/${asset.relations.entities[0].entitySlug}`
                  : undefined

            const body = (
              <div className="media-carousel-item w-56 flex-shrink-0 snap-start">
                <div className="media-carousel-item-frame overflow-hidden">{content}</div>
                <p className="mt-2.5 truncate text-sm font-medium text-auto-text">{rendered.title}</p>
                {asset.credit && <p className="truncate text-xs text-auto-text-tertiary">{asset.credit}</p>}
              </div>
            )

            // Youtube y video (mp4) ya son sus propios elementos interactivos
            // (facade con <button>) — no se envuelven en <Link> para no anidar
            // controles interactivos uno dentro del otro.
            const isInteractiveEmbed = rendered.renderAs === 'youtube' || rendered.renderAs === 'video'

            if (href && !isInteractiveEmbed) {
              return (
                <Link key={asset.id} href={href} className="block">
                  {body}
                </Link>
              )
            }

            // Imagen suelta sin relación a ninguna otra ficha: antes caía
            // en un <div> sin ningún manejador de click (no pasaba nada al
            // tocarla). Ahora se puede ampliar en el mismo lightbox que usa
            // el retrato de la ficha.
            if (!isInteractiveEmbed) {
              return (
                <SimpleLightbox key={asset.id} src={rendered.thumbnailSrc} alt={rendered.title}>
                  {body}
                </SimpleLightbox>
              )
            }

            return <div key={asset.id}>{body}</div>
          })}
        </div>
      </CardBody>
    </Card>
  )
}
