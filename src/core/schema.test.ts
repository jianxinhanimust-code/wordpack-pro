import { describe, expect, it } from 'vitest'
import { createData, parseBackup, serializeBackup } from './schema'
import { recordRating } from './learning'
import { makeWord } from '@/data/books'

describe('backup and migration', () => {
  it('round trips actual cards, history, collections, and settings', () => {
    const word = makeWord({ word: 'derive' }, 'cet6')
    const saved = recordRating(createData(), word, 'recall', 'again', new Date('2026-11-22'))
    expect(parseBackup(serializeBackup(saved))).toEqual(saved)
  })

  it('rejects a corrupt or future backup', () => {
    expect(() => parseBackup('{"version":99}')).toThrow()
    expect(() => parseBackup('{"version":1,"progress":{"cet6:derive":{"due":null}}}')).toThrow()
    expect(() => parseBackup('{"version":2,"data":{"history":null}}')).toThrow()
  })

  it('restores earlier v2 backups into their existing exam section', () => {
    const saved = createData()
    const oldSettings = Object.fromEntries(Object.entries(saved.settings).filter(([key]) => key !== 'exam'))
    oldSettings.book = 'cet4'
    const restored = parseBackup(JSON.stringify({ version: 2, data: { ...saved, settings: oldSettings } }))
    expect(restored.settings.exam).toBe('cet4')
    expect(restored.settings.book).toBe('cet4')
  })

  it('preserves legacy SM-2 due dates and raw records without inventing history', () => {
    const due = 1800000000000
    const progress = {
      'cet6:derive': {
        id: 'cet6:derive', book: 'cet6', ease: 2.45, interval: 8, streak: 3,
        due, learnedAt: due - 1000000000, lastReview: due - 691200000,
        reviews: 4, mistakes: 1, status: 'reviewing',
      },
    }
    const migrated = parseBackup(JSON.stringify({ version: 1, progress, settings: { currentBook: 'cet6' } }))
    expect(migrated.progress.derive.recognition?.card.due).toBe(new Date(due).toISOString())
    expect(migrated.progress.derive.recognition?.card.reps).toBe(4)
    expect(migrated.legacy?.progress).toEqual(progress)
    expect(migrated.history).toEqual([])
  })
})
