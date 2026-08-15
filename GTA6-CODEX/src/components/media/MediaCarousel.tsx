import Image from 'next/image'
import Link from 'next/link'
import type { MediaAsset } from '@/types/media'
import { resolveMediaRender } from '@/lib/media'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed'
import { VideoEmbed } from '@/components/media/VideoEmbed'

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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gta-text-secondary">{title}</h3>
      </CardHeader>
      <CardBody className="!py-0">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-4 -mx-1 px-1">
          {renderable.map(({ asset, rendered }) => {
            const content =
              rendered.renderAs === 'youtube' ? (
                <YouTubeEmbed embedId={rendered.embedId!} title={rendered.title} thumbnailSrc={rendered.thumbnailSrc} />
              ) : rendered.renderAs === 'video' ? (
                <VideoEmbed videoSrc={rendered.videoSrc!} title={rendered.title} />
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gta-darker">
                  <Image
                    src={rendered.thumbnailSrc}
                    alt={rendered.title}
                    fill
                    sizes="240px"
                    className="object-cover"
                  />
                </div>
              )

            const href =
              asset.relations?.trailer?.trailerSlug != null
                ? `/trailers/${asset.relations.trailer.trailerSlug}`
                : asset.relations?.entity != null
                  ? `/${asset.relations.entity.entityType}/${asset.relations.entity.entitySlug}`
                  : undefined

            const body = (
              <div className="w-56 flex-shrink-0 snap-start">
                {content}
                <p className="mt-2 truncate text-sm font-medium text-gta-text">{rendered.title}</p>
                {asset.credit && <p className="truncate text-xs text-gta-text-tertiary">{asset.credit}</p>}
              </div>
            )

            // Youtube y video (mp4) ya son sus propios elementos interactivos
            // (facade con <button>) — no se envuelven en <Link> para no anidar
            // controles interactivos uno dentro del otro.
            const isInteractiveEmbed = rendered.renderAs === 'youtube' || rendered.renderAs === 'video'

            return href && !isInteractiveEmbed ? (
              <Link key={asset.id} href={href} className="block">
                {body}
              </Link>
            ) : (
              <div key={asset.id}>{body}</div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}
