import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Gem, Link2, Minus, PackageOpen, PawPrint, Plus, RotateCcw, Search, Sparkles, Star } from 'lucide-react'
import type { BookMeta, Word } from '@/data/books'
import type { Data, Skill } from '@/core/schema'
import { wordKey } from '@/core/schema'
import { getProgress, recallStatus } from '@/core/learning'
import { meaningOf, other, related } from '@/data/editorial'
import { alternateCreature, creatureBook, creatureByWord, creatureWords } from '@/data/creatures'
import { toggleFavorite } from '@/core/vault'
import { cardDesign, illustrationUrl, rarities } from '@/core/cardArt'
import type { Rarity } from '@/core/cardArt'
import { WordCard } from './WordCard'
import { WordDetails } from './WordDetails'
import { Modal } from './LibraryPages'

const filters = [
  { value: 'all', label: '全部词卡' }, { value: 'owned', label: '已收藏' },
  { value: 'due', label: '待复习' }, { value: 'starred', label: '特别收藏' },
] as const
const skillNames: Record<Skill, string> = { recognition: '认词', spelling: '拼写', listening: '听音' }
const PAGE_SIZE = 24
type RarityFilter = 'all' | 'variant' | Rarity

export function Collection({ data, active, words, books, memberships, reduced, now, learn, openCreaturePack }: {
  data: Data; words: Word[]; books: BookMeta[]; memberships: Map<string, Set<string>>;
  active: string;
  reduced: boolean; now: Date; learn: (word: Word) => void; openCreaturePack: () => Promise<void>
}) {
  const [filter, setFilter] = useState<typeof filters[number]['value']>('all')
  const [query, setQuery] = useState('')
  const [book, setBook] = useState(active)
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Word | null>(null)
  const [opening, setOpening] = useState(false)
  const [packError, setPackError] = useState(false)
  const isCreatureBook = book === creatureBook.id
  const pool = isCreatureBook ? creatureWords : words
  const index = useMemo(() => new Map([...words, ...pool].map(w => [wordKey(w.word), w])), [words, pool])
  const filtered = useMemo(() => {
    const text = wordKey(query)
    const due = (id: string) => {
      const p = getProgress(data, id)
      return p && [p.recognition, p.spelling, p.listening].some(t => t && Date.parse(t.card.due) <= now.getTime())
    }
    return pool.filter(w => {
      const id = wordKey(w.word)
      if (book && !isCreatureBook && !memberships.get(id)?.has(book)) return false
      const identity = rarity !== 'all' || text ? cardDesign(id).identity : null
      return (!text || id.includes(text) || meaningOf(w).includes(text) || identity?.kind.includes(text) || identity?.variant?.includes(text))
        && (rarity === 'all' || (rarity === 'variant' ? !!identity?.variant : identity?.rarity === rarity))
        && (filter === 'all' || filter === 'owned' && Object.hasOwn(data.collected, id)
          || filter === 'starred' && data.favorites.includes(id) || filter === 'due' && due(id))
    })
  }, [pool, query, book, isCreatureBook, rarity, filter, data, now, memberships])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const activePage = Math.min(page, totalPages - 1)
  const sectionCount = book && !isCreatureBook ? pool.filter(w => memberships.get(wordKey(w.word))?.has(book)).length : pool.length
  const collected = Object.keys(data.collected).filter(word => !book || (isCreatureBook ? creatureByWord(word) : memberships.get(word)?.has(book))).length
  return <div className="standard-page">
    <div className="page-heading"><div><h1>收藏图鉴</h1><p>已收藏 {collected} 张词卡。打开卡片可查看学习记录和共鸣。</p></div>
      <span className="pill"><Gem size={17}/>{sectionCount.toLocaleString()} 张词卡</span></div>
    <section className="creature-banner" aria-label="词灵系列">
      <img src={illustrationUrl('eclipse-phoenix')} alt="" width="720" height="1008" decoding="async"/>
      <div className="creature-banner-content">
        <div><h2><PawPrint size={21}/>词灵系列</h2>
          <p>{isCreatureBook ? `已收集 ${collected} / ${creatureWords.length} 张` : `${creatureWords.length} 张生物卡 · 晶化与幽影异种`}</p></div>
        {isCreatureBook ? <button className="secondary" disabled={opening} onClick={() => {
          setOpening(true)
          setPackError(false)
          void openCreaturePack().catch(() => { setPackError(true); setOpening(false) })
        }}><PackageOpen size={17}/>拆词灵词包</button>
          : <button className="secondary" onClick={() => {
            setBook(creatureBook.id); setRarity('all'); setFilter('all'); setQuery(''); setPage(0)
          }}>浏览词灵系列<ArrowRight size={17}/></button>}
        {packError && <p role="alert">词包打开失败，请重试。</p>}
      </div>
    </section>
    <div className="filters panel">
      <div className="filter-tabs" aria-label="收藏状态">{filters.map(f =>
        <button className="subtab" aria-pressed={filter === f.value} key={f.value} onClick={() => { setFilter(f.value); setPage(0) }}>{f.label}</button>)}</div>
      <div className="filter-fields">
        <label className="search-box"><Search size={17}/><input aria-label="搜索词卡" placeholder="搜索英文或中文" value={query}
          onChange={e => { setQuery(e.target.value); setPage(0) }}/></label>
        <select aria-label="筛选词书" value={book} onChange={e => { setBook(e.target.value); setPage(0) }}>
          <option value="">全部词书</option>{books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select aria-label="筛选稀有度或异种" value={rarity} onChange={e => { setRarity(e.target.value as RarityFilter); setPage(0) }}>
          <option value="all">全部稀有度</option>
          {Object.entries(rarities).map(([id, label]) => <option key={id} value={id}>{id} · {label}</option>)}
          <option value="variant">仅看异种</option>
        </select>
      </div>
    </div>
    {filtered.length ? <div className="collection-grid">{filtered.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE).map(word => {
      const owned = Object.hasOwn(data.collected, wordKey(word.word))
      return <button key={word.id} className={`collection-tile ${owned ? 'owned' : 'unowned'}`} onClick={() => setSelected(word)}>
        <WordCard word={word} compact staticMotion={reduced}/><span className="card-state">{recallStatus(data, word.word, now.getTime())}
        {owned && <Sparkles size={13}/>}</span></button>
    })}</div> : <div className="empty-state panel"><Search size={25}/><p>没有符合条件的词卡。</p></div>}
    {totalPages > 1 && <nav className="pagination" aria-label="图鉴分页">
      <button className="secondary" disabled={activePage === 0} onClick={() => setPage(activePage - 1)}><ArrowLeft size={16}/>上一页</button>
      <span>{activePage + 1} / {totalPages}</span>
      <button className="secondary" disabled={activePage + 1 >= totalPages} onClick={() => setPage(activePage + 1)}>下一页<ArrowRight size={16}/></button>
    </nav>}
    {selected && <CardProfile key={selected.id} word={selected} data={data} books={books} memberships={memberships}
      reduced={reduced} now={now} close={() => setSelected(null)} learn={() => learn(selected)}
      select={id => { const next = index.get(id) ?? creatureWords.find(word => word.word === id); if (next) setSelected(next) }}/>}
  </div>
}

function CardProfile({ word, data, books, memberships, reduced, now, close, learn, select }: {
  word: Word; data: Data; books: BookMeta[]; memberships: Map<string, Set<string>>; reduced: boolean; now: Date;
  close: () => void; learn: () => void; select: (id: string) => void
}) {
  const id = wordKey(word.word)
  const progress = getProgress(data, word.word)
  const history = data.history.filter(event => event.word === id).slice(-10).reverse()
  const favorite = data.favorites.includes(id)
  const [message, setMessage] = useState('')
  const alternate = alternateCreature(id)
  return <Modal title="词卡详情" close={close}>
    <div className="profile-grid"><WordCard word={word} staticMotion={reduced}/><WordDetails word={word} settings={data.settings}/></div>
    <div className="action-row">
      <button className="primary" onClick={learn}><BookOpen size={17}/>练习这个词</button>
      <button className="secondary" aria-pressed={favorite} onClick={() => {
        void toggleFavorite(id).catch(() => setMessage('收藏保存失败，请重试。'))
      }}><Star size={16} fill={favorite ? 'currentColor' : 'none'}/>{favorite ? '已特别收藏' : '特别收藏'}</button>
    </div>
    {alternate && <div className="creature-pair"><span><PawPrint size={16}/>{alternate.kind}</span>
      <button className="text-button" onClick={() => select(alternate.word)}>
        {alternate.variant ?? '查看原种'} <strong lang="en">{alternate.word}</strong><ArrowRight size={15}/>
      </button></div>}
    {message && <p className="notice error" role="alert">{message}</p>}
    <div className="member-list">{books.filter(book => memberships.get(id)?.has(book.id)).map(book => <span className="pill" key={book.id}>{book.name}</span>)}</div>
    <div className="profile-section">
      <div className="section-heading"><h3>学习记录</h3><span className="pill">{recallStatus(data, word.word, now.getTime())}</span></div>
      <ul className="history-list">{(Object.keys(skillNames) as Skill[]).map(skill => {
        const track = progress?.[skill]
        return <li key={skill}><strong>{skillNames[skill]}</strong>{track
          ? <span>{track.card.reps} 次 · {track.errors} 次忘记 · 下次 {new Date(track.card.due).toLocaleString('zh-CN')}</span>
          : <span>尚未练习</span>}</li>
      })}</ul>
      {history.length > 0 && <details><summary>最近 {history.length} 条评分</summary><ul className="history-list">
        {history.map((e, i) => <li key={i}>
          <strong>{e.rating} · {skillNames[e.skill]}</strong><span>{new Date(e.at).toLocaleString('zh-CN')}</span></li>)}</ul></details>}
    </div>
    <RelationGraph word={word.word} data={data} select={select}/>
  </Modal>
}

function RelationGraph({ word, data, select }: { word: string; data: Data; select: (id: string) => void }) {
  const links = related(word)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; dx: number; dy: number; id: number } | null>(null)
  const points = links.map((edge, index) => {
    const theta = index * 2 * Math.PI / links.length - Math.PI / 8
    return { edge, id: other(edge, word), x: Math.cos(theta) * 115, y: Math.sin(theta) * 68 }
  })
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || e.pointerId !== drag.current.id) return
    setOffset({ x: drag.current.dx + e.clientX - drag.current.x, y: drag.current.dy + e.clientY - drag.current.y })
  }
  return <section className="profile-section">
    <div className="section-heading"><h3><Link2 size={16}/>词汇共鸣</h3></div>
    {!links.length ? <p className="muted">此词暂无已校订的关系。</p> : <>
      <div className="graph-wrap" onPointerDown={e => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY, dx: offset.x, dy: offset.y, id: e.pointerId }
      }} onPointerMove={move} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}>
        <div className="graph-controls">
          <button className="icon-button" aria-label="放大共鸣图" onClick={() => setZoom(n => Math.min(1.8, n + 0.2))}><Plus size={16}/></button>
          <button className="icon-button" aria-label="缩小共鸣图" onClick={() => setZoom(n => Math.max(0.6, n - 0.2))}><Minus size={16}/></button>
          <button className="icon-button" aria-label="重置共鸣图" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}><RotateCcw size={15}/></button>
        </div>
        <div className="graph-center" style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})` }}>
          {points.map(({ id, x, y }) => <i className="graph-edge" key={id} style={{
            width: Math.hypot(x, y), transform: `rotate(${Math.atan2(y, x)}rad)`,
          }}/>)}
          <span className="graph-node center">{word}</span>
          {points.map(({ id, x, y }) => <button className={`graph-node ${Object.hasOwn(data.collected, id) ? 'lit' : ''}`} key={id}
            style={{ '--nx': `${x}px`, '--ny': `${y}px` } as CSSProperties} onClick={() => select(id)}>{id}</button>)}
        </div>
      </div>
      <ul className="history-list relation-list">{points.map(({ edge, id }) => <li key={id}>
        <strong>{edge.kind} · {id}</strong><span>{edge.label} <a href={edge.source} target="_blank" rel="noreferrer" aria-label={`${id} 关系来源`}><ExternalLink size={13}/></a></span></li>)}</ul>
    </>}
  </section>
}

