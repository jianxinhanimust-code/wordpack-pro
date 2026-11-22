/**
 * 旧版（不背单词 Lite）自定义词书读取。
 *
 * 只保留首次打开时的一次性迁移读取；新的学习记录全部由 vault.ts 管理。
 * 旧库名与表名在这里是常量，不随产品重命名，否则迁移会找不到数据。
 */
import type { BookMeta, Word } from '@/data/books'

/** 旧版 IDB 中的自定义词书结构 */
export interface CustomBook {
  id: string
  meta: BookMeta
  words: Word[]
  createdAt: number
}

const DB_NAME = 'bbdict'
const DB_STORE = 'custom-books'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbGetAll(): Promise<CustomBook[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly')
    const req = tx.objectStore(DB_STORE).getAll()
    req.onsuccess = () => {
      const books = req.result as CustomBook[]
      db.close()
      resolve(books)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}
