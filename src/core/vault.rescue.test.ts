import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createData } from './schema'
import { initVault, readRawRecord, resetVault, save } from './vault'

// 旧版 v1 的键在升级用户机器上可能是坏 JSON：它不能让启动失败。
beforeAll(() => {
  const legacy = new Map([['bbdict.progress.v1', '{broken json']])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => legacy.get(key) ?? null },
  })
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined })
})

async function injectRaw(value: unknown) {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('wordpack-pro', 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('learning')) request.result.createObjectStore('learning')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('learning', 'readwrite')
    tx.objectStore('learning').put(value, 'current')
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
  })
  database.close()
}

describe('startup recovery', () => {
  it('starts clean when a legacy key cannot be parsed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await initVault()
    expect(await save(data => data)).toEqual(createData())
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('exports the raw record and recovers after the stored record fails validation', async () => {
    await initVault()
    await injectRaw({ version: 2, unreadable: true })
    await expect(save(data => data)).rejects.toThrow()

    const raw = await readRawRecord()
    expect(raw).toContain('"unreadable": true')

    expect(await resetVault()).toEqual(createData())
    expect(await save(data => data)).toEqual(createData())
  })
})
