import '@fontsource-variable/inter/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from '@/App.tsx'
import { PwaUpdatePrompt } from '@/components/pwa/PwaUpdatePrompt'
import '@/index.css'
import { clearLegacyLocalStorageForApiMode } from '@/lib/local-storage-cleanup'

clearLegacyLocalStorageForApiMode()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <PwaUpdatePrompt />
    </BrowserRouter>
  </StrictMode>,
)
