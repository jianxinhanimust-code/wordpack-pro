import { createHash } from 'node:crypto'
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

const bundledLibraries = [
  'react', 'react-dom', 'scheduler', 'ts-fsrs', 'lucide-react', 'zod',
  '@fontsource-variable/manrope', '@fontsource/space-mono',
]

async function packageNotices(directory: string) {
  const files = ['LICENSE', 'THIRD_PARTY_NOTICES.md']
  await Promise.all(files.map(file => copyFile(new URL(file, import.meta.url), join(directory, file))))
  const licenses = await Promise.all(bundledLibraries.map(async library => {
    const path = new URL(`./node_modules/${library}/LICENSE`, import.meta.url)
    return `=== ${library} ===\n\n${(await readFile(path, 'utf8')).trim()}`
  }))
  const artwork = 'Artwork: foil-studio.webp and obsidian-stage.webp are original generated illustrations created for WordPack Pro. '
    + 'The gem app mark and PWA icons were drawn for WordPack Pro.'
  await writeFile(join(directory, 'THIRD_PARTY_LICENSES.txt'), [artwork, ...licenses].join('\n\n') + '\n', 'utf8')
}

function offlineBuild(): Plugin {
  return {
    name: 'wordpack-offline-cache',
    apply: 'build',
    async writeBundle(output) {
      const directory = resolve(output.dir ?? 'dist')
      await packageNotices(directory)
      const entries = (await readdir(directory, { recursive: true, withFileTypes: true }))
        .filter(entry => entry.isFile())
        .map(entry => join(entry.parentPath, entry.name))
        .map(path => relative(directory, path).replaceAll('\\', '/'))
        .filter(path => path !== 'offline-worker.js' && !path.endsWith('.map'))
        .sort()
      if (!entries.includes('index.html')) throw Error('Production build has no offline shell.')
      const worker = await readFile(new URL('./scripts/offline-worker.js', import.meta.url), 'utf8')
      const version = createHash('sha256').update(worker)
      for (const path of entries) {
        version.update(path).update(await readFile(join(directory, path)))
      }
      const script = worker.replace('__WORDPACK_ASSETS__', JSON.stringify(entries))
        .replace('__WORDPACK_REVISION__', version.digest('hex').slice(0, 16))
      await writeFile(join(directory, 'offline-worker.js'), script, 'utf8')
    },
  }
}

export default defineConfig({
  plugins: [react(), offlineBuild()],
  // Relative URLs work for both root and subdirectory static deployments.
  base: process.env.PAGES_BASE || './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
