/**
 * Escena de fondo 100% original (SVG + gradientes), inspirada en la estética
 * "sunset synthwave" del sitio (paleta Leonida Nights: magenta/cian/dorado
 * ya definida en tailwind.config.js), pero sin usar ningún asset de
 * Rockstar Games / Take-Two: nada de key art oficial, boxart, logos ni
 * personajes con parecido a Jason/Lucia. Todo dibujado a mano en vector:
 * cielo degradé, sol, siluetas de palmera, skyline genérico y un sedán
 * clásico estilizado en silueta (sin marca).
 *
 * Dos variantes de paleta para mantener la rotación visual del hero sin
 * depender de archivos de imagen.
 */

interface HeroSceneSVGProps {
  variant?: 'magenta' | 'cyan'
  className?: string
  style?: React.CSSProperties
}

export function HeroSceneSVG({ variant = 'magenta', className, style }: HeroSceneSVGProps) {
  const isMagenta = variant === 'magenta'
  const skyTop = isMagenta ? '#2a0a3d' : '#0a1a3d'
  const skyMid = isMagenta ? '#ff2f8f' : '#22d3ee'
  const skyBottom = isMagenta ? '#ffb347' : '#a78bfa'
  const sun = isMagenta ? '#ffd700' : '#f0c274'
  const silhouette = '#0a0712'

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="55%" stopColor={skyMid} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
        <linearGradient id={`sun-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sun} stopOpacity="0.95" />
          <stop offset="100%" stopColor={sun} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`ground-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={silhouette} stopOpacity="0.4" />
          <stop offset="100%" stopColor={silhouette} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Cielo */}
      <rect width="1600" height="900" fill={`url(#sky-${variant})`} />

      {/* Sol */}
      <circle cx="800" cy="560" r="220" fill={`url(#sun-${variant})`} />

      {/* Líneas horizontales del sol, estilo synthwave */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x="580"
          y={480 + i * 26}
          width="440"
          height="8"
          fill={skyTop}
          opacity={0.5}
        />
      ))}

      {/* Grid de horizonte */}
      <g opacity="0.35" stroke={sun} strokeWidth="2">
        {[...Array(10)].map((_, i) => (
          <line key={`v-${i}`} x1={i * 178 - 100} y1="640" x2={i * 178 - 400} y2="900" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={`h-${i}`} x1="0" y1={640 + i * 52} x2="1600" y2={640 + i * 52} />
        ))}
      </g>

      {/* Skyline genérico */}
      <g fill={silhouette}>
        <rect x="60" y="560" width="70" height="220" />
        <rect x="150" y="600" width="50" height="180" />
        <rect x="220" y="520" width="90" height="260" />
        <rect x="1300" y="580" width="60" height="200" />
        <rect x="1380" y="540" width="80" height="240" />
        <rect x="1480" y="610" width="55" height="170" />
      </g>

      {/* Palmeras */}
      <g fill={silhouette}>
        {/* Palmera izquierda */}
        <path d="M340 780 C338 650 350 560 370 500 L378 500 C362 560 352 650 356 780 Z" />
        <g transform="translate(374, 500)">
          <path d="M0 0 C-40 -20 -90 -10 -110 20 C-70 10 -35 8 0 20 Z" />
          <path d="M0 0 C30 -30 80 -30 110 0 C70 -10 30 -5 0 15 Z" />
          <path d="M0 0 C-20 -45 -15 -85 5 -110 C0 -70 5 -35 10 0 Z" />
          <path d="M0 0 C25 -40 60 -55 95 -45 C60 -30 30 -15 10 5 Z" />
          <path d="M0 0 C-30 -35 -60 -55 -95 -50 C-60 -30 -30 -10 -5 8 Z" />
        </g>

        {/* Palmera derecha */}
        <path d="M1230 780 C1226 640 1240 545 1262 480 L1270 480 C1252 545 1244 640 1248 780 Z" />
        <g transform="translate(1266, 480)">
          <path d="M0 0 C-42 -22 -95 -12 -115 20 C-72 10 -36 8 0 20 Z" />
          <path d="M0 0 C32 -32 84 -32 116 0 C74 -10 32 -5 0 16 Z" />
          <path d="M0 0 C-22 -48 -16 -90 5 -116 C0 -74 5 -38 10 0 Z" />
          <path d="M0 0 C26 -42 63 -58 100 -48 C63 -32 32 -16 10 5 Z" />
          <path d="M0 0 C-32 -38 -63 -58 -100 -53 C-63 -32 -32 -11 -5 8 Z" />
        </g>
      </g>

      {/* Suelo / calle */}
      <rect x="0" y="780" width="1600" height="120" fill={`url(#ground-${variant})`} />

      {/* Silueta de sedán clásico, sin marca */}
      <g transform="translate(560, 720)" fill={silhouette}>
        <path d="M0 130 L0 90 Q0 78 14 76 L60 68 L110 30 Q124 20 148 20 L360 20 Q384 20 398 32 L440 68 L470 76 Q484 78 484 90 L484 130 Z" />
        <circle cx="90" cy="132" r="26" />
        <circle cx="400" cy="132" r="26" />
      </g>
    </svg>
  )
}
