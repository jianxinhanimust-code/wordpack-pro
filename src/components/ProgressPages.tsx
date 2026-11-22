import { useState } from 'react'
import { ArrowRight, AudioLines, Brain, ChartNoAxesColumnIncreasing, Clock, Flame, Gem, Keyboard, Layers3, Repeat2, ScrollText, Target, Trophy } from 'lucide-react'
import type { Data, Exam, Mode, Skill } from '@/core/schema'
import { wordKey } from '@/core/schema'
import type { BookMeta, Word } from '@/data/books'
import { dailySummary, localDay, retention, streak } from '@/core/learning'

const trackCards = [
  { skill: 'recognition', mode: 'review', icon: Brain, title: '认词复习', detail: '看英文，主动回忆释义', color: 'violet' },
  { skill: 'spelling', mode: 'spell', icon: Keyboard, title: '拼写复习', detail: '独立的拼写记忆计划', color: 'rose' },
  { skill: 'listening', mode: 'listen', icon: AudioLines, title: '听音复习', detail: '独立的听音记忆计划', color: 'blue' },
] as const
const exercises = [
  { mode: 'sprint', icon: Target, title: '六级冲刺', detail: '学习释义、常用搭配和用法。' },
  { mode: 'recall', icon: Brain, title: '快速认词', detail: '主动回忆，然后自评。' },
  { mode: 'context', icon: ScrollText, title: '语境辨义', detail: '在句子中判断词义。' },
  { mode: 'spell', icon: Keyboard, title: '拼写训练', detail: '从中文释义回忆英文。' },
  { mode: 'listen', icon: AudioLines, title: '听音识词', detail: '听发音，选择词义。' },
  { mode: 'dictation', icon: AudioLines, title: '听写', detail: '听发音，输入英文。' },
  { mode: 'mistakes', icon: Repeat2, title: '错词专项', detail: '集中复测曾经答错的词。' },
] as const

export function ReviewPage({ exam, book, due, mistakes, start }: {
  exam: Exam; book: string; due: Record<Skill, number>; mistakes: number; start: (mode: Mode, dueOnly?: boolean) => void
}) {
  return <div className="standard-page">
    <div className="page-heading"><div><h1>复习计划</h1><p>{book} · 认词、拼写和听音分别安排复习。</p></div>
      <span className="pill"><Clock size={17}/>{due.recognition + due.spelling + due.listening} 项到期</span></div>
    <div className="book-grid review-track">{trackCards.map(({ skill, mode, title, icon: Icon, color, detail }) =>
      <article className="panel book-tile" key={skill}>
        <span className={`tile-icon ${color}`}><Icon size={22}/></span><h2>{title}</h2><p>{detail}</p>
        <div className="metric-count">{due[skill]}<small> 张到期</small></div>
        <button className="secondary" disabled={!due[skill]} onClick={() => start(mode, true)}>开始复习<ArrowRight size={16}/></button>
      </article>)}</div>
    <div className="section-heading"><h2>专项训练</h2></div>
    <div className="training-grid compact-grid">{exercises.map(({ mode, icon: Icon, title, detail }) =>
      <button className="training-tile panel" key={mode} onClick={() => start(mode)}>
        <span className="tile-icon violet"><Icon size={20}/></span><span><strong>{mode === 'sprint' && exam === 'cet4' ? '四级冲刺' : title}</strong>
        <small>{detail}{mode === 'mistakes' && ` · ${mistakes} 词`}</small></span>
        <ArrowRight size={16}/></button>)}</div>
  </div>
}

const achievements = [
  { title: '初次收藏', at: 1, text: '收藏 1 张词卡' },
  { title: '小小图鉴', at: 25, text: '收藏 25 张不同词卡' },
  { title: '百词收藏', at: 100, text: '收藏 100 张不同词卡' },
] as const

export function StatsPage({ data, now, active, words, onStart }: {
  data: Data; now: Date; active: BookMeta; words: Word[]; onStart?: () => void
}) {
  const [allBooks, setAllBooks] = useState(false)
  const keys = new Set(words.map(word => wordKey(word.word)))
  const scoped = allBooks ? data : {
    ...data,
    progress: Object.fromEntries(Object.entries(data.progress).filter(([word]) => keys.has(word))),
    collected: Object.fromEntries(Object.entries(data.collected).filter(([word]) => keys.has(word))),
    history: data.history.filter(event => event.book === active.id),
    legacy: undefined,
  }
  const chart = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(now); day.setDate(day.getDate() - 13 + i)
    const key = localDay(day)
    return { key, ...dailySummary(scoped, key) }
  })
  const max = Math.max(1, ...chart.map(day => day.learned + day.reviews))
  const total = Object.keys(scoped.progress).length
  const collected = Object.keys(scoped.collected).length
  const overallCollection = Object.keys(data.collected).length
  const retained = retention(scoped, now)
  const metrics = [
    { icon: Layers3, title: '已练单词', value: total, suffix: '词', color: 'violet' },
    { icon: Gem, title: '词卡收藏', value: collected, suffix: '张', color: 'blue' },
    { icon: Flame, title: '连续学习', value: streak(scoped, now), suffix: '天', color: 'amber' },
    { icon: Brain, title: '认词预估保持率', value: retained === undefined ? '—' : Math.round(retained * 100), suffix: retained === undefined ? '' : '%', color: 'jade' },
  ] as const
  const empty = chart.every(day => day.learned + day.reviews === 0)
  return <div className="standard-page">
    <div className="page-heading"><div><h1>学习统计</h1><p>{allBooks ? '全部词书' : active.name} · 练习趋势与认词保持率</p></div>
      <button className="secondary" aria-pressed={allBooks} onClick={() => setAllBooks(value => !value)}>
        {allBooks ? '查看当前词书' : '查看全部词书'}
      </button></div>
    <div className="stats-grid">{metrics.map(({ icon: Icon, title, value, suffix, color }) =>
      <article key={title} className="metric panel"><span className={`tile-icon ${color}`}><Icon size={21}/></span>
        <div><h3>{title}</h3><div className="metric-count">{value}<small> {suffix}</small></div></div></article>)}</div>
    <section className="panel trend-panel">
      <div className="section-heading"><h2><ChartNoAxesColumnIncreasing size={20}/> 近 14 天</h2>
        <div className="chart-legend"><span>新学</span><span>复习</span></div></div>
      {empty
        ? <div className="trend-empty"><ChartNoAxesColumnIncreasing size={26}/>
          <span>最近 14 天还没有学习记录{onStart ? '，先拆一包，进度就会出现在这里。' : '。'}</span>
          {onStart && <button className="secondary" onClick={onStart}>去拆一包</button>}</div>
        : <div className="trend-chart" role="list" aria-label="最近 14 天的新学与复习次数">
          {chart.map((day, i) => <div className="trend-column" role="listitem" key={day.key}
            title={`${day.key}，新学 ${day.learned}，复习 ${day.reviews}`}>
            <div className="bars" aria-label={`新学 ${day.learned}，复习 ${day.reviews}`}>
              <i className="learned" style={{ height: (day.learned / max * 100) + '%' }}/><i className="reviewed" style={{ height: (day.reviews / max * 100) + '%' }}/>
            </div><small>{i % 2 === 1 ? day.key.slice(5).replace('-', '/') : '\u00a0'}</small>
          </div>)}
        </div>}
    </section>
    <section><div className="section-heading"><h2>收藏成就</h2></div>
      <div className="book-grid">{achievements.map(a => <article key={a.at} className={`panel book-tile ${overallCollection >= a.at ? 'active-book' : ''}`}>
        <span className="tile-icon amber"><Trophy size={20}/></span><h2>{a.title}</h2><p>{a.text}</p>
        <progress value={Math.min(overallCollection, a.at)} max={a.at} aria-label={a.text}/><small className="muted">{overallCollection >= a.at ? '已达成' : `${overallCollection} / ${a.at}`}</small></article>)}</div>
    </section>
  </div>
}

