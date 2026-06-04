import { workboardThClass, workboardThGroupClass } from '@/components/projects/workboard/workboard-table'
import { cn } from '@/lib/utils'

export function WorkboardTableHead() {
  return (
    <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
      <tr className="border-b border-border/80">
        <th rowSpan={2} className={workboardThClass} aria-hidden />
        <th rowSpan={2} className={workboardThClass}>
          <span title="Nombre de la actividad o tarea">Actividad</span>
        </th>
        <th rowSpan={2} className={workboardThClass}>
          <span title="Detalle opcional">Descripción</span>
        </th>
        <th rowSpan={2} className={workboardThClass}>
          <span title="Personas asignadas">Responsables</span>
        </th>
        <th rowSpan={2} className={cn(workboardThClass, 'min-w-[8.5rem]')}>
          <span title="Estado de avance de la actividad">Estado</span>
        </th>
        <th colSpan={2} className={workboardThGroupClass}>
          Horas
        </th>
        <th colSpan={2} className={workboardThGroupClass}>
          Planificado
        </th>
        <th colSpan={2} className={workboardThGroupClass}>
          Ejecutado
        </th>
        <th rowSpan={2} className={workboardThClass}>
          Comentario
        </th>
        <th rowSpan={2} className={workboardThClass} aria-hidden />
      </tr>
      <tr className="border-b border-border">
        <th className={cn(workboardThSubClass, 'min-w-[5.5rem]')}>Est.</th>
        <th className={cn(workboardThSubClass, 'min-w-[5.5rem]')}>Real</th>
        <th className={workboardThSubClass}>Inicio</th>
        <th className={workboardThSubClass}>Fin</th>
        <th className={workboardThSubClass}>Inicio</th>
        <th className={workboardThSubClass}>Fin</th>
      </tr>
    </thead>
  )
}

const workboardThSubClass =
  'border-b border-border border-l border-border/80 bg-muted/35 px-2 py-1 text-center text-[10px] font-medium text-muted-foreground'
