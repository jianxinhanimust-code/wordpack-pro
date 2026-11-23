import { once } from 'node:events'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createWordPackServer } from './start.mjs'

const server = createWordPackServer({ env: {}, root: process.env.WORDPACK_CHECK_ROOT })
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const origin = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch(process.env.WORDPACK_CHROMIUM === 'playwright' ? {} : { channel: 'chrome' })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  let mainNavigations = 0
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) mainNavigations += 1 })
  await page.goto(origin)
  await page.waitForFunction(() => Boolean(document.querySelector('#root')?.textContent?.trim()))
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  assert.equal(mainNavigations, 1, 'first offline-cache installation must not interrupt the current screen')

  const precached = await page.evaluate(async () => {
    const keys = (await caches.keys()).filter(key => key.startsWith('wordpack-pro:'))
    if (keys.length !== 1) throw Error('expected one build cache')
    return (await (await caches.open(keys[0])).keys()).map(request => new URL(request.url).pathname)
  })
  const book = precached.find(path => /^\/assets\/cet4-.*\.js$/.test(path))
  assert.ok(book, 'a separate CET-4 book chunk is precached')
  // 只考四六级的用户不该为 GRE/TOEFL 首屏多付 2.2 MB
  assert.ok(!precached.some(path => /^\/assets\/(gre|toefl|npee|primary)-.*\.js$/.test(path)),
    'optional large books are not precached')
  assert.ok(precached.includes('/foil-studio.webp'))
  assert.equal(precached.filter(path => path.startsWith('/card-art/')).length, 68)
  const atlasArt = '/card-art/atlas/79-amber-wyvern-frost.webp'
  assert.ok(!precached.includes(atlasArt), 'the extended collections do not download on first install')
  assert.ok(precached.includes('/manifest.webmanifest'))
  assert.ok(!precached.some(path => path.startsWith('/api/')))
  const loadedAtlas = await page.evaluate(async path => {
    const image = await fetch(path)
    return image.ok && image.headers.get('content-type') === 'image/webp'
  }, atlasArt)
  assert.ok(loadedAtlas, 'an extended illustration can be loaded on demand')

  await context.setOffline(true)
  await page.reload()
  await page.waitForFunction(() => Boolean(document.querySelector('#root')?.textContent?.trim()))
  const result = await page.evaluate(async ([bookPath, atlasPath]) => {
    const [dictionary, art, variant, exotic, variety, atlas] = await Promise.all([
      fetch(bookPath), fetch('/card-art/wing-subject.webp'), fetch('/card-art/glacial-koi-shadow.webp'),
      fetch('/card-art/salt-gecko-obsidian.webp'),
      fetch('/card-art/glasswing-cicada-frost.webp'),
      fetch(atlasPath),
    ])
    return {
      wordBookAvailable: dictionary.ok && (await dictionary.text()).length > 1000,
      artworkAvailable: art.ok && art.headers.get('content-type') === 'image/webp',
      creatureAvailable: variant.ok && variant.headers.get('content-type') === 'image/webp',
      exoticAvailable: exotic.ok && exotic.headers.get('content-type') === 'image/webp',
      varietyAvailable: variety.ok && variety.headers.get('content-type') === 'image/webp',
      atlasAvailable: atlas.ok && atlas.headers.get('content-type') === 'image/webp',
      aiUnavailable: await fetch('/api/ai').then(() => false, () => true),
    }
  }, [book, atlasArt])
  assert.deepEqual(result, {
    wordBookAvailable: true, artworkAvailable: true, creatureAvailable: true, exoticAvailable: true,
    varietyAvailable: true, atlasAvailable: true, aiUnavailable: true,
  })
  await page.goto(`${origin}/#books`)
  const cet4 = page.locator('.book-tile').filter({ has: page.getByRole('heading', { name: '大学英语四级' }) })
  await cet4.getByRole('button', { name: '使用大学英语四级' }).click()
  await cet4.getByText('正在使用', { exact: true }).waitFor()
  await page.goto(origin)
  await page.getByRole('button', { name: '开始拆包' }).click()
  await page.getByRole('button', { name: '直接打开' }).click()
  await page.getByRole('button', { name: '开始学习' }).click()
  await page.getByRole('button', { name: '查看答案' }).click()
  await page.locator('button.rating.good').click()
  await page.getByRole('button', { name: '查看答案' }).waitFor()
  await page.goto(origin)
  const count = page.locator('.metric').filter({ hasText: '今日新词' }).locator('.metric-count')
  await count.waitFor()
  assert.match(await count.innerText(), /^1\s*\/\s*12$/)

  // 运行时缓存：只预缓存四六级，其余词书在第一次打开时进缓存（之后同样离线可用）
  await context.setOffline(false)
  await page.goto(`${origin}/#books`)
  const gaokao = page.locator('.book-tile').filter({ has: page.getByRole('heading', { name: '高考英语' }) })
  await gaokao.getByRole('button', { name: '使用高考英语' }).click()
  await gaokao.getByText('正在使用', { exact: true }).waitFor()
  let runtimeCached = false
  for (let attempt = 0; attempt < 40 && !runtimeCached; attempt += 1) {
    runtimeCached = await page.evaluate(async () => {
      const key = (await caches.keys()).find(name => name.startsWith('wordpack-pro:'))
      if (!key) return false
      const paths = (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)
      return paths.some(path => /\/assets\/npee-.*\.js$/.test(path))
    })
    if (!runtimeCached) await page.waitForTimeout(250)
  }
  assert.ok(runtimeCached, 'a book opened for the first time is cached at runtime')
  console.log(`PWA test passed with ${precached.length} precached files. Offline reload, CET-4 switch, card reveal, session save, and runtime book caching passed.`)} finally {
  await browser?.close()
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
}
