import { useEffect } from 'react'

const SITE_SUFFIX = ' · Kora CRM'

export function useMarketingPageMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = `${title}${SITE_SUFFIX}`
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) {
      meta.setAttribute('content', description)
    }
  }, [title, description])
}
