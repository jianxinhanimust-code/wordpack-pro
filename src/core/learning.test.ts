import { describe, expect, it } from 'vitest'
import { getQueue, mistakeSkill, ratingSchedule, recordRating, retention } from './learning'
import { createData } from './schema'
import { makeWord } from '@/data/books'
import { cardDesign } from './cardArt'
import { getPackQueue } from './packQueue'
import { creatureWords } from '@/data/creatures'

const words = ['sustain', 'derive', 'allocate'].map((word) => makeWord({ word }, 'cet6'))
const now = new Date('2026-11-22T08:00:00Z')

describe('WordPack FSRS', () => {
  it('prioritizes the oldest due card and preserves separate skill tracks', () => {
    const start = createData()
    const learned = recordRating(start, words[1], 'recall', 'again', now)
    const spelled = recordRating(learned, words[1], 'spell', 'good', now)
    const then = new Date('2026-11-23T08:00:00Z')
    expect(getQueue(words, spelled, 'recognition', then, 2, 1).map(w => w.word))
      .toEqual(['derive', 'sustain', 'allocate'])
    expect(spelled.progress.derive.recognition?.errors).toBe(1)
    expect(spelled.progress.derive.spelling?.errors).toBe(0)
    expect(spelled.history.map(e => e.mode)).toEqual(['recall', 'spell'])
    expect(spelled.history.map(e => e.first)).toEqual([true, false])
    expect(start.history).toHaveLength(0)
  })

  it('uses a shared canonical word identity across books, including imports', () => {
    const learned = recordRating(createData(), words[0], 'sprint', 'easy', now)
    const same = makeWord({ word: 'SUSTAIN' }, 'custom-personal')
    expect(getQueue([same, words[0], words[1]], learned, 'recognition', now, 3, 3))
      .toEqual([words[1]])
    expect(learned.progress.sustain.recognition?.card.stability).toBeGreaterThan(0)
    expect(retention(learned, now)).toBeGreaterThan(0.9)
  })

  it('retests spelling errors on their own track and handles a clock set backward', () => {
    const initial = recordRating(createData(), words[0], 'spell', 'again', now)
    const skill = mistakeSkill(initial, words[0].word)
    expect(skill).toBe('spelling')
    const earlier = new Date(now.getTime() - 180000)
    expect(() => ratingSchedule(initial, words[0], skill, earlier)).not.toThrow()
    const retested = recordRating(initial, words[0], 'mistakes', 'good', earlier, skill)
    expect(retested.progress.sustain.recognition).toBeUndefined()
    expect(retested.progress.sustain.spelling?.card.reps).toBe(2)
    expect(retested.history[1].mode).toBe('mistakes')
  })

  it('deals uncollected words with varied art across consecutive packs and keeps due cards first', () => {
    const initial = createData()
    const first = getPackQueue(creatureWords, initial, now, 12)
    const collected = Object.fromEntries(first.map(w => [w.word, now.getTime()]))
    const after = { ...initial, collected, packs: [now.getTime()] }
    const second = getPackQueue(creatureWords, after, now, 12)
    expect(first).toHaveLength(5)
    expect(second).toHaveLength(5)
    expect(new Set([...first, ...second].map(word => cardDesign(word.word).motif)).size).toBe(10)

    const yesterday = new Date(now.getTime() - 86_400_000)
    const due = recordRating(after, first[0], 'recall', 'again', yesterday)
    expect(getPackQueue(creatureWords, due, now, 1)).toEqual([first[0], second[0]])
    expect(getPackQueue(creatureWords, due, now, 0)).toEqual([first[0]])
  })
})
