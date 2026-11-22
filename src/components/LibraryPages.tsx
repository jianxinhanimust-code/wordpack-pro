import { startTransition, useEffect, useId, useOptimistic, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ArrowRight, BookOpen, Check, Download, FileUp, HardDrive, Headphones, Settings2, Upload } from 'lucide-react'
import type { BookMeta, Word } from '@/data/books'
import { parseWordlist } from '@/core/import'
import { PERSONAL } from '@/data/library'
import { importBackup, save } from '@/core/vault'
import { parseBackup, serializeBackup, wordKey } from '@/core/schema'
import type { Data, Preferences } from '@/core/schema'
import { listVoices, voiceReport, waitVoices } from '@/core/speech'
import { Pronounce } from './WordDetails'

export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const modal = useRef<HTMLDialogElement>(null)
  const heading = useId()
  useEffect(() => {
    const dialog = modal.current
    if (!dialog?.open) dialog?.showModal()
  }, [])
  return <dialog className="details-modal" ref={modal} aria-labelledby={heading}
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    <div className="modal-inner">
      <header className="section-heading"><h2 id={heading}>{title}</h2><button className="text-button" onClick={close}>关闭</button></header>
      {children}
    </div>
  </dialog>
}

function makeId() {
  const nonce = crypto.getRandomValues(new Uint32Array(2)).join('')
  return 'custom-' + Date.now() + '-' + nonce
}

/** 微信/QQ 等内置浏览器：Web Speech 与「添加到主屏幕」都受限，提示用户换浏览器 */
const isInAppBrowser = () => /MicroMessenger|QQ\/|Weibo|AlipayClient|baiduboxapp/i.test(navigator.userAgent)

export function BooksPage({ data, active, books, select }: {
  data: Data; active: BookMeta; books: BookMeta[]; select: (id: string) => Promise<void>
}) {
  const [importing, setImporting] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  return <div className="standard-page">
    <div className="page-heading"><div><h1>我的词书</h1><p>选择一套词书，或导入你的阅读生词。</p></div>
      <button className="primary" onClick={() => setImporting('new')}><FileUp size={18}/>导入词库</button></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="book-grid">
      {books.map(book => <article className={`book-tile panel ${active.id === book.id ? 'active-book' : ''}`} key={book.id}>
        <span className={`tile-icon ${book.color}`}><BookOpen size={21}/></span>
        <h2>{book.name}</h2><p>{book.description}</p><span className="muted">{book.totalCount.toLocaleString()} 词</span>
        <div className="book-actions">
          {active.id === book.id ? <span className="pill selected"><Check size={15}/>正在使用</span> :
            <button className="secondary" aria-label={`使用${book.name}`} onClick={() => {
              setError(''); void select(book.id).catch(() => setError('切换词书失败，请重试。'))
            }}>使用词书<ArrowRight size={15}/></button>}
          {(book.id === PERSONAL || data.books.some(b => b.id === book.id)) &&
            <button className="text-button" onClick={() => setImporting(book.id)}><FileUp size={15}/>添加词汇</button>}
        </div>
      </article>)}
    </div>
    {importing && <WordImport book={importing} title={books.find(book => book.id === importing)?.name}
      close={() => setImporting('')} done={message => { setNotice(message); setImporting('') }}/>}
  </div>
}

function WordImport({ book, title, close, done }: { book: string; title?: string; close: () => void; done: (message: string) => void }) {
  const [name, setName] = useState('')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isNew = book === 'new'
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 16 * 1024 * 1024) { setError('词库文件需小于 16 MB。'); return }
    try {
      setInput(await file.text())
      if (isNew && !name) setName(file.name.replace(/\.[^.]+$/, '').slice(0, 80))
      setError('')
    } catch { setError('文件读取失败，可粘贴 UTF-8 文本。') }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const id = isNew ? makeId() : book
    const { words, skipped } = parseWordlist(input, id)
    const accepted = words.filter(w => /^[A-Za-z0-9][A-Za-z0-9_ .’'/-]{0,159}$/.test(w.word))
    if (!accepted.length) { setError('未找到有效词条，请检查文件格式或编码。'); return }
    if (accepted.length > 40000) { setError('单个词本支持最多 40,000 个词。'); return }
    setBusy(true)
    let added = 0
    try {
      await save(data => {
        const prior = data.books.find(b => b.id === id)
        const byKey = new Map<string, Word>((prior?.words ?? []).map(w => [wordKey(w.word), w]))
        for (const word of accepted) {
          const key = wordKey(word.word)
          if (!byKey.has(key)) { byKey.set(key, word); added++ }
        }
        const label = prior?.meta.name ?? (isNew ? name.trim() || '自定义词书' : title ?? '个人生词本')
        const custom = { id, createdAt: prior?.createdAt ?? Date.now(), words: [...byKey.values()],
          meta: { id, name: label, shortName: label, description: '本地导入的个人词汇', color: 'emerald', totalCount: byKey.size } }
        return { ...data, books: [...data.books.filter(b => b.id !== id), custom], settings: { ...data.settings, book: id } }
      })
      // 跳过的＝解析阶段失败或文件内重复（skipped）＋ 与该词书已有词条重复（words 减 added）
      const omitted = words.length - added + skipped
      done(`已导入 ${added} 个新词${omitted ? `，跳过 ${omitted} 条重复或无效记录` : ''}。`)
    } catch {
      setError('导入失败，请检查词条长度或浏览器存储空间。')
      setBusy(false)
    }
  }
  return <Modal title={isNew ? '导入自定义词书' : `导入到${title || '个人生词本'}`} close={close}>
    <form className="form-grid" onSubmit={event => { void submit(event) }}>
      {isNew && <label className="field">词书名称<input value={name} maxLength={80} placeholder="例如：六级阅读生词" onChange={event => setName(event.target.value)}/></label>}
      <label className="field">选择 TXT、CSV 或 JSON 文件<input type="file" accept=".txt,.csv,.json,text/plain" onChange={event => { void readFile(event) }}/></label>
      <label className="field">或粘贴词表<textarea value={input} onChange={event => setInput(event.target.value)} rows={7}
        placeholder={'word,meaning\nsustain,维持；支撑\ncoherent,连贯的'}/></label>
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="primary" disabled={busy || !input.trim()}><Upload size={17}/>导入并使用</button>
    </form>
  </Modal>
}

export function downloadJson(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function SettingsPage({ data, offlineReady, update, stats }: {
  data: Data; offlineReady: boolean; update: (patch: Partial<Preferences>) => Promise<void>; stats: () => void
}) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [voices, setVoices] = useState(listVoices)
  const [voiceCheck, setVoiceCheck] = useState(voiceReport)
  const [pending, setPending] = useState<{ text: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [settings, optimistic] = useOptimistic(data.settings,
    (current, patch: Partial<Preferences>) => ({ ...current, ...patch }))
  useEffect(() => { void waitVoices().then(list => { setVoices(list); setVoiceCheck(voiceReport()) }) }, [])
  function change(patch: Partial<Preferences>) {
    startTransition(async () => {
      optimistic(patch)
      try { await update(patch) }
      catch { setError('设置保存失败，请重试。') }
    })
  }
  async function readBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setMessage('')
    if (file.size > 50 * 1024 * 1024) { setError('备份文件需小于 50 MB。'); return }
    try {
      const text = await file.text()
      parseBackup(text)
      setPending({ text, name: file.name })
    } catch { setError('备份校验失败，请选择 WordPack Pro 或旧版不背单词 Lite 导出的 JSON。') }
  }
  async function restore() {
    if (!pending || busy) return
    setBusy(true)
    try { await importBackup(pending.text); setPending(null); setMessage('备份已恢复。') }
    catch { setError('恢复失败，之前的数据仍已保留。'); setPending(null) }
    finally { setBusy(false) }
  }
  return <div className="standard-page">
    <div className="page-heading"><div><h1>偏好设置</h1><p>调整训练节奏、声音和离线数据。</p></div>
      <button className="secondary" onClick={stats}>学习统计<ArrowRight size={16}/></button></div>
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="section-grid">
      <section className="panel form-panel"><h2><Settings2 size={19}/>学习体验</h2>
        <div className="form-grid">
          <label className="field">每日新词目标<select value={settings.dailyGoal} onChange={e => change({ dailyGoal: Number(e.target.value) })}>
            {[...new Set([5, 10, 12, 15, 20, 30, 50, settings.dailyGoal])].sort((a,b)=>a-b).map(n => <option key={n} value={n}>{n} 词</option>)}</select></label>
          <label className="field">每次复习上限<select value={settings.reviewLimit} onChange={e => change({ reviewLimit: Number(e.target.value) })}>
            {[...new Set([20, 40, 60, 80, 120, settings.reviewLimit])].sort((a,b)=>a-b).map(n => <option key={n} value={n}>{n} 张</option>)}</select></label>
          <label className="field">拆包动画<select value={settings.motion} onChange={e => change({ motion: e.target.value as Preferences['motion'] })}>
            <option value="full">完整动画</option><option value="reduced">减少动态效果</option><option value="off">关闭动画</option>
          </select></label>
          <label className="field">界面主题<select value={settings.theme} onChange={e => change({ theme: e.target.value as Preferences['theme'] })}>
            <option value="violet">紫罗兰</option><option value="midnight">午夜蓝</option></select></label>
          <label className="toggle"><input type="checkbox" checked={settings.sound} onChange={e => change({ sound: e.target.checked })}/>拆包音效</label>
        </div>
      </section>
      <section className="panel form-panel"><h2><Headphones size={19}/>英文朗读</h2>
        <div className="form-grid">
          <label className="field">口音<select value={settings.accent} onChange={e => change({ accent: e.target.value as Preferences['accent'], voice: '' })}>
            <option value="en-US">美式英语</option><option value="en-GB">英式英语</option></select></label>
          <label className="field">音色<select value={settings.voice} onChange={e => change({ voice: e.target.value })}>
            <option value="">自动选择</option>{voices.map(v => <option key={v.voiceURI} value={v.name}>{v.name}{v.localService ? '（本地）' : ''}</option>)}</select></label>
          <label className="field">语速<select value={settings.rate} onChange={e => change({ rate: Number(e.target.value) })}>
            {[...new Set([0.65, 0.8, 0.9, 1, 1.15, settings.rate])].sort((a,b)=>a-b).map(n => <option key={n} value={n}>{n}×</option>)}</select></label>
          <div><Pronounce text="Read a little every day." settings={settings} label="试听发音"/></div>
          <div className="field"><span>语音自检</span>
            <p className="muted" role="status">{voiceCheck.supported
              ? `本机共有 ${voiceCheck.total} 个语音，其中英语 ${voiceCheck.english} 个。发音优先用站点自带的音频，系统语音只作兜底。`
              : `当前浏览器没有提供语音合成接口（微信、QQ 等内置浏览器常见），发音会使用站点自带的音频，不影响使用。${isInAppBrowser() ? ' 想安装到主屏幕、用上系统语音，请改用 Chrome 或系统浏览器打开。' : ''}`}</p>
            <button className="secondary" onClick={() => { setVoices(listVoices()); setVoiceCheck(voiceReport()) }}>重新检测</button>
          </div>
        </div>
      </section>
      <section className="panel form-panel"><h2><HardDrive size={19}/>本地备份</h2>
        <p>{offlineReady ? '离线资源已缓存。' : '生产版本首次加载后会缓存离线资源。'} 浏览器清除网站数据时，学习记录也会丢失。</p>
        <div className="action-row">
          <button className="secondary" onClick={() => downloadJson(serializeBackup(data), 'wordpack-pro-backup.json')}><Download size={17}/>导出备份</button>
          <label className="secondary file-button"><Upload size={17}/>导入恢复<input aria-label="导入恢复" type="file" accept=".json,application/json" onChange={event => { void readBackup(event) }}/></label>
        </div>
      </section>
      <section className="panel form-panel"><h2>AI 学习助手</h2>
        <p>在单词详解中按需生成讲解或练习。服务地址和密钥由自托管的同源服务器设置。</p>
        <p className="muted">已在本机保存 {data.aiFeedback.length} 条 AI 内容反馈。</p>
      </section>
    </div>
    {pending && <Modal title="恢复学习备份" close={() => { if (!busy) setPending(null) }}>
      <p>恢复 <strong>{pending.name}</strong> 将用备份替换当前学习记录、词书和设置。</p>
      <div className="action-row">
        <button className="secondary" onClick={() => downloadJson(serializeBackup(data), 'wordpack-pro-before-restore.json')}>下载当前备份</button>
        <button className="primary" disabled={busy} onClick={() => { void restore() }}>确认恢复</button>
      </div>
    </Modal>}
  </div>
}

