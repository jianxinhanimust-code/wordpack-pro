import { useId, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronRight, Layers3, Leaf, LoaderCircle, PackageOpen, PawPrint, Snowflake, Star, X, Zap } from 'lucide-react'
import type { Word } from '@/data/books'
import { getNote, meaningOf } from '@/data/editorial'
import { artBook, artBooks } from '@/data/creatures'
import type { ArtBookId } from '@/data/creatures'
import { cardDesign } from '@/core/cardArt'
import { makeChoices } from '@/core/practice'
import { wordKey } from '@/core/schema'
import type { Data } from '@/core/schema'
import { save } from '@/core/vault'
import { CardViewer } from './CardViewer'
import { WordCard } from './WordCard'
import './HomeActivity.css'

export function DailyChallenge({ book, words, data, day, loading, learn }: {
  book: string; words: Word[]; data: Data; day: string; loading: boolean; learn: (word: Word) => void
}) {
  const heading = useId()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const prompt = useMemo(() => {
    const usable = words.filter(word => meaningOf(word))
    if (usable.length < 2) return null
    const editorial = usable.filter(word => getNote(word.word))
    const candidates = editorial.length ? editorial : usable
    const ordinal = Math.floor(Date.parse(day) / 86_400_000)
    const word = candidates[((ordinal % candidates.length) + candidates.length) % candidates.length]!
    const choices = makeChoices(word, usable, true)
    return choices.length > 1 ? { word, choices, note: getNote(word.word) } : null
  }, [day, words])
  const saved = data.dailyChallenges?.[book]
  const key = prompt ? wordKey(prompt.word.word) : ''
  const answer = saved?.day === day && saved.word === key ? saved.answer : undefined
  const correct = prompt?.choices.find(choice => choice.id === key)?.text

  async function submit(choice: string) {
    if (saving || answer || !key) return
    setSaving(true)
    setError(false)
    try {
      await save(current => {
        const previous = current.dailyChallenges?.[book]
        if (previous?.day === day && previous.word === key) return current
        return { ...current, dailyChallenges: { ...current.dailyChallenges, [book]: { day, word: key, answer: choice } } }
      })
    } catch { setError(true) }
    finally { setSaving(false) }
  }

  return <section className="activity-panel daily-panel" aria-labelledby={heading}>
    <div className="activity-heading">
      <h2 id={heading}><Zap size={19} aria-hidden="true"/>每日一题</h2>
      <time dateTime={day}>{day.slice(5).replace('-', '.')}</time>
    </div>
    {prompt ? <>
      <div className="daily-prompt">
        <strong className="daily-term" lang="en">{prompt.word.word}</strong>
        <span>{prompt.note ? '选出它在语境中的词义' : '选出这个词的中文释义'}</span>
      </div>
      {prompt.note && <p className="daily-example" lang="en">{prompt.note.example}</p>}
      <div className="daily-options" role="group" aria-label="词义选项">
        {prompt.choices.map((choice, index) => {
          const result = answer && (choice.id === key ? 'correct' : choice.id === answer ? 'missed' : 'other')
          return <button type="button" key={choice.id} className="daily-choice" data-result={result || undefined}
            disabled={saving || Boolean(answer)} onClick={() => { void submit(choice.id) }}>
            <span aria-hidden="true">{result === 'correct' ? <Check size={13}/> : result === 'missed' ? <X size={13}/> : String.fromCharCode(65 + index)}</span>
            {choice.text}
          </button>
        })}
      </div>
      {answer && <div className="daily-feedback">
        <p role="status"><strong>{answer === key ? '回答正确' : '已揭晓答案'}</strong> · 词义 {correct}</p>
        <button type="button" className="text-button" onClick={() => learn(prompt.word)}>练习这个词<ArrowRight size={15}/></button>
      </div>}
      {error && <p className="daily-feedback" role="alert">答题记录未保存，请再试一次。</p>}
    </> : <p className="activity-empty">{loading ? <><LoaderCircle size={20} className="spin"/>正在准备今天的题目…</>
      : '这本词书需要至少两个有不同释义的单词才能出题。'}</p>}
  </section>
}

const shelves = [
  { id: 'recent', label: '最近入藏', icon: PackageOpen },
  { id: 'favorites', label: '特别收藏', icon: Star },
  { id: 'creatures', label: '词灵系列', icon: PawPrint },
  { id: 'exotic', label: '异境物种', icon: Leaf },
  { id: 'variety', label: '万象生灵', icon: Snowflake },
] as const
const themedBooks = artBooks.filter(book => book.theme)

export function Showcase({ words, data, loading, reduced, openGallery, openArtBook }: {
  words: Word[]; data: Data; loading: boolean; reduced: boolean; openGallery: () => void; openArtBook: (id: ArtBookId) => void
}) {
  const heading = useId()
  const [shelf, setShelf] = useState<typeof shelves[number]['id'] | ArtBookId>('recent')
  const [preview, setPreview] = useState<{ cards: Word[]; selected: number } | null>(null)
  const { recent, favorites, examples } = useMemo(() => {
    const seen = new Set<string>()
    const examples: Word[] = []
    for (const word of words) {
      const { motif } = cardDesign(word.word)
      if (seen.has(motif)) continue
      seen.add(motif)
      examples.push(word)
      if (examples.length === 3) break
    }
    const collectedAt = (word: Word) => data.collected[wordKey(word.word)] ?? -1
    const recent = words.filter(word => Object.hasOwn(data.collected, wordKey(word.word)))
      .sort((a, b) => collectedAt(b) - collectedAt(a)).slice(0, 3)
    const favorites = new Map(data.favorites.map((id, index) => [id, index]))
    return { recent, examples, favorites: words.filter(word => favorites.has(wordKey(word.word)))
      .sort((a, b) => (favorites.get(wordKey(b.word)) ?? 0) - (favorites.get(wordKey(a.word)) ?? 0)).slice(0, 3) }
  }, [words, data.collected, data.favorites])
  const sample = shelf === 'recent' && recent.length === 0
  const series = artBook(shelf)
  const cards = series?.previews ?? (shelf === 'favorites' ? favorites : sample ? examples : recent)

  return <section className="activity-panel showcase-panel" aria-labelledby={heading} data-sample={sample}>
    <div className="activity-heading">
      <h2 id={heading}><Layers3 size={19} aria-hidden="true"/>收藏展柜</h2>
      <button type="button" className="text-button" onClick={series ? () => openArtBook(series.meta.id) : openGallery}>
        {series ? '查看全系列' : '打开图鉴'}<ChevronRight size={15}/></button>
    </div>
    <div className="showcase-shelves" role="group" aria-label="展柜分类">
      {shelves.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={id === shelf} onClick={() => setShelf(id)}>
        <Icon size={13}/>{label}
      </button>)}
      <select aria-label="选择新增主题系列" value={series?.theme ? series.meta.id : ''} onChange={event => {
        const book = artBook(event.target.value)
        setShelf(book?.meta.id ?? 'recent')
      }}>
        <option value="">更多主题</option>
        {themedBooks.map(book => <option key={book.meta.id} value={book.meta.id}>{book.meta.name}</option>)}
      </select>
    </div>
    {cards.length ? <div className="showcase-cards">
      {cards.map((word, index) => <button type="button" key={word.id} aria-label={`预览词卡 ${word.word}`}
        onClick={() => setPreview({ cards, selected: index })}><WordCard word={word} compact staticMotion={reduced}/></button>)}
    </div> : <p className="activity-empty">{loading ? <><LoaderCircle size={20} className="spin"/>正在加载词卡…</>
      : shelf === 'favorites' ? '点预览窗口的星标，把喜爱的词卡放进这里。' : '当前词书暂无可展示的词卡。'}</p>}
    {!!cards.length && <p className="showcase-foot">{series ? <strong>{series.meta.description}</strong>
      : sample ? <><strong>词卡预览</strong><span>拆包后会显示最近入藏</span></>
      : <span>点开可以翻牌、查看词义和标星</span>}</p>}
    {preview && <CardViewer cards={preview.cards} initial={preview.selected} reduced={reduced} onClose={() => setPreview(null)}/>}
  </section>
}
