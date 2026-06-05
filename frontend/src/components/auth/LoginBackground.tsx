/** Fondo de login: gradientes de marca sin animaciones pesadas. */
export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-background to-sky-50/80 dark:from-background dark:via-background dark:to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_0%,rgba(124,58,237,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(6,182,212,0.1),transparent_50%)]" />
      <div className="absolute -end-[12%] -top-[18%] size-[min(520px,55vw)] rounded-full bg-violet-500/[0.07] blur-3xl" />
      <div className="absolute -bottom-[15%] -start-[8%] size-[min(420px,45vw)] rounded-full bg-cyan-500/[0.08] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border) / 0.35) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 85% 75% at 50% 40%, black 15%, transparent 72%)',
        }}
      />
    </div>
  )
}
