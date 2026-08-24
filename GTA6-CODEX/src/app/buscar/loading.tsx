export default function Loading() {
  return (
    <div className="container-max py-16">
      <div className="mx-auto mb-10 h-12 w-full max-w-xl animate-pulse rounded-lg bg-auto-border/60" />
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-auto-border/60"
          />
        ))}
      </div>
    </div>
  )
}
