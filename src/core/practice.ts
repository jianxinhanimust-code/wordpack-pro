import type { Word } from '@/data/books'
import { getNote, meaningOf, other, related } from '@/data/editorial'
import { wordKey } from './schema'

export function exactSpelling(answer: string, expected: string) {
  return wordKey(answer) === wordKey(expected) && wordKey(expected).length > 0
}

export function makeChoices(target: Word, pool: Word[], context: boolean) {
  const samePart = target.definitions[0]?.[0]
  const paired = new Set(related(target.word).map(relation => other(relation, target.word)))
  const key = wordKey(target.word)
  const getText = (word: Word) => context
    ? getNote(word.word)?.meaning || word.definitions[0]?.[1] || ''
    : meaningOf(word)
  const targetText = getText(target)
  if (!targetText) return []
  const candidate = pool.filter(w => wordKey(w.word) !== key && (paired.has(wordKey(w.word))
    || w.definitions[0]?.[0] === samePart || !samePart))
  const compare = (w: Word) => {
    const id = wordKey(w.word)
    const isPaired = paired.has(id) ? -3 : 0
    const sameStart = id[0] === key[0] ? -1 : 0
    return isPaired + sameStart
  }
  candidate.sort((a, b) => compare(a) - compare(b))
  const choices = [{ id: key, text: targetText }]
  const used = new Set([targetText])
  for (const item of [...candidate, ...pool]) {
    const id = wordKey(item.word)
    const text = getText(item)
    if (id === key || !text || used.has(text) || text.includes(targetText) || targetText.includes(text)
      || choices.some(choice => choice.id === id)) continue
    choices.push({ id, text })
    used.add(text)
    if (choices.length === 4) break
  }
  if (choices.length < 2) return []
  const position = [...key].reduce((sum, char) => Math.imul(sum, 31) + char.charCodeAt(0), 7) >>> 0
  const shift = position % choices.length
  return [...choices.slice(shift), ...choices.slice(0, shift)]
}

