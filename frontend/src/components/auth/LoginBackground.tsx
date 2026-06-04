/** Fondo estático ligero (sin blur animado — evita picos de GPU en Chrome). */
export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-muted/30" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/[0.04] to-chart-5/[0.08]" />
      <div className="absolute -end-24 -top-24 size-72 rounded-full bg-primary/10" />
      <div className="absolute -bottom-20 -start-16 size-64 rounded-full bg-chart-5/10" />
    </div>
  )
}
