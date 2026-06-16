import {
  AlertTriangle,
  CalendarDays,
  Coins,
  Loader2,
  Percent,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  getStoredExchangeRatesApi,
  syncExchangeRatesApi,
  updateStoredExchangeRatesApi,
} from '@/api/exchange-rates'
import { isApiEnabled } from '@/api/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import {
  chileDateString,
  formatExchangeRateFetchedAt,
  type ExchangeRateSnapshot,
} from '@/lib/currency'
import { validateDefaultVatPercent } from '@/lib/default-vat'
import { cn } from '@/lib/utils'

type RateDraft = {
  ufClp: string
  usdClp: string
  eurClp: string
}

type CurrencyCode = 'UF' | 'USD' | 'EUR'

const CURRENCY_META: Record<
  CurrencyCode,
  { key: keyof RateDraft; accent: string; hint: string }
> = {
  UF: {
    key: 'ufClp',
    accent: 'border-sky-200/80 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20',
    hint: 'Unidad de fomento',
  },
  USD: {
    key: 'usdClp',
    accent: 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20',
    hint: 'Dólar observado',
  },
  EUR: {
    key: 'eurClp',
    accent: 'border-violet-200/80 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20',
    hint: 'Euro',
  },
}

function ratesToDraft(rates: ExchangeRateSnapshot | null): RateDraft {
  return {
    ufClp: rates?.ufClp != null ? String(rates.ufClp) : '',
    usdClp: rates?.usdClp != null ? String(rates.usdClp) : '',
    eurClp: rates?.eurClp != null ? String(rates.eurClp) : '',
  }
}

function parseRateInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function formatDisplayDate(iso: string): string {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso
  const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!)
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatRateClp(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function SourceBadge({ source }: { source?: string }) {
  const isManual = source?.toLowerCase().includes('manual')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        isManual
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
          : 'bg-primary/10 text-primary',
      )}
    >
      {isManual ? 'Manual' : source ?? 'findic.cl'}
    </span>
  )
}

function RateMetricCard({
  code,
  value,
  editable,
  disabled,
  onChange,
}: {
  code: CurrencyCode
  value: string
  editable?: boolean
  disabled?: boolean
  onChange?: (value: string) => void
}) {
  const meta = CURRENCY_META[code]
  const parsed = parseRateInput(value)

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-4 shadow-sm transition-colors',
        meta.accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {code}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.hint}</p>
        </div>
        <span className="rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          1 {code}
        </span>
      </div>

      {editable ? (
        <div className="mt-4 space-y-1.5">
          <label htmlFor={`rate-${code}`} className="sr-only">
            {code} en CLP
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm text-muted-foreground">
              $
            </span>
            <Input
              id={`rate-${code}`}
              type="number"
              value={value}
              disabled={disabled}
              placeholder="0"
              className="h-10 border-background/80 bg-background/90 ps-7 text-base font-semibold tabular-nums shadow-sm"
              onChange={(event) => onChange?.(event.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">Valor en pesos chilenos</p>
        </div>
      ) : (
        <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {parsed != null ? formatRateClp(parsed) : '—'}
        </p>
      )}
    </div>
  )
}

function RatesGrid({
  draft,
  editable,
  disabled,
  onChange,
}: {
  draft: RateDraft
  editable?: boolean
  disabled?: boolean
  onChange?: (patch: Partial<RateDraft>) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(['UF', 'USD', 'EUR'] as const).map((code) => (
        <RateMetricCard
          key={code}
          code={code}
          value={draft[CURRENCY_META[code].key]}
          editable={editable}
          disabled={disabled}
          onChange={(next) => onChange?.({ [CURRENCY_META[code].key]: next })}
        />
      ))}
    </div>
  )
}

function RatesMeta({ rates }: { rates: ExchangeRateSnapshot }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>
        Referencia{' '}
        <span className="font-medium text-foreground">{rates.rateDate}</span>
      </span>
      <span aria-hidden>·</span>
      <SourceBadge source={rates.source} />
      {rates.fetchedAt ? (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <RefreshCw aria-hidden className="size-3" />
            {formatExchangeRateFetchedAt(rates.fetchedAt)}
          </span>
        </>
      ) : null}
    </div>
  )
}

export function TaxCurrencySettingsPanel() {
  const today = chileDateString()
  const { canEdit } = useModulePermissions('configuracion')
  const { settings, isLoading: orgLoading, saveSettings } = useOrganizationSettings()
  const readOnly = !canEdit || orgLoading

  const [vatDraft, setVatDraft] = useState(String(settings.defaultVatPercent))
  const [vatSaving, setVatSaving] = useState(false)
  const [confirmVatOpen, setConfirmVatOpen] = useState(false)
  const vatDirty = vatDraft.trim() !== String(settings.defaultVatPercent)

  const [todayRates, setTodayRates] = useState<ExchangeRateSnapshot | null>(null)
  const [rateDraft, setRateDraft] = useState<RateDraft>(() => ratesToDraft(null))
  const [todayLoading, setTodayLoading] = useState(isApiEnabled())
  const [todayError, setTodayError] = useState<string | null>(null)
  const [ratesSaving, setRatesSaving] = useState(false)
  const [confirmRatesOpen, setConfirmRatesOpen] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false)

  const [searchDate, setSearchDate] = useState('')
  const [searchRates, setSearchRates] = useState<ExchangeRateSnapshot | null>(null)
  const [searchChecked, setSearchChecked] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    setVatDraft(String(settings.defaultVatPercent))
  }, [settings.defaultVatPercent])

  const loadToday = useCallback(async () => {
    if (!isApiEnabled()) {
      setTodayLoading(false)
      return
    }
    setTodayLoading(true)
    setTodayError(null)
    try {
      const data = await getStoredExchangeRatesApi()
      setTodayRates(data)
      setRateDraft(ratesToDraft(data))
    } catch (error) {
      setTodayError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los indicadores del día.',
      )
    } finally {
      setTodayLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadToday()
  }, [loadToday])

  const handleOpenConfirmVat = () => {
    const value = Number.parseFloat(vatDraft)
    const validation = validateDefaultVatPercent(value)
    if (validation) {
      toast.warning(validation)
      return
    }
    setConfirmVatOpen(true)
  }

  const handleConfirmSaveVat = async () => {
    const value = Number.parseFloat(vatDraft)
    const validation = validateDefaultVatPercent(value)
    if (validation) {
      toast.warning(validation)
      return
    }
    setVatSaving(true)
    try {
      await saveSettings({ defaultVatPercent: value })
      setConfirmVatOpen(false)
      toast.success('IVA por defecto actualizado.')
    } catch {
      toast.error('No se pudo guardar el IVA.')
    } finally {
      setVatSaving(false)
    }
  }

  const parsedRateDraft = {
    ufClp: parseRateInput(rateDraft.ufClp),
    usdClp: parseRateInput(rateDraft.usdClp),
    eurClp: parseRateInput(rateDraft.eurClp),
  }

  const ratesDraftValid =
    parsedRateDraft.ufClp != null &&
    parsedRateDraft.usdClp != null &&
    parsedRateDraft.eurClp != null

  const ratesDraftDirty =
    !todayRates ||
    parsedRateDraft.ufClp !== todayRates.ufClp ||
    parsedRateDraft.usdClp !== todayRates.usdClp ||
    parsedRateDraft.eurClp !== todayRates.eurClp

  const handleConfirmSaveRates = async () => {
    if (!ratesDraftValid || !canEdit) return
    setRatesSaving(true)
    try {
      const saved = await updateStoredExchangeRatesApi({
        rateDate: today,
        ufClp: parsedRateDraft.ufClp!,
        usdClp: parsedRateDraft.usdClp!,
        eurClp: parsedRateDraft.eurClp!,
      })
      setTodayRates(saved)
      setRateDraft(ratesToDraft(saved))
      setConfirmRatesOpen(false)
      toast.success('Indicadores del día actualizados.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los indicadores.',
      )
    } finally {
      setRatesSaving(false)
    }
  }

  const handleConfirmSync = async () => {
    if (!canEdit || !isApiEnabled()) return
    setSyncLoading(true)
    try {
      const synced = await syncExchangeRatesApi(today)
      setTodayRates(synced)
      setRateDraft(ratesToDraft(synced))
      setConfirmSyncOpen(false)
      toast.success('Indicadores sincronizados correctamente.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo sincronizar los indicadores (findic.cl / mindicador.cl).',
      )
    } finally {
      setSyncLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchDate.trim()) return
    if (!isApiEnabled()) {
      setSearchError('La API no está habilitada.')
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    setSearchChecked(false)
    setSearchRates(null)

    try {
      const data = await getStoredExchangeRatesApi(searchDate)
      setSearchRates(data)
      setSearchChecked(true)
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : 'No se pudo consultar la fecha indicada.',
      )
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Percent aria-hidden className="size-5" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold">IVA por defecto</CardTitle>
                <CardDescription className="mt-1 max-w-xl">
                  Aplica en productos, cotizaciones, compras y facturas. Valor estándar en Chile: 19%.
                </CardDescription>
              </div>
            </div>

            <fieldset
              disabled={readOnly}
              className="flex flex-wrap items-end gap-3 border-0 p-0 m-0 min-w-0 lg:justify-end"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="default-vat-percent"
                  className="text-xs text-muted-foreground"
                >
                  Porcentaje
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="default-vat-percent"
                    type="number"
                    value={vatDraft}
                    disabled={readOnly}
                    className="h-11 w-24 text-center text-lg font-semibold tabular-nums"
                    onChange={(event) => setVatDraft(event.target.value)}
                  />
                  <span className="text-lg font-medium text-muted-foreground">%</span>
                </div>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  onClick={handleOpenConfirmVat}
                  disabled={vatSaving || orgLoading || !vatDirty}
                  className="h-11"
                >
                  Guardar IVA
                </Button>
              ) : null}
            </fieldset>
          </div>
        </div>
        <CardContent className="px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Los documentos ya emitidos conservan el IVA calculado al momento de su creación.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="space-y-4 border-b border-border/60 bg-muted/10 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-primary shadow-sm">
                <Coins aria-hidden className="size-5" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Indicadores económicos</CardTitle>
                <CardDescription className="mt-1 capitalize">
                  {formatDisplayDate(today)}
                </CardDescription>
              </div>
            </div>
            {todayRates ? <RatesMeta rates={todayRates} /> : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sincronización automática diaria a las 00:05 (Chile) desde findic.cl (con respaldo
            mindicador.cl). Puedes
            corregir valores manualmente cuando sea necesario.
          </p>
        </CardHeader>

        <CardContent className="space-y-6 px-6 py-5">
          {todayLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Cargando indicadores…
            </div>
          ) : todayError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {todayError}
            </p>
          ) : canEdit ? (
            <>
              <RatesGrid
                draft={rateDraft}
                editable
                disabled={readOnly}
                onChange={(patch) => setRateDraft((prev) => ({ ...prev, ...patch }))}
              />
              {!todayRates ? (
                <p className="text-center text-sm text-muted-foreground">
                  Aún no hay valores para hoy. Ingresa UF, USD y EUR para registrarlos.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2"
                  disabled={syncLoading || ratesSaving || readOnly || !isApiEnabled()}
                  onClick={() => setConfirmSyncOpen(true)}
                >
                  {syncLoading ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw aria-hidden className="size-4" />
                  )}
                  Sincronizar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!ratesDraftValid || !ratesDraftDirty || ratesSaving || syncLoading}
                  onClick={() => setConfirmRatesOpen(true)}
                >
                  Guardar indicadores
                </Button>
              </div>
            </>
          ) : (
            <RatesGrid draft={ratesToDraft(todayRates)} />
          )}

          <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <label
                  htmlFor="exchange-rate-search-date"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  <CalendarDays aria-hidden className="size-3.5" />
                  Consultar histórico
                </label>
                <Input
                  id="exchange-rate-search-date"
                  type="date"
                  value={searchDate}
                  max={today}
                  className="h-10 bg-background shadow-sm"
                  onChange={(event) => {
                    setSearchDate(event.target.value)
                    setSearchChecked(false)
                    setSearchRates(null)
                    setSearchError(null)
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-10 gap-2"
                disabled={!searchDate.trim() || searchLoading}
                onClick={() => void handleSearch()}
              >
                {searchLoading ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Search aria-hidden className="size-4" />
                )}
                Buscar
              </Button>
            </div>

            {searchError ? (
              <p className="mt-3 text-sm text-destructive">{searchError}</p>
            ) : null}

            {searchChecked && !searchRates ? (
              <p className="mt-4 rounded-lg bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                No hay registros para{' '}
                <span className="font-medium capitalize text-foreground">
                  {formatDisplayDate(searchDate)}
                </span>
                .
              </p>
            ) : null}

            {searchRates ? (
              <div className="mt-5 space-y-3">
                <RatesMeta rates={searchRates} />
                <RatesGrid draft={ratesToDraft(searchRates)} />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmVatOpen} onOpenChange={setConfirmVatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-5 text-amber-500" />
              Confirmar cambio de IVA
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-muted-foreground">
                <p>
                  Cambiarás el IVA por defecto de{' '}
                  <span className="font-medium text-foreground">
                    {settings.defaultVatPercent}%
                  </span>{' '}
                  a{' '}
                  <span className="font-medium text-foreground">
                    {vatDraft.trim()}%
                  </span>
                  .
                </p>
                <p>
                  El nuevo porcentaje se aplicará al calcular IVA en productos nuevos,
                  cotizaciones, compras y facturas. Los documentos ya emitidos no se
                  modifican.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmVatOpen(false)}
              disabled={vatSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSaveVat()}
              disabled={vatSaving}
            >
              {vatSaving ? 'Guardando…' : 'Confirmar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSyncOpen} onOpenChange={setConfirmSyncOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw aria-hidden className="size-5 text-primary" />
              Sincronizar indicadores
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-muted-foreground">
                <p>
                  Se consultará findic.cl (y mindicador.cl si falla) y se actualizarán los valores UF,
                  USD y EUR
                  almacenados para{' '}
                  <span className="font-medium capitalize text-foreground">
                    {formatDisplayDate(today)}
                  </span>
                  .
                </p>
                <p>
                  Si habías modificado los indicadores manualmente, esos valores serán
                  reemplazados por los del servicio y la fuente volverá a{' '}
                  <span className="font-medium text-foreground">findic.cl</span> y, de ser
                  necesario, <span className="font-medium text-foreground">mindicador.cl</span>.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmSyncOpen(false)}
              disabled={syncLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSync()}
              disabled={syncLoading}
            >
              {syncLoading ? 'Sincronizando…' : 'Sincronizar ahora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRatesOpen} onOpenChange={setConfirmRatesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-5 text-amber-500" />
              Confirmar indicadores manuales
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-muted-foreground">
                <p>
                  Sobrescribirás los valores UF, USD y EUR del{' '}
                  <span className="font-medium capitalize text-foreground">
                    {formatDisplayDate(today)}
                  </span>
                  .
                </p>
                <p>
                  Quedarán marcados como manuales y se usarán al convertir moneda en cotizaciones,
                  facturas y compras con esta fecha de referencia.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRatesOpen(false)}
              disabled={ratesSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSaveRates()}
              disabled={ratesSaving}
            >
              {ratesSaving ? 'Guardando…' : 'Confirmar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
