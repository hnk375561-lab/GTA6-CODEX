import type { Trailer } from '@/types'
import { getMediaAssets, resolveMediaRender } from '@/lib/media'
import { Card, CardBody } from '@/components/ui/Card'
import { YouTubeEmbed } from '@/components/media/YouTubeEmbed'
import { VideoEmbed } from '@/components/media/VideoEmbed'

interface TrailerPlayerProps {
  trailer: Trailer
}

/**
 * Reproductor principal en la ficha de un trailer: reutiliza el mismo
 * `MediaAsset` que ya arma `lib/media.ts` a partir de `trailer.officialUrl`
 * (no vuelve a parsear la URL acá), para no tener dos lugares que decidan
 * qué es un ID de YouTube válido.
 */
export function TrailerPlayer({ trailer }: TrailerPlayerProps) {
  const asset = getMediaAssets().find((a) => a.relations?.trailer?.trailerSlug === trailer.slug)

  if (!asset) {
    return (
      <Card className="overflow-hidden !p-0">
        <div className="card-media relative aspect-video w-full overflow-hidden bg-gta-dark">
          <div className="card-media-fallback absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="card-media-fallback-sweep" aria-hidden="true" />
            <svg viewBox="0 0 48 48" className="relative h-12 w-12 stroke-gta-accent/50" fill="none" strokeWidth="1.5" aria-hidden="true">
              <rect x="5" y="10" width="38" height="28" rx="3" />
              <path d="M20 18l11 6-11 6z" />
            </svg>
            <span className="relative text-[11px] font-medium uppercase tracking-wider text-gta-text-secondary/70">
              Sin video oficial verificado
            </span>
          </div>
        </div>
        <CardBody>
          <p className="text-gta-text-secondary">
            Todavía no hay un video oficial reconocible para este trailer.
            {trailer.officialUrl && (
              <>
                {' '}
                Podés verlo directamente en{' '}
                <a
                  href={trailer.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gta-accent-strong underline underline-offset-2"
                >
                  el enlace oficial
                </a>
                .
              </>
            )}
          </p>
        </CardBody>
      </Card>
    )
  }

  const rendered = resolveMediaRender(asset)

  return (
    <Card className="overflow-hidden !p-0">
      {rendered.renderAs === 'youtube' ? (
        <YouTubeEmbed
          embedId={rendered.embedId!}
          title={rendered.title}
          thumbnailSrc={rendered.thumbnailSrc}
          className="!rounded-none !border-0"
        />
      ) : rendered.renderAs === 'video' ? (
        <VideoEmbed videoSrc={rendered.videoSrc!} title={rendered.title} className="!rounded-none !border-0" />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <p className="text-sm text-gta-text-secondary">{asset.credit}</p>
        {trailer.durationSeconds && (
          <p className="text-xs text-gta-text-tertiary">
            {Math.floor(trailer.durationSeconds / 60)}:
            {String(trailer.durationSeconds % 60).padStart(2, '0')} min
          </p>
        )}
      </div>
    </Card>
  )
}
