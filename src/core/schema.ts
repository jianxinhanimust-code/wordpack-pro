import { createEmptyCard, State } from 'ts-fsrs'
import { z } from 'zod'
import type { Card } from 'ts-fsrs'

export const wordKey = (word: string) => word.normalize('NFKC').trim().toLowerCase()
  .replace(/[’‘]/g, "'").replace(/\s+/g, ' ')

const integer = z.number().int().nonnegative()
const timestamp = integer.max(8.64e15)
const key = z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_ .’'/-]*$/)
const bookKey = z.string().regex(/^[a-z0-9_-]{1,100}$/)
const date = z.iso.datetime({ precision: 3 })
const definitions = z.array(z.tuple([
  z.enum(['', 'n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'num.', 'art.', 'int.']),
  z.string().max(2000),
])).max(40)
const word = z.object({
  id: z.string().min(1).max(300), book: bookKey, word: key,
  phonetic: z.string().max(200), freq: z.number().finite(),
  definitions, tip: z.string().max(2000).optional(),
})
const customBook = z.object({
  id: bookKey, createdAt: timestamp, words: z.array(word).max(40000),
  meta: z.object({
    id: bookKey, name: z.string().min(1).max(100), shortName: z.string().max(100),
    description: z.string().max(500), color: z.string().max(60), totalCount: integer,
  }),
}).refine(b => b.id === b.meta.id && b.words.every(w => w.book === b.id))
const settings = z.object({
  book: bookKey,
  exam: z.enum(['cet4', 'cet6']).optional(),
  dailyGoal: z.number().int().min(1).max(120),
  reviewLimit: z.number().int().min(1).max(200),
  motion: z.enum(['full', 'reduced', 'off']),
  sound: z.boolean(), voice: z.string().max(200), rate: z.number().min(0.5).max(1.5),
  accent: z.enum(['en-US', 'en-GB']),
  theme: z.enum(['violet', 'midnight']),
}).transform(value => ({
  ...value,
  exam: value.exam ?? (value.book === 'cet4' ? 'cet4' as const : 'cet6' as const),
}))
export type Preferences = z.infer<typeof settings>
export type Exam = Preferences['exam']
export const defaults: Preferences = {
  book: 'cet6', exam: 'cet6', dailyGoal: 12, reviewLimit: 80, motion: 'full', sound: true,
  voice: '', rate: 0.9, accent: 'en-US', theme: 'violet',
}
export const modes = ['pack', 'sprint', 'recall', 'spell', 'listen', 'mistakes', 'review', 'context', 'dictation'] as const
export type Mode = typeof modes[number]
export type Skill = 'recognition' | 'spelling' | 'listening'
export const ratings = ['again', 'hard', 'good', 'easy'] as const
export type Feedback = typeof ratings[number]

const cardSchema = z.object({
  due: date, stability: z.number().nonnegative(), difficulty: z.number().min(0).max(10),
  scheduled_days: integer, learning_steps: integer,
  reps: integer, lapses: integer, state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  last_review: date.optional(),
})
const track = z.object({ card: cardSchema, errors: integer })
const progress = z.object({
  label: key, books: z.array(bookKey), first: timestamp, updated: timestamp,
  recognition: track.optional(), spelling: track.optional(), listening: track.optional(),
})
const event = z.object({
  word: key, book: bookKey, mode: z.enum(modes), skill: z.enum(['recognition', 'spelling', 'listening']),
  at: timestamp, rating: z.enum(ratings), first: z.boolean(), due: timestamp,
})
const legacyCard = z.object({
  id: z.string(), book: bookKey, due: timestamp, learnedAt: timestamp, lastReview: timestamp,
  reviews: integer, mistakes: integer, interval: z.number().nonnegative(), ease: z.number(),
  streak: integer, status: z.enum(['new', 'learning', 'reviewing', 'mastered']),
})
const legacy = z.object({
  version: z.literal(1),
  progress: z.record(z.string(), legacyCard),
  settings: z.object({
    currentBook: bookKey.optional(), dailyNew: z.number().optional(), dailyReview: z.number().optional(),
    voice: z.string().optional(), rate: z.number().optional(),
  }).passthrough().optional(),
  dailyStats: z.record(z.string(), z.object({
    learned: integer, reviewed: integer, answered: integer, correct: integer,
  }).passthrough()).optional(),
  customBooks: z.array(customBook).optional(),
  starred: z.array(z.string()).optional(),
})
export const dataSchema = z.object({
  version: z.literal(2), settings, progress: z.record(key, progress),
  history: z.array(event), collected: z.record(key, timestamp), favorites: z.array(key),
  books: z.array(customBook).refine(b => new Set(b.map(x => x.id)).size === b.length),
  packs: z.array(timestamp), aiFeedback: z.array(z.object({
    word: key, at: timestamp, note: z.string().min(1).max(500),
  })),
  legacy: legacy.optional(),
})
export type Data = z.infer<typeof dataSchema>
export type Track = z.infer<typeof track>

export function createData(): Data {
  return {
    version: 2, settings: { ...defaults }, progress: {}, history: [], collected: {},
    favorites: [], books: [], packs: [], aiFeedback: [],
  }
}

export function encodeCard(card: Card): Track['card'] {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() }
}

export function decodeCard(card: Track['card']): Card {
  return { ...card, due: new Date(card.due), last_review: card.last_review ? new Date(card.last_review) : undefined }
}

export function serializeBackup(data: Data): string {
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), data }, null, 2)
}

export function parseBackup(text: string): Data {
  const envelope: unknown = JSON.parse(text)
  if (typeof envelope !== 'object' || !envelope || !('version' in envelope)) throw Error('备份缺少版本信息。')
  if (envelope.version === 2 && 'data' in envelope) return dataSchema.parse(envelope.data)
  if (envelope.version === 1) return migrateLegacy(legacy.parse(envelope))
  throw Error('此备份版本暂不支持。')
}

function migrateLegacy(old: z.infer<typeof legacy>): Data {
  const data = createData()
  const oldSettings = old.settings
  data.legacy = old
  data.books = old.customBooks ?? []
  data.settings = {
    ...defaults, book: oldSettings?.currentBook ?? defaults.book,
    exam: oldSettings?.currentBook === 'cet4' ? 'cet4' : 'cet6',
    dailyGoal: Math.min(120, Math.max(1, Math.round(oldSettings?.dailyNew ?? defaults.dailyGoal))),
    reviewLimit: Math.min(200, Math.max(1, Math.round(oldSettings?.dailyReview ?? defaults.reviewLimit))),
    voice: oldSettings?.voice?.slice(0, 200) ?? '',
    rate: Math.min(1.5, Math.max(0.5, oldSettings?.rate ?? defaults.rate)),
  }
  for (const record of Object.values(old.progress)) {
    if (!record.lastReview || !record.reviews || record.status === 'new') continue
    const label = wordKey(record.id.slice(record.id.indexOf(':') + 1))
    const previous = Object.hasOwn(data.progress, label) ? data.progress[label] : undefined
    if (!key.safeParse(label).success) continue
    const books = [...new Set([...(previous?.books ?? []), record.book])]
    const first = Math.min(previous?.first ?? Infinity, record.learnedAt || record.lastReview)
    if (previous && previous.updated > record.lastReview) {
      data.progress[label] = { ...previous, books, first }
      continue
    }
    const card = createEmptyCard(new Date(record.due))
    card.state = record.status === 'learning' ? State.Learning : State.Review
    card.last_review = new Date(record.lastReview)
    card.reps = record.reviews
    card.lapses = record.mistakes
    card.scheduled_days = Math.round(record.interval)
    // Approximation until the first FSRS rating. The original SM-2 record remains in the backup.
    card.stability = Math.max(0.1, record.interval)
    card.difficulty = Math.max(1, Math.min(10, 10 - (record.ease - 1.3) * 5))
    data.progress[label] = { label, books, first, updated: record.lastReview,
      recognition: { card: encodeCard(card), errors: record.mistakes } }
    data.collected[label] = first
  }
  data.favorites = [...new Set((old.starred ?? []).map(id => wordKey(id.slice(id.indexOf(':') + 1)))
    .filter(label => key.safeParse(label).success))]
  return dataSchema.parse(data)
}

