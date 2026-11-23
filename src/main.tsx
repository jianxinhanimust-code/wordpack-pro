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

  // 新版本装好后提示刷新。没有这一步，已经打开着的页面会一直跑旧版本，
  // 表现就是「明明修好了，手机上还是旧行为」。
  let controller = navigator.serviceWorker.controller
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const previous = controller
    controller = navigator.serviceWorker.controller
    // The first installation claims the page while someone may already be tapping a control.
    // Reload only when a new worker replaces one that was already controlling the page.
    if (!previous || !controller || previous === controller || refreshing) return
    refreshing = true
    window.location.reload()
  })

  function offerUpdate(registration: ServiceWorkerRegistration) {
    if (!registration.waiting || !navigator.serviceWorker.controller) return
    if (document.getElementById('sw-update')) return
    const bar = document.createElement('div')
    bar.id = 'sw-update'
    bar.className = 'update-bar'
    bar.setAttribute('role', 'status')
    const text = document.createElement('span')
    text.textContent = '有新版本，刷新后生效'
    const action = document.createElement('button')
    action.type = 'button'
    action.textContent = '刷新'
    action.addEventListener('click', () => {
      bar.remove()
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
    })
    bar.append(text, action)
    document.body.append(bar)
  }

  void navigator.serviceWorker.register(worker, { updateViaCache: 'none' }).then(registration => {
    offerUpdate(registration)
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed') offerUpdate(registration)
      })
    })
  }).catch(error => {
    console.warn('WordPack Pro offline cache registration failed.', error)
  })
}
