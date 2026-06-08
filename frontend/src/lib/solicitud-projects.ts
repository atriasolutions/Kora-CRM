import type { SolicitudDetail } from '@/data/solicitudes.mock'
import type { CreateProjectFormValues } from '@/lib/project-create'
import { applySolicitudChange } from '@/lib/project-commercial-origin'

export function createProjectInitialFromSolicitud(
  solicitud: Pick<SolicitudDetail, 'id' | 'title' | 'code' | 'assignee'>,
): Partial<CreateProjectFormValues> {
  return {
    name: `Proyecto — ${solicitud.title}`,
    managerName: solicitud.assignee,
    ...applySolicitudChange(solicitud.id, {
      id: solicitud.id,
      title: solicitud.title,
      code: solicitud.code,
    }),
  }
}
