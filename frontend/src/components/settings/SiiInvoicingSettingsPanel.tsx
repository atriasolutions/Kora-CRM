import { Loader2, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  deleteSiiCredentialApi,
  getSiiStatusApi,
  listFolioRangesApi,
  listSiiCredentialsApi,
  uploadCafApi,
  uploadSiiCredentialApi,
  type FolioRange,
  type SiiCredential,
  type SiiIntegrationStatus,
} from '@/api/sii'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { validateOrganizationSettings } from '@/lib/organization-settings'
import type { InvoicingMode, OrganizationSettings } from '@/types/organization-settings'
import { toast } from '@/lib/toast'

export function SiiInvoicingSettingsPanel() {
  const { canEdit } = useModulePermissions('configuracion')
  const { settings, saveSettings } = useOrganizationSettings()
  const [draft, setDraft] = useState<OrganizationSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<SiiIntegrationStatus | null>(null)
  const [credentials, setCredentials] = useState<SiiCredential[]>([])
  const [folios, setFolios] = useState<FolioRange[]>([])
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certPassword, setCertPassword] = useState('')
  const [portalRut, setPortalRut] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [siiEnv, setSiiEnv] = useState<'certification' | 'production'>('production')
  const [uploadingCert, setUploadingCert] = useState(false)
  const [cafXml, setCafXml] = useState('')
  const [cafRangeStart, setCafRangeStart] = useState('')
  const [cafRangeEnd, setCafRangeEnd] = useState('')
  const [uploadingCaf, setUploadingCaf] = useState(false)

  const refreshSii = useCallback(async () => {
    if (draft.invoicingMode !== 'sii') return
    try {
      const [st, creds, folioList] = await Promise.all([
        getSiiStatusApi(),
        listSiiCredentialsApi(),
        listFolioRangesApi(),
      ])
      setStatus(st)
      setCredentials(creds)
      setFolios(folioList)
    } catch {
      setStatus(null)
    }
  }, [draft.invoicingMode])

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  useEffect(() => {
    void refreshSii()
  }, [refreshSii])

  const patch = (partial: Partial<OrganizationSettings>) =>
    setDraft((prev) => ({ ...prev, ...partial }))

  const handleSaveMode = async () => {
    if (!canEdit) return
    const validation = validateOrganizationSettings(draft)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    try {
      await saveSettings(draft)
      toast.success('Modo de facturación guardado.')
      await refreshSii()
    } catch {
      toast.error('No se pudo guardar la configuración SII.')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadCert = async () => {
    if (!canEdit || !certFile || !certPassword.trim() || !consent) {
      toast.warning('Completa certificado, contraseña y acepta la delegación.')
      return
    }
    setUploadingCert(true)
    try {
      const form = new FormData()
      form.append('file', certFile)
      form.append('certPassword', certPassword)
      form.append('env', siiEnv)
      form.append('consent', 'true')
      if (portalRut.trim()) form.append('portalRut', portalRut.trim())
      if (portalPassword.trim()) form.append('portalPassword', portalPassword.trim())
      const result = await uploadSiiCredentialApi(form)
      if (result.tokenTest.ok) {
        toast.success('Certificado SII guardado y validado con el SII.')
      } else {
        const rut = result.tokenTest.certRut ?? result.credential.certRut
        const rutLine = rut ? ` RUT del certificado: ${rut}.` : ''
        toast.warning(
          `Certificado guardado, pero el SII no emitió token.${rutLine} En www.sii.cl → Clave tributaria, habilita autenticación por certificado digital para ese RUT y verifica que sea representante de la empresa.`,
          12000,
        )
      }
      setCertFile(null)
      setCertPassword('')
      await refreshSii()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir certificado.')
    } finally {
      setUploadingCert(false)
    }
  }

  const handleUploadCaf = async () => {
    if (!canEdit || !cafXml.trim()) {
      toast.warning('Pega el contenido XML del CAF.')
      return
    }
    setUploadingCaf(true)
    try {
      await uploadCafApi({
        dteType: 33,
        cafXml: cafXml.trim(),
        rangeStart: cafRangeStart ? Number.parseInt(cafRangeStart, 10) : undefined,
        rangeEnd: cafRangeEnd ? Number.parseInt(cafRangeEnd, 10) : undefined,
      })
      toast.success('Rango de folios registrado.')
      setCafXml('')
      setCafRangeStart('')
      setCafRangeEnd('')
      await refreshSii()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar CAF.')
    } finally {
      setUploadingCaf(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Modo de facturación</CardTitle>
          <CardDescription>
            Elige si registras folios SII manualmente o emites documentos integrados al SII por
            tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canEdit} className="space-y-4 border-0 p-0 m-0">
            <div className="flex flex-col gap-2 sm:flex-row">
              {(['manual', 'sii'] as InvoicingMode[]).map((mode) => (
                <label
                  key={mode}
                  className={`flex flex-1 cursor-pointer flex-col rounded-lg border p-4 ${
                    draft.invoicingMode === mode
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="invoicing-mode"
                    className="sr-only"
                    checked={draft.invoicingMode === mode}
                    onChange={() => patch({ invoicingMode: mode })}
                  />
                  <span className="font-medium text-foreground">
                    {mode === 'manual' ? 'Manual' : 'Integrado al SII'}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {mode === 'manual'
                      ? 'Registro interno; ingresas el folio al marcar emitida.'
                      : 'Emisión automática con certificado digital y folios CAF.'}
                  </span>
                </label>
              ))}
            </div>

            {draft.invoicingMode === 'sii' ? (
              <ContactFormInput
                id="sii-activity-code"
                label="Código actividad económica (SII)"
                inputVariant="integer"
                value={draft.economicActivityCode?.toString() ?? ''}
                onChange={(v) =>
                  patch({
                    economicActivityCode: v.trim() ? Number.parseInt(v, 10) : null,
                  })
                }
                placeholder="Ej. 620200"
                required
              />
            ) : null}

            <Button type="button" onClick={handleSaveMode} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Guardando…
                </>
              ) : (
                'Guardar modo'
              )}
            </Button>
          </fieldset>
        </CardContent>
      </Card>

      {draft.invoicingMode === 'sii' ? (
        <>
          {status ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
                  Estado integración
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {status.readyToEmit ? (
                  <p className="text-foreground">Listo para emitir facturas al SII.</p>
                ) : (
                  <p>
                    Pendiente:{' '}
                    {status.missing.length > 0
                      ? status.missing.join(', ')
                      : 'completar configuración'}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Certificado digital (.p12)</CardTitle>
              <CardDescription>
                Usa el mismo ambiente SII que tu certificado: producción (palena) o certificación
                (maullin). Incluye clave tributaria para sincronizar RCV.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {credentials.length > 0 ? (
                <ul className="text-sm text-muted-foreground">
                  {credentials.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 py-1">
                      <span>
                        {c.env} · RUT cert {c.certRut ?? '—'} · vence{' '}
                        {c.certExpiresAt
                          ? new Date(c.certExpiresAt).toLocaleDateString('es-CL')
                          : '—'}{' '}
                        · portal {c.hasPortalCredentials ? 'OK' : 'sin clave'}
                      </span>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteSiiCredentialApi(c.id).then(refreshSii).catch(() =>
                              toast.error('No se pudo eliminar.'),
                            )
                          }
                        >
                          Eliminar
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Ambiente SII</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {(
                      [
                        {
                          value: 'production' as const,
                          label: 'Producción',
                          hint: 'Certificado real (palena.sii.cl)',
                        },
                        {
                          value: 'certification' as const,
                          label: 'Certificación',
                          hint: 'Pruebas SII (maullin.sii.cl)',
                        },
                      ] as const
                    ).map((option) => (
                      <label
                        key={option.value}
                        className={`flex flex-1 cursor-pointer flex-col rounded-lg border p-3 ${
                          siiEnv === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sii-env"
                          className="sr-only"
                          checked={siiEnv === option.value}
                          onChange={() => setSiiEnv(option.value)}
                        />
                        <span className="font-medium text-foreground">{option.label}</span>
                        <span className="mt-1 text-xs text-muted-foreground">{option.hint}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="sii-cert-file" className="text-sm font-medium">
                    Archivo .p12 / .pfx
                  </label>
                  <input
                    id="sii-cert-file"
                    type="file"
                    accept=".p12,.pfx"
                    className="mt-1 block w-full text-sm"
                    onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <ContactFormInput
                  id="sii-cert-pass"
                  label="Contraseña del certificado"
                  type="password"
                  value={certPassword}
                  onChange={setCertPassword}
                />
                <ContactFormInput
                  id="sii-portal-rut"
                  label="RUT portal SII (RCV)"
                  value={portalRut}
                  onChange={setPortalRut}
                />
                <ContactFormInput
                  id="sii-portal-pass"
                  label="Clave tributaria portal"
                  type="password"
                  value={portalPassword}
                  onChange={setPortalPassword}
                />
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Autorizo almacenar de forma cifrada mi certificado y credenciales tributarias
                    para operar con el SII en nombre de mi empresa.
                  </span>
                </label>
                <Button type="button" onClick={handleUploadCert} disabled={uploadingCert}>
                  {uploadingCert ? 'Subiendo…' : 'Guardar certificado'}
                </Button>
              </fieldset>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Folios CAF (tipo 33)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {folios.length > 0 ? (
                <ul className="text-sm">
                  {folios.map((f) => (
                    <li key={f.id} className="text-muted-foreground">
                      Tipo {f.dteType}: {f.rangeStart}–{f.rangeEnd} · restantes {f.remaining}
                    </li>
                  ))}
                </ul>
              ) : null}
              <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
                <div>
                  <label htmlFor="caf-xml" className="text-sm font-medium">
                    XML CAF
                  </label>
                  <textarea
                    id="caf-xml"
                    className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={cafXml}
                    onChange={(e) => setCafXml(e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContactFormInput
                    id="caf-from"
                    label="Folio desde (si el parser no está disponible)"
                    inputVariant="integer"
                    value={cafRangeStart}
                    onChange={setCafRangeStart}
                  />
                  <ContactFormInput
                    id="caf-to"
                    label="Folio hasta"
                    inputVariant="integer"
                    value={cafRangeEnd}
                    onChange={setCafRangeEnd}
                  />
                </div>
                <Button type="button" onClick={handleUploadCaf} disabled={uploadingCaf}>
                  {uploadingCaf ? 'Registrando…' : 'Registrar CAF'}
                </Button>
              </fieldset>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
