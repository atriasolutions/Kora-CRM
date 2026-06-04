import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  getOrganizationSettingsApi,
  updateOrganizationSettingsApi,
} from '@/api/organization-settings'
import { isApiEnabled } from '@/api/config'
import { OrganizationSettingsContext } from '@/contexts/organization-settings-context'
import { syncOrganizationSettings } from '@/data/organization-settings-store'
import {
  defaultOrganizationSettings,
  loadOrganizationSettings,
  saveOrganizationSettings as persistSettings,
} from '@/lib/organization-settings'
import type { OrganizationSettings } from '@/types/organization-settings'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { toast } from '@/lib/toast'

const useApi = isApiEnabled()

export function OrganizationSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OrganizationSettings>(() =>
    useApi ? defaultOrganizationSettings() : loadOrganizationSettings(),
  )
  const [isLoading, setIsLoading] = useState(false)

  const applySettings = useCallback((next: OrganizationSettings) => {
    setSettings(next)
    syncOrganizationSettings(next)
  }, [])

  const reloadFromApi = useCallback(async () => {
    const data = await getOrganizationSettingsApi()
    applySettings(data)
  }, [applySettings])

  useRegistryApiBootstrap(async () => {
    setIsLoading(true)
    try {
      await reloadFromApi()
    } finally {
      setIsLoading(false)
    }
  })

  const saveSettings = useCallback(
    async (next: OrganizationSettings) => {
      if (useApi) {
        const saved = await updateOrganizationSettingsApi(next)
        applySettings(saved)
        return
      }
      applySettings(next)
      persistSettings(next)
    },
    [applySettings],
  )

  const updateSettings = useCallback(
    (patch: Partial<OrganizationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch }
        if (!useApi) persistSettings(next)
        syncOrganizationSettings(next)
        return next
      })
    },
    [],
  )

  const resetSettings = useCallback(() => {
    if (useApi) {
      toast.warning('En modo API los datos se gestionan en el servidor.')
      return
    }
    const defaults = defaultOrganizationSettings()
    applySettings(defaults)
    persistSettings(defaults)
  }, [applySettings])

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings, saveSettings, resetSettings }),
    [settings, isLoading, updateSettings, saveSettings, resetSettings],
  )

  return (
    <OrganizationSettingsContext.Provider value={value}>
      {children}
    </OrganizationSettingsContext.Provider>
  )
}
