/* The build injects exact asset URLs and a hash of their contents. */
const assets = __WORDPACK_ASSETS__
const revision = '__WORDPACK_REVISION__'
const scope = self.registration.scope
const prefix = `wordpack-pro:${scope}:`
const cacheName = prefix + revision
const shell = new URL('index.html', scope).href
// 部署在子路径时（如 /wordpack-pro/）资源前缀也要跟着变
const assetPrefix = new URL('assets/', scope).pathname
const audioPrefix = new URL('audio/', scope).pathname
const atlasPrefix = new URL('card-art/atlas/', scope).pathname
const urls = new Set(assets.map(path =>
  new URL(path.split('/').map(encodeURIComponent).join('/'), scope).href))

self.addEventListener('install', event => {
  // Keep the old worker active until its pages close so every tab keeps a matching bundle.
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll([...urls].map(url => new Request(url, { cache: 'reload' })))))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName)
      .map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

// 页面上的「有新版本，刷新」按钮会让新 worker 立刻接管
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  // The AI proxy is never cached: it answers per request and must fail when offline.
  if (url.pathname.startsWith('/api/')) return
  const navigation = event.request.mode === 'navigate' && (url.pathname === new URL(scope).pathname
    || url.pathname === new URL(shell).pathname)
  // Precached assets plus anything else the app has already pulled in (词书分片、发音和大型卡组插画).
  const cacheable = navigation || urls.has(url.href)
    || url.pathname.startsWith(assetPrefix) || url.pathname.startsWith(audioPrefix) || url.pathname.startsWith(atlasPrefix)
  if (!cacheable) return
  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    const key = navigation ? shell : url.href
    const cached = await cache.match(key)
    if (cached) return cached
    const response = await fetch(event.request)
    if (!navigation && response.ok && response.type === 'basic') await cache.put(key, response.clone())
    return response
  })())
})
