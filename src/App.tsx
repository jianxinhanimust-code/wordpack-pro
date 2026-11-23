import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CircleAlert, Download, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import type { Word } from '@/data/books'
import { TOPIC, uniqueWords, useLibrary } from '@/data/library'
import { getNote, meaningOf } from '@/data/editorial'
import { dailySummary, getProgress, getQueue, localDay, skillOf } from '@/core/learning'
import type { Exam, Mode, Preferences, Skill } from '@/core/schema'
import { initVault, readRawRecord, resetVault, save, useVault } from '@/core/vault'
import { Shell, paths } from '@/components/Shell'
import type { Page } from '@/components/Shell'
import { Dashboard } from '@/components/Dashboard'
import { Pack } from '@/components/Pack'
import { Study } from '@/components/Study'
import { Collection } from '@/components/Collection'
import { BooksPage, SettingsPage, downloadJson } from '@/components/LibraryPages'
import { ReviewPage, StatsPage } from '@/components/ProgressPages'

const skills = ['recognition', 'spelling', 'listening'] as const
type Session = { words: Word[]; mode: Mode; id: number }
function readPage(): Page {
  const name = window.location.hash.slice(1)
  if (name === 'study') return 'review'
  return Object.hasOwn(paths, name) ? name as Page : 'home'
}

export default function App() {
  const { data, error, ready } = useVault()
  const [page, setPage] = useState<Page>(readPage)
  const [session, setSession] = useState<Session | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [online, setOnline] = useState(navigator.onLine)
  const [offlineReady, setOfflineReady] = useState(() => Boolean(navigator.serviceWorker?.controller))
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [rescueNote, setRescueNote] = useState('')
  const library = useLibrary(data, page === 'collection')
  const { metadata, active, words, universe, memberships, loading } = library
  const staticMotion = systemReduced || data.settings.motion !== 'full'
  const remaining = Math.max(0, data.settings.dailyGoal - dailySummary(data, localDay(now), active.id).learned)
  useEffect(() => { void initVault() }, [])
  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, 15000)
    const connectivity = () => setOnline(navigator.onLine)
    const hash = () => {
      setPage(readPage())
      setSession(null)
      update()
      window.scrollTo(0, 0)
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => setSystemReduced(media.matches)
    const offline = () => setOfflineReady(Boolean(navigator.serviceWorker?.controller))
    window.addEventListener('hashchange', hash)
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    window.addEventListener('focus', update)
    navigator.serviceWorker?.addEventListener('controllerchange', offline)
    media.addEventListener('change', motion)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('hashchange', hash)
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
      window.removeEventListener('focus', update)
      navigator.serviceWorker?.removeEventListener('controllerchange', offline)
      media.removeEventListener('change', motion)
    }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme
    document.documentElement.dataset.motion = staticMotion ? 'reduced' : 'full'
  }, [data.settings.theme, staticMotion])

  const mustReview = useMemo(() => {
    const count: Record<Skill, number> = { recognition: 0, spelling: 0, listening: 0 }
    for (const word of words) {
      const progress = getProgress(data, word.word)
      if (!progress) continue
      for (const skill of skills) {
        const track = progress[skill]
        if (track && Date.parse(track.card.due) <= now.getTime()) count[skill]++
      }
    }
    return count
  }, [data, now, words])
  const misses = useMemo(() => words.filter(word => {
    const state = getProgress(data, word.word)
    return state && skills.some(skill => (state[skill]?.errors ?? 0) > 0)
  }).sort((a, b) => {
    const missed = (word: Word) => skills.reduce((total, skill) => total + (getProgress(data, word.word)?.[skill]?.errors ?? 0), 0)
    return missed(b) - missed(a)
  }), [words, data])
  const totalDue = Object.values(mustReview).reduce((total, count) => total + count, 0)

  function go(next: Page) {
    if (next !== 'study') setSession(null)
    setPage(next)
    if (window.location.hash !== '#' + next) window.history.pushState(null, '', '#' + next)
    setNow(new Date())
    window.scrollTo(0, 0)
  }
  const begin = (mode: Mode, chosen: Word[]) => {
    setSession({ words: chosen, mode, id: Date.now() })
    go('study')
  }
  const update = async (patch: Partial<Preferences>) => {
    await save(current => ({ ...current, settings: { ...current.settings, ...patch } }))
  }
  const selectExam = (exam: Exam) => update({ book: exam, exam })
  const selectBook = (book: string) => {
    if (book === 'cet4' || book === 'cet6') return selectExam(book)
    return update(book === TOPIC ? { book, exam: 'cet6' } : { book })
  }
  async function saveRawRecord() {
    const raw = await readRawRecord()
    if (!raw) { setRescueNote('没有找到可导出的原始记录。'); return }
    downloadJson(raw, 'wordpack-pro-raw.json')
    setRescueNote('原始记录已下载。修复后再通过「导入恢复」载入。')
  }
  async function wipe() {
    if (!window.confirm('清空本地学习记录后无法恢复。确定继续？')) return
    try { await resetVault(); setRescueNote('') }
    catch { setRescueNote('清空失败，请重试或下载原始记录后再处理。') }
  }
  const queue = (mode: Mode, cap: number, dueOnly: boolean) => {
    const skill = skillOf(mode)
    const allowed = (w: Word) => mode === 'context' ? Boolean(getNote(w.word))
      : mode === 'spell' || mode === 'listen' ? Boolean(meaningOf(w)) : true
    const selected = words.filter(allowed)
    const reference = new Date()
    const due = getQueue(selected, data, skill, reference, 0, Math.min(cap, data.settings.reviewLimit))
    if (dueOnly || due.length >= cap) return due
    const newWords = getQueue(selected, data, skill, reference,
      Math.min(cap - due.length, skill === 'recognition' ? remaining : cap), 0)
    return uniqueWords([...due, ...newWords])
  }
  function start(mode: Mode, dueOnly = false) {
    if (mode === 'mistakes') { begin(mode, misses.slice(0, 15)); return }
    begin(mode, queue(mode, dueOnly ? data.settings.reviewLimit : 12, dueOnly || mode === 'review'))
  }

  if (!ready) {
    return <main className="boot-screen">
      {error ? <>
        <CircleAlert size={30}/>
        <h1>无法打开本地学习记录</h1>
        <p role="alert">{error}</p>
        <p className="boot-hint">可以先导出原始记录留底，再决定是否清空重来。</p>
        <div className="action-row">
          <button className="secondary" onClick={() => window.location.reload()}><RotateCcw size={17}/>重试</button>
          <button className="secondary" onClick={() => { void saveRawRecord() }}><Download size={17}/>下载原始记录</button>
          <button className="danger" onClick={() => { void wipe() }}><Trash2 size={17}/>清空并重新开始</button>
        </div>
        {rescueNote && <p role="status">{rescueNote}</p>}
      </> : <>
        <LoaderCircle size={28} className="spin"/>
        <h1>WordPack Pro</h1>
        <p role="status">正在读取本地学习记录…</p>
      </>}
    </main>
  }

  const activePage = page === 'study' && !session ? 'review' : page
  return <Shell page={activePage} active={active} go={go} online={online} due={totalDue}>
    {library.error && <p role="alert" className="notice error"><CircleAlert size={17}/> 部分词库无法读取。请联网刷新，或打开已导入的本地词书。</p>}
    {activePage === 'home' && <Dashboard active={active} data={data} words={words} loading={loading} reduced={staticMotion}
      now={now} due={totalDue} go={go} selectExam={selectExam} learn={word => begin('recall', [word])}
      start={mode => { if (!loading || totalDue) start(mode); else go('review') }}/>}
    {activePage === 'pack' && (loading ? <div className="empty-state panel"><LoaderCircle className="spin"/>正在加载{active.name}…</div>
      : <Pack words={queue('pack', 5, false)} active={active} settings={data.settings} collected={data.collected} reduced={staticMotion}
        disabledMotion={data.settings.motion === 'off'} back={() => go('home')} learn={chosen => begin('pack', chosen)}
        choose={() => go('books')} openGallery={() => go('collection')}/>)}
    {activePage === 'study' && session && <Study key={session.id} words={session.words} mode={session.mode} pool={words} data={data}
      staticMotion={staticMotion} back={() => go(session.mode === 'pack' ? 'home' : 'review')} finish={() => go('home')}
      switchRecall={() => begin('recall', session.words)}/>}
    {activePage === 'review' && (loading ? <div className="empty-state panel"><LoaderCircle className="spin"/>正在加载{active.name}…</div>
      : <ReviewPage exam={data.settings.exam} book={active.name} due={mustReview} mistakes={misses.length} start={start}/>)}
    {activePage === 'collection' && <Collection data={data} active={active.id} words={universe} books={metadata} memberships={memberships}
      now={now} reduced={staticMotion} learn={word => begin('recall', [word])}/>}
    {activePage === 'books' && <BooksPage active={active} data={data} books={metadata} select={selectBook}/>}
    {activePage === 'stats' && <StatsPage data={data} now={now} active={active} words={words} onStart={() => go('pack')}/>}
    {activePage === 'settings' && <SettingsPage data={data} update={update} offlineReady={offlineReady} stats={() => go('stats')}/>}
    {activePage === 'home' && active.totalCount === 0 && <button className="secondary" onClick={() => go('books')}>
      <BookOpen size={17}/>为当前词书添加词汇</button>}
  </Shell>
}
