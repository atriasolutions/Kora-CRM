import { ClipboardList, Link2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getUserApi } from '@/api/users'
import { isApiEnabled } from '@/api/config'
import { SolicitudDescriptionEditor } from '@/components/solicitudes/SolicitudDescriptionEditor'
import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import {
  SOLICITUD_PRIORITY_OPTIONS,
  SOLICITUD_STATUS_OPTIONS,
} from '@/data/solicitudes.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import type { SolicitudFile } from '@/lib/solicitud-files'
import type { SolicitudFormValues } from '@/lib/solicitud-form'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { isGuestUserListItem } from '@/lib/user-display'
import { findUserById, findUserByName } from '@/lib/user-lookup'

type SolicitudFormFieldsProps = {
  values: SolicitudFormValues
  onChange: (patch: Partial<SolicitudFormValues>) => void
  descriptionFiles: SolicitudFile[]
  onDescriptionFilesChange: (files: SolicitudFile[]) => void
  descriptionAuthorName: string
  editorKey: string
  idPrefix?: string
  disabled?: boolean
  /** Muestra lookup de usuario invitado (solo creación por equipo interno). */
  showRequesterField?: boolean
}

export function SolicitudFormFields({
  values,
  onChange,
  descriptionFiles,
  onDescriptionFilesChange,
  descriptionAuthorName,
  editorKey,
  idPrefix = 'sol',
  disabled = false,
  showRequesterField = false,
}: SolicitudFormFieldsProps) {
  const patch = (partial: Partial<SolicitudFormValues>) => onChange(partial)
  const { allUsers } = useUsersRegistry()
  const registryRequester = useMemo(
    () =>
      findUserById(allUsers, values.requesterUserId) ??
      findUserByName(allUsers, values.requesterName),
    [allUsers, values.requesterUserId, values.requesterName],
  )
  const [requesterGuestCompany, setRequesterGuestCompany] = useState<{
    id?: string
    name?: string
  } | null>(null)

  useEffect(() => {
    const requesterId = values.requesterUserId.trim()
    if (!requesterId) {
      setRequesterGuestCompany(null)
      return
    }

    const fromRegistry = {
      id: registryRequester?.guestCompanyId?.trim(),
      name: registryRequester?.guestCompanyName?.trim(),
    }
    if (fromRegistry.id || fromRegistry.name) {
      setRequesterGuestCompany(fromRegistry)
      return
    }

    if (!isApiEnabled()) {
      setRequesterGuestCompany(null)
      return
    }

    let cancelled = false
    void getUserApi(requesterId)
      .then((detail) => {
        if (cancelled) return
        setRequesterGuestCompany({
          id: detail.guestCompanyId?.trim(),
          name: detail.guestCompanyName?.trim(),
        })
      })
      .catch(() => {
        if (!cancelled) setRequesterGuestCompany(null)
      })

    return () => {
      cancelled = true
    }
  }, [values.requesterUserId, registryRequester])

  const requesterCompanyName =
    requesterGuestCompany?.name?.trim() ||
    registryRequester?.guestCompanyName?.trim() ||
    ''
  const requesterHasCompany = Boolean(
    requesterGuestCompany?.id?.trim() ||
      requesterGuestCompany?.name?.trim() ||
      registryRequester?.guestCompanyId?.trim() ||
      registryRequester?.guestCompanyName?.trim(),
  )

  return (
    <div className="space-y-5">
      {showRequesterField ? (
        <ContactFormSection
          title="A petición de"
          description="Usuario invitado que solicita el trabajo (opcional)"
          icon={UserRound}
        >
          <UserLookupField
            label="Usuario invitado"
            value={values.requesterName}
            onChange={(requesterName, user) =>
              patch({
                requesterName,
                requesterUserId: user?.id ?? '',
              })
            }
            disabled={disabled}
            placeholder="Buscar usuario invitado…"
            helperText="Se asocia la empresa del invitado a la solicitud. El invitado la verá en «Mis solicitudes»."
            activeOnly={false}
            userFilter={(user) =>
              isGuestUserListItem(user) && user.status !== 'Inactivo'
            }
          />
          {requesterHasCompany ? (
            <p className="text-xs text-muted-foreground">
              Empresa asociada:{' '}
              <span className="font-medium text-foreground">
                {requesterCompanyName || 'Empresa configurada'}
              </span>
            </p>
          ) : values.requesterUserId ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Este invitado no tiene empresa configurada; no podrás crear la solicitud hasta
              asignarle una en Usuarios.
            </p>
          ) : null}
        </ContactFormSection>
      ) : null}
      <ContactFormSection
        title="Solicitud"
        description="Título, descripción y clasificación"
        icon={ClipboardList}
      >
        <ContactFormInput
          id={`${idPrefix}-title`}
          label="Título"
          inputVariant="alphanumeric"
          value={values.title}
          onChange={(title) => patch({ title })}
          disabled={disabled}
          placeholder="Ej. Integración con sistema externo"
        />
        <ContactFormField label="Descripción" id={`${idPrefix}-description`}>
          <SolicitudDescriptionEditor
            key={editorKey}
            initialHtml={values.description}
            initialFiles={descriptionFiles}
            authorName={descriptionAuthorName}
            onChange={(description) => patch({ description })}
            onFilesChange={onDescriptionFilesChange}
            disabled={disabled}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Inserta imágenes con el botón, pegando o arrastrando. Se guardan en Archivos. Clic en
            miniatura para ampliar.
          </p>
        </ContactFormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormSelect
            id={`${idPrefix}-status`}
            label="Estado"
            value={values.status}
            onChange={(status) =>
              patch({ status: status as SolicitudFormValues['status'] })
            }
            options={SOLICITUD_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            disabled={disabled}
          />
          <ContactFormSelect
            id={`${idPrefix}-priority`}
            label="Prioridad"
            value={values.priority}
            onChange={(priority) =>
              patch({ priority: priority as SolicitudFormValues['priority'] })
            }
            options={SOLICITUD_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
            disabled={disabled}
          />
        </div>
        <UserLookupField
          label="Responsable"
          value={values.assigneeName}
          onChange={(assigneeName, user) =>
            patch({
              assigneeName,
              assigneeUserId: user?.id ?? '',
            })
          }
          disabled={disabled}
          helperText="Persona a cargo de la solicitud. Aparece en Mis solicitudes."
        />
      </ContactFormSection>
      <ContactFormSection
        title="Enlaces"
        description="Referencias técnicas opcionales"
        icon={Link2}
      >
        <ContactFormInput
          id={`${idPrefix}-documentation-url`}
          label="URL documentación"
          inputVariant="alphanumeric"
          value={values.documentationUrl}
          onChange={(documentationUrl) => patch({ documentationUrl })}
          disabled={disabled}
          placeholder="https://docs.ejemplo.com/proyecto"
        />
        <ContactFormInput
          id={`${idPrefix}-git-branch-url`}
          label="Rama Git"
          inputVariant="alphanumeric"
          value={values.gitBranchUrl}
          onChange={(gitBranchUrl) => patch({ gitBranchUrl })}
          disabled={disabled}
          placeholder="https://github.com/org/repo/tree/feature/rama"
        />
        <p className="text-xs text-muted-foreground">
          URL del branch o repositorio en Git (opcional).
        </p>
      </ContactFormSection>
    </div>
  )
}
