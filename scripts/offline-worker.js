/* The build injects exact asset URLs and a hash of their contents. */
const assets = __WORDPACK_ASSETS__
const revision = '__WORDPACK_REVISION__'
const scope = self.registration.scope
const prefix = `wordpack-pro:${scope}:`
const cacheName = prefix + revision
const shell = new URL('index.html', scope).href
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

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  const hashless = url.href
  const navigation = event.request.mode === 'navigate' && (url.pathname === new URL(scope).pathname
    || url.pathname === new URL(shell).pathname)
  if (!navigation && !urls.has(hashless)) return
  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(navigation ? shell : hashless)
    return cached ?? fetch(event.request)
  })())
})
