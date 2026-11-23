import { useState } from 'react'
import { ArrowDownRight, ArrowRight, AudioLines, BookOpen, Brain, CalendarDays, ChevronRight,
  CircleHelp, Flame, Hourglass, Keyboard, Layers3, PackageOpen, Sparkles, Target } from 'lucide-react'
import type { BookMeta } from '@/data/books'
import type { Data, Exam, Mode } from '@/core/schema'
import { dailySummary, localDay, streak } from '@/core/learning'
import type { Page } from './Shell'
import { CollectorCover } from './CollectorCover'

const training = [
  { mode: 'sprint', name: '六级冲刺', icon: Target, subtitle: '释义、搭配与语境', color: 'violet' },
  { mode: 'recall', name: '快速认词', icon: Brain, subtitle: '主动回忆，再查看答案', color: 'blue' },
  { mode: 'spell', name: '拼写训练', icon: Keyboard, subtitle: '看中文，写英文', color: 'rose' },
  { mode: 'listen', name: '听音识词', icon: AudioLines, subtitle: '听发音，辨词义', color: 'jade' },
] as const

const examSections = [
  { id: 'cet4', label: '大学英语四级', code: 'CET-4', words: '四级词包' },
  { id: 'cet6', label: '大学英语六级', code: 'CET-6', words: '六级词包' },
] as const

export function Dashboard({ active, data, now, due, go, start, selectExam }: {
  active: BookMeta; data: Data; now: Date; due: number; go: (page: Page) => void; start: (mode: Mode) => void;
  selectExam: (exam: Exam) => Promise<void>
}) {
  const [switching, setSwitching] = useState<Exam | null>(null)
  const [error, setError] = useState(false)
  const exam = examSections.find(section => section.id === data.settings.exam) ?? examSections[1]
  const summary = dailySummary(data, localDay(now), active.id)
  const percent = Math.min(100, Math.round(summary.learned / data.settings.dailyGoal * 100))
  return <div className="dashboard">
    <div className="page-heading home-heading">
      <h1>学习首页</h1>
      <button className="pill book-picker" aria-label={`当前词书：${active.name}`} onClick={() => go('books')}><BookOpen size={16}/>{active.name}<ChevronRight size={15}/></button>
    </div>
    <div className="exam-switcher" role="group" aria-label="四六级学习专区">
      {examSections.map(section => <button key={section.id} type="button" className={`exam-tile ${section.id}`}
        aria-pressed={section.id === exam.id} disabled={switching !== null} onClick={() => {
          setError(false)
          setSwitching(section.id)
          void selectExam(section.id).catch(() => setError(true)).finally(() => setSwitching(null))
        }}><span className="exam-code">{section.code}</span><strong>{section.label}</strong><ChevronRight size={16}/></button>)}
    </div>
    {error && <p className="notice error" role="alert">切换专区失败，请重试。</p>}
    <section className="hero" data-exam={exam.id} aria-labelledby="hero-title">
      <div className="hero-art" aria-hidden="true">
        <CollectorCover exam={exam.id}/>
      </div>
      <div className="hero-content">
        <div className="hero-label"><Sparkles size={15}/> {exam.code}</div>
        <h2 id="hero-title">打开你的<br/><em>{active.id === exam.id ? exam.words : '今日词包'}</em></h2>
        <p>到期词优先，每包最多 5 张。</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => go('pack')}><PackageOpen size={19}/> 开始拆包 <ArrowRight size={18}/></button>
          <button className="hero-alt" onClick={() => start('sprint')}>直接学习 <ArrowDownRight size={17}/></button>
        </div>
      </div>
    </section>
    <section aria-labelledby="today-heading" className="dashboard-section">
      <div className="section-heading"><h2 id="today-heading">今日进度</h2><button className="text-button" onClick={() => go('stats')}>查看统计<ChevronRight size={16}/></button></div>
      <div className="metrics">
        <article className="metric panel">
          <span className="tile-icon violet"><Target size={20}/></span>
          <div><h3>今日新词</h3><div className="metric-count">{summary.learned}<small> / {data.settings.dailyGoal}</small></div></div>
          <div className="metric-foot"><progress value={percent} max={100} aria-label="今日新词目标"/><span>{percent}%</span></div>
        </article>
        <article className="metric panel">
          <span className="tile-icon blue"><Hourglass size={19}/></span>
          <div><h3>到期复习</h3><div className="metric-count">{due}<small> 张</small></div></div>
          <button className="metric-foot text-button" onClick={() => go('review')}>进入复习 <ChevronRight size={15}/></button>
        </article>
        <article className="metric panel">
          <span className="tile-icon amber"><Flame size={20}/></span>
          <div><h3>连续学习</h3><div className="metric-count">{streak(data, now)}<small> 天</small></div></div>
          <span className="metric-foot"><CalendarDays size={15}/> 今天累计拆 {summary.packs} 包</span>
        </article>
      </div>
    </section>
    <section aria-labelledby="training-heading" className="dashboard-section">
      <div className="section-heading"><h2 id="training-heading">专项训练</h2><button className="text-button" onClick={() => go('review')}>全部练习<ChevronRight size={16}/></button></div>
      <div className="training-grid">{training.map(({ mode, name, icon: Icon, subtitle, color }) =>
        <button className="training-tile panel" key={mode} onClick={() => start(mode)}>
          <span className={`tile-icon ${color}`}><Icon size={20}/></span><span><strong>{mode === 'sprint' && exam.id === 'cet4' ? '四级冲刺' : name}</strong><small>{subtitle}</small></span>
          <ChevronRight size={16} className="trailing"/>
        </button>)}</div>
    </section>
    <div className="dashboard-footer">
      <button className="text-button" onClick={() => go('collection')}><Layers3 size={16}/> 已收藏 {Object.keys(data.collected).length} 张词卡</button>
      <button className="text-button" onClick={() => go('settings')}><CircleHelp size={16}/> 备份与离线</button>
    </div>
  </div>
}

