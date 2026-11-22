import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI)
  const worker = new URL('offline-worker.js', base)
  void navigator.serviceWorker.register(worker, { updateViaCache: 'none' }).catch(error => {
    console.warn('WordPack Pro offline cache registration failed.', error)
  })
}
