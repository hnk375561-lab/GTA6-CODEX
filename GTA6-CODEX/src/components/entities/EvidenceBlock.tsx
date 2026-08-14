import { BaseEntity } from '@/types'

type Evidence = NonNullable<BaseEntity['evidence']>
type EvidenceLevel = Evidence['level'] | 'oficial-visual-multifuente'

const LEVEL_META: Record<EvidenceLevel, { label: string; icon: string; className: string }> = {
  'oficial-nombrado': {
    label: 'Oficial · nombrado',
    icon: '✓',
    className: 'border-green-800 bg-green-900/40 text-green-300',
  },
  'oficial-visual-multifuente': {
    label: 'Oficial · visual (multi-fuente)',
    icon: '◎',
    className: 'border-green-800 bg-green-900/40 text-green-300',
  },
  'oficial-visual': {
    label: 'Oficial · identificación visual',
    icon: '◎',
    className: 'border-emerald-800 bg-emerald-900/30 text-emerald-300',
  },
  respaldado: {
    label: 'Respaldado por fuentes secundarias',
    icon: '◈',
    className: 'border-blue-800 bg-blue-900/30 text-blue-300',
  },
  especulativo: {
    label: 'Especulativo',
    icon: '?',
    className: 'border-yellow-800 bg-yellow-900/30 text-yellow-300',
  },
}

interface EvidenceBlockProps {
  evidence: Evidence
}

/**
 * Presenta la trazabilidad de una entidad: nivel de certeza de la
 * identificación, fuente primaria/secundaria y nota de auditoría.
 * Usa <details> nativo para la nota (sin JS) porque puede ser larga.
 */
export function EvidenceBlock({ evidence }: EvidenceBlockProps) {
  const meta = LEVEL_META[evidence.level as EvidenceLevel] ?? {
    label: evidence.level,
    icon: '·',
    className: 'border-gta-border bg-gta-card text-gta-text-secondary',
  }

  return (
    <div className="rounded-lg border border-gta-border bg-gta-darker/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
        >
          <span aria-hidden="true">{meta.icon}</span>
          {meta.label}
        </span>
      </div>

      <dl className="space-y-2.5 text-sm">
        {evidence.primarySource && (
          <div>
            <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gta-text-secondary">
              Fuente primaria
            </dt>
            <dd className="text-gta-text">{evidence.primarySource}</dd>
          </div>
        )}
        {evidence.secondarySource && (
          <div>
            <dt className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gta-text-secondary">
              Fuente secundaria
            </dt>
            <dd className="text-gta-text-secondary">{evidence.secondarySource}</dd>
          </div>
        )}
      </dl>

      {evidence.note && (
        <details className="group mt-3 border-t border-gta-border pt-3">
          <summary className="cursor-pointer list-none text-xs font-semibold text-gta-accent transition-colors hover:text-gta-accent-orange">
            <span className="inline-flex items-center gap-1">
              Nota de auditoría
              <span className="inline-block transition-transform duration-300 group-open:rotate-90">
                ›
              </span>
            </span>
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-gta-text-secondary">{evidence.note}</p>
        </details>
      )}

      {evidence.limitations && evidence.limitations.length > 0 && (
        <details className="group mt-3 border-t border-gta-border pt-3">
          <summary className="cursor-pointer list-none text-xs font-semibold text-gta-accent-warning transition-colors hover:text-gta-accent-orange">
            <span className="inline-flex items-center gap-1">
              Limitaciones conocidas
              <span className="inline-block transition-transform duration-300 group-open:rotate-90">
                ›
              </span>
            </span>
          </summary>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gta-text-secondary">
            {evidence.limitations.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 text-gta-accent-warning/70" aria-hidden="true">
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
