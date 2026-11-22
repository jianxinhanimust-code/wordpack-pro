import { createEmptyCard, fsrs, Rating, State } from 'ts-fsrs'
import type { Word } from '@/data/books'
import type { Data, Feedback, Mode, Skill } from './schema'
import { decodeCard, encodeCard, wordKey } from './schema'

const scheduler = fsrs({ enable_fuzz: false })
export const grades = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy } as const
export const skillOf = (mode: Mode): Skill =>
  mode === 'spell' || mode === 'dictation' ? 'spelling' : mode === 'listen' ? 'listening' : 'recognition'

export function getProgress(data: Data, word: string) {
  const id = wordKey(word)
  return Object.hasOwn(data.progress, id) ? data.progress[id] : undefined
}

export function mistakeSkill(data: Data, word: string): Skill {
  const progress = getProgress(data, word)
  const tracks = ['recognition', 'spelling', 'listening'] as const
  return tracks.reduce<Skill>((worst, track) =>
    (progress?.[track]?.errors ?? 0) > (progress?.[worst]?.errors ?? 0) ? track : worst, 'recognition')
}

export function recordRating(data: Data, word: Word, mode: Mode, rating: Feedback, now = new Date(),
  skill = skillOf(mode)): Data {
  const id = wordKey(word.word)
  const previous = getProgress(data, word.word)
  const track = previous?.[skill]
  const at = Math.max(now.getTime(), previous?.updated ?? 0)
  const next = scheduler.next(track ? decodeCard(track.card) : createEmptyCard(new Date(at)), new Date(at), grades[rating]).card
  const progress = {
    ...previous, label: word.word, first: previous?.first ?? at, updated: at,
    books: [...new Set([...(previous?.books || []), word.book])],
    [skill]: { card: encodeCard(next), errors: (track?.errors ?? 0) + Number(rating === 'again') },
  }
  return {
    ...data,
    progress: { ...data.progress, [id]: progress },
    collected: { ...data.collected, [id]: Object.hasOwn(data.collected, id) ? data.collected[id] : at },
    history: [...data.history, { word: id, book: word.book, skill, mode, at,
      rating, first: previous === undefined, due: next.due.getTime() }],
  }
}

export function getQueue(words: Word[], data: Data, skill: Skill, now: Date, newLimit: number, reviewLimit: number) {
  const seen = new Set<string>()
  const fresh: Word[] = []
  const due: { word: Word; at: number }[] = []
  for (const word of words) {
    const id = wordKey(word.word)
    if (seen.has(id)) continue
    seen.add(id)
    const track = getProgress(data, word.word)?.[skill]
    if (!track) fresh.push(word)
    else {
      const at = Date.parse(track.card.due)
      if (at <= now.getTime()) due.push({ word, at })
    }
  }
  due.sort((a, b) => a.at - b.at)
  return [...due.slice(0, reviewLimit).map(item => item.word), ...fresh.slice(0, newLimit)]
}

export function recallStatus(data: Data, word: string, at = Date.now()) {
  const track = getProgress(data, word)?.recognition
  if (!track) return '未学'
  if (Date.parse(track.card.due) <= at) return '待复习'
  return track.card.state === State.Review ? '已学过' : '正在学'
}

export function retention(data: Data, now = new Date()) {
  const tracks = Object.values(data.progress).flatMap(p => p.recognition ? [p.recognition] : [])
  if (!tracks.length) return undefined
  return tracks.reduce((sum, track) => sum + scheduler.retrievability(decodeCard(track.card),
    new Date(Math.max(now.getTime(), Date.parse(track.card.last_review ?? track.card.due)))), 0) / tracks.length
}

export function localDay(d: Date | number = new Date()) {
  const date = new Date(d)
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function dailySummary(data: Data, day: string, book?: string) {
  const old = book ? undefined : data.legacy?.dailyStats?.[day]
  const entries = data.history.filter(e => (!book || e.book === book) && localDay(e.at) === day)
  return {
    learned: (old?.learned ?? 0) + entries.filter(e => e.first).length,
    reviews: (old?.reviewed ?? 0) + entries.filter(e => !e.first).length,
    answered: (old?.answered ?? 0) + entries.length,
    correct: (old?.correct ?? 0) + entries.filter(e => e.rating !== 'again').length,
    packs: data.packs.filter(at => localDay(at) === day).length,
  }
}

export function streak(data: Data, now = new Date()) {
  const days = new Set(data.history.map(e => localDay(e.at)))
  for (const [day, stat] of Object.entries(data.legacy?.dailyStats ?? {})) {
    if (stat.learned || stat.reviewed) days.add(day)
  }
  const cursor = new Date(now)
  let count = 0
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(localDay(cursor))) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export function ratingSchedule(data: Data, word: Word, skill: Skill, now = new Date()) {
  const track = getProgress(data, word.word)?.[skill]
  const previous = track?.card.last_review
  const date = previous && Date.parse(previous) > now.getTime() ? new Date(previous) : now
  return scheduler.repeat(track ? decodeCard(track.card) : createEmptyCard(date), date)
}

