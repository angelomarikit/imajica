import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reclaimClinicStorageForAuth } from '@/utils/safeLocalStorage'

/**
 * Clinic tablets (Lipa, etc.) accumulate old local caches. Free space on every
 * boot so the login token can save — staff should never need to Clear site data.
 */
try {
  reclaimClinicStorageForAuth()
} catch {
  /* ignore */
}

/**
 * After a Vercel deploy, tablets left open still reference old hashed chunks.
 * Reload once so Place Order / Save Customer never die on "Failed to fetch
 * dynamically imported module".
 */
const CHUNK_RELOAD_KEY = 'imajica_chunk_reload_v1'

function isStaleChunkError(message: string) {
  return /failed to fetch dynamically imported module|loading chunk [\w-]+ failed|importing a module script failed|error loading dynamically imported module/i.test(
    message,
  )
}

function reloadOnceForStaleChunk(reason: string) {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  } catch {
    /* ignore */
  }
  console.warn('[boot] stale asset after deploy — reloading once:', reason)
  window.location.reload()
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForStaleChunk('vite:preloadError')
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : String(reason ?? '')
  if (!isStaleChunkError(message)) return
  event.preventDefault()
  reloadOnceForStaleChunk(message)
})

window.addEventListener('load', () => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    /* ignore */
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
