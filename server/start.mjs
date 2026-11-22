import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { createCoach } from './ai.mjs'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.txt', 'text/plain; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'], ['.woff', 'font/woff'], ['.webp', 'image/webp'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
])

// font-src must allow data: because Vite inlines the small font subsets as data URIs.
// script-src and worker-src are stated explicitly so the service worker registration
// never falls back through default-src with a console complaint.
const csp = "default-src 'self'; script-src 'self'; worker-src 'self'; font-src 'self' data:; "
  + "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; "
  + "img-src 'self' data:; style-src 'self' 'unsafe-inline'"

export function createWordPackServer({ env = process.env, root = dist } = {}) {
  const staticRoot = resolve(root)
  const coach = createCoach(env)

  return createServer((req, res) => {
    void serve(req, res).catch(() => {
      if (res.headersSent) {
        res.destroy()
        return
      }
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('WordPack Pro 服务暂不可用')
    })
  })

  async function serve(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname === '/api/ai') return coach(req, res)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' }).end()
      return
    }
    let path
    try {
      path = decodeURIComponent(url.pathname)
    } catch {
      res.writeHead(400).end()
      return
    }
    const file = resolve(staticRoot, `.${path === '/' ? '/index.html' : path}`)
    if (!file.startsWith(staticRoot + sep) || path.includes('\\') || path.includes('\0')) {
      res.writeHead(404).end()
      return
    }
    const info = await stat(file).catch(() => undefined)
    if (!info?.isFile()) {
      res.writeHead(404).end()
      return
    }
    const cached = path.startsWith('/assets/') && /-[\w-]{8,}\.[\w]+$/.test(basename(file))
    res.writeHead(200, {
      'content-type': contentTypes.get(extname(file)) ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': cached ? 'public, max-age=31536000, immutable' : 'no-cache',
      'content-security-policy': csp,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    })
    if (req.method === 'HEAD') res.end()
    else await pipeline(createReadStream(file), res)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.WORDPACK_PORT || 4173)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('WORDPACK_PORT 必须为有效端口。')
  const index = await stat(resolve(dist, 'index.html')).catch(() => undefined)
  if (!index?.isFile()) throw Error('请先运行 npm run build，生成 dist 目录。')
  createWordPackServer().listen(port, '127.0.0.1', () => {
    console.log(`WordPack Pro  http://127.0.0.1:${port}/`)
  })
}
