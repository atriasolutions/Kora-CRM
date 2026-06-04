import type { ProjectHealth, ProjectPriority, ProjectStatus } from '@/data/projects.mock'

export function projectStatusVariant(
  status: ProjectStatus,
): 'proposal' | 'customer' | 'muted' {
  switch (status) {
    case 'Completado':
      return 'customer'
    case 'Pausado':
      return 'muted'
    case 'En curso':
    default:
      return 'proposal'
  }
}

export function projectHealthVariant(
  health: ProjectHealth,
): 'customer' | 'destructive' | 'proposal' {
  switch (health) {
    case 'En plazo':
      return 'customer'
    case 'Retrasado':
      return 'destructive'
    case 'En riesgo':
    default:
      return 'proposal'
  }
}

export function projectPriorityVariant(
  priority: ProjectPriority,
): 'destructive' | 'proposal' | 'muted' {
  switch (priority) {
    case 'Alta':
      return 'destructive'
    case 'Media':
      return 'proposal'
    case 'Baja':
    default:
      return 'muted'
  }
}

export function parseProgressNum(progress: string): number {
  return Number.parseInt(progress.replace(/[^\d]/g, ''), 10) || 0
}
