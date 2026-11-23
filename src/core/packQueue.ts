import type { Word } from '@/data/books'
import { cardDesign } from './cardArt'
import { getQueue } from './learning'
import { wordKey } from './schema'
import type { Data } from './schema'

export function getPackQueue(words: Word[], data: Data, now: Date, remaining: number) {
  const selected = getQueue(words, data, 'recognition', now, 0, Math.min(5, data.settings.reviewLimit))
  const size = Math.min(5, selected.length + remaining)
  if (selected.length >= size) return selected

  const artworks = new Set(selected.map(word => cardDesign(word.word).motif))
  const used = new Set(selected.map(word => wordKey(word.word)))
  const previous = data.packs.at(-1)
  const recentArt = new Set(Object.entries(data.collected).filter(([, at]) => at === previous)
    .map(([key]) => cardDesign(key).motif))
  const available = getQueue(words, data, 'recognition', now, words.length, 0)
  const candidates = available.map(word => {
    const key = wordKey(word.word)
    return { word, key, art: cardDesign(key).motif }
  }).sort((a, b) => Number(recentArt.has(a.art)) - Number(recentArt.has(b.art)))

  for (const existing of [false, true]) {
    const group = candidates.filter(({ key }) => Object.hasOwn(data.collected, key) === existing)
    for (const distinct of [true, false]) {
      for (const { word, key, art } of group) {
        if (selected.length === size) return selected
        if (used.has(key)) continue
        if (distinct && artworks.has(art)) continue
        selected.push(word)
        used.add(key)
        artworks.add(art)
      }
    }
  }
  return selected
}
