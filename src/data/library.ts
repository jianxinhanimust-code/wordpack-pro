import { useEffect, useMemo, useState } from 'react'
import { BOOK_INDEX, loadBook, makeWord } from './books'
import type { BookMeta, Word } from './books'
import { orderByEditorial, priority } from './editorial'
import { wordKey } from '@/core/schema'
import type { Data } from '@/core/schema'
import { creatureBook, creatureWords } from './creatures'

export const TOPIC = 'reading'
export const PERSONAL = 'personal'
const featured: BookMeta[] = [
  creatureBook,
  { id: TOPIC, name: '六级阅读常用词', shortName: '阅读专题', description: '常见搭配、语境和同义替换', color: 'rose', totalCount: priority.length },
  { id: PERSONAL, name: '真题个人生词本', shortName: '个人词本', description: '导入你的阅读生词，独立管理', color: 'emerald', totalCount: 0 },
]
export const builtin = [
  ...BOOK_INDEX.filter(b => b.id === 'cet6' || b.id === 'cet4').reverse(),
  ...featured,
  ...BOOK_INDEX.filter(b => b.id !== 'cet4' && b.id !== 'cet6'),
]
const starterData = new Map<string, Word[]>()

async function loadBuiltin(id: string): Promise<Word[]> {
  if (id === creatureBook.id) return creatureWords
  const cached = starterData.get(id)
  if (cached) return cached
  if (id === TOPIC) {
    const terms = await Promise.all(['cet6', 'cet4'].map(loadBuiltin))
    const byKey = new Map(terms.flat().map(word => [wordKey(word.word), word]))
    const list = priority.flatMap(key => {
      const word = byKey.get(key)
      return word ? [makeWord(word, TOPIC)] : []
    })
    starterData.set(id, list)
    return list
  }
  const words = orderByEditorial(await loadBook(id))
  starterData.set(id, words)
  return words
}

export function uniqueWords(words: Word[]) {
  const map = new Map<string, Word>()
  for (const word of words) {
    const id = wordKey(word.word)
    if (!map.has(id)) map.set(id, word)
  }
  return [...map.values()]
}

export function useLibrary(data: Data, collection: boolean) {
  const metadata = useMemo(() => {
    const overrides = new Map(data.books.map(book => [book.id, book.meta]))
    return [...builtin.map(book => overrides.get(book.id) ?? book),
      ...data.books.filter(book => !builtin.some(b => b.id === book.id)).map(book => book.meta)]
  }, [data.books])
  const active = metadata.find(book => book.id === data.settings.book) ?? metadata[0]
  const relevant = [...new Set([active.id,
    ...(collection ? builtin.map(b => b.id) : [])])].filter(id => builtin.some(b => b.id === id)).sort().join(',')
  const [loaded, setLoaded] = useState<Record<string, Word[]>>({})
  const [error, setError] = useState(false)
  useEffect(() => {
    let stale = false
    setError(false)
    const ids = relevant.split(',').filter(Boolean)
    void Promise.all(ids.map(async id => [id, await loadBuiltin(id)] as const)).then(entries => {
      if (!stale) setLoaded(current => ({ ...current, ...Object.fromEntries(entries) }))
    }).catch(() => { if (!stale) setError(true) })
    return () => { stale = true }
  }, [relevant])
  const words = useMemo(() => {
    const custom = data.books.find(b => b.id === active.id)
    return custom?.words ?? loaded[active.id] ?? []
  }, [active.id, data.books, loaded])
  const universe = useMemo(() => uniqueWords([
    ...words, ...data.books.flatMap(book => book.words), ...Object.values(loaded).flat(),
  ]), [words, loaded, data.books])
  const memberships = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const entry of [...data.books.flatMap(book => book.words), ...Object.values(loaded).flat()]) {
      const id = wordKey(entry.word)
      const memberships = map.get(id) ?? new Set<string>()
      memberships.add(entry.book)
      map.set(id, memberships)
    }
    return map
  }, [data.books, loaded])
  return {
    active, metadata, words, universe, memberships, error,
    loading: !error && !Object.hasOwn(loaded, active.id) && active.id !== PERSONAL
      && !data.books.some(b => b.id === active.id),
  }
}

