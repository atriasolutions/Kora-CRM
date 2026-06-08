/** Paleta visual alineada con LoginPage (violeta · primario · cyan). */
export const marketingTheme = {
  header:
    'border-white/10 bg-[#0f0818]/88 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0f0818]/80',
  headerScrolled:
    'border-white/15 bg-[#0f0818]/95 shadow-lg shadow-violet-950/40 backdrop-blur-xl',
  hero: 'bg-gradient-to-br from-[#0f0818] via-[#15103a] to-[#0a2d45] text-white',
  pageCanvas: 'bg-gradient-to-br from-slate-50 via-background to-sky-50/80',
  accentGradient: 'bg-gradient-to-r from-violet-600 via-primary to-cyan-500',
  accentGradientHover: 'hover:opacity-95',
  textGradient: 'bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent',
  navActiveBar: 'bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-400',
  iconSurface: 'bg-gradient-to-br from-violet-500/30 to-cyan-500/25 text-cyan-200',
  cardDark: 'border-white/10 bg-white/[0.06] backdrop-blur-md',
  ctaBand:
    'border-violet-400/25 bg-gradient-to-br from-[#1a1035] via-[#15103a] to-[#0a2d45] shadow-xl shadow-violet-950/30',
  badge:
    'border-white/15 bg-white/10 text-white/90 backdrop-blur-sm',
  sparkle: 'text-cyan-300',
} as const
