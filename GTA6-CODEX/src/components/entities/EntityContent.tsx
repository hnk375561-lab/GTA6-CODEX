import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'

interface EntityContentProps {
  content: string
}

interface TocHeading {
  depth: 2 | 3
  text: string
  id: string
}

/**
 * Extrae los encabezados ## / ### del markdown crudo para armar el índice
 * de la izquierda. Usa `github-slugger` (la misma librería que usa
 * `rehype-slug` por debajo) e instancia un slugger propio, recorriendo los
 * encabezados en el mismo orden en que el AST de `rehype-slug` los va a
 * encontrar al renderizar — así, ante títulos duplicados, el sufijo
 * `-1`/`-2` que genera el slugger coincide en ambos lados y el link del
 * índice apunta exactamente al ancla real del heading.
 */
function extractToc(content: string): TocHeading[] {
  const slugger = new GithubSlugger()
  const headings: TocHeading[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim())
    if (!match) continue
    const depth = match[1].length as 2 | 3
    const text = match[2].trim()
    headings.push({ depth, text, id: slugger.slug(text) })
  }
  return headings
}

/**
 * Componentes de markdown mapeados al lenguaje visual del sitio (mismos
 * colores/tracking que `EntitySectionHeading`, mismo acento rosa que el
 * resto del dossier) en vez de la tipografía default del navegador que
 * dejaba ver literalmente `##`, `**` y `- ` como texto plano.
 */
const markdownComponents: Components = {
  h2: ({ children, id }) => (
    <h2
      id={id}
      className="scroll-mt-24 mb-3 mt-8 flex items-center gap-2.5 text-lg font-bold text-gta-text first:mt-0"
    >
      <span className="h-4 w-1 shrink-0 rounded-full bg-gta-accent" aria-hidden="true" />
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className="scroll-mt-24 mb-2.5 mt-6 text-base font-semibold text-gta-text">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-relaxed text-gta-text-secondary last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-gta-text">{children}</strong>,
  em: ({ children }) => <em className="text-gta-text-secondary">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-4 ml-1 list-outside list-disc space-y-1.5 pl-4 marker:text-gta-accent last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-1 list-outside list-decimal space-y-1.5 pl-4 marker:font-semibold marker:text-gta-accent last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed text-gta-text-secondary">{children}</li>,
  a: ({ href, children }) => {
    const isInternal = href?.startsWith('/')
    const className = 'link-underline font-medium text-gta-accent transition-colors hover:text-gta-accent-strong'
    if (isInternal && href) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      )
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  },
  blockquote: ({ children }) => (
    <blockquote className="mb-4 rounded-r-md border-l-2 border-gta-accent/60 bg-gta-surface-elevated/50 py-2 pl-4 pr-3 text-gta-text-secondary italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-gta-border" />,
  code: ({ children }) => (
    <code className="rounded bg-gta-surface-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-gta-accent-strong">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-lg border border-gta-border last:mb-0">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gta-surface-elevated">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-gta-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gta-text-tertiary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-gta-border/60 px-3 py-2 text-gta-text-secondary last:border-b-0">{children}</td>
  ),
}

/**
 * Índice de contenido: solo aparece si el artículo tiene al menos 3
 * encabezados (por debajo de eso, la ficha se lee de un vistazo y un
 * índice de 1-2 links es ruido, no ayuda). Reutiliza el mismo lenguaje
 * numerado que el resto de secciones del dossier.
 */
function ContentToc({ headings }: { headings: TocHeading[] }) {
  if (headings.length < 3) return null

  return (
    <nav
      aria-label="Índice de la ficha"
      className="mb-6 rounded-lg border border-gta-border bg-gta-surface-elevated/40 px-4 py-3.5"
    >
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gta-text-tertiary">
        En esta ficha
      </p>
      <ol className="space-y-1.5">
        {headings.map((h, i) => (
          <li key={h.id} className={cn(h.depth === 3 && 'ml-4')}>
            <a
              href={`#${h.id}`}
              className="group flex items-baseline gap-2 text-sm text-gta-text-secondary transition-colors hover:text-gta-accent"
            >
              <span className="font-mono text-[10px] tabular-nums text-gta-accent/60 group-hover:text-gta-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="link-underline">{h.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function EntityContent({ content }: EntityContentProps) {
  const toc = extractToc(content)

  return (
    <div className="max-w-none">
      <ContentToc headings={toc} />
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
