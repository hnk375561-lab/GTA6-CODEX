import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="container-narrow py-20 text-center">
        <div className="mb-8">
          <p className="eyebrow mb-4 text-xs font-semibold uppercase text-gta-accent-strong">
            Expediente · Sin resultados
          </p>
          <div className="text-gradient-vice mb-4 font-display text-8xl font-bold sm:text-9xl">404</div>
          <h1 className="mb-2 text-3xl font-bold text-gta-text sm:text-4xl">Página no encontrada</h1>
          <p className="mb-8 text-lg text-gta-text-secondary">
            Parece que esta ubicación no existe en el código de GTA 6.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="btn-primary inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-semibold text-gta-darker transition-all hover:-translate-y-0.5"
          >
            Volver a Inicio
          </Link>
          <p className="text-sm text-gta-text-tertiary">
            Si crees que esto es un error,{' '}
            <Link
              href="/buscar"
              className="link-underline text-gta-accent-strong transition-colors hover:text-gta-accent"
            >
              probá buscarlo
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
