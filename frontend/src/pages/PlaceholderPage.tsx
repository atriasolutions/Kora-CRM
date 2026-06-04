export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-3 px-4 py-8 sm:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        Vista en construcción. Este módulo se conectará a tu API de Express cuando esté listo.
      </p>
    </div>
  )
}
