import { useSyncExternalStore } from 'react'
import { createData, dataSchema, parseBackup, wordKey } from './schema'
import type { Data } from './schema'
import type { Word } from '@/data/books'
import { idbGetAll } from './storage'

const dbName = 'wordpack-pro'
const table = 'learning'
const slot = 'current'
type Transform = (data: Data) => Data

let connection: Promise<IDBDatabase> | undefined
function db() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(table)
    request.onblocked = () => reject(Error('本地数据库正在被其他窗口占用。'))
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); connection = undefined }
      resolve(request.result)
    }
  }).catch((error: unknown) => { connection = undefined; throw error })
  return connection
}

async function transaction(update?: Transform) {
  const database = await db()
  return new Promise<Data | undefined>((resolve, reject) => {
    const tx = database.transaction(table, update ? 'readwrite' : 'readonly')
    const store = tx.objectStore(table)
    const request = store.get(slot)
    let current: Data | undefined
    let failure: unknown
    request.onsuccess = () => {
      try {
        const raw: unknown = request.result
        if (raw !== undefined) current = dataSchema.parse(raw)
        if (update) {
          current = update(current ?? createData())
          store.put(dataSchema.parse(current), slot)
        }
      } catch (error) {
        failure = error
        tx.abort()
      }
    }
    tx.oncomplete = () => resolve(current)
    tx.onabort = () => reject(failure ?? tx.error ?? Error('存储事务已取消。'))
  })
}

async function legacyData() {
  // A corrupt legacy key must never block startup: the new records live in IndexedDB,
  // and these keys are only read once for a best-effort migration.
  const old = (key: string) => {
    try {
      const value = localStorage.getItem(key)
      return value === null ? undefined : JSON.parse(value) as unknown
    } catch {
      console.warn(`WordPack Pro 跳过无法解析的旧版数据：${key}`)
      return undefined
    }
  }
  const progress = old('bbdict.progress.v1')
  const settings = old('bbdict.settings.v1')
  const dailyStats = old('bbdict.dailystats.v1')
  const starred = old('bbdict.starred.v1')
  const databaseExists = typeof indexedDB.databases === 'function'
    ? (await indexedDB.databases()).some(entry => entry.name === 'bbdict')
    : Boolean(old('bbdict.custom.index.v1'))
  const customBooks = databaseExists ? await idbGetAll() : []
  if (!progress && !settings && !dailyStats && !starred && !customBooks.length) return undefined
  return parseBackup(JSON.stringify({ version: 1, progress: progress ?? {}, settings, dailyStats, starred, customBooks }))
}

let state: { data: Data; ready: boolean; error: string } = { data: createData(), ready: false, error: '' }
const subscriptions = new Set<() => void>()
function publish(next: typeof state) {
  state = next
  subscriptions.forEach(listener => listener())
}
const subscribe = (listener: () => void) => {
  subscriptions.add(listener)
  return () => { subscriptions.delete(listener) }
}
const snapshot = () => state
export const useVault = () => useSyncExternalStore(subscribe, snapshot, snapshot)
let channel: BroadcastChannel | undefined
let initializing: Promise<void> | undefined

export function initVault() {
  initializing ??= (async () => {
    const stored = await transaction()
    const imported = stored ? undefined : await legacyData()
    const data = stored ?? (imported ? await transaction(current =>
      current.legacy || current.history.length || current.books.length ? current : imported) : undefined) ?? createData()
    publish({ data, ready: true, error: '' })
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(dbName)
      channel.onmessage = () => {
        void transaction().then(updated => {
          if (updated) publish({ data: updated, ready: true, error: '' })
        }).catch(() => publish({ ...state, error: '读取其他窗口的更新失败。' }))
      }
    }
  })().catch((error: unknown) => {
    publish({ ...state, error: '本地数据读取或迁移失败。原有记录已保留。' })
    console.error(error)
  })
  return initializing
}

export async function save(update: Transform) {
  await initVault()
  if (!state.ready) throw Error(state.error)
  const data = await transaction(update)
  if (!data) throw Error('写入未完成。')
  publish({ data, ready: true, error: '' })
  channel?.postMessage('changed')
  return data
}

export async function importBackup(file: string) {
  const imported = parseBackup(file)
  return save(() => imported)
}

export function collect(words: Word[]) {
  return save(data => {
    const now = Date.now()
    const collected = { ...data.collected }
    for (const word of words) {
      const id = wordKey(word.word)
      if (!Object.hasOwn(collected, id)) collected[id] = now
    }
    return { ...data, collected, packs: [...data.packs, now] }
  })
}

/**
 * 读出原始记录文本，跳过 schema 校验。
 * 启动失败时（数据损坏或版本不兼容），这是唯一还能把学习记录取出来的途径。
 */
export async function readRawRecord(): Promise<string | undefined> {
  try {
    const database = await db()
    return await new Promise<string | undefined>((resolve, reject) => {
      const tx = database.transaction(table, 'readonly')
      const request = tx.objectStore(table).get(slot)
      request.onsuccess = () => {
        const value: unknown = request.result
        resolve(value === undefined ? undefined : JSON.stringify(value, null, 2))
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return undefined
  }
}

/** 用一份全新的空数据覆盖本地记录。不读取旧值，因此数据损坏时也能恢复。 */
export async function resetVault(): Promise<Data> {
  const database = await db()
  const fresh = createData()
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(table, 'readwrite')
    tx.objectStore(table).put(dataSchema.parse(fresh), slot)
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? Error('重置本地数据失败。'))
  })
  publish({ data: fresh, ready: true, error: '' })
  channel?.postMessage('changed')
  return fresh
}

